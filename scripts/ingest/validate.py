"""Validate the trivia bank: report quality, catchall %, sample rows.

Run after any ingest or reclassify pass.

Usage:
    uv run python -m scripts.ingest.validate
    uv run python -m scripts.ingest.validate --samples 5
    uv run python -m scripts.ingest.validate --source r-trivia
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb

from scripts.ingest._common import DEFAULT_DB

CATCHALL_THRESHOLD = 0.20  # warn if a category has > 20% on catchall


def report(con: duckdb.DuckDBPyConnection, source: str | None, samples: int) -> int:
    where = "WHERE q.source = ?" if source else ""
    params = [source] if source else []

    total = con.execute(
        f"SELECT COUNT(*) FROM question q {where}", params
    ).fetchone()[0]
    print(f"Total questions in bank{f' (source={source})' if source else ''}: {total:,}\n")

    print("Per-category breakdown (total / catchall / pct on catchall):")
    cat_rows = con.execute(
        f"""
        SELECT c.slug, COUNT(*) AS total,
               SUM(CASE WHEN s.is_catchall THEN 1 ELSE 0 END) AS catchall,
               ROUND(100.0 * SUM(CASE WHEN s.is_catchall THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        {where}
        GROUP BY 1
        ORDER BY total DESC
        """,
        params,
    ).fetchall()
    fails = 0
    for slug, total_n, ca, pct in cat_rows:
        flag = "  ⚠ over threshold" if (pct / 100.0) > CATCHALL_THRESHOLD else ""
        if (pct / 100.0) > CATCHALL_THRESHOLD:
            fails += 1
        print(f"  {slug:20s}  {total_n:>5}   {ca:>5}   {pct}%{flag}")

    print(f"\nCatchall threshold: {CATCHALL_THRESHOLD*100:.0f}% — {fails} category/ies over.")

    # Subcategory distribution
    print("\nSubcategory distribution (top 30):")
    sub_rows = con.execute(
        f"""
        SELECT c.slug || '/' || s.slug AS path, COUNT(*) AS n
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        {where}
        GROUP BY 1
        ORDER BY n DESC
        LIMIT 30
        """,
        params,
    ).fetchall()
    for path, n in sub_rows:
        print(f"  {path:55s}  {n:>5}")

    # Tag distribution
    print("\nTag distribution (top 20):")
    tag_rows = con.execute(
        f"""
        SELECT t.kind || ':' || t.slug AS tag, COUNT(*) AS n
        FROM question_tag qt
        JOIN tag t ON qt.tag_id = t.id
        JOIN question q ON qt.question_id = q.id
        {where}
        GROUP BY 1
        ORDER BY n DESC
        LIMIT 20
        """,
        params,
    ).fetchall()
    if tag_rows:
        for tag, n in tag_rows:
            print(f"  {tag:30s}  {n:>5}")
    else:
        print("  (no tags assigned yet)")

    # Random samples per non-catchall subcategory (sanity check the rules worked)
    if samples > 0:
        print(f"\nRandom samples per subcategory ({samples} each):")
        sample_rows = con.execute(
            f"""
            WITH ranked AS (
              SELECT c.slug AS cat, s.slug AS sub,
                     q.question_text, q.answer_text,
                     ROW_NUMBER() OVER (PARTITION BY c.slug, s.slug ORDER BY random()) AS rn
              FROM question q
              JOIN category c ON q.category_id = c.id
              JOIN subcategory s ON q.subcategory_id = s.id
              {where}
              {("AND " if where else "WHERE ")}NOT s.is_catchall
            )
            SELECT cat, sub, question_text, answer_text
            FROM ranked
            WHERE rn <= ?
            ORDER BY cat, sub
            """,
            params + [samples],
        ).fetchall()
        prev_key = None
        for cat, sub, q, a in sample_rows:
            key = (cat, sub)
            if key != prev_key:
                print(f"\n  [{cat}/{sub}]")
                prev_key = key
            qt = q if len(q) <= 90 else q[:87] + "…"
            at = a if len(a) <= 50 else a[:47] + "…"
            print(f"    Q: {qt}")
            print(f"    A: {at}")

    return 0 if fails == 0 else 0  # don't fail-exit; just report


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--source", default=None)
    p.add_argument("--samples", type=int, default=3)
    args = p.parse_args()

    if not args.db.exists():
        print(f"DB not found: {args.db}", file=sys.stderr)
        return 1

    con = duckdb.connect(str(args.db), read_only=True)
    rc = report(con, args.source, args.samples)
    con.close()
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
