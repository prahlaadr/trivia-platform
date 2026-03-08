# Pyaar Trivia Platform

A full-featured trivia hosting platform for live pub quiz nights. Upload quiz files, generate custom games from team-selected topics, present slides in fullscreen, and track scores in real time.

**Live:** [pyaar-trivia.vercel.app](https://pyaar-trivia.vercel.app)

---

## What It Does

This platform runs a complete trivia night end-to-end:

1. **Teams walk in** and pick topics they want to hear about
2. **Game Gen** aggregates topics and generates 6 rounds of 6 questions via AI (Claude Code skill + web search)
3. **Presenter** displays slides in fullscreen — questions, answers, round titles, and tie-breakers
4. **Scorekeeper** tracks scores per round with Joker support and a live leaderboard

It also supports traditional quiz hosting: upload a `.docx` or `.pdf` quiz file, and the parser converts it to slides automatically.

## Two Modes

| Mode | What it does | Who uses it |
|------|-------------|-------------|
| **Vercel** | Presenter, scorekeeper, quiz upload (Blob storage) | You + host employees |
| **Local** | Everything above + Game Gen mode + AI question generation | You only |

---

## Features

### Presenter

Full-screen quiz presentation with keyboard navigation.

- Parses `.docx` (mammoth) and `.pdf` (unpdf) quiz files into slides
- Round types: standard Q&A, video rounds, progressive reveal (Guess Who/Where)
- Answer reveal flow: questions one-by-one → review all → question/answer pairs
- Per-slide timer, progress bar, jump navigation panel
- Scores overlay with live leaderboard and inline scorekeeper
- Floating toolbar that adapts to any viewport size

### Scorekeeper

Live game scoring at `/score`.

- Create game sessions with team names and round count
- Score input per round with Joker tracking (doubles one round per team)
- Live leaderboard (sortable, presentable on screen)
- Last round auto-doubled
- Accessible from within the Presenter via the Scores overlay (press `S`)

### Game Gen Mode

Dynamic game creation for live trivia nights at `/game-gen`.

- **Team registration:** Each team picks 3-5 topics from a curated list or adds custom ones
- **Topic aggregation:** Deduplicates and ranks topics by popularity across all teams
- **Round planning:** Auto-generates a 6-round plan from the ranked topic pool
- **AI generation:** A Claude Code skill (`/game-gen`) takes the topic plan and generates 36 questions + 1 tie-breaker
  - Web searches each topic for fresh 2025-2026 facts
  - Matches the witty, conversational tone of existing quizzes
  - Mix of difficulty per round (2 easy, 2 medium, 2 hard)
  - No API costs — runs through Claude Code / Claude Max plan
- **Presenter-ready:** Generated quiz uses the exact same JSON format, loads directly into the Presenter

**Game Gen flow:**
```
Teams pick topics → Topics ranked → Round plan generated → Copy prompt to Claude Code
→ /game-gen skill generates questions → Click "Check for Results" → Present Game
```

### Brand Toggle

Switch between **Pyaar Trivia** and **Dirty South Trivia** branding with a single click. Persisted in localStorage, affects all pages and slides. Toggle button on homepage (top-right corner).

### Vercel Blob Storage

Uploaded quizzes persist across deploys via Vercel Blob. Local mode uses filesystem (`public/data/`), Vercel mode reads/writes from Blob store automatically. Admin PIN gate on upload/delete.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh)
- [Python 3.13+](https://www.python.org/) with [uv](https://docs.astral.sh/uv/)

### Local Development

```bash
git clone https://github.com/prahlaadr/trivia-platform.git
cd trivia-platform

# Python deps (for batch parsing)
uv sync

# Web app
cd web
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) — drag & drop `.docx` or `.pdf` quiz files, or click **Game Gen** to start building a custom game.

### Vercel Deployment

Auto-deploys from `main` via GitHub integration. Requires:
- `BLOB_READ_WRITE_TOKEN` env var (from Vercel Blob store)
- `ADMIN_PIN` env var (optional — gates upload/delete)

---

## Keyboard Shortcuts (Presenter)

| Key | Action |
|-----|--------|
| `→` / `Space` / `Enter` | Next slide |
| `←` / `Backspace` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `F` | Toggle fullscreen |
| `S` | Toggle scores overlay |
| `Esc` | Close overlay / exit to quiz list |

---

## Quiz Document Format

The parser handles `.docx` and `.pdf` files structured like:

```
Pub Quiz 566 – January 13, 2026

Round 1 – Random Knowledge
1 Point Per Correct Answer
Joker Is In Play

1. First question text
Answer text

2. Second question text
A. Choice A
B. Choice B
C. Choice C
D. Choice D

Round 2 – Theme Name
...

Tie Breaker: Question text
Answer text
```

Supported round types:
- **Standard** — Numbered questions with text answers or multiple choice
- **Video** — Video montage rounds (answers only)
- **Progressive** — Guess Who/Where with clues at 10/8/6/4/2 points

---

## Project Structure

```
trivia-platform/
├── parser.py                  # Python .docx batch parser (CLI)
├── pyproject.toml             # Python dependencies
├── bank/                      # Raw quiz files (gitignored)
├── PLAN.md                    # Architecture and roadmap
├── SAMPLE-RUN-1.md            # Full Game Gen E2E test documentation
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── parse/         # Upload, list, delete quizzes (Blob or filesystem)
│   │   │   │   ├── parse-all/     # Batch parse via Python
│   │   │   │   └── quiz/          # Fetch single quiz by ID
│   │   │   ├── game-gen/          # Game Gen UI (team registration, topic picker, round plan)
│   │   │   ├── present/[quizId]/  # Presenter page
│   │   │   └── score/             # Scorekeeper pages
│   │   ├── components/
│   │   │   ├── Presenter.tsx      # Slide navigation, toolbar, overlays
│   │   │   ├── QuizList.tsx       # Homepage: upload + quiz list
│   │   │   ├── ScoreGrid.tsx      # Scoring spreadsheet
│   │   │   └── SlideRenderer.tsx  # All slide type renderers
│   │   └── lib/
│   │       ├── branding.ts        # Brand toggle (Pyaar / Dirty South)
│   │       ├── game-gen.ts        # Game Gen state management (localStorage)
│   │       ├── parser.ts          # DOCX + PDF → Quiz parser
│   │       ├── scoring.ts         # Session management (localStorage)
│   │       ├── slides.ts          # Quiz → Slide[] builder
│   │       └── types.ts           # Quiz, Round, Question, Slide, GameGen types
│   └── public/
│       ├── data/                  # Parsed + generated quiz JSON (local)
│       └── fonts/                 # Poppins font files
└── README.md
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Parsing | mammoth (DOCX), unpdf (PDF) |
| Storage | Vercel Blob (deployed), filesystem (local) |
| Scoring | localStorage |
| AI Generation | Claude Code skill + web search (no API costs) |
| Runtime | Bun |
| Deployment | Vercel (auto-deploy from GitHub) |

---

## Module Status

| Module | Status |
|--------|--------|
| Presenter | Done |
| Scorekeeper | Done |
| Brand Toggle | Done |
| PDF + DOCX Upload | Done |
| Vercel Blob Storage | Done |
| Game Gen Mode | Done |
