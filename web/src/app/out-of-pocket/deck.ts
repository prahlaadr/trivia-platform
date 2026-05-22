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
    }
  | {
      type: "reveal";
      number: number;
      text: string;
      points: number;
      answer: string;
      bullets?: { text: string; correct?: boolean }[];
      codeBlock?: string;
    }
  | { type: "answers-divider"; date?: string };

interface DeckQuestion {
  number: number;
  text: string;
  points: number;
  answer: string;
  bullets?: string[];
  revealBullets?: { text: string; correct?: boolean }[];
  codeBlock?: string;
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
      },
      {
        number: 4,
        text: "Shaun of the Dead, Hot Fuzz, and The World’s End are the movies in this trilogy, named after an ice cream … or a pastry, depending on where in Europe you find yourself",
        points: 1,
        answer: "Cornetto",
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
      },
      {
        number: 4,
        text: "The world’s biggest one of these can be found in Portugal (Parque da Cidade, Porto). It measures 25,100 sq. m (270,174 sq. ft)",
        points: 1,
        answer: "Quilt",
      },
      {
        number: 5,
        text: "When this is baked into tart form, it becomes Harry Potter’s favorite treat",
        points: 1,
        answer: "Treacle",
      },
      {
        number: 6,
        text: "This dog is half dachshund mixed with ________",
        points: 1,
        answer: "Beagle (his name is Bodhi)",
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

  for (const section of sections) {
    slides.push({
      type: "section",
      sectionNumber: section.number,
      sectionTitle: section.title,
      subtitle: section.subtitle,
    });
    for (const q of section.questions) {
      slides.push({
        type: "question",
        number: q.number,
        text: q.text,
        points: q.points,
        bullets: q.bullets,
        codeBlock: q.codeBlock,
      });
      slides.push({
        type: "reveal",
        number: q.number,
        text: q.text,
        points: q.points,
        answer: q.answer,
        bullets: q.revealBullets,
        codeBlock: q.codeBlock,
      });
    }
  }

  slides.push({ type: "answers-divider", date: "Sep 2025" });

  return slides;
}

export const DECK_TITLE = "Sep 2025 SQL Trivia · expanded for Data Camp";
