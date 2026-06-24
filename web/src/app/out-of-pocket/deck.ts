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
      matchPairs?: { term: string; definition: string }[];
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
      matchPairs?: { term: string; definition: string }[];
      codeBlock?: string;
      imageSrc?: string;
      imageSrc2?: string;
      caption?: string;
      sourceUrl?: string;
      sourceLabel?: string;
    }
  | { type: "answers-divider"; title?: string; date?: string };

/** The "shape" of a question — drives which fields the editor shows and which
 *  mechanic the slides render. Inferred from populated fields when absent. */
export type QuestionKind = "standard" | "choices" | "code" | "matching" | "ordering";

export interface DeckQuestion {
  number: number;
  /** Questions default to included. Set false to keep a question "on the
   *  bench" — skipped by buildDeck and not counted, but still editable and
   *  toggleable per event. Mirrors DeckSection.enabled. */
  enabled?: boolean;
  /** Question shape. If omitted, inferred via inferKind(). */
  kind?: QuestionKind;
  text: string;
  points: number;
  answer: string;
  bullets?: string[];
  revealBullets?: { text: string; correct?: boolean }[];
  /** A matching question: question slide shows terms + shuffled definitions
   *  (both columns); reveal shows each term next to its correct definition. */
  matchPairs?: { term: string; definition: string }[];
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

/** Infer a question's kind from its populated fields (for legacy questions
 *  without an explicit `kind`). */
export function inferKind(q: DeckQuestion): QuestionKind {
  if (q.kind) return q.kind;
  if (q.matchPairs && q.matchPairs.length) return "matching";
  if (q.codeBlock) return "code";
  if (q.revealBullets && q.revealBullets.length) return "choices";
  if (q.bullets && q.bullets.length) {
    return /→|->|order/i.test(q.answer || "") ? "ordering" : "choices";
  }
  return "standard";
}

/** The baked-in deck. Used as the seed/default when no saved deck exists,
 *  and as the "Reset to original" target. */
export const DEFAULT_SECTIONS: DeckSection[] = [
  {
    "number": 0,
    "title": "Get into your teams + team name",
    "subtitle": "(we’re all zero-indexed, right?)",
    "body": "You should have gotten your team number assigned at the start. If not or you forgot, introduce yourself to a team! Also, think of a team name. Some ideas to get you started: Drop table like it’s hot; dude, where’s my data; null pointer sisters; smells like updag in here",
    "questions": []
  },
  {
    "number": 1,
    "title": "Phase 1: Movies and SQL",
    "subtitle": "your queries betray you",
    "questions": [
      {
        "number": 1,
        "text": "Identify the movie from the SQL:",
        "points": 1,
        "codeBlock": "SELECT * FROM Earth\nWHERE population = population / 2;",
        "answer": "Avengers: Infinity War",
        "revealImageSrc": "/oop/movies/infinity-war.png"
      },
      {
        "number": 2,
        "text": "Identify the movie from the SQL:",
        "points": 1,
        "answer": "Interstellar",
        "kind": "code",
        "codeBlock": "SELECT CASE WHEN gravity = 'extreme'\n            THEN '7 years' ELSE '1 hour' END AS time_passed\nFROM endurance;",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/interstellar-1781620674043.jpg"
      },
      {
        "number": 3,
        "text": "Identify the movie from the SQL:",
        "points": 1,
        "answer": "Inception",
        "kind": "code",
        "codeBlock": "SELECT * FROM reality\nWHERE dream_id IN (\n        SELECT dream_id FROM dream\n        WHERE level_id IN (\n                SELECT level_id FROM level\n                WHERE deeper_id IN (\n                        SELECT deeper_id FROM deeper\n                        WHERE limbo_id IN (\n                                SELECT limbo_id FROM limbo))));",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/16inceptioncap-articlelarge-1781620176880.webp",
        "revealCaption": "yo dawg heard you like subqueries"
      },
      {
        "number": 4,
        "text": "Identify the movie from the SQL:",
        "points": 1,
        "answer": "10 Things I Hate About You",
        "kind": "code",
        "codeBlock": "SELECT * FROM feelings\nWHERE target = 'you'\nORDER BY hatred DESC\nLIMIT 10;",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/fd332b5a-0b2c-42d3-9663-6b28f66eeefe-1200x675-1781620849346.jpg",
        "revealCaption": "11: your insistence on using semicolons"
      },
      {
        "number": 5,
        "text": "Identify the movie (or musical!) from the SQL:",
        "points": 1,
        "answer": "Les Misérables",
        "kind": "code",
        "codeBlock": "SELECT * FROM prisoners\nWHERE prisoner_id = 24601;",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/81e1npaqjml-ac-uf1000-1000-ql80-1781621000751.jpg"
      },
      {
        "number": 6,
        "text": "Identify the movie from the SQL:",
        "points": 1,
        "answer": "Groundhog Day",
        "kind": "code",
        "codeBlock": "DECLARE @day INT\nSET @day = 1\nWHILE (@day <= 10)\nBEGIN\n    PRINT 'Feb 2'\nEND"
      }
    ]
  },
  {
    "number": 2,
    "title": "Phase 2: Oh you're a data fan? Name every data",
    "subtitle": "you know you know these",
    "questions": [
      {
        "number": 1,
        "text": "Guess the data tool from its logo:",
        "points": 1,
        "answer": "R",
        "questionImageSrc": "/oop/logos/r.svg",
        "revealCaption": "okay that was an easy one"
      },
      {
        "number": 2,
        "text": "Guess the data tool from its logo:",
        "points": 1,
        "answer": "Google Sheets",
        "questionImageSrc": "/oop/logos/google-sheets.svg",
        "revealCaption": "The universal clinical-ops spreadsheet, for better or worse."
      },
      {
        "number": 3,
        "text": "Guess the data tool from its logo:",
        "points": 1,
        "answer": "Python",
        "questionImageSrc": "/oop/logos/python.svg",
        "revealCaption": "Workhorse for health data science & ML."
      },
      {
        "number": 4,
        "text": "Guess the data tool from its logo:",
        "points": 1,
        "answer": "Databricks",
        "questionImageSrc": "/oop/logos/databricks-icon.png",
        "revealImageSrc": "/oop/logos/databricks.png",
        "revealCaption": "Lakehouse for large-scale clinical & genomic ML."
      },
      {
        "number": 5,
        "text": "Guess the data tool from its logo:",
        "points": 1,
        "answer": "MATLAB",
        "questionImageSrc": "/oop/logos/matlab.png",
        "revealCaption": "Medical imaging and biosignal (ECG/EEG) processing."
      },
      {
        "number": 6,
        "text": "Guess the data tool from its logo:",
        "points": 1,
        "answer": "Microsoft Power BI",
        "questionImageSrc": "/oop/logos/powerbi.svg",
        "revealCaption": "Dashboards across payers, providers & hospital ops."
      }
    ]
  },
  {
    "number": 3,
    "title": "Phase 3: X Marks the Spot",
    "subtitle": "every answer starts with X",
    "questions": [
      {
        "number": 1,
        "text": "Match each X-term to its definition:",
        "points": 8,
        "answer": "",
        "matchPairs": [
          {
            "term": "X12",
            "definition": "The bread-and-butter data format — if you deal with healthcare billing, you've had nightmares parsing an X12 EDI file."
          },
          {
            "term": "χ² ",
            "definition": "Chi-Square: The stats test for comparing categorical variables in clinical data."
          },
          {
            "term": "X-23",
            "definition": "Laura Kinney — the mutant clone and adopted daughter of Wolverine (X-Men comics, the movie Logan)."
          },
          {
            "term": "X Æ A-12",
            "definition": "Elon Musk and Grimes' famously unpronounceable kid — broke a few birth-certificate databases with its special characters."
          },
          {
            "term": "X7",
            "definition": "BMW's flagship full-size luxury SUV."
          },
          {
            "term": "XGBoost",
            "definition": "The gradient-boosting library quietly powering a huge share of clinical risk-prediction and tabular-ML models."
          },
          {
            "term": "XML",
            "definition": "The markup behind HL7 CDA / C-CDA clinical documents — the verbose ancestor before everyone moved to FHIR + JSON."
          }
        ]
      }
    ],
    "enabled": true
  },
  {
    "number": 4,
    "title": "Phase 4: Charts about 🎵🎵charts🎵🎵",
    "subtitle": "The answer to these will be a musician or band",
    "questions": [
      {
        "number": 1,
        "text": "Which musician does this chart represent?",
        "points": 1,
        "answer": "Taylor Swift",
        "questionImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-neli-1781808764032.png",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-neli-1781808787743.png"
      },
      {
        "number": 2,
        "text": "Which band does this chart represent?",
        "points": 1,
        "answer": "Fleetwood Mac",
        "kind": "standard",
        "questionImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-nacu-1781808799169.png",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-nacu-1781808812546.png",
        "revealCaption": "they never stopped thinking about tomorrow"
      },
      {
        "number": 3,
        "text": "Which musician does this chart represent?",
        "points": 1,
        "answer": "Mariah Carey (I will also accept Michael Bublé, although his spikes in 2022 should be lower",
        "kind": "standard",
        "questionImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-neag-1781808952588.png",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-neag-1781808955398.png"
      },
      {
        "number": 4,
        "text": "Which musician does this chart represent? ",
        "points": 1,
        "answer": "Adele",
        "kind": "standard",
        "questionImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-ngjn-1781809010954.png",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-ngjn-1781809015009.png"
      },
      {
        "number": 5,
        "text": "Which musician does this chart represent?",
        "points": 1,
        "answer": "Mr Worldwide himself, Pitbull",
        "kind": "standard",
        "questionImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-ngmp-1781809045801.png",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/scr-20260618-ngmp-1781809047693.png"
      }
    ]
  },
  {
    "number": 5,
    "title": "Tiebreakers!",
    "subtitle": "The answer to all of these will be a pun on a musician or band",
    "questions": [
      {
        "number": 1,
        "text": "Example! \n\nWhat do you call it when Jimmy Fallon's House Band decides to measure the average size of the error between a model’s predictions and the real data?",
        "points": 1,
        "answer": "The Roots Mean Square",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/the-roots-02-1782246664730.jpg"
      },
      {
        "number": 2,
        "text": "Tiebreaker 1: where the singer of \"brat\" puts the independent variable on a chart",
        "points": 1,
        "answer": "Charlie XCX-axis",
        "kind": "standard",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/brat-font-1782246772091.png"
      },
      {
        "number": 3,
        "text": "Tiebreaker 2: this famous soulful crooner + pianist always includes a key that maps each color to the data it represents when he makes charts",
        "points": 1,
        "answer": "John Legend",
        "kind": "standard",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/gettyimages-1058976308-1782247186431.jpg"
      },
      {
        "number": 4,
        "text": "Tiebreaker 3: this chanteuse WILL write a Love Song to this standard chart that depicts data with stacked rectangles ",
        "points": 1,
        "answer": "Sara Bar-Chart-eilles",
        "kind": "standard",
        "revealImageSrc": "https://5hr43axeywo90xkd.public.blob.vercel-storage.com/oop/uploads/ab67616d0000b273402ee46c35743e5b515a7fd8-1782247188650.jpeg"
      }
    ],
    "body": "Get thee to a punnery"
  }
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

    // Render only the mechanic the question's kind uses (media stays universal),
    // so the slides stay consistent even if old fields linger after a type switch.
    const questionSlide = (q: DeckQuestion): Slide => {
      const k = inferKind(q);
      return {
        type: "question",
        number: q.number,
        text: q.text,
        points: q.points,
        bullets: k === "choices" || k === "ordering" ? q.bullets : undefined,
        matchPairs: k === "matching" ? q.matchPairs : undefined,
        codeBlock: k === "code" ? q.codeBlock : undefined,
        imageSrc: q.questionImageSrc,
        imageSrc2: q.questionImageSrc2,
        caption: q.questionCaption,
        sourceUrl: q.questionSourceUrl,
        sourceLabel: q.sourceLabel,
      };
    };

    for (const q of activeQuestions) {
      slides.push(questionSlide(q));
    }

    slides.push({
      type: "answers-divider",
      title: `PHASE ${section.number} · ANSWERS`,
      date: "Data Camp · June 2026",
    });

    for (const q of activeQuestions) {
      const k = inferKind(q);
      slides.push(questionSlide(q));
      slides.push({
        type: "reveal",
        number: q.number,
        text: q.text,
        points: q.points,
        answer: q.answer,
        bullets: k === "choices" ? q.revealBullets : undefined,
        matchPairs: k === "matching" ? q.matchPairs : undefined,
        codeBlock: k === "code" ? q.codeBlock : undefined,
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
