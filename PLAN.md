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
| Team registration (name + 3 topic picks) | 🔲 Not started |
| Topic aggregation → round generation | 🔲 Not started |
| AI question generation (Claude API + web search) | 🔲 Not started |
| Question swapping | 🔲 Not started |
| Test bank pull (reuse existing questions by topic) | 🔲 Not started |

**Game Gen flow:**
1. Teams walk in, each picks 3 topics
2. Once 3–5 teams registered, generate rounds (6 questions each) from combined topic pool
3. Pull from test bank first, AI-generate to fill gaps
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

Persistent quiz storage via Vercel Blob. Upload PDF/DOCX → parse → store JSON in Blob. Admin PIN gate on upload/delete. Sort controls on quiz list.

### Module 5: Game Gen Mode (Local) 🔲

**Goal:** Dynamic game creation for live trivia nights with AI-powered question generation.

**Sub-features:**
- Team registration UI
- Topic selection (3 per team)
- Round generation from topic pool
- AI question generation (Claude API + web search)
- Question bank integration (reuse existing questions)
- Question swapping (replace individual questions)

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

### Phase 3 — Game Gen Mode (Local)
8. Team registration UI
9. Topic aggregation → round generation logic
10. Claude API integration for question generation
11. Test bank search (by topic/tag)
12. Question swapping UI
13. End-to-end game flow

---

## Status

| Module | Status | Notes |
|--------|--------|-------|
| Presenter | ✅ Done | PDF + DOCX, slides, keyboard nav, fullscreen |
| Scorekeeper | ✅ Done | Teams, rounds, joker, leaderboard, CSV |
| Brand Toggle | ✅ Done | Dirty South (default) ↔ Pyaar Trivia |
| Vercel Blob | ✅ Done | Persistent storage, admin PIN (481516), delete, sort |
| Game Gen | 🔲 Not started | Local-only, includes AI generator |
