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
                         questionType, choices, qualityScore}, ...]
    }
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import duckdb

from scripts.ingest._common import DEFAULT_DB

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO_ROOT / "web" / ".bank" / "bank.json"


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
    return {
        "id": str(r["id"]),
        "source": r["source"],
        "sourceUrl": r["source_url"],
        "text": r["question_text"],
        "answer": r["answer_text"],
        "aliases": list(aliases) if aliases else [],
        "categorySlug": r["cat_slug"],
        "subcategorySlug": r["sub_slug"],
        "difficulty": r["difficulty"],
        "questionType": r["question_type"],
        "choices": choices,
        "qualityScore": float(r["quality_score"]) if r["quality_score"] is not None else 0.5,
        "timeSensitive": bool(r.get("time_sensitive")),
    }


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
    return {
        "categories": len(categories),
        "subcategories": len(subcategories),
        "questions": len(questions),
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
    print(f"  bytes:         {stats['bytes']:>10,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
