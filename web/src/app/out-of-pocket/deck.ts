/* Out of Pocket sample deck — Sep 2025 SQL Trivia full content
 * plus a new "SQL at the Movies" Section 4 contributed for Data Camp 2026.
 *
 * Source: outofpocket-sql-trivia-sep-2025.pdf (the Sep 2025 OOP trivia deck).
 * Each question becomes a (question slide) → (reveal slide) pair via buildDeck.
 */

export type Slide =
  | { type: "cover"; title: string; subtitle?: string; date?: string }
  | {
      type: "section";
      sectionNumber: number;
      sectionTitle: string;
      subtitle?: string;
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

interface DeckQuestion {
  number: number;
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

interface DeckSection {
  number: number;
  title: string;
  subtitle?: string;
  questions: DeckQuestion[];
}

const sections: DeckSection[] = [
  {
    number: 0,
    title: "Get into your teams + team name",
    subtitle: "we’re all zero-indexed, right?",
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
        points: 2,
        answer: "Ross (Ihaka) or Robert (Gentleman): creators of R language",
      },
      {
        number: 3,
        text: "Put these in the correct order of evaluation (all or nothing):",
        points: 3,
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
        text: "What year was The Empire Strikes Back released?",
        points: 1,
        answer: "1980",
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
        text: "The Devil Wears Prada 2 is in production for a 2026 release. What does Anne Hathaway’s character Andy do for a living when the sequel opens, per the early reports?",
        points: 2,
        answer:
          "She’s a magazine executive (Vogue-esque) trying to land Miranda Priestly as a guest editor — “Andy is now the boss.”",
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
    title: "Phase 3: ??? trivia",
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
        codeBlock:
          "BEGIN TRANSACTION;\nROLLBACK;\nBEGIN TRANSACTION;\nROLLBACK;\n-- ad infinitum",
        answer: "Groundhog Day",
      },
      {
        number: 3,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "UPDATE students\nSET status = 'wizard'\nWHERE age = 11;",
        answer: "Harry Potter and the Sorcerer’s Stone",
      },
      {
        number: 4,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "SELECT TOP 1 *\nFROM candidates\nORDER BY kill_count DESC;",
        answer: "John Wick",
      },
      {
        number: 5,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "DROP TABLE skynet;",
        answer: "Terminator 2: Judgment Day",
      },
      {
        number: 6,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "INSERT INTO DeLorean (destination_year)\nVALUES (1955);",
        answer: "Back to the Future",
      },
      {
        number: 7,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "SELECT name FROM fish\nWHERE parent = 'Marlin'\n  AND status = 'missing';",
        answer: "Finding Nemo",
      },
      {
        number: 8,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "DELETE FROM Matrix\nWHERE type = 'human'\n  AND awakened = FALSE;",
        answer: "The Matrix",
      },
      {
        number: 9,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "ALTER TABLE Bruce_Wayne\nADD COLUMN persona VARCHAR(10)\nDEFAULT 'Batman';",
        answer: "Batman Begins",
      },
      {
        number: 10,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "MERGE INTO Corleone_Family\nUSING rivals\nON conflict = TRUE\nWHEN MATCHED THEN DELETE;",
        answer: "The Godfather Part II",
      },
    ],
  },
];

export function buildDeck(): Slide[] {
  const slides: Slide[] = [];
  slides.push({
    type: "cover",
    title: "SQL trivia",
    subtitle: "LIMIT 100 questions",
    date: "Sep 2025",
  });

  // Each phase is self-contained: cyan section divider → questions for that
  // phase → pink "Phase N · Answers" divider → for each question a Q-alone
  // slide and a Q+answer reveal slide. This is the live-trivia pacing:
  // read out the round, collect answers, then reveal that round's answers
  // before moving on to the next phase. Phases with no questions (Section 0
  // / team intro) emit just the section divider.
  for (const section of sections) {
    slides.push({
      type: "section",
      sectionNumber: section.number,
      sectionTitle: section.title,
      subtitle: section.subtitle,
    });

    if (section.questions.length === 0) continue;

    for (const q of section.questions) {
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
      date: "Sep 2025",
    });

    for (const q of section.questions) {
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

export const DECK_TITLE = "Sep 2025 SQL Trivia · expanded for Data Camp";
