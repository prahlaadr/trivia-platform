"""Ingest OpenTDB (opentdb.com) into the trivia bank.

Walks categories 9..32, paginates 50 at a time using a session token
(prevents duplicates within a session). HTML-decodes the text fields.
Maps each OpenTDB category id → our canonical (cat, subcat) per
DEFAULT_MAPPING.

Usage:
    uv run python -m scripts.ingest.ingest_opentdb
    uv run python -m scripts.ingest.ingest_opentdb --category 11   # films only

Rate limit: 1 request / 5 seconds per IP. We sleep 6s between requests.
"""

from __future__ import annotations

import argparse
import html
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import duckdb
import httpx

from scripts.ingest._common import (
    DEFAULT_DB,
    DEFAULT_MAPPING,
    SOURCE_QUALITY,
    category_lookup,
    dedup_hash,
)

SOURCE = "opentdb"
QUALITY = SOURCE_QUALITY[SOURCE]
BASE = "https://opentdb.com"
SLEEP_BETWEEN = 6.0  # seconds, respects rate limit

CATEGORIES = list(DEFAULT_MAPPING[SOURCE].keys())  # ['9'..'32']


def get_token(client: httpx.Client) -> str:
    r = client.get(f"{BASE}/api_token.php?command=request")
    r.raise_for_status()
    return r.json()["token"]


def category_total(client: httpx.Client, cat_id: str) -> int:
    r = client.get(f"{BASE}/api_count.php?category={cat_id}")
    r.raise_for_status()
    return r.json()["category_question_count"]["total_question_count"]


def fetch_page(client: httpx.Client, cat_id: str, amount: int, token: str) -> list[dict]:
    r = client.get(f"{BASE}/api.php?amount={amount}&category={cat_id}&token={token}")
    r.raise_for_status()
    js = r.json()
    code = js.get("response_code", -1)
    if code == 4:        # token exhausted
        return []
    if code != 0:        # other error
        print(f"  ! response_code={code} for cat {cat_id}")
        return []
    return js.get("results", [])


def decode(s: str) -> str:
    return html.unescape(s).strip()


def to_canonical_row(otdb: dict, cat_id_lookup: dict, cat_str: str) -> dict:
    cat_id, sub_id = cat_id_lookup[cat_str]
    qtext = decode(otdb["question"])
    answer = decode(otdb["correct_answer"])
    incorrect = [decode(x) for x in otdb.get("incorrect_answers", [])]
    if otdb.get("type") == "boolean":
        qtype = "true_false"
        options_json = None
    elif incorrect:
        qtype = "multiple_choice"
        choices = sorted(incorrect + [answer])  # alpha-sort so position isn't revealing
        options_json = json.dumps({
            "choices": choices,
            "correct_index": choices.index(answer),
        })
    else:
        qtype = "open_ended"
        options_json = None
    return {
        "source": SOURCE,
        "source_id": f"otdb-{cat_str}-{dedup_hash(qtext)[:12]}",  # synthetic stable id
        "source_url": None,
        "question_text": qtext,
        "answer_text": answer,
        "answer_aliases": [],
        "category_id": cat_id,
        "subcategory_id": sub_id,
        "difficulty": otdb.get("difficulty", "medium").lower(),
        "question_type": qtype,
        "options_json": options_json,
        "time_sensitive": False,
        "low_confidence": False,
        "dedup_hash": dedup_hash(qtext),
        "quality_score": QUALITY,
    }


def ingest(
    con: duckdb.DuckDBPyConnection,
    only_category: str | None,
    max_pages: int | None,
) -> dict:
    cat_id_lookup = category_lookup(con, DEFAULT_MAPPING[SOURCE])

    cats = [only_category] if only_category else CATEGORIES
    started = datetime.now()
    added_total = 0
    skipped_total = 0
    seen_per_cat = {}

    with httpx.Client(timeout=20) as client:
        token = get_token(client)
        print(f"OpenTDB token: {token[:10]}...")

        for ci, cat in enumerate(cats, 1):
            try:
                total = category_total(client, cat)
            except Exception as e:
                print(f"  ! couldn't get total for cat {cat}: {e}")
                continue
            print(f"\n[{ci}/{len(cats)}] OpenTDB cat {cat}: {total} total questions")
            time.sleep(SLEEP_BETWEEN)

            collected = []
            page_count = 0
            while True:
                if max_pages and page_count >= max_pages:
                    break
                amount = min(50, total - len(collected))
                if amount <= 0:
                    break
                results = fetch_page(client, cat, amount, token)
                if not results:
                    break
                collected.extend(results)
                page_count += 1
                print(f"  page {page_count}: +{len(results)} (running {len(collected)}/{total})")
                time.sleep(SLEEP_BETWEEN)

            seen_per_cat[cat] = len(collected)

            # Build canonical rows
            rows = []
            for otdb in collected:
                try:
                    rows.append(to_canonical_row(otdb, cat_id_lookup, cat))
                except Exception as e:
                    print(f"  ! row conversion failed: {e}")

            # Dedup against existing across ALL sources
            existing = set(
                h[0] for h in con.execute(
                    "SELECT dedup_hash FROM question WHERE dedup_hash = ANY(?)",
                    [[r["dedup_hash"] for r in rows]] if rows else [[]],
                ).fetchall()
            )
            new_rows = [r for r in rows if r["dedup_hash"] not in existing]
            skipped_this = len(rows) - len(new_rows)

            if new_rows:
                import polars as pl
                ndf = pl.DataFrame(new_rows)
                con.register("staging_otdb", ndf.to_arrow())
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
                    FROM staging_otdb
                """)
                con.unregister("staging_otdb")

            added_total += len(new_rows)
            skipped_total += skipped_this
            print(f"  inserted {len(new_rows)}, deduped {skipped_this}")

    # ingest_run ledger
    con.execute("""
        INSERT INTO ingest_run (source, last_source_id, last_offset, rows_added, rows_skipped, started_at, finished_at)
        VALUES (?, NULL, ?, ?, ?, ?, ?)
        ON CONFLICT (source) DO UPDATE SET
            last_offset  = EXCLUDED.last_offset,
            rows_added   = COALESCE(ingest_run.rows_added, 0) + EXCLUDED.rows_added,
            rows_skipped = COALESCE(ingest_run.rows_skipped, 0) + EXCLUDED.rows_skipped,
            started_at   = EXCLUDED.started_at,
            finished_at  = EXCLUDED.finished_at
    """, [SOURCE, sum(seen_per_cat.values()), added_total, skipped_total, started, datetime.now()])

    return {"added": added_total, "skipped": skipped_total, "seen_per_cat": seen_per_cat}


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--category", default=None, help="OpenTDB category id (e.g. 11)")
    p.add_argument("--max-pages", type=int, default=None, help="Cap pages per category (testing)")
    args = p.parse_args()

    if not args.db.exists():
        print(f"DB not found: {args.db}", file=sys.stderr)
        return 1

    con = duckdb.connect(str(args.db))
    result = ingest(con, args.category, args.max_pages)
    print(f"\nDONE — added {result['added']}, skipped {result['skipped']}")
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
