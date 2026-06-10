/* Out of Pocket — Data Camp, June 2026.
 *
 * This is the SINGLE SOURCE OF TRUTH for the live /out-of-pocket deck.
 * Edit sections/questions here; regenerate the tracking ledger with
 * `bun run export-csv`. (Built on the Sep 2025 SQL Trivia deck, since
 * expanded with the "SQL at the Movies" round and re-dated for Data Camp.)
 * Each question becomes a (question slide) → (reveal slide) pair via buildDeck.
 */

export type Slide =
  | { type: "cover"; title: string; subtitle?: string; date?: string }
  | {
      type: "section";
      sectionNumber: number;
      sectionTitle: string;
      subtitle?: string;
      body?: string;
    }
  | {
      type: "question";
      number: number;
      text: string;
      points: number;
      bullets?: string[];
      codeBlock?: string;
      imageSrc?: string;
      imageSrc2?: string;
      caption?: string;
      sourceUrl?: string;
      sourceLabel?: string;
    }
  | {
      type: "reveal";
      number: number;
      text: string;
      points: number;
      answer: string;
      bullets?: { text: string; correct?: boolean }[];
      codeBlock?: string;
      imageSrc?: string;
      imageSrc2?: string;
      caption?: string;
      sourceUrl?: string;
      sourceLabel?: string;
    }
  | { type: "answers-divider"; title?: string; date?: string };

export interface DeckQuestion {
  number: number;
  /** Questions default to included. Set false to keep a question "on the
   *  bench" — skipped by buildDeck and not counted, but still editable and
   *  toggleable per event. Mirrors DeckSection.enabled. */
  enabled?: boolean;
  text: string;
  points: number;
  answer: string;
  bullets?: string[];
  revealBullets?: { text: string; correct?: boolean }[];
  codeBlock?: string;
  /** Image shown on the question slide (e.g. the porcupine quill SEM). */
  questionImageSrc?: string;
  questionImageSrc2?: string;
  questionCaption?: string;
  questionSourceUrl?: string;
  /** Image shown on the reveal slide alongside the answer. */
  revealImageSrc?: string;
  revealImageSrc2?: string;
  revealCaption?: string;
  revealSourceUrl?: string;
  /** Label used for both question and reveal source links; defaults to "source". */
  sourceLabel?: string;
}

export interface DeckSection {
  number: number;
  title: string;
  subtitle?: string;
  /** Long-form body text rendered on the section divider (e.g. Section 0 team intro). */
  body?: string;
  /** Optional rounds default to enabled. Set false to keep a round "loaded but
   *  off" — it's skipped by buildDeck and not counted, but stays editable and
   *  can be flipped on per event (e.g. swap rounds for returning players). */
  enabled?: boolean;
  questions: DeckQuestion[];
}

/** The baked-in deck. Used as the seed/default when no saved deck exists,
 *  and as the "Reset to original" target. */
export const DEFAULT_SECTIONS: DeckSection[] = [
  {
    number: 0,
    title: "Get into your teams + team name",
    subtitle: "(we’re all zero-indexed, right?)",
    body: "You should have gotten your team number assigned at the start. If not or you forgot, introduce yourself to a team! Also, think of a team name. Some ideas to get you started: Drop table like it’s hot; dude, where’s my data; null pointer sisters; smells like updag in here",
    questions: [],
  },
  {
    number: 1,
    title: "Phase 1: SQL trivia!",
    subtitle: "SELECT *",
    questions: [
      {
        number: 1,
        text: "What does SQL stand for?",
        points: 1,
        answer: "Structured Query Language",
      },
      {
        number: 2,
        text: "What does the “R” stand for in the R programming language?",
        points: 1,
        answer: "Ross (Ihaka) or Robert (Gentleman): creators of R language",
      },
      {
        number: 3,
        text: "Put these in the correct order of evaluation (all or nothing):",
        points: 2,
        bullets: ["SELECT", "FROM", "WHERE", "LIMIT", "HAVING"],
        answer: "FROM → WHERE → HAVING → SELECT → LIMIT",
      },
    ],
  },
  {
    number: 2,
    title: "Phase 2: Sequel trivia",
    subtitle: "oops name collision",
    questions: [
      {
        number: 1,
        text: "Which of the following are real Avatar movie sequels?",
        points: 3,
        bullets: [
          "Way of Water",
          "Search for the Air Seed",
          "Fire and Ash",
          "The Tulkun Rider",
          "The Wind Awakens",
        ],
        answer: "",
        revealBullets: [
          { text: "Way of Water", correct: true },
          { text: "Search for the Air Seed" },
          { text: "Fire and Ash", correct: true },
          { text: "The Tulkun Rider", correct: true },
          { text: "The Wind Awakens" },
        ],
      },
      {
        number: 2,
        text: "Who directed The Last Jedi?",
        points: 1,
        bullets: ["Kathleen Kennedy", "JJ Abrams", "Rian Johnson", "Terry Gilliam"],
        answer: "Rian Johnson",
      },
      {
        number: 3,
        text: "What movie was “Electric Boogaloo” originally the sequel to?",
        points: 1,
        answer: "Breakin’",
        revealImageSrc: "/oop/img-breakin.png",
      },
      {
        number: 4,
        text: "Shaun of the Dead, Hot Fuzz, and The World’s End are the movies in this trilogy, named after an ice cream … or a pastry, depending on where in Europe you find yourself",
        points: 1,
        answer: "Cornetto",
        revealImageSrc: "/oop/img-cornetto.png",
        revealImageSrc2: "/oop/img-croissant.png",
        revealCaption: "“Non sono un croissant!” (“I’m not a croissant!” in Italian)",
      },
      {
        number: 5,
        text: "The Devil Wears Prada 2 (out 2026) reportedly went by a one-word codename on its casting calls — the very color Miranda Priestly (Meryl Streep) dissects in her famous monologue about the fashion industry’s cultural reach in the first film. What’s the word?",
        points: 2,
        answer: "Cerulean",
        revealImageSrc: "/oop/img-cerulean.png",
        revealCaption: "Andy’s “lumpy blue sweater” — cerulean, per Miranda’s monologue.",
      },
      {
        number: 6,
        text: "Star Wars: Episode I is The Phantom Menace. Name Episodes II and III (1 pt each):",
        points: 2,
        answer: "Attack of the Clones (II) and Revenge of the Sith (III)",
      },
    ],
  },
  {
    number: 3,
    title: "Phase 3: “Sounds Like SQL” Trivia",
    subtitle: "Open your minds for this one",
    questions: [
      {
        number: 1,
        text: "These birds patter their feet on sand or soil in a behavior called worm charming. The prevailing theory is that it sounds enough like rain to drum up assorted invertebrates for the birds to eat",
        points: 1,
        answer: "Seagulls",
        revealImageSrc: "/oop/img-seagulls.jpg",
        revealSourceUrl: "https://www.youtube.com/watch?v=ppPcSaXyY4w",
      },
      {
        number: 2,
        text: "This 90s action star was in movies like Hard to Kill, Above the Law, Out for Justice, Under Siege, and other combinations of [Preposition] [Noun]",
        points: 1,
        answer: "Steven Seagal",
      },
      {
        number: 3,
        text: "What’s this thing? (super sharp, sharper than a hypodermic needle; microscopic backward-facing barbs)",
        points: 1,
        answer: "Quill (porcupine)",
        questionImageSrc: "/oop/img-quill-needle.png",
        questionImageSrc2: "/oop/img-quill-barbs.png",
        revealCaption:
          "Many believe the natural antibiotic effect of the quill's grease is a sign of benevolence — what it really does is make it impossible for the sting victim to escape the pain through the call of death, forcing it to live through the pain as a reminder of the wrath of our lil porcupine.",
        revealSourceUrl: "https://link.springer.com/article/10.1007/BF01016483",
        sourceLabel: "natural antibiotic effect",
      },
      {
        number: 4,
        text: "The world’s biggest one of these can be found in Portugal (Parque da Cidade, Porto). It measures 25,100 sq. m (270,174 sq. ft)",
        points: 1,
        answer: "Quilt",
        revealImageSrc: "/oop/img-quilt.png",
        questionSourceUrl:
          "https://www.guinnessworldrecords.com/world-records/largest-patchwork-quilt",
        revealSourceUrl:
          "https://www.guinnessworldrecords.com/world-records/largest-patchwork-quilt",
      },
      {
        number: 5,
        text: "When this is baked into tart form, it becomes Harry Potter’s favorite treat",
        points: 1,
        answer: "Treacle",
        revealImageSrc: "/oop/img-treacle.png",
      },
      {
        number: 6,
        text: "This dog is half dachshund mixed with ________",
        points: 1,
        answer: "Beagle (his name is Bodhi)",
        questionImageSrc: "/oop/img-bodhi.jpg",
        revealImageSrc: "/oop/img-bodhi.jpg",
        revealCaption: "His name is Bodhi. My brother-in-law’s dog and famous good boy",
      },
    ],
  },
  {
    number: 4,
    title: "Phase 4: SQL at the Movies",
    subtitle: "your queries betray you",
    questions: [
      {
        number: 1,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "SELECT * FROM Earth\nWHERE population = population / 2;",
        answer: "Avengers: Infinity War",
      },
      {
        number: 2,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "UPDATE students\nSET status = 'wizard'\nWHERE age = 11;",
        answer: "Harry Potter and the Sorcerer’s Stone",
      },
      {
        number: 3,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "DROP TABLE skynet;",
        answer: "Terminator 2: Judgment Day",
      },
      {
        number: 4,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "INSERT INTO DeLorean (destination_year)\nVALUES (1955);",
        answer: "Back to the Future",
      },
      {
        number: 5,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "MERGE INTO Corleone_Family\nUSING rivals\nON conflict = TRUE\nWHEN MATCHED THEN DELETE;",
        answer: "The Godfather Part II",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // OPTIONAL ROUNDS — loaded but `enabled: false`. Flip them on in the
  // editor (or here) to swap in for returning players. Drafts: refine the
  // questions/answers in the editor; the Logo round needs images uploaded.
  // ─────────────────────────────────────────────────────────────────
  {
    number: 5,
    title: "Phase 5: Guess the Data Logo",
    subtitle: "you've stared at these all day",
    enabled: false,
    questions: [
      // Upload each logo on the question slide via the editor before going live.
      {
        number: 1,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "R",
      },
      {
        number: 2,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Tableau",
      },
      {
        number: 3,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "MATLAB",
      },
      {
        number: 4,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Jupyter",
      },
      {
        number: 5,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "DuckDB",
      },
      {
        number: 6,
        text: "Guess the data tool from its logo (the elephant):",
        points: 1,
        answer: "PostgreSQL",
      },
    ],
  },
  {
    number: 6,
    title: "Phase 6: A Brief History of the Spreadsheet",
    subtitle: "before Sheets, before Excel",
    enabled: false,
    questions: [
      {
        number: 1,
        text: "Released in 1979 for the Apple II, what program is widely considered the first spreadsheet — the original “killer app” that sold computers?",
        points: 1,
        answer: "VisiCalc",
      },
      {
        number: 2,
        text: "Which spreadsheet dominated the 1980s PC market on MS-DOS, before Excel eventually took the crown?",
        points: 1,
        answer: "Lotus 1-2-3",
      },
      {
        number: 3,
        text: "Microsoft Excel first shipped in 1985 — on which platform, two years before a Windows version existed?",
        points: 1,
        answer: "The Apple Macintosh",
      },
      {
        number: 4,
        text: "In the function name VLOOKUP, what does the “V” stand for?",
        points: 1,
        answer: "Vertical",
      },
      {
        number: 5,
        text: "Which three-key combo entered a legacy “array formula” in older versions of Excel?",
        points: 1,
        answer: "Ctrl + Shift + Enter",
      },
      {
        number: 6,
        text: "The word “spreadsheet” comes from accountants laying numbers out how, across a ledger?",
        points: 1,
        answer: "Spread across two facing pages (a “spread” sheet)",
      },
    ],
  },
  {
    number: 7,
    title: "Phase 7: X Marks the Spot",
    subtitle: "X-[number], all over the place",
    enabled: false,
    questions: [
      {
        number: 1,
        text: "Match each X-[number] to what it refers to. (Options: BMW SUV · Wolverine’s clone · EDI claims standard · Apple’s 2017 phone · rocket plane)",
        points: 5,
        answer: "",
        bullets: ["X12", "X-23", "X7", "iPhone X", "X-15"],
        revealBullets: [
          { text: "X12 → ASC X12 — the EDI standard behind 837/835 healthcare claims" },
          { text: "X-23 → Laura Kinney, Wolverine’s clone (X-Men / Logan)" },
          { text: "X7 → BMW’s full-size luxury SUV" },
          { text: "iPhone X → Apple’s 2017 10th-anniversary phone" },
          { text: "X-15 → the North American X-15, fastest crewed rocket plane" },
        ],
      },
      {
        number: 2,
        text: "Match each “X” to what it is. (Options: gradient-boosting ML library · Apple’s OS “ten” · graphics API · the social platform · X11 on Mac)",
        points: 5,
        answer: "",
        bullets: ["XGBoost", "macOS X", "DirectX", "X (the app)", "XQuartz"],
        revealBullets: [
          { text: "XGBoost → the gradient-boosting ML library" },
          { text: "macOS X → Apple’s operating system “ten” (2001–2020)" },
          { text: "DirectX → Microsoft’s graphics / gaming API" },
          { text: "X (the app) → Twitter, rebranded in 2023" },
          { text: "XQuartz → the X11 windowing system on macOS" },
        ],
      },
    ],
  },

  // Image round — upload each photo on the question slide via the editor.
  {
    number: 8,
    title: "Phase 8: Famous Healthcare Peeps",
    subtitle: "the real who's who?",
    enabled: false,
    questions: [
      { number: 1, text: "Who's this?", points: 1, answer: "Henrietta Lacks (HeLa cells)" },
      { number: 2, text: "Who's this?", points: 1, answer: "Florence Nightingale" },
      { number: 3, text: "Who's this?", points: 1, answer: "Atul Gawande" },
      { number: 4, text: "Who's this?", points: 1, answer: "George Clooney (Dr. Doug Ross on ER)" },
      { number: 5, text: "Who's this?", points: 1, answer: "Alexander Fleming (penicillin)" },
    ],
  },
  {
    number: 9,
    title: "Phase 9: Reverse Spelling Bee",
    subtitle: "you know you know these",
    enabled: false,
    questions: [
      { number: 1, text: "HIPAA", points: 1, answer: "Health Insurance Portability and Accountability Act" },
      { number: 2, text: "HEDIS", points: 1, answer: "Healthcare Effectiveness Data and Information Set" },
      { number: 3, text: "FHIR", points: 1, answer: "Fast Healthcare Interoperability Resources" },
      { number: 4, text: "FQHC", points: 1, answer: "Federally Qualified Health Center" },
      { number: 5, text: "HCC", points: 1, answer: "Hierarchical Condition Category" },
      { number: 6, text: "CMS", points: 1, answer: "Centers for Medicare & Medicaid Services" },
      { number: 7, text: "LTSS", points: 1, answer: "Long-Term Services and Supports" },
    ],
  },
  // Image round — upload a tightly cropped photo on each question slide.
  {
    number: 10,
    title: "Phase 10: Guess the Zoomed-in Thing",
    subtitle: "too close for comfort (drafts — swap in real crops)",
    enabled: false,
    questions: [
      { number: 1, text: "Guess the zoomed-in thing:", points: 1, answer: "Blood pressure gauge (sphygmomanometer)" },
      { number: 2, text: "Guess the zoomed-in thing:", points: 1, answer: "EpiPen" },
      { number: 3, text: "Guess the zoomed-in thing:", points: 1, answer: "Stethoscope chestpiece" },
      { number: 4, text: "Guess the zoomed-in thing:", points: 1, answer: "Pill blister pack" },
      { number: 5, text: "Guess the zoomed-in thing:", points: 1, answer: "Otoscope" },
    ],
  },
  {
    number: 11,
    title: "Phase 11: Prior-Auth Denials",
    subtitle: "real denial reason, or did we make it up?",
    // Drafts — swap in real OOP-sourced denial stories. Each slide offers
    // the same two choices; the reveal states which it is.
    enabled: false,
    questions: [
      {
        number: 1,
        text: "“Step therapy: the member must try and fail two cheaper drugs before we'll cover the one the doctor actually prescribed.”",
        points: 1,
        answer: "Real — step therapy / “fail first” is a common PA tactic.",
        bullets: ["Real", "Made up"],
      },
      {
        number: 2,
        text: "“Denied: prior auth was approved, but the approval expired before the surgery could be scheduled.”",
        points: 1,
        answer: "Real — expiring authorizations are a real headache.",
        bullets: ["Real", "Made up"],
      },
      {
        number: 3,
        text: "“Denied because the diagnosis and procedure codes were submitted in alphabetical order instead of numerical.”",
        points: 1,
        answer: "Made up (… probably).",
        bullets: ["Real", "Made up"],
      },
    ],
  },
  {
    number: 12,
    title: "Phase 12: Monster or Med",
    subtitle: "Pokémon, or prescription?",
    enabled: false,
    questions: [
      { number: 1, text: "Latuda", points: 1, answer: "Med — lurasidone (antipsychotic)", bullets: ["Monster", "Med"] },
      { number: 2, text: "Lunala", points: 1, answer: "Monster — Legendary Pokémon (Gen 7)", bullets: ["Monster", "Med"] },
      { number: 3, text: "Abilify", points: 1, answer: "Med — aripiprazole (antipsychotic)", bullets: ["Monster", "Med"] },
      { number: 4, text: "Absol", points: 1, answer: "Monster — Pokémon (the disaster one)", bullets: ["Monster", "Med"] },
      { number: 5, text: "Xeljanz", points: 1, answer: "Med — tofacitinib (RA/JAK inhibitor)", bullets: ["Monster", "Med"] },
      { number: 6, text: "Girafarig", points: 1, answer: "Monster — Pokémon (and a palindrome!)", bullets: ["Monster", "Med"] },
    ],
  },
  // Image round — upload the cropped “A” from each company's logo.
  {
    number: 13,
    title: "Phase 13: Name the A",
    subtitle: "guess the company from the A in its logo",
    enabled: false,
    questions: [
      { number: 1, text: "Name the company from the “A” in its logo:", points: 1, answer: "Aetna" },
      { number: 2, text: "Name the company from the “A” in its logo:", points: 1, answer: "Anthem (now Elevance Health)" },
      { number: 3, text: "Name the company from the “A” in its logo:", points: 1, answer: "Athenahealth" },
      { number: 4, text: "Name the company from the “A” in its logo:", points: 1, answer: "Aledade" },
      { number: 5, text: "Name the company from the “A” in its logo:", points: 1, answer: "AbbVie" },
      { number: 6, text: "Name the company from the “A” in its logo:", points: 1, answer: "Amgen" },
    ],
  },
];

/** Backwards-compatible alias for the baked-in deck. */
export const sections = DEFAULT_SECTIONS;

export function buildDeck(deckSections: DeckSection[] = DEFAULT_SECTIONS): Slide[] {
  const slides: Slide[] = [];
  slides.push({
    type: "cover",
    title: "SQL trivia",
    subtitle: "LIMIT 100 questions",
    date: "Out of Pocket · Data Camp · June 2026",
  });

  // Each phase is self-contained: cyan section divider → questions for that
  // phase → pink "Phase N · Answers" divider → for each question a Q-alone
  // slide and a Q+answer reveal slide. This is the live-trivia pacing:
  // read out the round, collect answers, then reveal that round's answers
  // before moving on to the next phase. Phases with no questions (Section 0
  // / team intro) emit just the section divider.
  for (const section of deckSections) {
    if (section.enabled === false) continue; // optional round toggled off
    slides.push({
      type: "section",
      sectionNumber: section.number,
      sectionTitle: section.title,
      subtitle: section.subtitle,
      body: section.body,
    });

    // Only included questions present (and get a reveal). A round whose
    // questions are all benched emits just its divider, like the team intro.
    const activeQuestions = section.questions.filter((q) => q.enabled !== false);
    if (activeQuestions.length === 0) continue;

    for (const q of activeQuestions) {
      slides.push({
        type: "question",
        number: q.number,
        text: q.text,
        points: q.points,
        bullets: q.bullets,
        codeBlock: q.codeBlock,
        imageSrc: q.questionImageSrc,
        imageSrc2: q.questionImageSrc2,
        caption: q.questionCaption,
        sourceUrl: q.questionSourceUrl,
        sourceLabel: q.sourceLabel,
      });
    }

    slides.push({
      type: "answers-divider",
      title: `PHASE ${section.number} · ANSWERS`,
      date: "Data Camp · June 2026",
    });

    for (const q of activeQuestions) {
      slides.push({
        type: "question",
        number: q.number,
        text: q.text,
        points: q.points,
        bullets: q.bullets,
        codeBlock: q.codeBlock,
        imageSrc: q.questionImageSrc,
        imageSrc2: q.questionImageSrc2,
        caption: q.questionCaption,
        sourceUrl: q.questionSourceUrl,
        sourceLabel: q.sourceLabel,
      });
      slides.push({
        type: "reveal",
        number: q.number,
        text: q.text,
        points: q.points,
        answer: q.answer,
        bullets: q.revealBullets,
        codeBlock: q.codeBlock,
        imageSrc: q.revealImageSrc,
        imageSrc2: q.revealImageSrc2,
        caption: q.revealCaption,
        sourceUrl: q.revealSourceUrl,
        sourceLabel: q.sourceLabel,
      });
    }
  }

  return slides;
}

export const DECK_TITLE = "Out of Pocket · Data Camp · June 2026";
