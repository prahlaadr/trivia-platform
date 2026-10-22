"""Ingest The Trivia API (the-trivia-api.com) into the bank.

These questions are already vetted, categorized, tagged, and multiple-choice, so
this needs NO Gemini: map their 10 categories to the bank's taxonomy, dedup
(exact dedup_hash + semantic gate vs the bank), insert. The v2 API serves RANDOM
questions (no bulk export), so we pull pages and dedup by their id until we reach
the target unique count or draws stop yielding anything new.

License: CC BY-NC 4.0 (non-commercial, attribution). Attribute The Trivia API on
the site if these questions are shown.

    uv run python -m scripts.ingest.ingest_trivia_api --target 3000           # pull + preview, no writes
    uv run python -m scripts.ingest.ingest_trivia_api --target 3000 --apply   # + insert + export + snapshot
"""
from __future__ import annotations

import argparse
import json
import time
import uuid
from pathlib import Path

import duckdb
import httpx

from scripts.ingest._common import DEFAULT_DB, dedup_hash

REPO = Path(__file__).resolve().parents[2]
SOURCE = "trivia-api"
QUALITY = 0.8  # vetted + reviewed; above opentdb/triviaqa, near the pub-quiz docs
API = "https://the-trivia-api.com/v2/questions?limit=50"

# their category -> (bank category slug, bank catchall subcategory slug)
CAT_MAP = {
    "music": ("music", "rock-pop"),
    "film_and_tv": ("film-tv", "hollywood"),
    "arts_and_literature": ("literature", "classics-poetry-theatre"),
    "history": ("history", "modern-history"),
    "society_and_culture": ("politics-society", "leaders-world"),
    "science": ("science-nature", "animals-plants-earth"),
    "geography": ("geography", "countries-capitals-flags"),
    "food_and_drink": ("food-drink", "world-cuisines"),
    "sport_and_leisure": ("sport", "american-sports"),
    "general_knowledge": ("pop-misc", "general-knowledge"),
}


def pull_unique(target: int, max_pages: int, pause: float, known: set | None = None) -> list[dict]:
    """Pull random pages, keep only ids not already in `known`, until `target`
    NEW unique are collected or draws stop yielding new ones (API exhausted)."""
    known = known or set()
    seen: dict[str, dict] = {}
    pages = stale = 0
    while len(seen) < target and pages < max_pages and stale < 25:
        try:
            r = httpx.get(API, timeout=30)
            if r.status_code != 200:
                time.sleep(2.0)
                stale += 1
                continue
            batch = r.json()
        except Exception:
            time.sleep(2.0)
            continue
        before = len(seen)
        for q in batch:
            if q["id"] not in known:
                seen[q["id"]] = q
        pages += 1
        stale = stale + 1 if len(seen) == before else 0
        if pages % 10 == 0:
            print(f"  ...{pages} pages, {len(seen)} new unique")
        time.sleep(pause)
    return list(seen.values())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--target", type=int, default=3000, help="unique questions to pull")
    ap.add_argument("--max-pages", type=int, default=200)
    ap.add_argument("--pause", type=float, default=0.4, help="seconds between API calls")
    ap.add_argument("--threshold", type=float, default=0.90)
    ap.add_argument("--apply", action="store_true", help="insert + export_json + snapshot")
    args = ap.parse_args()

    con = duckdb.connect(str(DEFAULT_DB))
    known = {r[0] for r in con.execute(
        "SELECT source_id FROM question WHERE source = ? AND source_id IS NOT NULL", [SOURCE]).fetchall()}
    print(f"pulling from The Trivia API (target {args.target} NEW; {len(known)} already in bank)...")
    raw = pull_unique(args.target, args.max_pages, args.pause, known)
    print(f"pulled {len(raw)} new unique questions")

    cat_id = {s: i for s, i in con.execute("SELECT slug, id FROM category").fetchall()}
    sub_id = {s: i for s, i in con.execute("SELECT slug, id FROM subcategory").fetchall()}

    # build candidate rows, exact-dedup within pull + vs bank
    seen_hashes = set()
    cand = []
    skipped_cat = 0
    for q in raw:
        cat = q.get("category")
        if cat not in CAT_MAP:
            skipped_cat += 1
            continue
        qtext = q["question"]["text"] if isinstance(q.get("question"), dict) else q.get("question")
        ans = q.get("correctAnswer")
        if not qtext or not ans:
            continue
        h = dedup_hash(qtext)
        if h in seen_hashes:
            continue
        seen_hashes.add(h)
        cslug, sslug = CAT_MAP[cat]
        choices = list(q.get("incorrectAnswers", [])) + [ans]
        cand.append({
            "id": str(uuid.uuid4()), "source": SOURCE, "source_id": q.get("id"),
            "source_url": "https://the-trivia-api.com",
            "question_text": qtext, "answer_text": ans, "answer_aliases": [],
            "category_id": cat_id[cslug], "subcategory_id": sub_id[sslug],
            "difficulty": q.get("difficulty") or "medium",
            "question_type": "multiple_choice", "options_json": json.dumps(choices),
            "time_sensitive": False, "low_confidence": False,
            "dedup_hash": h, "quality_score": QUALITY,
        })

    # drop ones already in the bank (exact)
    existing = set()
    hashes = [c["dedup_hash"] for c in cand]
    for s in range(0, len(hashes), 5000):
        existing |= {r[0] for r in con.execute(
            "SELECT dedup_hash FROM question WHERE dedup_hash = ANY(?)", [hashes[s:s + 5000]]).fetchall()}
    cand = [c for c in cand if c["dedup_hash"] not in existing]
    print(f"after category-map + exact-dedup vs bank: {len(cand)} new ({skipped_cat} unmapped categories)")

    # semantic gate vs the bank
    bank_texts = [r[0] for r in con.execute(
        "SELECT question_text FROM question WHERE question_text IS NOT NULL").fetchall()]
    from scripts.ingest.dedup_gate import gate
    keep_idx, leak, within = gate([c["question_text"] for c in cand], bank_texts, args.threshold)
    cand = [cand[i] for i in keep_idx]
    print(f"after semantic gate: {len(cand)} keep ({len(leak)} leakage, {len(within)} within-dup)")

    from collections import Counter
    bycat = Counter(c["category_id"] for c in cand)
    id_cat = {i: s for s, i in cat_id.items()}
    print("by category:", {id_cat[k]: v for k, v in sorted(bycat.items(), key=lambda x: -x[1])})
    print("\nsamples:")
    for c in cand[:6]:
        print(f"  [{id_cat[c['category_id']]}/{c['difficulty']}] {c['question_text'][:62]}  ->  {c['answer_text'][:28]}")

    if not args.apply:
        print(f"\npreview only. Re-run with --apply to insert {len(cand)} + export + snapshot.")
        return 0

    import polars as pl
    con.register("stg", pl.DataFrame(cand).to_arrow())
    con.execute("""
        INSERT INTO question (id, source, source_id, source_url, question_text, answer_text,
            answer_aliases, category_id, subcategory_id, difficulty, question_type, options_json,
            time_sensitive, low_confidence, dedup_hash, quality_score)
        SELECT id::UUID, source, source_id, source_url, question_text, answer_text,
            answer_aliases, category_id, subcategory_id, difficulty, question_type, options_json,
            time_sensitive, low_confidence, dedup_hash, quality_score FROM stg
    """)
    con.unregister("stg")
    con.close()
    print(f"\ninserted {len(cand)} questions from The Trivia API.")
    import subprocess
    subprocess.run(["uv", "run", "python", "-m", "scripts.ingest.export_json"], cwd=REPO)
    subprocess.run(["uv", "run", "python", "-m", "scripts.ingest.snapshot"], cwd=REPO)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
