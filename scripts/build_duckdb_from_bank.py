#!/usr/bin/env python3
"""Rebuild the canonical DuckDB (data/bank/trivia.duckdb) from the committed
web/.bank/bank.json.

The 23MB DuckDB is git-ignored (only bank.json ships), so this is how anyone
cloning the repo reconstructs the full Python ingest/reclassify pipeline's
database — and how the maintainer keeps the DB in sync after editing
bank.json directly (the 2026-06 quality pass did exactly that).

Idempotent: drops + recreates the `question` table from bank.json. The
taxonomy (category/subcategory/tag) is seeded by init_schema first.

Usage:
    uv run python -m scripts.ingest.init_schema         # seed taxonomy (idempotent)
    uv run python -m scripts.build_duckdb_from_bank     # then (re)build questions
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

import duckdb

from scripts.ingest._common import dedup_hash

REPO_ROOT = Path(__file__).resolve().parents[1]
DB = REPO_ROOT / "data" / "bank" / "trivia.duckdb"
BANK = REPO_ROOT / "web" / ".bank" / "bank.json"


def main() -> int:
    if not DB.exists():
        print(
            f"DB not found: {DB}\nRun first:  uv run python -m scripts.ingest.init_schema",
            file=sys.stderr,
        )
        return 1

    bank = json.load(open(BANK))
    qs = bank["questions"]
    con = duckdb.connect(str(DB))

    cat_id = dict(con.execute("SELECT slug, id FROM category").fetchall())
    # (category_id, subcategory_slug) -> subcategory_id, plus a per-category
    # catch-all fallback for any subcategory slug not in the taxonomy.
    sub_id: dict[tuple[int, str], int] = {}
    catchall: dict[int, int] = {}
    for sid, cid, slug, is_ca in con.execute(
        "SELECT id, category_id, slug, is_catchall FROM subcategory"
    ).fetchall():
        sub_id[(cid, slug)] = sid
        if is_ca:
            catchall[cid] = sid

    if not cat_id:
        print("taxonomy not seeded — run init_schema first", file=sys.stderr)
        return 1

    con.execute("BEGIN")
    con.execute("DELETE FROM question")
    inserted = skipped = 0
    for q in qs:
        cid = cat_id.get(q["categorySlug"])
        if cid is None:
            skipped += 1
            continue
        sid = sub_id.get((cid, q.get("subcategorySlug") or "")) or catchall.get(cid)
        choices = q.get("choices") or []
        options_json = (
            json.dumps({"choices": choices, "correct_index": None}) if choices else None
        )
        con.execute(
            """
            INSERT INTO question
              (id, source, source_url, question_text, answer_text, answer_aliases,
               category_id, subcategory_id, difficulty, question_type, options_json,
               time_sensitive, dedup_hash, quality_score)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            [
                q["id"],
                q.get("source", "bank"),
                q.get("sourceUrl"),
                q["text"],
                q.get("answer") or "",
                q.get("aliases", []),
                cid,
                sid,
                q.get("difficulty"),
                q.get("questionType"),
                options_json,
                bool(q.get("timeSensitive")),
                dedup_hash(q["text"]),
                float(q.get("qualityScore", 0.5)),
            ],
        )
        inserted += 1
    con.execute("COMMIT")
    total = con.execute("SELECT COUNT(*) FROM question").fetchone()[0]
    con.close()
    print(f"rebuilt question table: inserted {inserted}, skipped {skipped} (bad category).")
    print(f"DuckDB now matches bank.json: {total} questions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
