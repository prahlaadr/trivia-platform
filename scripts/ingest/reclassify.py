"""Apply keyword rules to existing questions: reclassify subcategory + add tags.

Re-run any time after editing keyword_rules.yaml. Safe to run repeatedly:
moves rows that match more-specific rules, never removes work.

Usage:
    uv run python -m scripts.ingest.reclassify
    uv run python -m scripts.ingest.reclassify --source r-trivia
    uv run python -m scripts.ingest.reclassify --dry-run
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import duckdb
import yaml

from scripts.ingest._common import DEFAULT_DB

REPO_ROOT = Path(__file__).resolve().parents[2]
RULES_YAML = REPO_ROOT / "scripts" / "ingest" / "_taxonomy" / "keyword_rules.yaml"


def load_rules(path: Path) -> tuple[list[dict], list[dict]]:
    raw = yaml.safe_load(path.read_text())
    sub_rules = raw.get("subcategory_rules", []) or []
    tag_rules = raw.get("tag_rules", []) or []
    # Pre-compile regexes
    for r in sub_rules + tag_rules:
        r["_re"] = re.compile(r["match"], re.IGNORECASE)
    return sub_rules, tag_rules


def load_lookups(con: duckdb.DuckDBPyConnection) -> tuple[dict, dict, dict]:
    """Returns:
        cat_id_by_slug:  {'film-tv': 1, ...}
        sub_id_by_slugs: {('film-tv','bollywood'): 7, ...}
        tag_id_by_pair:  {('region','india'): 12, ...}
    """
    cat_id_by_slug = dict(con.execute("SELECT slug, id FROM category").fetchall())
    sub_id_by_slugs = {
        (cs, ss): sid
        for cs, ss, sid in con.execute(
            """
            SELECT c.slug, s.slug, s.id
            FROM subcategory s JOIN category c ON s.category_id = c.id
            """
        ).fetchall()
    }
    tag_id_by_pair = {(k, s): tid for k, s, tid in con.execute("SELECT kind, slug, id FROM tag").fetchall()}
    return cat_id_by_slug, sub_id_by_slugs, tag_id_by_pair


def reclassify(con: duckdb.DuckDBPyConnection, source: str | None, dry_run: bool) -> dict:
    sub_rules, tag_rules = load_rules(RULES_YAML)
    cat_id_by_slug, sub_id_by_slugs, tag_id_by_pair = load_lookups(con)

    # Pull candidates: question text + answer + current category/subcat
    where = "WHERE q.source = ?" if source else ""
    params = [source] if source else []
    rows = con.execute(
        f"""
        SELECT q.id, q.question_text, q.answer_text,
               c.slug AS cat_slug, s.slug AS sub_slug,
               s.is_catchall AS on_catchall
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        {where}
        """,
        params,
    ).fetchall()

    moved = 0
    tags_added = 0
    updates = []           # list of (new_cat_id, new_sub_id, qid)
    tag_inserts = set()    # set of (qid, tag_id) to insert
    move_log = {}          # {(from_path, to_path): count}

    for qid, qtext, atext, cat_slug, sub_slug, on_catchall in rows:
        haystack = f"{qtext}  {atext}"
        # Subcategory rules — first match wins.
        # Rules may optionally re-route across top-level categories via
        # set_category (combined with set_subcategory).
        for rule in sub_rules:
            if rule.get("if_category") and rule["if_category"] != cat_slug:
                continue
            target_cat_slug = rule.get("set_category") or cat_slug
            new_sub_slug = rule.get("set_subcategory")
            if not new_sub_slug:
                continue
            if rule["_re"].search(haystack):
                if target_cat_slug != cat_slug or new_sub_slug != sub_slug:
                    new_cat_id = cat_id_by_slug.get(target_cat_slug)
                    new_sub_id = sub_id_by_slugs.get((target_cat_slug, new_sub_slug))
                    if new_cat_id is not None and new_sub_id is not None:
                        updates.append((new_cat_id, new_sub_id, qid))
                        moved += 1
                        from_path = f"{cat_slug}/{sub_slug}"
                        to_path = f"{target_cat_slug}/{new_sub_slug}"
                        key = (from_path, to_path)
                        move_log[key] = move_log.get(key, 0) + 1
                # Also pick up any tags from this rule
                for tag_str in rule.get("add_tags", []) or []:
                    kind, slug = tag_str.split(":", 1)
                    tid = tag_id_by_pair.get((kind, slug))
                    if tid is not None:
                        tag_inserts.add((qid, tid))
                break  # first matching subcategory rule wins

        # Tag-only rules — every match contributes
        for rule in tag_rules:
            if rule["_re"].search(haystack):
                for tag_str in rule.get("add_tags", []) or []:
                    kind, slug = tag_str.split(":", 1)
                    tid = tag_id_by_pair.get((kind, slug))
                    if tid is not None:
                        tag_inserts.add((qid, tid))

    if dry_run:
        print(f"[dry-run] would move {moved} questions, add {len(tag_inserts)} tag assignments")
        for (a, b), n in sorted(move_log.items(), key=lambda kv: -kv[1])[:20]:
            print(f"  {a:30s} → {b:30s}  {n:>5}")
        return {"moved": moved, "tags_added": 0, "tag_total": len(tag_inserts)}

    con.execute("BEGIN")
    if updates:
        # Batch UPDATE via a temp table. Per-row UPDATEs trip DuckDB's
        # FK constraint check on question_tag.question_id even though
        # we aren't changing the id.
        con.execute("CREATE OR REPLACE TEMP TABLE pending_moves (qid UUID, cat_id INTEGER, sub_id INTEGER)")
        import pyarrow as pa
        tbl = pa.table({
            "qid": [u[2] for u in updates],
            "cat_id": [u[0] for u in updates],
            "sub_id": [u[1] for u in updates],
        })
        con.register("pending_moves_stage", tbl)
        con.execute("INSERT INTO pending_moves SELECT qid::UUID, cat_id, sub_id FROM pending_moves_stage")
        con.unregister("pending_moves_stage")
        con.execute("""
            UPDATE question
            SET category_id = pm.cat_id, subcategory_id = pm.sub_id
            FROM pending_moves pm
            WHERE question.id = pm.qid
        """)
        con.execute("DROP TABLE pending_moves")

    # Tag UPSERTs
    for qid, tid in tag_inserts:
        con.execute(
            "INSERT INTO question_tag (question_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            [qid, tid],
        )
    tags_added = len(tag_inserts)
    con.execute("COMMIT")

    return {"moved": moved, "tags_added": tags_added, "move_log": move_log}


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--source", default=None, help="Filter by source (e.g. r-trivia)")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if not args.db.exists():
        print(f"DB not found: {args.db}", file=sys.stderr)
        return 1

    con = duckdb.connect(str(args.db))
    result = reclassify(con, args.source, args.dry_run)
    print(f"\nReclassify result: moved={result['moved']}, tags_added={result.get('tags_added',0)}")
    if result.get("move_log"):
        print("\nTop moves (catchall → specific):")
        for (a, b), n in sorted(result["move_log"].items(), key=lambda kv: -kv[1])[:25]:
            print(f"  {a:30s} → {b:30s}  {n:>5}")
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
