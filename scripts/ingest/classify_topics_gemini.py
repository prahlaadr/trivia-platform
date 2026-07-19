"""Reclassify questions into the taxonomy using Gemini (LLM), for rows the
keyword rules can't place — chiefly the pop-misc/general-knowledge catchall.

Unlike reclassify.py (regex keyword rules), this reads each question with an
LLM and picks the best category + subcategory from the live taxonomy. Built
for the dirty-south pub quizzes, whose jokey round titles leave ~77% in the
catchall so topic filtering barely works.

Preview-first: default run calls Gemini and prints the proposed before/after
distribution + samples, writing NOTHING. Pass --apply to update the DB, then
rebuild bank.json (export_json) and snapshot.

Usage:
    uv run python -m scripts.ingest.classify_topics_gemini                 # preview all dirty-south
    uv run python -m scripts.ingest.classify_topics_gemini --only-catchall # only catchall/pop-misc rows
    uv run python -m scripts.ingest.classify_topics_gemini --apply         # write + export + snapshot

Key: GEMINI_API_KEY from env or ~/Projects/.secrets/secrets.env.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import duckdb
import httpx

from scripts.ingest._common import DEFAULT_DB

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
BATCH = 20


def gemini_key() -> str:
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    secrets = Path.home() / "Projects" / ".secrets" / "secrets.env"
    if secrets.exists():
        m = re.search(r'GEMINI_API_KEY="?([^"\n]+)"?', secrets.read_text())
        if m:
            return m.group(1)
    print("No GEMINI_API_KEY (env or ~/Projects/.secrets/secrets.env)", file=sys.stderr)
    raise SystemExit(1)


def load_taxonomy(con) -> tuple[dict, str]:
    """Returns ({(cat_slug, sub_slug): (cat_id, sub_id)}, prompt_listing)."""
    rows = con.execute(
        """
        SELECT c.slug, s.slug, c.id, s.id
        FROM subcategory s JOIN category c ON s.category_id = c.id
        ORDER BY c.slug, s.slug
        """
    ).fetchall()
    pairs: dict[tuple[str, str], tuple[int, int]] = {}
    by_cat: dict[str, list[str]] = {}
    for cs, ss, cid, sid in rows:
        pairs[(cs, ss)] = (cid, sid)
        by_cat.setdefault(cs, []).append(ss)
    listing = "\n".join(f"- {cs}: {', '.join(subs)}" for cs, subs in by_cat.items())
    return pairs, listing


def classify_batch(key: str, listing: str, batch: list[tuple]) -> dict[int, tuple[str, str]]:
    """batch = [(idx, question_text, answer_text)]. Returns {idx: (cat, sub)}."""
    items = "\n".join(f'{i}. Q: {t}  A: {a}' for i, t, a in batch)
    prompt = (
        "You are a trivia librarian. Assign each question the single best "
        "category and subcategory from THIS taxonomy (use the exact slugs; the "
        "subcategory must belong to the chosen category):\n\n"
        f"{listing}\n\n"
        "Questions:\n"
        f"{items}\n\n"
        'Return ONLY a JSON array: [{"i": <number>, "category": "<slug>", '
        '"subcategory": "<slug>"}]. Pick the most specific fitting subcategory; '
        "avoid the generic 'general-*' catchall unless nothing else fits."
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    for attempt in range(4):
        r = httpx.post(url, headers={"x-goog-api-key": key}, json=body, timeout=60)
        if r.status_code == 200:
            break
        if r.status_code in (429, 503) and attempt < 3:
            time.sleep(1.5 * 2 ** attempt)
            continue
        raise RuntimeError(f"Gemini {r.status_code}: {r.text[:160]}")
    text = "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    out = {}
    for row in json.loads(text):
        out[int(row["i"])] = (row.get("category"), row.get("subcategory"))
    return out


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--source", default="dirty-south")
    p.add_argument("--only-catchall", action="store_true", help="only rows on a catchall subcategory")
    p.add_argument("--limit", type=int, default=0, help="cap questions (for a quick sample)")
    p.add_argument("--apply", action="store_true", help="write to DB + export_json + snapshot")
    args = p.parse_args()

    key = gemini_key()
    con = duckdb.connect(str(args.db))
    pairs, listing = load_taxonomy(con)

    where = "WHERE q.source = ?"
    params: list = [args.source]
    if args.only_catchall:
        where += " AND s.is_catchall"
    rows = con.execute(
        f"""
        SELECT q.id, q.question_text, q.answer_text, c.slug, s.slug
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        {where}
        ORDER BY q.id
        """,
        params,
    ).fetchall()
    if args.limit:
        rows = rows[: args.limit]
    print(f"Classifying {len(rows)} '{args.source}' questions with {MODEL} …")

    updates = []            # (cat_id, sub_id, qid)
    before = {}             # cat/sub -> count (current)
    after = {}              # cat/sub -> count (proposed)
    samples = []
    invalid = 0

    for start in range(0, len(rows), BATCH):
        chunk = rows[start : start + BATCH]
        batch = [(i, r[1], r[2]) for i, r in enumerate(chunk)]
        try:
            result = classify_batch(key, listing, batch)
        except Exception as e:
            print(f"  ! batch @ {start} failed: {e}", file=sys.stderr)
            result = {}
        for i, r in enumerate(chunk):
            qid, qtext, _atext, cur_cat, cur_sub = r
            before[f"{cur_cat}/{cur_sub}"] = before.get(f"{cur_cat}/{cur_sub}", 0) + 1
            cat, sub = result.get(i, (None, None))
            if (cat, sub) in pairs:
                cid, sid = pairs[(cat, sub)]
                after[f"{cat}/{sub}"] = after.get(f"{cat}/{sub}", 0) + 1
                if (cat, sub) != (cur_cat, cur_sub):
                    updates.append((cid, sid, qid))
                    if len(samples) < 15:
                        samples.append(f"  {qtext[:52]:54s} {cur_cat}/{cur_sub} -> {cat}/{sub}")
            else:
                invalid += 1
                after[f"{cur_cat}/{cur_sub}"] = after.get(f"{cur_cat}/{cur_sub}", 0) + 1
        print(f"  …{min(start + BATCH, len(rows))}/{len(rows)}")
        time.sleep(0.4)

    print(f"\nProposed: {len(updates)} moves, {invalid} invalid/unchanged")
    print("\nSample moves:")
    print("\n".join(samples))
    print("\nAFTER distribution (top categories):")
    cat_after: dict[str, int] = {}
    for k, n in after.items():
        cat_after[k.split("/")[0]] = cat_after.get(k.split("/")[0], 0) + n
    for c, n in sorted(cat_after.items(), key=lambda kv: -kv[1]):
        print(f"  {c:20s} {n}")
    pop_before = sum(v for k, v in before.items() if k.startswith("pop-misc/"))
    pop_after = sum(v for k, v in after.items() if k.startswith("pop-misc/"))
    print(f"\npop-misc catchall: {pop_before} -> {pop_after}")

    if not args.apply:
        print("\npreview only — re-run with --apply to write, export_json, and snapshot.")
        return 0

    # Apply via temp-table batch UPDATE (same pattern as reclassify.py).
    con.execute("BEGIN")
    con.execute("CREATE OR REPLACE TEMP TABLE pending (qid UUID, cat_id INTEGER, sub_id INTEGER)")
    import pyarrow as pa
    con.register("stage", pa.table({
        "qid": [u[2] for u in updates], "cat_id": [u[0] for u in updates], "sub_id": [u[1] for u in updates],
    }))
    con.execute("INSERT INTO pending SELECT qid::UUID, cat_id, sub_id FROM stage")
    con.unregister("stage")
    con.execute("UPDATE question SET category_id = p.cat_id, subcategory_id = p.sub_id FROM pending p WHERE question.id = p.qid")
    con.execute("DROP TABLE pending")
    con.execute("COMMIT")
    con.close()
    print(f"\napplied {len(updates)} moves. Now run export_json + snapshot:")
    print("  uv run python -m scripts.ingest.export_json && uv run python -m scripts.ingest.snapshot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
