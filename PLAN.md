# Pyaar Trivia Platform — PLAN

> A trivia hosting platform with two deployment targets:
> **Local** (full game generation toolkit) and **Vercel** (pyaar-trivia.vercel.app — presenter/scorekeeper for hosts).
> Location: `~/Documents/Projects/01-web-apps/trivia-platform/`

---

## Architecture: Two Access Methods

### Vercel — `pyaar-trivia.vercel.app`

The deployed web interface for trivia hosting. Used by you and trivia host employees.

| Feature | Status |
|---------|--------|
| Brand toggle (Dirty South / Pyaar Trivia) | ✅ Built |
| PDF + DOCX upload & parsing | ✅ Built |
| Presenter (slides, keyboard nav, fullscreen) | ✅ Built |
| Scorekeeper (teams, rounds, joker, leaderboard) | ✅ Built |
| Google Drive integration (shared test banks) | 🔲 Not started |

**Google Drive flow:** You upload quiz files to a shared Google Drive folder. Host employees connect to see available games. You control which games are shared.

### Local — Game Gen Mode

The full platform running locally for dynamic game creation. Built as a separate module.

| Feature | Status |
|---------|--------|
| Team registration (name + 3-5 topic picks) | ✅ Built |
| Topic aggregation → round generation | ✅ Built |
| Bank-backed round generation (shared `bank-generate.ts` engine, no LLM) | ✅ Built |
| Test bank pull (questions by topic from the bank) | ✅ Built (now the primary flow) |
| AI fresh-question generation (external `/game-gen` Claude Code skill, web search) | ✅ Built (separate manual tool) |
| Question swapping | 🔲 Not started |

> **How generation actually works now (code was verified 2026-10-19):** both Game
> Gen (team-driven) and Wildcard (host-driven) pull from the local question bank
> via the shared `bank-generate.ts` engine (`/api/wildcard/topic`), no live LLM.
> The web-search `/game-gen` skill is a separate manual path. Full detail:
> [`docs/generation-modes.md`](docs/generation-modes.md).

**Game Gen flow:**
1. Teams walk in, each picks 3 topics
2. Once 3–5 teams registered, generate rounds (6 questions each) from the combined topic pool
3. Pull questions from the bank by topic (via the shared engine)
4. Present rounds via the Presenter, score as you go

---

## Modules

### Module 1: Presenter ✅

Parses `.docx` and `.pdf` quiz files → renders slides per round. Keyboard navigation, fullscreen, per-slide timer.

### Module 2: Scorekeeper ✅

Live game scoring — create sessions, register teams, input scores per round, Joker tracking, live leaderboard, CSV export. Data stored in localStorage.

### Module 3: Brand Toggle ✅

Switch between Dirty South Trivia and Pyaar Trivia branding. Stored in localStorage, affects all pages and slides.

### Module 4: Vercel Blob Storage ✅

Persistent quiz storage via Vercel Blob. Upload PDF/DOCX → parse → store JSON in Blob. Sort controls on quiz list.

### Module 5: Game Gen Mode (Local) ✅

Dynamic game creation for live trivia nights. Teams pick 3-5 topics, topics are aggregated and ranked, a 6-round plan is generated, and questions are pulled from the local bank via the shared `bank-generate.ts` engine (the same one Wildcard uses), producing a standard Quiz JSON that loads directly into the Presenter. The separate `/game-gen` Claude Code skill is the web-search path for brand-new questions. See [`docs/generation-modes.md`](docs/generation-modes.md).

**Remaining sub-features:**
- Question swapping (replace individual questions without regenerating)
- (Done) Test bank pull is now the primary generation path (bank-backed)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Next.js API routes |
| Doc parsing | mammoth (DOCX), unpdf (PDF) |
| AI (local) | Claude API (`@anthropic-ai/sdk`) + web search tool |
| Scoring | localStorage (client-side) |
| Runtime | Bun |
| Deployment | Vercel (pyaar-trivia.vercel.app) |

---

## Build Order

### Phase 1 — Vercel MVP ✅
1. ~~Presenter (DOCX → slides)~~
2. ~~Scorekeeper~~
3. ~~Brand toggle~~
4. ~~PDF support~~

### Phase 2 — Vercel Blob + Admin ✅
5. ~~Vercel Blob persistence~~
6. ~~Admin PIN gate on upload/delete~~
7. ~~Delete quiz, sort controls~~

### Phase 3 — Game Gen Mode (Local) ✅
8. ~~Team registration UI~~
9. ~~Topic aggregation → round generation logic~~
10. ~~Claude Code skill for question generation~~
11. Test bank search (by topic/tag)
12. Question swapping UI
13. ~~End-to-end game flow~~

---

## Status

| Module | Status | Notes |
|--------|--------|-------|
| Presenter | ✅ Done | PDF + DOCX, slides, keyboard nav, fullscreen |
| Scorekeeper | ✅ Done | Teams, rounds, joker, leaderboard, CSV |
| Brand Toggle | ✅ Done | Dirty South (default) ↔ Pyaar Trivia |
| Vercel Blob | ✅ Done | Persistent storage, delete, sort |
| Game Gen | ✅ Done | Local-only, AI generator, saved games. Remaining: question swapping, test bank pull |
