# How trivia generation works (Game Gen, Wildcard, and the AI skill)

Authoritative note on how rounds get created in this project, because PLAN.md's
older description (Game Gen = web-search generation, bank-pull "not started") no
longer matches the code. Verified against the source 2026-10-19.

## The short version

There are **two in-app generation modes, and both pull from the local question
bank, no live LLM**. They are thin front-ends over one shared engine. A separate
Claude Code skill (`/game-gen`) is the only path that generates brand-new
questions with an LLM, and it is an external manual tool, not the in-app flow.

```
                 ┌─────────────────────────────┐
  Wildcard  ───▶ │  bank-generate.ts           │ ───▶ /api/wildcard/topic ──▶ question bank
 (host picks)    │  (shared bank -> quiz engine)│      (resolve topic + pull)   (trivia.duckdb)
  Game Gen  ───▶ │                             │
 (teams pick)    └─────────────────────────────┘ ───▶ GeneratedRounds + tiebreaker ──▶ Quiz JSON ──▶ Presenter

  /game-gen skill (Claude Code, web search) ──▶ fresh Quiz JSON file  [separate, manual, LLM]
```

## The shared bank engine

`web/src/lib/bank-generate.ts` is the one place round assembly lives. Its own
header: "Both Wildcard (host-driven) and Game Gen (team-driven) are thin
front-ends over this: pick a set of round topics, pull questions for each from the
bundled question bank (`/api/wildcard/topic`), and assemble GeneratedRounds plus a
hard tiebreaker." Keeping it shared stops the two pages from drifting apart.

### How a topic becomes questions (`/api/wildcard/topic`)

`web/src/app/api/wildcard/topic/route.ts` + `web/src/lib/bank/queries.ts`:

1. `salientTopic(topic)` extracts the distinctive term ("Marvel movies" -> "marvel").
2. `resolveTopic()` maps it to a (category, subcategory) by exact slug, token
   overlap, or fuzzy match against the bank's taxonomy.
3. `pickQuestions()` pulls with a fallback chain (returns first non-empty):
   subcategory + topic-text filter -> category + topic-text filter -> subcategory
   broad -> category broad -> fuzzy LIKE across the bank -> empty + a clear "no
   questions match" warning. Widening past the topic filter surfaces a warning.
4. Returns N (default 8) questions per pick, **all from the bank, no LLM**.
   Supports `excludeIds` (dedup), `difficulty`, `allowTimeSensitive`.

## The two in-app modes

- **Wildcard** (`/wildcard`, `web/src/app/wildcard/page.tsx`) is the main
  live-trivia mode: the host types audience-shouted topics or clicks category
  tiles, builds 6 picks (8 questions each), generates, previews, presents. Fully
  bank-backed. Detailed host walkthrough in `end-to-end-flow.md`.
- **Game Gen** (`/game-gen`, `web/src/app/game-gen/page.tsx`, session logic in
  `web/src/lib/game-gen.ts`) is team-driven: teams register and each picks 3-5
  topics, the topics are aggregated/ranked into a round plan, and rounds are
  filled from the bank via the same engine. Session state persists in
  localStorage like the scorekeeper.

## The AI skill (separate, LLM)

The `/game-gen` **Claude Code skill** (lives in `~/.claude/skills`, not this repo)
generates fresh questions via web search and emits a standard Quiz JSON file you
load into the Presenter. Use it when you want brand-new questions that are not in
the bank. It is distinct from the in-app "Game Gen" mode above (which is
bank-backed); they unfortunately share a name.

## Output + bank

- **Output schema:** a standard Quiz JSON (`quiz_number`, `rounds[]` with
  `round_type` standard | progressive | video, `questions[]`, `mini_games`,
  tiebreaker). It loads directly into the Presenter and is what gets saved /
  published.
- **The bank:** `trivia.duckdb` (schema + multi-source ingest in
  `question-bank.md`), exported to a committed `bank.json` and read by the app.
  The query layer is `web/src/lib/bank/queries.ts` + `web/src/lib/bank/duck.ts`
  (read-only singleton).

## Implication for the Pyaar Trivia Library round-builder

Because topic -> bank -> round assembly already exists (the engine above), the
round-builder's ASSEMBLE mode largely reuses `bank-generate.ts` /
`/api/wildcard/topic`. The genuinely new work is: (1) ingesting more sources
(TriviaQA, NYC League) into the bank so there is more to pull, (2) REPLICATE a
stored full round (the engine assembles by topic, it does not replay a known
round), and (3) the music-link path. See `pyaar-trivia-library-SPEC.md`.
