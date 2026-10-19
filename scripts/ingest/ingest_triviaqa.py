"""Resumable TriviaQA Unfiltered ingest into the bank.

Pipeline per run: exact-dedup (dedup_hash) + semantic gate vs the bank -> Gemini
classify (category/subcategory) -> deterministic + Gemini facet tags -> insert.

Designed to run in CHUNKS across Gemini quota windows: `--limit N` caps how many
are ingested per run, and re-running skips everything already ingested (by
dedup_hash), so you can run it daily until the ~98K are in. `--dry` validates the
no-Gemini part (load + dedup + gate) and writes nothing.

    uv run python -m scripts.ingest.ingest_triviaqa --dry --limit 50       # preview, no Gemini
    uv run python -m scripts.ingest.ingest_triviaqa --limit 2000           # ingest a chunk (needs Gemini)
    uv run python -m scripts.ingest.ingest_triviaqa --limit 2000 --export  # + rebuild bank.json + snapshot

TriviaQA Q+A are read from the staged extract at library/trivia_library.duckdb.
"""
from __future__ import annotations

import argparse
import time
import uuid
from pathlib import Path

import duckdb

from scripts.ingest._common import DEFAULT_DB, dedup_hash, fallback_cat_sub
from scripts.ingest.classify_topics_gemini import BATCH, classify_batch, gemini_key, load_taxonomy
from scripts.ingest.tag_questions_gemini import ERA_SLUGS, deterministic_era, tag_batch

REPO = Path(__file__).resolve().parents[2]
LIBRARY_DB = REPO / "library" / "trivia_library.duckdb"
SOURCE = "triviaqa"
QUALITY = 0.6  # web-scraped + unverified; below the vetted sources


def load_candidates(con, limit):
    lib = duckdb.connect(str(LIBRARY_DB), read_only=True)
    rows = lib.execute(
        "SELECT question, answer, aliases FROM questions "
        "WHERE source LIKE 'triviaqa%' AND question IS NOT NULL AND answer IS NOT NULL"
    ).fetchall()
    lib.close()
    cand, seen = [], set()
    for q, a, al in rows:
        h = dedup_hash(q)
        if h in seen:
            continue
        seen.add(h)
        cand.append({"q": q, "a": a or "", "aliases": [x for x in (al or "").split("|") if x], "hash": h})
    # skip anything already in the bank (exact + resumable)
    existing = set()
    hashes = [c["hash"] for c in cand]
    for s in range(0, len(hashes), 5000):
        chunk = hashes[s:s + 5000]
        existing |= {r[0] for r in con.execute(
            "SELECT dedup_hash FROM question WHERE dedup_hash = ANY(?)", [chunk]).fetchall()}
    cand = [c for c in cand if c["hash"] not in existing]
    return cand[:limit] if limit else cand


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=2000, help="max to ingest this run (0 = all)")
    ap.add_argument("--dry", action="store_true", help="load + dedup + gate only; no Gemini, no writes")
    ap.add_argument("--threshold", type=float, default=0.90)
    ap.add_argument("--export", action="store_true", help="rebuild bank.json + snapshot after insert")
    args = ap.parse_args()

    con = duckdb.connect(str(DEFAULT_DB))
    cand = load_candidates(con, args.limit)
    print(f"TriviaQA candidates after exact-dedup vs bank: {len(cand)}")
    if not cand:
        print("nothing new to ingest.")
        return 0

    bank_texts = [r[0] for r in con.execute(
        "SELECT question_text FROM question WHERE question_text IS NOT NULL").fetchall()]
    from scripts.ingest.dedup_gate import gate
    keep_idx, leak, within = gate([c["q"] for c in cand], bank_texts, args.threshold)
    cand = [cand[i] for i in keep_idx]
    print(f"after semantic gate: {len(cand)} keep ({len(leak)} leakage, {len(within)} within-dup dropped)")

    if args.dry:
        print("\n--- DRY: sample of what would be ingested ---")
        for c in cand[:8]:
            print(f"  Q: {c['q'][:58]}   A: {c['a'][:28]}")
        print("\n(no Gemini called, no writes. Drop --dry after the quota resets to ingest.)")
        return 0

    key = gemini_key()
    pairs, listing = load_taxonomy(con)
    tag_id = {slug: tid for slug, tid in con.execute("SELECT slug, id FROM tag").fetchall()}
    fb_cat, fb_sub = fallback_cat_sub(con)
    rows, tag_assign = [], []

    for start in range(0, len(cand), BATCH):
        chunk = cand[start:start + BATCH]
        cbatch = [(i, c["q"], c["a"]) for i, c in enumerate(chunk)]
        try:
            cres = classify_batch(key, listing, cbatch)
        except Exception as e:
            print(f"  ! classify @{start}: {e}")
            cres = {}
        try:
            tres = tag_batch(key, cbatch)
        except Exception as e:
            print(f"  ! tag @{start}: {e}")
            tres = {}
        for i, c in enumerate(chunk):
            qid = str(uuid.uuid4())
            cat, sub = cres.get(i, (None, None))
            cid, sid = pairs.get((cat, sub), (fb_cat, fb_sub))
            rows.append({
                "id": qid, "source": SOURCE, "source_id": f"tqa-{c['hash'][:12]}", "source_url": None,
                "question_text": c["q"], "answer_text": c["a"], "answer_aliases": c["aliases"],
                "category_id": cid, "subcategory_id": sid, "difficulty": "medium",
                "question_type": "open_ended", "options_json": None, "time_sensitive": False,
                "low_confidence": (cat, sub) not in pairs, "dedup_hash": c["hash"], "quality_score": QUALITY,
            })
            det = deterministic_era(f"{c['q']} {c['a']}")
            tags = [t for t in tres.get(i, []) if t in tag_id]
            if det:
                tags = [t for t in tags if t not in ERA_SLUGS] + [det]
            for t in set(tags):
                tag_assign.append((qid, tag_id[t]))
        print(f"  ...{min(start + BATCH, len(cand))}/{len(cand)}")
        time.sleep(0.4)

    import polars as pl
    con.register("stg", pl.DataFrame(rows).to_arrow())
    con.execute("""
        INSERT INTO question (id, source, source_id, source_url, question_text, answer_text,
            answer_aliases, category_id, subcategory_id, difficulty, question_type, options_json,
            time_sensitive, low_confidence, dedup_hash, quality_score)
        SELECT id::UUID, source, source_id, source_url, question_text, answer_text,
            answer_aliases, category_id, subcategory_id, difficulty, question_type, options_json,
            time_sensitive, low_confidence, dedup_hash, quality_score FROM stg
    """)
    con.unregister("stg")
    for qid, tid in tag_assign:
        con.execute("INSERT INTO question_tag (question_id, tag_id) VALUES (?::UUID, ?) ON CONFLICT DO NOTHING",
                    [qid, tid])
    print(f"\ninserted {len(rows)} questions + {len(tag_assign)} tag assignments.")
    con.close()

    if args.export:
        import subprocess
        subprocess.run(["uv", "run", "python", "-m", "scripts.ingest.export_json"], cwd=REPO)
        subprocess.run(["uv", "run", "python", "-m", "scripts.ingest.snapshot"], cwd=REPO)
    else:
        print("next: uv run python -m scripts.ingest.export_json && uv run python -m scripts.ingest.snapshot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
