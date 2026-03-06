# Trivia Platform — PLAN

> A full-stack trivia hosting platform for running weekly pub quizzes.
> Location: `~/Documents/Projects/01-web-apps/trivia-platform/`

---

## Overview

Four integrated modules:

| Module | Purpose |
|--------|---------|
| **Presenter** | Turn question docs → slides, display rounds live during games |
| **Question Bank** | Import, organize, search, and tag questions from a folder of docs |
| **Scorekeeper** | Live game scoring — create games, input scores per round per team |
| **AI Generator** | Generate new questions via Claude API + web search by topic |

---

## Module 1: Presenter (Priority — build first)

**Goal:** Parse `.docx` question files → render clean slides per round, navigable during a live game.

### Parsing (from Pub Quiz 566 analysis)

The doc format:
- `Round N – Theme Name` lines mark round boundaries
- `N Point(s) Per Correct Answer` lines carry scoring rules
- `Joker Is IN PLAY` / `Joker Is NOT In Play` per round
- Questions: numbered `1.` to `8.`, answer on the next non-empty line
- Special rounds: progressive reveal (Guess Where), math sums (Add It Up), video rounds
- Mini Games: between rounds, not formally scored
- Tie Breaker: single question at the end

### Slide Layout

Each round generates slides:
1. **Round title slide** — "Round 2 – Zero Proof" + theme description + scoring rules
2. **All-questions slide** — all 8 questions displayed at once (matches their format: teams get all 8 at once)
3. **Answers reveal slide** — questions + answers shown for grading
4. For special rounds (Guess Where): progressive reveal slides (one clue per slide)

### Tech
- Parse `.docx` with `python-docx` → structured JSON
- Render slides in browser (React component, full-screen, arrow-key navigation)
- Optional: export to actual `.pptx` via `python-pptx` for offline use

---

## Module 2: Question Bank

**Goal:** Connect to a folder of question docs, index all questions, make them searchable and taggable.

### Features
- Watch folder (e.g., `~/Documents/Trivia/`) for `.docx` files
- Parse each doc → extract rounds, questions, answers, themes
- Store in DuckDB: questions table with fields:
  - `id`, `source_file`, `round_num`, `round_theme`, `question_text`, `answer_text`, `point_value`, `round_type`, `tags[]`, `date_used`
- Search by: theme, keyword, tag, date, round type
- Deduplicate: flag questions that are too similar across docs
- Tag questions manually or auto-tag by theme keywords

### Folder Structure Expected
```
~/Documents/Trivia/
├── Pub Quiz 566.docx
├── Pub Quiz 567.docx
├── ...
└── custom/
    └── my-questions.docx
```

---

## Module 3: Scorekeeper

**Goal:** Run live games — create a game, register teams, input scores per round, track Joker usage, show leaderboard.

### Features
- Create new game (date, venue, number of rounds)
- Register teams (team name, optional recurring teams)
- Per round: input score for each team (1-8 scale typically), mark Joker round
- Joker doubles that round's score, one per team per game
- Live leaderboard (sortable, projected on screen)
- Game history: view past games, team standings over time
- Tie breaker support

### Data Model
```
games: id, date, venue, status
teams: id, name, created_at
game_teams: game_id, team_id, joker_round
scores: game_id, team_id, round_num, raw_score, joker_applied, final_score
```

### Integration with existing `trivia-scorer`
- The OCR answer-sheet scanning from `09-utilities/trivia-scorer/` could become an optional input method
- Manual score entry is the primary flow

---

## Module 4: AI Question Generator

**Goal:** Generate trivia questions by topic using Claude API + web search.

### Features
- Pick a topic/category → generate 8 questions + answers
- Use Claude web search tool for current events, recent stats, pop culture
- Match the style of existing questions (casual, pub-quiz tone)
- Difficulty slider (easy / medium / hard)
- Generated questions feed into the Question Bank
- Export as `.docx` matching the existing format

### Generation Prompt Strategy
- Feed Claude examples from the question bank for tone/style
- Specify round type (standard, progressive reveal, add-it-up, etc.)
- Web search for facts → formulate questions around them

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 + React 19 + TypeScript + Tailwind |
| Backend | Hono (Bun) API routes, or Next.js API routes |
| Database | DuckDB (local-first, file-based) |
| Doc parsing | Python scripts (`python-docx`, `python-pptx`) |
| AI | Claude API (`@anthropic-ai/sdk`) + web search tool |
| Presenter | React slide components, fullscreen mode |

---

## Build Order

### Phase 1 — Presenter MVP
1. Python parser: `.docx` → structured JSON (rounds, questions, answers)
2. React slide viewer: navigate rounds, show questions, reveal answers
3. Basic file upload or folder selection

### Phase 2 — Question Bank
4. Batch parser: process folder of docs → DuckDB
5. Search/browse UI for questions
6. Tagging system

### Phase 3 — Scorekeeper
7. Game creation + team registration
8. Score input per round with Joker tracking
9. Live leaderboard display
10. Game history

### Phase 4 — AI Generator
11. Claude API integration with web search
12. Question generation by topic/style
13. Export to `.docx` format
14. Feed into question bank

---

## Open Questions

- [ ] Should the presenter be a separate standalone tool or integrated into the main app?
- [ ] Is `.docx` the only input format, or also `.pdf`, `.txt`, Google Docs?
- [ ] How many historical quiz docs exist to seed the question bank?
- [ ] Should the scorekeeper support remote team self-registration (QR code)?
- [ ] Hosting: local-only or deployed (Vercel)?
