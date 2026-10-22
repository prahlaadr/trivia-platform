"""Export the trivia bank to a single JSON file for runtime serving.

DuckDB native bindings can't run on Vercel's serverless runtime
(missing libduckdb.so). So we pre-export the bank to JSON at build/
ingest time, and the Next.js API loads it in-memory.

Output: web/.bank/bank.json — ~5MB, committed to git.

Schema:
    {
      "categories":    [{id, slug, name, sortOrder, questionCount}, ...],
      "subcategories": [{id, categoryId, categorySlug, slug, name, isCatchall, questionCount}, ...],
      "questions":     [{id, source, sourceUrl, text, answer, aliases,
                         categorySlug, subcategorySlug, difficulty,
                         questionType, choices, qualityScore, rhymeKey}, ...]
    }
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import duckdb

from scripts.ingest._common import DEFAULT_DB

# pronouncing is only needed to precompute rhymeKey (CMU dict). Optional so the
# export still runs without it, just without rhyme-pattern support.
try:
    import pronouncing
except ImportError:  # pragma: no cover
    pronouncing = None

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO_ROOT / "web" / ".bank" / "bank.json"

# Function words we lowercase inside a Title-Cased question so it reads like a
# sentence. We NEVER touch content words (can't tell a proper noun from a common
# noun with a rule), so "What Communication Aid Was Invented In 1905 By American
# Undertaker" becomes "What Communication Aid was Invented in 1905 by American
# Undertaker" — not perfect, but the jarring "Was/In/By" capitals are gone and
# the ranking demotes what's left.
FUNCTION_WORDS = {
    "a", "an", "the", "and", "or", "but", "nor", "of", "to", "in", "on", "at",
    "by", "for", "with", "from", "as", "into", "onto", "over", "under", "per",
    "via", "vs", "is", "are", "was", "were", "be", "been", "being", "am", "do",
    "does", "did", "has", "have", "had", "can", "could", "will", "would",
    "shall", "should", "may", "might", "must", "it", "its", "this", "that",
    "these", "those", "their", "his", "her", "our", "your", "my",
}
_QUESTION_STARTS = {"what", "which", "who", "whom", "whose", "where", "when", "why", "how"}


def _normalize_dashes(text: str) -> str:
    # Em dash used as punctuation -> comma. En dash too, UNLESS it's a numeric
    # range (5-10), which stays. Collapse any doubled commas this produces.
    text = re.sub(r"\s*—\s*", ", ", text)
    text = re.sub(r"(?<!\d)\s*–\s*(?!\d)", ", ", text)
    return re.sub(r",\s*,", ", ", text)


def _looks_title_cased(words: list[str]) -> bool:
    alpha = [w for w in words if w[:1].isalpha() and len(w) > 1]
    if len(alpha) < 4:
        return False
    caps = sum(1 for w in alpha if w[0].isupper())
    return caps / len(alpha) >= 0.65


def _detitle(text: str) -> str:
    words = text.split()
    if not _looks_title_cased(words):
        return text
    out = []
    for i, w in enumerate(words):
        bare = w.lower().strip(".,:;?!'\"")
        if i > 0 and bare in FUNCTION_WORDS and not w.isupper():
            out.append(w.lower())
        else:
            out.append(w)
    return " ".join(out)


def _ensure_terminal(text: str) -> str:
    t = text.rstrip()
    if t and t[-1] not in ".?!:…":
        first = t.split(" ", 1)[0].lower().strip("'\"")
        if first in _QUESTION_STARTS:
            t += "?"
    return t


def clean_question(text: str | None) -> str | None:
    if not text:
        return text
    return _ensure_terminal(_detitle(_normalize_dashes(text)))


def rhyme_key(answer: str | None) -> str | None:
    """CMU rhyming part for a single ASCII word answer (for rhyme-pattern rounds)."""
    if pronouncing is None or not answer:
        return None
    a = answer.strip()
    if " " in a or not a.isascii() or not a.replace("'", "").isalpha():
        return None
    phones = pronouncing.phones_for_word(a.lower())
    return pronouncing.rhyming_part(phones[0]) if phones else None


def to_camel_q(r: dict) -> dict:
    # Parse options_json into choices array
    choices: list[str] = []
    if r.get("options_json"):
        try:
            parsed = json.loads(r["options_json"])
            if isinstance(parsed, dict) and isinstance(parsed.get("choices"), list):
                choices = parsed["choices"]
        except Exception:
            pass
    aliases = r.get("answer_aliases") or []
    answer = _normalize_dashes(r["answer_text"].strip()) if r["answer_text"] else r["answer_text"]
    return {
        "id": str(r["id"]),
        "source": r["source"],
        "sourceUrl": r["source_url"],
        "text": clean_question(r["question_text"]),
        "answer": answer,
        "aliases": list(aliases) if aliases else [],
        "categorySlug": r["cat_slug"],
        "subcategorySlug": r["sub_slug"],
        "difficulty": r["difficulty"],
        "questionType": r["question_type"],
        "choices": choices,
        "qualityScore": float(r["quality_score"]) if r["quality_score"] is not None else 0.5,
        "timeSensitive": bool(r.get("time_sensitive")),
        "rhymeKey": rhyme_key(answer),
    }


def write_rhyme_seeds(questions: list[dict], out_dir: Path) -> int:
    """Map common words -> CMU rhyming part so a user-typed rhyme seed resolves
    at runtime (JS has no phonetics). Only keep parts that some answer uses, so
    the file stays small and every seed can actually fill a round."""
    if pronouncing is None:
        return 0
    from collections import Counter

    parts = Counter(q["rhymeKey"] for q in questions if q.get("rhymeKey"))
    usable = {p for p, n in parts.items() if n >= 3}
    if not usable:
        return 0
    pronouncing.init_cmu()
    seeds: dict[str, str] = {}
    for word, phones in pronouncing.pronunciations:
        if "(" in word:  # skip alternate pronunciations like "word(2)"
            continue
        rp = pronouncing.rhyming_part(phones)
        if rp in usable:
            seeds.setdefault(word.lower(), rp)
    (out_dir / "rhyme-seeds.json").write_text(json.dumps(seeds, separators=(",", ":")))
    return len(seeds)


def export(db_path: Path, out_path: Path) -> dict:
    con = duckdb.connect(str(db_path), read_only=True)

    cats = con.execute(
        """
        SELECT c.id, c.slug, c.name, c.sort_order AS sort_order,
               COUNT(q.id) AS question_count
        FROM category c
        LEFT JOIN question q
          ON q.category_id = c.id AND q.superseded_by IS NULL
        WHERE c.active
        GROUP BY c.id, c.slug, c.name, c.sort_order
        ORDER BY c.sort_order
        """
    ).fetchall()
    categories = [
        {"id": cid, "slug": slug, "name": name, "sortOrder": so, "questionCount": qc}
        for cid, slug, name, so, qc in cats
    ]

    subs = con.execute(
        """
        SELECT s.id, s.category_id, c.slug AS cat_slug,
               s.slug, s.name, s.is_catchall,
               COUNT(q.id) AS question_count,
               c.sort_order AS sort_order
        FROM subcategory s
        JOIN category c ON s.category_id = c.id
        LEFT JOIN question q
          ON q.subcategory_id = s.id AND q.superseded_by IS NULL
        WHERE s.active
        GROUP BY s.id, s.category_id, c.slug, s.slug, s.name, s.is_catchall, c.sort_order
        ORDER BY sort_order, s.is_catchall DESC, s.slug
        """
    ).fetchall()
    subcategories = [
        {
            "id": sid,
            "categoryId": cat_id,
            "categorySlug": cat_slug,
            "slug": slug,
            "name": name,
            "isCatchall": bool(is_catchall),
            "questionCount": qc,
        }
        for sid, cat_id, cat_slug, slug, name, is_catchall, qc, _so in subs
    ]

    qrows = con.execute(
        """
        SELECT CAST(q.id AS VARCHAR) AS id,
               q.source, q.source_url, q.question_text, q.answer_text,
               q.answer_aliases, c.slug AS cat_slug, s.slug AS sub_slug,
               q.difficulty, q.question_type, q.options_json,
               q.quality_score, q.time_sensitive
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        WHERE q.superseded_by IS NULL
        """
    ).fetchall()
    cols = [d[0] for d in con.description]
    questions = [to_camel_q(dict(zip(cols, r))) for r in qrows]

    out = {
        "categories": categories,
        "subcategories": subcategories,
        "questions": questions,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, separators=(",", ":")))
    rhyme_seeds = write_rhyme_seeds(questions, out_path.parent)
    return {
        "categories": len(categories),
        "subcategories": len(subcategories),
        "questions": len(questions),
        "rhymeSeeds": rhyme_seeds,
        "bytes": out_path.stat().st_size,
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = p.parse_args()

    if not args.db.exists():
        print(f"DB not found: {args.db}", file=sys.stderr)
        return 1

    stats = export(args.db, args.out)
    print(f"Exported to {args.out}")
    print(f"  categories:    {stats['categories']:>5}")
    print(f"  subcategories: {stats['subcategories']:>5}")
    print(f"  questions:     {stats['questions']:>5,}")
    print(f"  rhyme seeds:   {stats['rhymeSeeds']:>5,}")
    print(f"  bytes:         {stats['bytes']:>10,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
