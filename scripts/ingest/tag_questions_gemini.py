"""Tag questions with FACET tags (era / region / audience / flags), to fix the
~12% tag coverage. Two stages:

  Stage 1 (deterministic, free, exact): an explicit year in the Q/A text ->
    the matching era tag. Regex beats an LLM at reading a literal year.
  Stage 2 (Gemini, gemini-2.5-flash): topic-driven facets the text does not
    state outright -> region of the subject, audience rating, flags, and era
    when the subject's period is known but no year is written.

Facet tags are ORTHOGONAL to the topic category; most questions get 0-3.
Precision-first: only assign a tag that clearly applies.

Preview-first, mirroring classify_topics_gemini.py: a default run proposes +
prints samples and writes NOTHING. Pass --apply to write question_tag rows
(ON CONFLICT DO NOTHING), then rebuild bank.json (export_json) + snapshot.

Usage:
    uv run python -m scripts.ingest.tag_questions_gemini --limit 30        # sample preview (accuracy check)
    uv run python -m scripts.ingest.tag_questions_gemini --source r-trivia # one source
    uv run python -m scripts.ingest.tag_questions_gemini --apply           # write + export + snapshot
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import duckdb
import httpx

from scripts.ingest._common import DEFAULT_DB
from scripts.ingest.classify_topics_gemini import MODEL, gemini_key

BATCH = 20

ERA_SLUGS = {"pre-1900", "1900-1950", "60s", "70s", "80s", "90s", "2000s", "2010s", "2020s"}

# Prompt guidance per facet (the quality lever: clear boundaries).
FACET_GUIDE = """ERA (the period the subject/answer is from; assign AT MOST ONE, only with a clear
time anchor; leave empty for timeless facts like geography, basic science, math):
  pre-1900, 1900-1950, 60s, 70s, 80s, 90s, 2000s, 2010s, 2020s

REGION (the cultural/geographic origin of the subject; assign if clearly tied to a
place; prefer the specific region over 'global'; 'global' only for universally shared):
  africa, asia, eu, india, latam, mena, oceania, uk, us, global

AUDIENCE:
  nerd   = niche / specialist / hard (needs expert knowledge)
  adult  = mature themes (sex, graphic violence, hard drugs)
  family = ONLY for explicitly child-oriented content (kids' shows, nursery rhymes).
           Do NOT tag ordinary all-ages trivia, that is the untagged default.

FLAGS (assign only when clearly true; leave empty for ordinary questions):
  nsfw           = explicit or offensive content
  opinion        = the answer is subjective or contested
  requires-image = the question needs a visual to work
  time-sensitive = the correct answer changes over time ("current / reigning / latest")
  us-centric     = a GLOBAL topic framed from a US-default viewpoint (e.g. "the World
                   Series"). Do NOT use for questions genuinely ABOUT the US (use region 'us').
  low-confidence = you are unsure the question's answer or placement is right"""


def deterministic_era(text: str) -> str | None:
    """Single era slug if the text's explicit year(s) land in ONE era, else None."""
    years = [int(y) for y in re.findall(r"\b(1\d{3}|20[0-2]\d)\b", text) if 1000 <= int(y) <= 2029]
    if not years:
        return None
    eras = set()
    for y in years:
        if y < 1900:
            eras.add("pre-1900")
        elif y < 1960:
            eras.add("1900-1950")
        elif y < 1970:
            eras.add("60s")
        elif y < 1980:
            eras.add("70s")
        elif y < 1990:
            eras.add("80s")
        elif y < 2000:
            eras.add("90s")
        elif y < 2010:
            eras.add("2000s")
        elif y < 2020:
            eras.add("2010s")
        else:
            eras.add("2020s")
    return next(iter(eras)) if len(eras) == 1 else None


def tag_batch(key: str, batch: list[tuple]) -> dict[int, list[str]]:
    items = "\n".join(f"{i}. Q: {q}  A: {a}" for i, q, a in batch)
    prompt = (
        "You are a trivia librarian. For each question assign ALL applicable FACET "
        "tags from the lists below (facets are orthogonal to the topic). Most "
        "questions get 0-3. BE PRECISE: only assign a tag that clearly applies, and "
        "prefer FEWER tags over wrong ones. Use the exact slugs.\n\n"
        f"{FACET_GUIDE}\n\nQuestions:\n{items}\n\n"
        'Return ONLY a JSON array: [{"i": <number>, "tags": ["<slug>", ...]}]. '
        "Empty list if none clearly apply."
    )
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    for attempt in range(4):
        r = httpx.post(url, headers={"x-goog-api-key": key}, json=body, timeout=60)
        if r.status_code == 200:
            break
        if r.status_code in (429, 503) and attempt < 3:
            time.sleep(1.5 * 2 ** attempt)
            continue
        raise RuntimeError(f"Gemini {r.status_code}: {r.text[:160]}")
    text = "".join(p.get("text", "") for p in r.json()["candidates"][0]["content"]["parts"])
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return {int(row["i"]): [str(t) for t in (row.get("tags") or [])] for row in json.loads(text)}


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--source", default=None, help="limit to one source (default: all)")
    p.add_argument("--limit", type=int, default=0, help="cap questions (for a quick sample)")
    p.add_argument("--apply", action="store_true", help="write question_tag + export_json + snapshot")
    args = p.parse_args()

    key = gemini_key()
    con = duckdb.connect(str(args.db))
    tag_id = {slug: tid for slug, tid in con.execute("SELECT slug, id FROM tag").fetchall()}
    valid = set(tag_id)

    where, params = "", []
    if args.source:
        where, params = "WHERE source = ?", [args.source]
    rows = con.execute(
        f"SELECT id, question_text, answer_text FROM question {where} ORDER BY id", params
    ).fetchall()
    if args.limit:
        rows = rows[: args.limit]
    print(f"Tagging {len(rows)} questions with {MODEL} (deterministic era + Gemini facets) ...")

    assignments: list[tuple[str, int]] = []   # (qid, tag_id)
    tag_counts: dict[str, int] = {}
    samples: list[str] = []
    invalid = 0

    for start in range(0, len(rows), BATCH):
        chunk = rows[start:start + BATCH]
        batch = [(i, r[1], r[2] or "") for i, r in enumerate(chunk)]
        try:
            gem = tag_batch(key, batch)
        except Exception as e:
            print(f"  ! batch @ {start} failed: {e}", file=sys.stderr)
            gem = {}
        for i, r in enumerate(chunk):
            qid, qtext, atext = r
            det = deterministic_era(f"{qtext} {atext or ''}")
            tags = [t for t in gem.get(i, []) if t in valid]
            # single era: the exact deterministic one wins over any Gemini era
            if det:
                tags = [t for t in tags if t not in ERA_SLUGS]
                tags.append(det)
            tags = sorted(set(tags))
            for t in gem.get(i, []):
                if t not in valid:
                    invalid += 1
            for t in tags:
                assignments.append((qid, tag_id[t]))
                tag_counts[t] = tag_counts.get(t, 0) + 1
            if tags and len(samples) < 25:
                samples.append(f"  {qtext[:60]:62s} -> {', '.join(tags)}"
                               + (f"  [era={det} det]" if det else ""))
        print(f"  ...{min(start + BATCH, len(rows))}/{len(rows)}")
        time.sleep(0.4)

    tagged_qs = len({a[0] for a in assignments})
    print(f"\nProposed: {len(assignments)} tag assignments across {tagged_qs}/{len(rows)} questions "
          f"({100*tagged_qs//max(1,len(rows))}%). {invalid} invalid slugs dropped.")
    print("\nSamples:")
    print("\n".join(samples))
    print("\nTag distribution (proposed):")
    for t, n in sorted(tag_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {t:16s} {n}")

    if not args.apply:
        print("\npreview only. Re-run with --apply to write question_tag, then export_json + snapshot.")
        return 0

    con.execute("BEGIN")
    for qid, tid in assignments:
        con.execute("INSERT INTO question_tag (question_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    [qid, tid])
    con.execute("COMMIT")
    con.close()
    print(f"\napplied {len(assignments)} tag assignments. Now run:")
    print("  uv run python -m scripts.ingest.export_json && uv run python -m scripts.ingest.snapshot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
