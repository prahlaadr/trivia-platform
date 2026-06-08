# Out of Pocket (OOP) module

You're inside the OOP quiz module — a self-contained mini-app. Full guide and
data model are in the repo-root `AGENTS.md` ("The Out of Pocket module"
section). Quick orientation:

- This folder: `page.tsx` (lobby), `present/` (presenter), `edit/` (editor),
  `deck.ts` (★ data model + baked-in `DEFAULT_SECTIONS` + `buildDeck`),
  `oop.css` / `layout.tsx` (brand scope + Baloo Da 2 font).
- Also part of OOP, outside this folder:
  - `web/src/components/oop/` — `OopSlides`, `OopQuestionEditor`, `OopAdminGate`
  - `web/src/lib/oopDeck.ts` — client helpers + factories
  - `web/src/app/api/oop-deck`, `api/oop-image`, `api/admin-check` — storage, upload, auth

**Content vs code:** live question edits go through `/out-of-pocket/edit` and
save to Vercel Blob — NOT to `deck.ts`. `deck.ts` is only the default seed and
the "Reset to original" target.

**Adding a question field** means editing FIVE places, keep them in sync:
`deck.ts` (type + `buildDeck`) → `Slide` types → `OopSlides` (render) →
`present/page.tsx` (pass-through) → `OopQuestionEditor` (edit UI).
