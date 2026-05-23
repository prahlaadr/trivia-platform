# End-to-End Flow — Pyaar Project Trivia

What this is and how a host actually uses it, after the Phase B quick-wins.

**Live at:** `https://trivia.pyaarproject.org`

---

## The product, one sentence

A live-trivia platform with a vetted 18,657-question bank — host picks
categories or types audience-shouted topics, gets generated rounds in
seconds, presents in the Pyaar Project brand, flags bad questions
mid-game.

---

## What a host does at the table

### 1. Open the homepage → click **Wildcard**

`/` shows three modes: Game Gen (AI-generated quiz, manual flow),
**Wildcard** (the main live-trivia mode), Scorekeeper.

### 2. On `/wildcard`, build a round of 6 picks (each = 8 questions)

Two ways to add picks, mix freely up to 6:

- **Type a topic the audience yelled** in the text input — e.g.
  "Bollywood", "Premier League", "Marvel". Press Enter or click Add
  → appears as a Madder chip with a "topic" badge.
- **Click category tiles** — 15 broad categories (Film & TV, Music,
  Sport, Geography, History, Science & Nature, Food & Drink, Literature,
  Art & Design, Games & Toys, Tech & Internet, Politics & Society,
  Mythology & Religion, Language & Words, Pop Culture & Misc).

You can also hit **Random Wildcard Game** for an instant 6 random
categories.

### 3. Hit **Generate**

For each pick, the API `/api/wildcard/topic` runs:

1. **Resolve the topic** to a (category, subcategory) — by exact slug,
   token overlap, or fuzzy match against the bank.
2. **Pull questions** with this fallback chain:
   - Subcategory match → if 0, widen to parent category → if 0, fuzzy
     LIKE on question + answer text → if still 0, return empty + a
     clear "no questions match" warning.

Returns 8 questions per pick. All from the local bank, no LLM.

### 4. Preview, then Present

The page shows a foldable list of rounds + questions + answers (host
view). Hit **Present →** to open the full-screen Presenter.

### 5. In the Presenter

Slide rhythm:
- **Presenting slides** (round title, question) are Kasavu cream with
  charcoal text + Madder accents
- **Reveal slides** keep the cream bg, but the answer drops in via a
  full-width Madder banner across the slide — visual "stamp" without
  jarring color flips

Toolbar: Prev / Next / counter / Fullscreen / **🚩 Flag**.

The Flag button only appears on slides with a question. Click → 6
verdicts (good / stale / wrong / ambiguous / too-hard / too-easy) →
selection writes to localStorage → small Madder toast confirms. These
flags can be exported later and applied to the bank's quality scores.

Other Presenter goodies:
- **Jump nav** (J) — overlay of every slide by round
- **Scorekeeper** (S) — inline scoring + leaderboard
- Arrow keys / Space / Enter advance

### 6. After the game

- **Save** the generated game (localStorage) so it appears on
  `/wildcard` next time.
- Flagged questions stay in localStorage as `trivia-feedback-v1` for
  later import into the bank.

---

## What's under the hood

### Bank

- **18,657 questions** across 15 categories / 50 subcategories
- DuckDB file at `web/.bank/trivia.duckdb` (~24MB, git-tracked)
- Sources today: r-trivia Reddit scrape (13,454) + OpenTDB (5,203)
- Schema + ingest pipeline documented in [`docs/question-bank.md`](./question-bank.md)
- Taxonomy in [`docs/category-taxonomy.md`](./category-taxonomy.md)

### Read path

- `web/src/lib/bank/duck.ts` — singleton DuckDB connection (read-only)
- `web/src/lib/bank/queries.ts` — typed wrappers + topic resolution
- `web/src/app/api/bank/categories` — GET, returns 15 cats + 50 subs + counts
- `web/src/app/api/wildcard/topic` — POST, returns 8 questions for a topic

### Write path (Phase B follow-ups, not yet wired)

- Flag verdicts live in `localStorage` per host browser
- A future admin route can read these back, apply quality_score deltas,
  and bake a new bank snapshot — see [`docs/question-bank.md`](./question-bank.md)
  feedback section.

### Out of Pocket Mode (separate route, unchanged)

`/out-of-pocket` is the live pitch deck for Alex Dou at Out of Pocket
Health — different brand, different slide templates, doesn't touch
anything in the bank. Lives entirely under `web/src/app/out-of-pocket/`.

---

## How to grow the bank

The bank is the contract — no LLM-generated questions at runtime.
To add coverage:

1. Drop new raw data in `data/bank/raw/<source>.<ext>`.
2. Write `scripts/ingest/ingest_<source>.py` mirroring the r-trivia
   ingester. Add a default mapping in `_common.py`.
3. Run the ingest → run `reclassify.py` → `validate.py` to see
   distribution.
4. `snapshot.py` writes a parquet snapshot + CHANGELOG entry.
5. Commit the new `web/.bank/trivia.duckdb` + parquet snapshot.

Today: r-trivia + OpenTDB. Candidates for next: el-cms/Open-trivia-database
(~17K MIT JSON, multi-language), manual curation for Bollywood / regional
topics where upstream sources are thin.
