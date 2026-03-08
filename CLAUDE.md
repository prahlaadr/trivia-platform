# Trivia Platform — Claude Context

## What This Is

A trivia hosting platform for live pub quiz nights. Two modes: Vercel (deployed at pyaar-trivia.vercel.app) for presenting and scoring, and Local for generating custom games via AI.

## Project Layout

```
trivia-platform/           # Repo root
├── web/                   # Next.js app (Vercel deploys from here)
│   ├── src/app/           # Pages and API routes
│   │   ├── api/parse/     # Quiz upload/list/delete (Blob or filesystem)
│   │   ├── api/quiz/      # Fetch single quiz by ID
│   │   ├── game-gen/      # Game Gen UI
│   │   ├── present/[quizId]/ # Presenter page
│   │   └── score/         # Scorekeeper pages
│   ├── src/components/    # React components
│   │   ├── Presenter.tsx  # Slide nav, toolbar, overlays, viewport management
│   │   ├── QuizList.tsx   # Homepage: upload zone + quiz list
│   │   ├── ScoreGrid.tsx  # Score input table with arrow-key nav
│   │   └── SlideRenderer.tsx # All slide type renderers
│   ├── src/lib/           # Shared logic
│   │   ├── branding.ts    # Brand toggle (Pyaar / Dirty South)
│   │   ├── game-gen.ts    # Game Gen sessions + saved games (localStorage)
│   │   ├── parser.ts      # DOCX + PDF → Quiz JSON parser
│   │   ├── scoring.ts     # Score sessions (localStorage)
│   │   ├── slides.ts      # Quiz → Slide[] builder
│   │   └── types.ts       # All TypeScript interfaces
│   └── public/
│       ├── data/          # Generated quiz JSON (local only, gitignored)
│       └── manifest.json  # PWA manifest
├── parser.py              # Python batch parser (CLI)
├── PLAN.md                # Architecture, roadmap, remaining features
└── README.md              # Full documentation
```

## Tech Stack

- **Runtime:** Bun (not npm)
- **Framework:** Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Parsing:** mammoth (DOCX), unpdf (PDF)
- **Storage:** Vercel Blob (deployed), filesystem (local)
- **Client state:** localStorage (scoring, branding, game gen sessions, saved games)
- **Deployment:** Vercel (auto-deploys from main)

## Key Patterns

- **Quiz JSON format:** Defined in `types.ts` — `Quiz` has `rounds[]`, each round has `questions[]`. All quiz sources (upload, game gen) produce this same shape.
- **Slides:** `slides.ts` converts a `Quiz` into a flat `Slide[]` array. The Presenter navigates this array linearly.
- **Presenter toolbar:** Uses `window.innerHeight` measurement (not CSS `100vh`) because Mac Dock/browser chrome can cover the bottom. Two-layer layout: outer `fixed inset-0` for background + inner flex column sized to measured height.
- **Brand toggle:** `localStorage("trivia-brand")` → `"dirty-south"` or `"pyaar"`. Default is `"dirty-south"`. Server-side rendering uses the default.
- **Admin PIN:** Set via `ADMIN_PIN` env var. Gates upload and delete operations. Client stores it in localStorage after first prompt.
- **Game Gen:** Teams pick topics → topics ranked → round plan generated → prompt copied to Claude Code → `/game-gen` skill generates quiz JSON → saved to `public/data/`.
- **Responsive:** All pages use `sm:` breakpoint pattern. Presenter hides fullscreen button on mobile.

## Environment Variables

- `BLOB_READ_WRITE_TOKEN` — Vercel Blob store token (required for deployed version)
- `ADMIN_PIN` — Gates upload/delete (set in Vercel env vars)
- `VERCEL` — Auto-set by Vercel, used to switch between Blob and filesystem storage

## Commands

```bash
cd web
bun install    # Install deps
bun dev        # Local dev server on :3000
bun run build  # Production build
vercel --prod  # Deploy (run from repo root, not web/)
```

## Remaining Features (see PLAN.md)

- Question swapping in Game Gen
- Test bank pull (search existing quizzes by topic)
- Google Drive integration for shared quiz access
