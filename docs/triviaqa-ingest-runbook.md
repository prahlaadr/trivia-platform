# TriviaQA ingest runbook

Bring the ~98K TriviaQA Unfiltered Q&A into the bank, de-duped and tagged, in
Gemini-quota-sized chunks. Everything is resumable: re-running skips whatever is
already in the bank (by `dedup_hash`), so you just run it again each day until
it's done.

## Prereqs

- **V3 connected** (`/Volumes/vision 3.0`) only for the one-time extract. Once
  `library/trivia_library.duckdb` exists, ingest reads from it and does not need V3.
- `GEMINI_API_KEY` in `~/Projects/.secrets/secrets.env` (already there).

## The three phases per run

1. **exact-dedup** vs the bank (`dedup_hash`) + within-batch.
2. **semantic gate** (`dedup_gate.py`, model2vec + numpy, no ANN) drops paraphrase
   near-dups of the bank at cosine >= 0.90.
3. **Gemini** classify (category/subcategory) + facet tags (era/region/audience/flags),
   then insert into `question` + `question_tag`.

## Commands

Preview (no Gemini, no writes), safe to run anytime, even with the quota at zero:

```bash
uv run python -m scripts.ingest.ingest_triviaqa --dry --limit 50
```

Ingest a chunk (needs Gemini quota):

```bash
uv run python -m scripts.ingest.ingest_triviaqa --limit 2000
```

Ingest a chunk and rebuild the published artifacts in one go:

```bash
uv run python -m scripts.ingest.ingest_triviaqa --limit 2000 --export
```

Run that last command once per day (or whenever the quota resets). It picks up
where it left off. When a run prints `nothing new to ingest.`, you're done.

If you skip `--export` on a run, finish later with:

```bash
uv run python -m scripts.ingest.export_json && uv run python -m scripts.ingest.snapshot
```

## Gemini budget (the math)

Each question costs **2 Gemini requests** (1 classify + 1 tag), batched 20 per
request. So a chunk of `N` costs about `N / 20 * 2 = N / 10` requests.

| Work | Questions | ~Requests |
|---|---|---|
| Re-tag existing bank (facets) | 19,289 | ~965 |
| Full TriviaQA ingest | ~97,700 net-new | ~9,770 |
| **Total** | | **~10,700** |

Cost is `N / 10` requests per chunk of `N` questions (`N/20` classify + `N/20`
tag). So:

| `--limit` | ~Requests |
|---|---|
| 2,000 | 200 |
| 7,000 | 700 |
| 15,000 | 1,500 (a full free day) |

Free tier for `gemini-2.5-flash` is ~1,500 requests/day (volatile; some accounts
see far less). So one reset is **not** enough for all of TriviaQA. Options:

- **Chunked across days** (default): `--limit 15000` uses a full free day; the
  ~97,700 net-new take about **7 days** of daily runs to finish.
- **Pay as you go** (fastest): enable billing on the key. gemini-2.5-flash is very
  cheap (fractions of a cent per request), so the whole job is roughly $2-5 total.
- Tag the existing 19K bank first (~965 requests, fits in one day), then start
  TriviaQA chunks.

## Order of operations after a reset

1. `uv run python -m scripts.ingest.tag_questions_gemini --apply` (fixes the 12%
   tag coverage on the current bank; ~965 requests, one day).
2. `uv run python -m scripts.ingest.ingest_triviaqa --limit 15000 --export` (repeat
   daily until `nothing new to ingest.`).
