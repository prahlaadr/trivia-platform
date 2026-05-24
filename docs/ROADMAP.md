# Roadmap

Where the Pyaar Project Trivia platform stands, what to work on next, and
how to pick what to tackle when you sit down for a session.

**Last session:** 2026-05-24 (video-games split + Pub Quiz docx ingest)
**Live at:** https://trivia.pyaarproject.org

---

## How to use this doc

Open it at the start of any new session. Pick from the **"Next up"** list
based on how much time you have and what kind of work you feel like doing.
Each item has an effort tag (S = <1hr, M = 1-3hr, L = half-day, XL = day+)
and an impact tag (host UX / content quality / architecture).

Then ask the assistant: **"Let's do `<item title>` from the ROADMAP."** —
the assistant will read this doc, find the entry, and pick up from there.

---

## Current state (snapshot)

- **19,101 questions** across 16 categories / 55 subcategories
- 4 sources: r-trivia (13,454), opentdb (5,203), dirty-south (444 — your
  own Pub Quiz docs), manual (0)
- DuckDB local ingest pipeline; runtime serves from `web/.bank/bank.json`
- Wildcard mode live; Generate from category tiles + free-text topics
- T/F questions are auto-prefixed `T/F:` so the host knows it's a verdict
- Cream + Madder slide rhythm; question slides cream, answer reveals
  same bg with a full-width Madder banner stamping the answer
- Flag-question button in Presenter writes verdicts to localStorage
- Out of Pocket Mode (Alex Dou pitch deck) lives at `/out-of-pocket`,
  untouched by Pyaar branding

---

## Next up — pick one

### 🎯 Pub Quiz Library (M–L, host UX)
**Why:** Your 14 Dirty South quizzes are parsed and sitting in the bank
as individual questions, but they were *designed* as themed rounds with
connection puzzles, mini-games, intros that explain mechanics. Picking
them as random Wildcard questions strips that context and turns them
into nonsense (the "Heart, Death, Eyes, Fire" incident).

**Right now:** `source='dirty-south'` is excluded from random Wildcard
picks. It still surfaces if you type a specific topic.

**To finish:** Surface the parsed Quiz JSONs as standalone selectable
quizzes in the homepage QuizList. Host clicks "Quiz #582" and presents
the whole 6-round quiz in original order with theme descriptions,
connection-round intros, and mini-games intact.

**Tasks:**
1. Decide where parsed Quiz JSONs live (suggest: `web/public/data/dirty-south/quiz-NNN.json` with a `.gitignore` exception so they're tracked)
2. Run the existing `parse_pub_quiz_docx.ts` over all 14 .docx files
3. Extend `/api/parse-all` (or add a sibling) to also surface these JSONs
4. QuizList already renders any quiz the API returns — should appear automatically
5. Verify the round_type + theme_description fields render in the Presenter

**Optional bonus:** Allow random Wildcard to mix WHOLE round-units from
Dirty South (not individual questions) for hybrid play.

---

### 🧹 History keyword rule reinforcement (S, content quality)
**Why:** `history` is the bank's biggest category (4,234 questions) but
**90%+ sit on the catchall `modern-history` subcat.** Audience-yelled
topics like "WW2", "Cold War", "Roman Empire" do resolve correctly via
their exact subcategory match — but a random history round samples
mostly modern-history because that's where the mass is. More aggressive
keyword rules would push e.g., questions mentioning "Caesar" or "Magna
Carta" into `ancient-medieval`, and "Hiroshima" or "Stalingrad" into
`world-wars-cold-war`.

**To do:**
1. Sample 30 random questions from `history/modern-history`
2. Identify recurring patterns that should move to the other two subcats
3. Add 5-10 keyword rules to `scripts/ingest/_taxonomy/keyword_rules.yaml`
4. Run `uv run python -m scripts.ingest.reclassify`, then `export_json` + `snapshot`
5. Push

Pattern: same as the audit-driven reclassify we did for video-games.

---

### 🗂 Film & TV subcategory split (S, content quality, lower urgency)
**Why:** `film-tv/hollywood` catchall holds 55% of the category. Worth
splitting into `tv-comedy` vs `tv-drama` vs `reality-tv` for the audience
member who yells "Friends" vs "Breaking Bad" vs "The Bachelor".

**To do:** Add subcats + keyword rules. Same pattern as history above.

---

### 📚 Pushshift Academic Torrents ingest (L, content quantity)
**Why:** 50K–100K new questions after dedupe against existing bank.
Bulk lift from r/trivia + r/pubquiz + r/quizzes via the Academic Torrents
40K-subreddit Pushshift mirror (Jun 2005 – Dec 2024).

**The catch:** It's a torrent download. The user needs to handle the
torrent client. Then we parse + dedup.

**To do:**
1. Download the relevant subreddit ndjson from Academic Torrents
2. Write `scripts/ingest/ingest_pushshift.py` to parse + dedup against
   existing bank by hash
3. Apply length filter (≥80 chars) at ingest so we keep the pub-quiz-style
   long-form questions and skip the trash
4. Reclassify, snapshot, export, push

Source: <https://academictorrents.com/details/1614740ac8c94505e4ecb9d88be8bed7b6afddd4>

---

### 🇮🇳 Wikidata SPARQL for Bollywood / cricket / Indian content (XL, content gap)
**Why:** The bank has **0 Bollywood questions**. r-trivia and OpenTDB
have basically no Indian-content trivia. Wikidata is CC0 and can be
SPARQL-queried to generate factual Q/A pairs (e.g., "Who directed
*Lagaan*?" — query Wikidata for `director_of(Lagaan)`).

**To do:**
1. Write 4-6 SPARQL queries (Bollywood films 1990–present with their
   director, year, genre; major Indian music artists and notable albums;
   IPL season winners; famous cricketers and their highest scores)
2. Convert query results to Q/A pairs with templates
3. Hash-dedup + insert with `source='wikidata'`, quality_score 0.8

Half-day to a full day depending on how many query patterns you write.

---

### 🚩 Flag-question feedback → bank refresh (M, quality loop)
**Why:** The 🚩 button in the Presenter writes verdicts to localStorage.
Right now those flags die when you clear browser data. They should
feed back into the bank.

**To do:**
1. Add `/api/bank/feedback` POST route that accepts the localStorage
   payload + persists it to a JSONL log (or Vercel Blob)
2. Add an admin script `scripts/ingest/apply_feedback.py` that reads
   the log, adjusts `quality_score` per verdict, soft-deletes
   `wrong_answer`+`offensive` flags
3. Add a "Sync flags" button in the Presenter that POSTs the local
   queue

---

### 🌫 Bank grew, time to move off git-tracked .duckdb (S, ops)
**Why:** Right now `web/.bank/bank.json` (~7.6MB) is committed. Fine
for now. When it grows past ~30MB it'll start to feel painful in git
diffs and PR reviews. Pre-emptive fix: move it to Vercel Blob with a
`prebuild` step that downloads it.

**Trigger:** When bank.json > 30MB.

---

### 📊 Trivia host telemetry (M, ops)
**Why:** You're the only host running games right now. Once others
start hosting — or once you want data on which questions/categories
are actually getting played — we need a thin analytics layer.

**To do:**
1. Add a `/api/bank/event` POST route (game generated, question shown,
   question flagged, game ended)
2. Append to a JSONL log
3. Weekly aggregation script

Don't bother until there's actually a reason. Right now this is YAGNI.

---

## Recently shipped (for context)

- 2026-05-24: Video Games split into its own top-level (16 categories
  total); 1,209 questions migrated; 4 video-game subcats with refined
  rules (nintendo / playstation-xbox / pc-indie / retro-arcade)
- 2026-05-24: T/F prefix auto-added to true/false questions
- 2026-05-24: Length-bias the picker; ingested 14 Dirty South Pub Quiz
  .docx files (+444 questions, quality_score 0.85)
- 2026-05-23: Audit-driven reclassify; 71 cross-category rules
- 2026-05-23: Wildcard refactor; ingest pipeline (r-trivia + OpenTDB);
  DuckDB → JSON runtime; Vercel deploy unblocked
- 2026-05-23: Pyaar Project rebrand (Kasavu cream / Madder / Karma +
  General Sans fonts); slide rhythm flipped
- 2026-05-22: Out of Pocket Mode shipped (Alex Dou pitch deck)
- 2026-05-22: Trivia Platform renamed from Dirty South Trivia

For finer detail see `CHANGELOG.md` in the repo root.

---

## Companion docs

- [`docs/end-to-end-flow.md`](./end-to-end-flow.md) — what a host actually does at a game
- [`docs/category-taxonomy.md`](./category-taxonomy.md) — canonical 16 categories × 55 subcats
- [`docs/question-bank.md`](./question-bank.md) — schema + ingest pipeline spec
- `CHANGELOG.md` (repo root) — every ingest snapshot
