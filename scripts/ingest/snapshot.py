"""Export the trivia bank to date-stamped parquet snapshots + write a CHANGELOG entry.

Parquets are small, columnar, git-friendly. They are the durable, auditable
history of the bank — even when the .duckdb file is gitignored.

Usage:
    uv run python -m scripts.ingest.snapshot
    uv run python -m scripts.ingest.snapshot --note "After OpenTDB ingest"
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from datetime import date
from pathlib import Path

import duckdb

from scripts.ingest._common import DEFAULT_DB

REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_ROOT = REPO_ROOT / "data" / "bank" / "snapshots"
CHANGELOG = REPO_ROOT / "CHANGELOG.md"

EXPORT_TABLES = ["category", "subcategory", "tag", "question", "question_tag"]


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def export(con: duckdb.DuckDBPyConnection, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    stats = {}
    for tbl in EXPORT_TABLES:
        path = out_dir / f"{tbl}.parquet"
        con.execute(f"COPY (SELECT * FROM {tbl}) TO '{path}' (FORMAT PARQUET)")
        n = con.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        stats[tbl] = {"rows": n, "bytes": path.stat().st_size, "sha256": file_sha256(path)[:16]}
    return stats


def summary(con: duckdb.DuckDBPyConnection) -> dict:
    """Aggregate metrics for the CHANGELOG entry."""
    out = {}
    out["total_questions"] = con.execute("SELECT COUNT(*) FROM question").fetchone()[0]
    out["by_source"] = dict(con.execute(
        "SELECT source, COUNT(*) FROM question GROUP BY 1 ORDER BY 2 DESC"
    ).fetchall())
    out["by_category"] = dict(con.execute("""
        SELECT c.slug, COUNT(*)
        FROM question q JOIN category c ON q.category_id = c.id
        GROUP BY 1 ORDER BY 2 DESC
    """).fetchall())
    out["catchall_pct"] = dict(con.execute("""
        SELECT c.slug,
               ROUND(100.0 * SUM(CASE WHEN s.is_catchall THEN 1 ELSE 0 END) / COUNT(*), 1)
        FROM question q
        JOIN category c ON q.category_id = c.id
        JOIN subcategory s ON q.subcategory_id = s.id
        GROUP BY 1 ORDER BY 1
    """).fetchall())
    out["tag_assignments"] = con.execute("SELECT COUNT(*) FROM question_tag").fetchone()[0]
    out["unique_tags"] = con.execute(
        "SELECT COUNT(DISTINCT tag_id) FROM question_tag"
    ).fetchone()[0]
    return out


def write_changelog_entry(snap_date: date, snap_dir: Path, note: str, stats: dict, summ: dict) -> None:
    entry = [
        f"\n## {snap_date.isoformat()} — Snapshot",
        f"\n_{note}_" if note else "",
        f"\n**Snapshot:** `{snap_dir.relative_to(REPO_ROOT)}`",
        f"\n**Total questions:** {summ['total_questions']:,}",
        f"\n**Tag assignments:** {summ['tag_assignments']:,} ({summ['unique_tags']} distinct tags used)",
        "\n\n### By source",
        "\n| Source | Rows |",
        "\n|---|---:|",
        *[f"\n| {src} | {n:,} |" for src, n in summ["by_source"].items()],
        "\n\n### Catchall % per category (lower is better)",
        "\n| Category | % on catchall |",
        "\n|---|---:|",
        *[f"\n| {c} | {p}% |" for c, p in summ["catchall_pct"].items()],
        "\n\n### Files (rows / bytes / sha256 prefix)",
        "\n| Table | Rows | Bytes | sha256 |",
        "\n|---|---:|---:|---|",
        *[f"\n| {t} | {s['rows']:,} | {s['bytes']:,} | `{s['sha256']}` |" for t, s in stats.items()],
        "\n",
    ]
    content = "".join(entry)

    if CHANGELOG.exists():
        existing = CHANGELOG.read_text()
        # Insert new entry below the H1
        if existing.startswith("# "):
            head, _, rest = existing.partition("\n")
            CHANGELOG.write_text(head + "\n" + content + rest)
        else:
            CHANGELOG.write_text(content + "\n" + existing)
    else:
        CHANGELOG.write_text("# Changelog\n" + content)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--date", default=date.today().isoformat(), help="YYYY-MM-DD (default today)")
    p.add_argument("--note", default="", help="Short note for the changelog entry")
    args = p.parse_args()

    if not args.db.exists():
        print(f"DB not found: {args.db}", file=sys.stderr)
        return 1

    snap_dir = SNAPSHOT_ROOT / args.date
    print(f"DB           : {args.db}")
    print(f"Snapshot dir : {snap_dir}")

    con = duckdb.connect(str(args.db), read_only=True)
    stats = export(con, snap_dir)
    print("\nExported tables:")
    for tbl, s in stats.items():
        print(f"  {tbl:20s}  rows={s['rows']:>8,}  bytes={s['bytes']:>10,}  sha256={s['sha256']}")

    summ = summary(con)
    write_changelog_entry(date.fromisoformat(args.date), snap_dir, args.note, stats, summ)
    print(f"\nCHANGELOG.md updated.")
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
