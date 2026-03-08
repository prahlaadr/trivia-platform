# Pyaar Trivia Platform

A trivia hosting platform with two deployment modes: **Vercel** (live presenter + scorekeeper for host employees) and **Local** (full game generation toolkit).

**Live:** [pyaar-trivia.vercel.app](https://pyaar-trivia.vercel.app)

## Architecture

| Mode | What it does | Who uses it |
|------|-------------|-------------|
| **Vercel** | Presenter, scorekeeper, test bank (Blob storage) | You + host employees |
| **Local** | Everything above + Game Gen mode + AI question generation | You only |

**Workflow:** Generate games locally → curate rounds → upload the best to Vercel Blob → host employees present them.

## Features

### Presenter
- Full-screen quiz slides with keyboard navigation
- Parses `.docx` (mammoth) and `.pdf` (unpdf) quiz files
- Round types: standard Q&A, video rounds, progressive reveal (Guess Who/Where)
- Answer reveal flow: questions one-by-one → review all → question/answer pairs
- Per-slide timer, progress bar, jump navigation

### Scorekeeper
- Create game sessions, register teams
- Score input per round with Joker tracking (doubles one round per team)
- Live leaderboard (sortable, projected on screen)
- Last round auto-doubled, CSV export

### Brand Toggle
- Switch between **Pyaar Trivia** and **Dirty South Trivia** branding
- Persisted in localStorage, affects all pages and slides
- Toggle button on homepage (top-right corner)

### Vercel Blob Storage
- Uploaded quizzes persist across deploys via Vercel Blob
- Local mode uses filesystem (`public/data/`)
- Vercel mode reads/writes from Blob store automatically

### Game Gen Mode (Local — not yet built)
- Teams walk in, each picks 3 topics
- Generate rounds (6 questions each) from combined topic pool
- AI question generation via Claude API + web search
- Pull from test bank first, AI-generate to fill gaps
- Save good rounds to local bank, upload to Vercel when ready

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

Open [http://localhost:3000](http://localhost:3000) — drag & drop `.docx` or `.pdf` quiz files to upload.

### Vercel Deployment

The app auto-deploys from `main` via GitHub integration. Requires:
- `BLOB_READ_WRITE_TOKEN` env var (from Vercel Blob store)
- Blob store connected to the project in all environments

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
C. Choice C ✅ (Correct)
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

## Project Structure

```
trivia-platform/
├── parser.py              # Python .docx batch parser (CLI)
├── pyproject.toml         # Python dependencies
├── bank/                  # Raw quiz files (gitignored)
├── PLAN.md                # Full architecture and roadmap
├── web/                   # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── parse/     # Upload + list quizzes (Blob or filesystem)
│   │   │   │   ├── parse-all/ # Batch parse via Python
│   │   │   │   └── quiz/      # Fetch single quiz by ID
│   │   │   ├── present/[quizId]/ # Presenter page
│   │   │   └── score/         # Scorekeeper pages
│   │   ├── components/
│   │   │   ├── Presenter.tsx  # Slide navigation + overlays
│   │   │   ├── QuizList.tsx   # Homepage: upload + quiz list
│   │   │   ├── ScoreGrid.tsx  # Scoring spreadsheet
│   │   │   └── SlideRenderer.tsx # All slide type renderers
│   │   └── lib/
│   │       ├── branding.ts    # Brand toggle (Pyaar / Dirty South)
│   │       ├── parser.ts      # DOCX + PDF → Quiz parser
│   │       ├── scoring.ts     # Session management (localStorage)
│   │       ├── slides.ts      # Quiz → Slide[] builder
│   │       └── types.ts       # Quiz, Round, Question, Slide types
│   └── public/
│       ├── data/              # Parsed quiz JSON (local, gitignored)
│       └── fonts/             # Poppins font files
└── README.md
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Parsing | mammoth (DOCX), unpdf (PDF) |
| Storage | Vercel Blob (deployed), filesystem (local) |
| Scoring | localStorage |
| Runtime | Bun |
| Deployment | Vercel (auto-deploy from GitHub) |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` / `Space` / `Enter` | Next slide |
| `←` / `Backspace` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `F` | Toggle fullscreen |
| `S` | Toggle scores overlay |
| `Esc` | Close overlay / exit to quiz list |

## Roadmap

See [PLAN.md](PLAN.md) for full architecture and build order.

| Module | Status |
|--------|--------|
| Presenter | ✅ Done |
| Scorekeeper | ✅ Done |
| Brand Toggle | ✅ Done |
| PDF + DOCX Upload | ✅ Done |
| Vercel Blob Storage | ✅ Done |
| Game Gen Mode (Local) | 🔲 Not started |
