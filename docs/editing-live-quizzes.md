# Editing a live quiz (fixing parser mistakes)

Live quizzes are served from **Vercel Blob** (`quiz_<N>.json`) behind
`https://trivia.pyaarproject.org`. When the docx/pdf parser gets a round wrong,
you fix the JSON in Blob directly — no redeploy needed.

## Repo / deploy facts

- GitHub: `github.com/prahlaadr/trivia-platform` (Vercel project `pyaar-trivia`, auto-deploys from `main`).
- Blob store key per quiz: `quiz_<quiz_number>.json`.
- Present page reads it via `GET /api/quiz?id=<N>` (public, no auth).
- `POST /api/quiz` (publish hand-authored JSON) exists only on branch
  `feat/publish-quiz-endpoint` — **not merged to main, so prod returns 405.**
  Until that branch ships, edit Blob directly (below). Merging it enables the
  clean `curl -X POST .../api/quiz -H "x-admin-pin: <PIN>"` path.

## One-time setup per session

```bash
cd trivia-platform
vercel env pull /tmp/trivia.env --environment=production   # grabs prod BLOB token + ADMIN_PIN
```
The `web/.env.local` Blob token points at a different/stale store and 403s — always use the pulled prod token.

## Fix flow (helper script)

```bash
cd web
node scripts/quiz-blob.mjs pull 618        # -> /tmp/quiz_618.json
# edit /tmp/quiz_618.json — fix the broken round's questions[] (see shape below)
node scripts/quiz-blob.mjs push /tmp/quiz_618.json
# reload https://trivia.pyaarproject.org/present/618
```

## Generating host notes (Gemini + Google Search)

`web/scripts/gen-host-notes.mjs` fills `host_hints` + `fun_facts` on demand, at any
granularity, grounded in live Google Search (facts retrieved, not recalled). It is
**preview-first**: writes `/tmp/quiz_<N>_notes.json` and prints everything for review;
publishes only with `--push`.

```bash
cd web
node scripts/gen-host-notes.mjs --quiz 618                 # whole quiz, only Qs missing notes
node scripts/gen-host-notes.mjs --quiz 618 --round 2       # one round
node scripts/gen-host-notes.mjs --quiz 618 --round 2 --q 3,5   # specific questions
   # --overwrite  redo Qs that already have notes
   # --push       publish to Blob (needs /tmp/trivia.env from `vercel env pull`)
   # --model      Gemini model (default gemini-2.5-flash, free tier)
```

- Key: `GEMINI_API_KEY` from env or `~/Projects/.secrets/secrets.env`.
- Skips internet-only + progressive rounds; video rounds get fun_facts only (no hints).
- Leak-guard: rejects/retries any hint that contains the answer, and flags `⚠ possible
  answer leak` in the preview if one slips through. Always eyeball the preview before `--push`.
- House rule enforced: em dashes are stripped from generated text.

## Question shape

Each `rounds[].questions[]` item:

```json
{ "number": 1, "text": "clue / clue / clue", "answer": "Answer", "choices": [], "is_internet_only": false }
```

## Common parser failure

The parser (`web/src/lib/parser.ts` → `parseRound`) only recognizes questions
that start with `N. ` (number-dot). Rounds written in other shapes parse to **0
questions**. Real example — quiz 618 Round 2 "Don't You Have a Podcast?" used
unnumbered `Clue / Clue / Podcast Answer` lines (answer glued to the clue with no
delimiter), so it came through empty. Fixed by hand-splitting the 8 lines into
`questions[]` and pushing. If a source round has no `N.` numbering, expect to
hand-fix it.
