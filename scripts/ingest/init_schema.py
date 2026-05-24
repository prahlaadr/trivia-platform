"""Initialize the trivia bank DuckDB schema and seed the canonical taxonomy.

Idempotent: safe to re-run. Drops nothing; CREATE TABLE IF NOT EXISTS and
UPSERTs the taxonomy rows.

Usage:
    uv run python -m scripts.ingest.init_schema
    uv run python -m scripts.ingest.init_schema --db path/to/custom.duckdb

Verify:
    SELECT COUNT(*) FROM category;       -- 15
    SELECT COUNT(*) FROM subcategory;    -- 50
    SELECT COUNT(*) FROM tag;            -- 28
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO_ROOT / "data" / "bank" / "trivia.duckdb"
TAXONOMY_YAML = REPO_ROOT / "scripts" / "ingest" / "_taxonomy" / "taxonomy.yaml"


SCHEMA_DDL = """
-- Sequences for human-readable PK ids (DuckDB has no auto-increment on INTEGER PK by default)
CREATE SEQUENCE IF NOT EXISTS seq_category_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_subcategory_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_tag_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_feedback_id START 1;

CREATE TABLE IF NOT EXISTS category (
    id          INTEGER PRIMARY KEY DEFAULT nextval('seq_category_id'),
    slug        VARCHAR UNIQUE NOT NULL,
    name        VARCHAR NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    active      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subcategory (
    id          INTEGER PRIMARY KEY DEFAULT nextval('seq_subcategory_id'),
    category_id INTEGER NOT NULL REFERENCES category(id),
    slug        VARCHAR NOT NULL,
    name        VARCHAR NOT NULL,
    is_catchall BOOLEAN DEFAULT FALSE,
    active      BOOLEAN DEFAULT TRUE,
    UNIQUE (category_id, slug)
);

CREATE TABLE IF NOT EXISTS tag (
    id    INTEGER PRIMARY KEY DEFAULT nextval('seq_tag_id'),
    kind  VARCHAR NOT NULL,
    slug  VARCHAR NOT NULL,
    name  VARCHAR NOT NULL,
    UNIQUE (kind, slug)
);

CREATE TABLE IF NOT EXISTS question (
    id              UUID PRIMARY KEY DEFAULT uuid(),
    source          VARCHAR NOT NULL,
    source_id       VARCHAR,
    source_url      VARCHAR,
    question_text   VARCHAR NOT NULL,
    answer_text     VARCHAR NOT NULL,
    answer_aliases  VARCHAR[],
    category_id     INTEGER REFERENCES category(id),
    subcategory_id  INTEGER REFERENCES subcategory(id),
    difficulty      VARCHAR,
    question_type   VARCHAR,
    options_json    JSON,
    time_sensitive  BOOLEAN DEFAULT FALSE,
    low_confidence  BOOLEAN DEFAULT FALSE,
    dedup_hash      VARCHAR NOT NULL,
    quality_score   REAL DEFAULT 0.5,
    ingested_at     TIMESTAMP DEFAULT now(),
    superseded_by   UUID
);

CREATE INDEX IF NOT EXISTS idx_question_cat
    ON question(category_id, subcategory_id, difficulty);

CREATE INDEX IF NOT EXISTS idx_question_dedup_active
    ON question(dedup_hash);

-- NOTE: no FK on question_id. DuckDB's FK check fires on parent UPDATEs
-- (even ones that don't touch the id), which blocks reclassify when a
-- question already has tag rows. We rely on cleanup-by-convention at
-- ingest/reclassify time instead.
CREATE TABLE IF NOT EXISTS question_tag (
    question_id UUID,
    tag_id      INTEGER REFERENCES tag(id),
    PRIMARY KEY (question_id, tag_id)
);

CREATE TABLE IF NOT EXISTS question_feedback (
    id          INTEGER PRIMARY KEY DEFAULT nextval('seq_feedback_id'),
    question_id UUID REFERENCES question(id),
    verdict     VARCHAR,
    note        VARCHAR,
    session_id  VARCHAR,
    created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topic_resolution (
    raw_topic      VARCHAR PRIMARY KEY,
    category_id    INTEGER,
    subcategory_id INTEGER,
    fts_query      VARCHAR,
    tags           VARCHAR[],
    resolved_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generation_log (
    id           UUID PRIMARY KEY DEFAULT uuid(),
    session_id   VARCHAR,
    topic        VARCHAR,
    tier         INTEGER,
    model        VARCHAR,
    prompt_hash  VARCHAR,
    raw_response JSON,
    created_at   TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingest_run (
    source         VARCHAR PRIMARY KEY,
    last_source_id VARCHAR,
    last_offset    INTEGER,
    rows_added     INTEGER,
    rows_skipped   INTEGER,
    started_at     TIMESTAMP,
    finished_at    TIMESTAMP
);
"""


def init_db(db_path: Path) -> duckdb.DuckDBPyConnection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(db_path))
    con.execute(SCHEMA_DDL)
    return con


def seed_taxonomy(con: duckdb.DuckDBPyConnection, yaml_path: Path) -> tuple[int, int, int]:
    """UPSERTs categories, subcategories, and tags from the YAML.

    Returns (n_categories, n_subcategories, n_tags) seeded.
    """
    data = yaml.safe_load(yaml_path.read_text())

    cat_count = 0
    sub_count = 0
    tag_count = 0

    # Categories
    for cat in data["categories"]:
        # UPSERT by slug
        con.execute(
            """
            INSERT INTO category (slug, name, sort_order)
            VALUES (?, ?, ?)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                sort_order = EXCLUDED.sort_order,
                active = TRUE
            """,
            [cat["slug"], cat["name"], cat["sort_order"]],
        )
        cat_count += 1
        cat_id = con.execute(
            "SELECT id FROM category WHERE slug = ?", [cat["slug"]]
        ).fetchone()[0]

        for sub in cat["subcategories"]:
            con.execute(
                """
                INSERT INTO subcategory (category_id, slug, name, is_catchall)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (category_id, slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    is_catchall = EXCLUDED.is_catchall,
                    active = TRUE
                """,
                [cat_id, sub["slug"], sub["name"], sub.get("is_catchall", False)],
            )
            sub_count += 1

    # Tags
    for kind, items in data["tags"].items():
        for tag in items:
            con.execute(
                """
                INSERT INTO tag (kind, slug, name)
                VALUES (?, ?, ?)
                ON CONFLICT (kind, slug) DO UPDATE SET name = EXCLUDED.name
                """,
                [kind, tag["slug"], tag["name"]],
            )
            tag_count += 1

    return cat_count, sub_count, tag_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--taxonomy",
        type=Path,
        default=TAXONOMY_YAML,
        help="Path to taxonomy.yaml",
    )
    args = parser.parse_args()

    print(f"DB     : {args.db}")
    print(f"Taxonomy: {args.taxonomy}")

    con = init_db(args.db)
    print("Schema initialized.")

    cats, subs, tags = seed_taxonomy(con, args.taxonomy)
    print(f"Seeded: {cats} categories, {subs} subcategories, {tags} tags.")

    # Verify
    n_cat = con.execute("SELECT COUNT(*) FROM category WHERE active").fetchone()[0]
    n_sub = con.execute("SELECT COUNT(*) FROM subcategory WHERE active").fetchone()[0]
    n_tag = con.execute("SELECT COUNT(*) FROM tag").fetchone()[0]
    n_catchall = con.execute(
        "SELECT COUNT(*) FROM subcategory WHERE is_catchall AND active"
    ).fetchone()[0]

    print(f"\nVerification:")
    print(f"  active categories     : {n_cat}  (expected 16)")
    print(f"  active subcategories  : {n_sub}  (expected 55)")
    print(f"  tags                  : {n_tag}  (expected 28)")
    print(f"  catchall subcats      : {n_catchall}  (expected 16, one per category)")

    ok = n_cat == 16 and n_sub == 55 and n_tag == 28 and n_catchall == 16
    if not ok:
        print("\nFAIL: counts don't match expected.", file=sys.stderr)
        return 1
    print("\nOK")
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
