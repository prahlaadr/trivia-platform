# Trivia Platform

A web-based pub quiz presenter that parses `.docx` question documents into interactive browser slides with keyboard navigation, fullscreen mode, and per-slide timers.

Built for [Dirty South Trivia](https://dirtysouthtrivia.com) — easily rebrandable for any trivia host.

## Features

- **Slide Presenter** — Full-screen quiz presentation with keyboard controls
- **Docx Parser** — Parses structured `.docx` quiz files into JSON
- **Drag & Drop Upload** — Upload new quiz docs directly from the browser
- **Multiple Round Types** — Standard Q&A, video rounds, progressive reveal (Guess Who/Where)
- **Answer Reveal Flow** — Questions one-by-one → review all → question/answer pairs
- **Per-slide Timer** — Tracks time spent on each slide
- **Keyboard Navigation** — Arrow keys, Space, Enter, Backspace, Home/End, F (fullscreen), Esc (exit)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 18+)
- [Python 3.13+](https://www.python.org/) with [uv](https://docs.astral.sh/uv/)

### Setup

```bash
# Clone
git clone https://github.com/prahlaadr/trivia-platform.git
cd trivia-platform

# Install Python dependencies
uv sync

# Install web dependencies
cd web
bun install

# Create your bank folder and add .docx quiz files
mkdir -p ../bank
# Copy your quiz .docx files into bank/

# Parse all docs in bank/
cd ..
uv run python parser.py bank/

# Or parse a single doc (outputs JSON to stdout)
uv run python parser.py bank/your-quiz.docx > web/public/data/quiz_123.json

# Start the dev server
cd web
bun dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see your quizzes listed. Click one to present.

### Uploading via Browser

You can also drag & drop `.docx` files onto the home page. The app will parse them automatically (requires the Python parser and `uv` to be available).

## Quiz Document Format

The parser expects `.docx` files structured like:

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

...

Round 2 – Theme Name
...

Tie Breaker: Question text
Answer text
```

Supported round types:
- **Standard** — Numbered questions with text answers or multiple choice
- **Video** — Video montage rounds (answers only)
- **Progressive** — Guess Who/Where with clues at 10/8/6/4/2 points

## Rebranding

All brand-specific text is centralized in [`web/src/lib/branding.ts`](web/src/lib/branding.ts):

```typescript
export const brand = {
  name: "Dirty South Trivia",
  website: "DirtySouthTrivia.com",
  socialHandle: "dstrivia",
  // ... change these to rebrand
};
```

Colors are documented at the top of [`web/src/components/SlideRenderer.tsx`](web/src/components/SlideRenderer.tsx) — search for hex values like `#1B4D3E`, `#FFD700`, etc. to change the palette.

The body background is set in [`web/src/app/globals.css`](web/src/app/globals.css).

## Project Structure

```
trivia-platform/
├── parser.py              # Python .docx parser
├── pyproject.toml         # Python dependencies
├── bank/                  # Your .docx quiz files (gitignored)
├── web/                   # Next.js app
│   ├── src/
│   │   ├── app/           # Pages and API routes
│   │   ├── components/    # SlideRenderer, Presenter, QuizList
│   │   └── lib/           # Types, slide builder, branding config
│   └── public/
│       ├── data/          # Parsed quiz JSON (gitignored)
│       └── fonts/         # Poppins font files
└── README.md
```

## Tech Stack

- **Frontend** — Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Parser** — Python 3.13, python-docx
- **Runtime** — Bun (or Node.js)
- **Font** — Poppins

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` / `Space` / `Enter` | Next slide |
| `←` / `Backspace` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `F` | Toggle fullscreen |
| `Esc` | Exit to quiz list |

## License

MIT
