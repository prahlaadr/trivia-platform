"""Ingest Dirty South Pub Quiz .docx files (pre-parsed to JSON) into the bank.

Pipeline:
  1. parse_pub_quiz_docx.ts already turned .docx files into Quiz JSON
     (one JSON per quiz, in the canonical platform Quiz shape).
  2. This script reads those JSONs and inserts every question into the
     question table with source='dirty-south' and quality_score=0.85
     (the highest source-tier baseline — these are the platform's voice).
  3. Categorization: every question lands on its quiz round's title as the
     round-context tag (not the canonical category yet); we route them
     to a default category via the round title heuristic, then let
     reclassify.py + keyword rules do the rest.

Usage:
    uv run python -m scripts.ingest.ingest_dirty_south <json_dir>

After:
    uv run python -m scripts.ingest.reclassify     # apply keyword rules
    uv run python -m scripts.ingest.export_json    # rebuild bank.json
    uv run python -m scripts.ingest.snapshot       # parquet + CHANGELOG
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import duckdb

from scripts.ingest._common import (
    DEFAULT_DB,
    SOURCE_QUALITY,
    category_lookup,
    dedup_hash,
)

SOURCE = "dirty-south"
QUALITY = 0.85  # Highest non-manual tier; trumps r-trivia (0.5) + opentdb (0.6)


# Round-title → canonical category heuristic. The Dirty South templates
# use round titles like "Random", "Geography", "Movies", "Music", etc.
# Things not matching any keyword land in pop-misc/general-knowledge so
# they're still surfaced; keyword_rules.yaml will refine via question
# text after ingest.
ROUND_TITLE_TO_CAT = [
    (("film", "movie", "tv", "television", "cinema", "manga", "anime", "marvel", "dc", "star wars"), ("film-tv", "hollywood")),
    (("music", "song", "lyric", "artist", "band", "album", "rock", "pop"), ("music", "rock-pop")),
    (("sport", "game", "athlete", "championship", "olympic", "football", "basketball", "cricket"), ("sport", "american-sports")),
    (("geography", "world", "country", "city", "capital", "guess where", "place"), ("geography", "countries-capitals-flags")),
    (("history", "year", "decade", "ancient", "war", "century"), ("history", "modern-history")),
    (("science", "nature", "animal", "biology", "physics", "chemistry", "space"), ("science-nature", "animals-plants-earth")),
    (("food", "drink", "cocktail", "wine", "beer", "cuisine", "recipe", "zero proof"), ("food-drink", "world-cuisines")),
    (("book", "author", "novel", "literature", "poet", "shakespeare", "quotable"), ("literature", "classics-poetry-theatre")),
    (("art", "design", "fashion", "logo", "architecture"), ("art-design", "art-architecture")),
    (("video game", "nintendo", "playstation", "xbox", "board game"), ("games-toys", "video-games")),
    (("technology", "tech", "internet", "meme", "social media", "programming"), ("tech-internet", "companies-tech")),
    (("politics", "election", "law", "president"), ("politics-society", "leaders-world")),
    (("myth", "religion", "god", "goddess", "legend"), ("myth-religion", "western-myth")),
    (("language", "word", "grammar", "etymology"), ("language-words", "wordplay-quotes-grammar")),
    # Catchall fallback handled below
]


def categorize(round_title: str) -> tuple[str, str]:
    t = (round_title or "").lower()
    for keywords, target in ROUND_TITLE_TO_CAT:
        if any(k in t for k in keywords):
            return target
    return ("pop-misc", "general-knowledge")


def load_quiz_jsons(json_dir: Path) -> list[dict]:
    out = []
    for p in sorted(json_dir.glob("*.json")):
        try:
            out.append(json.loads(p.read_text()))
        except Exception as e:
            print(f"  ! couldn't read {p.name}: {e}", file=sys.stderr)
    return out


def ingest(con: duckdb.DuckDBPyConnection, quizzes: list[dict], dry_run: bool) -> dict:
    # Build category lookup across all targets we use
    cat_map: dict[tuple[str, str], tuple[int, int]] = {}
    for slugs in {tgt for _, tgt in ROUND_TITLE_TO_CAT} | {("pop-misc", "general-knowledge")}:
        cs, ss = slugs
        row = con.execute(
            """
            SELECT c.id, s.id
            FROM subcategory s JOIN category c ON s.category_id = c.id
            WHERE c.slug = ? AND s.slug = ?
            """,
            [cs, ss],
        ).fetchone()
        if not row:
            raise ValueError(f"Mapping target missing: {cs}/{ss}")
        cat_map[slugs] = row

    started = datetime.now()

    rows: list[dict] = []
    skipped_internet = 0

    for quiz in quizzes:
        qnum = quiz.get("quiz_number", 0)
        for rd in quiz.get("rounds", []):
            cat_id, sub_id = cat_map[categorize(rd.get("title", ""))]
            for q in rd.get("questions", []):
                if q.get("is_internet_only"):
                    skipped_internet += 1
                    continue
                text = (q.get("text") or "").strip()
                answer = (q.get("answer") or "").strip()
                if not text or not answer:
                    continue
                rows.append({
                    "source": SOURCE,
                    "source_id": f"ds-q{qnum}-r{rd.get('number')}-q{q.get('number')}",
                    "source_url": None,
                    "question_text": text,
                    "answer_text": answer,
                    "answer_aliases": [],
                    "category_id": cat_id,
                    "subcategory_id": sub_id,
                    "difficulty": "medium",
                    "question_type": "open_ended",
                    "options_json": None,
                    "time_sensitive": False,
                    "low_confidence": False,
                    "dedup_hash": dedup_hash(text),
                    "quality_score": QUALITY,
                })

    print(f"Built {len(rows)} candidate rows ({skipped_internet} internet-only skipped)")

    if dry_run:
        print("[dry-run]")
        return {"added": 0, "skipped": 0, "considered": len(rows)}

    # Dedup against existing (any source)
    existing_q = set(
        h[0] for h in con.execute(
            "SELECT dedup_hash FROM question WHERE dedup_hash = ANY(?)",
            [[r["dedup_hash"] for r in rows]],
        ).fetchall()
    )
    new_rows = [r for r in rows if r["dedup_hash"] not in existing_q]
    skipped = len(rows) - len(new_rows)

    con.execute("BEGIN")
    if new_rows:
        import polars as pl
        ndf = pl.DataFrame(new_rows)
        con.register("staging_ds", ndf.to_arrow())
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
            FROM staging_ds
        """)
        con.unregister("staging_ds")

    con.execute("""
        INSERT INTO ingest_run (source, last_source_id, last_offset, rows_added, rows_skipped, started_at, finished_at)
        VALUES (?, NULL, ?, ?, ?, ?, ?)
        ON CONFLICT (source) DO UPDATE SET
            last_offset  = EXCLUDED.last_offset,
            rows_added   = COALESCE(ingest_run.rows_added, 0) + EXCLUDED.rows_added,
            rows_skipped = COALESCE(ingest_run.rows_skipped, 0) + EXCLUDED.rows_skipped,
            started_at   = EXCLUDED.started_at,
            finished_at  = EXCLUDED.finished_at
    """, [SOURCE, len(rows), len(new_rows), skipped, started, datetime.now()])
    con.execute("COMMIT")

    return {"added": len(new_rows), "skipped": skipped, "considered": len(rows)}


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("json_dir", type=Path)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    quizzes = load_quiz_jsons(args.json_dir)
    print(f"Loaded {len(quizzes)} quiz JSONs")

    con = duckdb.connect(str(args.db))
    # Make sure 'dirty-south' source priority is registered (cosmetic; reclassify
    # doesn't dedupe across sources by priority yet — we just trust quality_score)
    if SOURCE not in SOURCE_QUALITY:
        SOURCE_QUALITY[SOURCE] = QUALITY

    result = ingest(con, quizzes, args.dry_run)
    print(f"\nIngest result: {result}")
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
