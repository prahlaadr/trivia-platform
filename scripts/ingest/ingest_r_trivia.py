"""Ingest the r-trivia Reddit-scraped CSV into the trivia bank DuckDB.

Source: web/public/data/question-bank/r-trivia-questions.csv  (13.5K rows)
After: ingest_run('r-trivia') row recorded, question rows inserted.

Usage:
    uv run python -m scripts.ingest.ingest_r_trivia
    uv run python -m scripts.ingest.ingest_r_trivia --dry-run

Verify:
    SELECT category_id, COUNT(*)
    FROM question WHERE source='r-trivia'
    GROUP BY 1 ORDER BY 2 DESC;
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

import duckdb
import polars as pl

from scripts.ingest._common import (
    DEFAULT_DB,
    DEFAULT_MAPPING,
    REPO_ROOT,
    SOURCE_QUALITY,
    category_lookup,
    dedup_hash,
    fallback_cat_sub,
    parse_options,
)

CSV_PATH = REPO_ROOT / "web" / "public" / "data" / "question-bank" / "r-trivia-questions.csv"
SOURCE = "r-trivia"
QUALITY = SOURCE_QUALITY[SOURCE]


def load_csv(path: Path) -> pl.DataFrame:
    return pl.read_csv(
        path,
        infer_schema_length=10_000,
        truncate_ragged_lines=True,
        ignore_errors=False,
    )


def ingest(con: duckdb.DuckDBPyConnection, df: pl.DataFrame, dry_run: bool = False) -> dict:
    cat_map = category_lookup(con, DEFAULT_MAPPING[SOURCE])
    fb_cat_id, fb_sub_id = fallback_cat_sub(con)

    # Build the staging frame using Polars for speed
    df = df.filter(pl.col("question").is_not_null() & pl.col("answer").is_not_null())

    rows = []
    for r in df.iter_rows(named=True):
        cat_label = r.get("category") or ""
        cat_id, sub_id = cat_map.get(cat_label, (fb_cat_id, fb_sub_id))
        rows.append({
            "source": SOURCE,
            "source_id": r["id"],
            "source_url": None,
            "question_text": r["question"],
            "answer_text": r["answer"],
            "answer_aliases": [],
            "category_id": cat_id,
            "subcategory_id": sub_id,
            "difficulty": (r.get("difficulty") or "medium").lower(),
            "question_type": r.get("question_type") or "open_ended",
            "options_json": parse_options(r.get("options")),
            "time_sensitive": False,
            "low_confidence": False,
            "dedup_hash": dedup_hash(r["question"]),
            "quality_score": QUALITY,
        })

    if dry_run:
        print(f"[dry-run] would insert {len(rows)} rows")
        return {"added": 0, "skipped": 0, "considered": len(rows)}

    started = datetime.now()
    con.execute("BEGIN")

    # Snapshot of existing dedup_hashes for this source so we can skip dups
    existing = set(
        h[0] for h in con.execute(
            "SELECT dedup_hash FROM question WHERE source = ?", [SOURCE]
        ).fetchall()
    )

    added = 0
    skipped = 0

    # Insert in batches via a Polars frame for DuckDB to slurp
    new_rows = [r for r in rows if r["dedup_hash"] not in existing]
    skipped = len(rows) - len(new_rows)

    if new_rows:
        ndf = pl.DataFrame(new_rows)
        # Register the polars frame as a virtual table and INSERT … SELECT.
        # DuckDB can read Polars frames directly via Arrow.
        con.register("staging_r_trivia", ndf.to_arrow())
        con.execute("""
            INSERT INTO question (
                source, source_id, source_url, question_text, answer_text,
                answer_aliases, category_id, subcategory_id,
                difficulty, question_type, options_json,
                time_sensitive, low_confidence, dedup_hash, quality_score
            )
            SELECT
                source, source_id, source_url, question_text, answer_text,
                answer_aliases, category_id, subcategory_id,
                difficulty, question_type, options_json,
                time_sensitive, low_confidence, dedup_hash, quality_score
            FROM staging_r_trivia
        """)
        added = len(new_rows)
        con.unregister("staging_r_trivia")

    # Record the ingest_run
    con.execute("""
        INSERT INTO ingest_run (source, last_source_id, last_offset, rows_added, rows_skipped, started_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (source) DO UPDATE SET
            last_source_id = EXCLUDED.last_source_id,
            last_offset    = EXCLUDED.last_offset,
            rows_added     = COALESCE(ingest_run.rows_added, 0) + EXCLUDED.rows_added,
            rows_skipped   = COALESCE(ingest_run.rows_skipped, 0) + EXCLUDED.rows_skipped,
            started_at     = EXCLUDED.started_at,
            finished_at    = EXCLUDED.finished_at
    """, [SOURCE, rows[-1]["source_id"] if rows else None, len(rows), added, skipped, started, datetime.now()])

    con.execute("COMMIT")
    return {"added": added, "skipped": skipped, "considered": len(rows)}


def report(con: duckdb.DuckDBPyConnection) -> None:
    print("\nPer-category counts (source=r-trivia):")
    rows = con.execute("""
        SELECT c.slug AS cat, s.slug AS sub, COUNT(*) AS n
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        WHERE q.source = 'r-trivia'
        GROUP BY 1,2
        ORDER BY 1, n DESC
    """).fetchall()
    for cat, sub, n in rows:
        print(f"  {cat:18s}  {sub:30s}  {n:>5}")

    total = con.execute(
        "SELECT COUNT(*) FROM question WHERE source='r-trivia'"
    ).fetchone()[0]
    print(f"\nTotal r-trivia questions in bank: {total:,}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--csv", type=Path, default=CSV_PATH)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if not args.csv.exists():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    print(f"DB : {args.db}")
    print(f"CSV: {args.csv}")

    df = load_csv(args.csv)
    print(f"Loaded CSV: {len(df):,} rows, columns: {df.columns}")

    con = duckdb.connect(str(args.db))
    result = ingest(con, df, dry_run=args.dry_run)
    print(f"\nIngest result: {result}")

    report(con)
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
