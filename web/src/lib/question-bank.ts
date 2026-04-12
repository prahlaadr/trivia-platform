/**
 * Question Bank module — loads r/trivia questions from CSV,
 * provides category browsing and wildcard game generation.
 */

import type { GeneratedRound, GeneratedQuestion, GameGenSession } from "./types";

export interface BankQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "multiple_choice" | "open_ended" | "true_false";
  options: string[];
  postAuthor: string;
  postDate: string;
}

export interface CategoryInfo {
  name: string;
  count: number;
  difficulties: { easy: number; medium: number; hard: number };
}

let cachedQuestions: BankQuestion[] | null = null;

/**
 * Parse the CSV data into BankQuestion objects.
 * Called once on first load, then cached.
 */
function parseCSV(csvText: string): BankQuestion[] {
  const lines = csvText.split("\n");
  const questions: BankQuestion[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV parsing — handle quoted fields
    const fields = parseCSVLine(line);
    if (fields.length < 10) continue;

    const [id, question, answer, category, difficulty, questionType, options, postAuthor, postDate] =
      fields;

    if (!question || !answer) continue;

    questions.push({
      id,
      question,
      answer,
      category,
      difficulty: (difficulty as BankQuestion["difficulty"]) || "medium",
      questionType: (questionType as BankQuestion["questionType"]) || "open_ended",
      options: options ? options.split(" | ").filter(Boolean) : [],
      postAuthor,
      postDate,
    });
  }

  return questions;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Load all questions from the CSV file.
 * In browser: fetches from /data/question-bank/r-trivia-questions.csv
 */
export async function loadQuestionBank(): Promise<BankQuestion[]> {
  if (cachedQuestions) return cachedQuestions;

  const response = await fetch("/data/question-bank/r-trivia-questions.csv");
  if (!response.ok) throw new Error("Failed to load question bank");
  const text = await response.text();
  cachedQuestions = parseCSV(text);
  return cachedQuestions;
}

/**
 * Get all unique categories with counts.
 */
export function getCategories(questions: BankQuestion[]): CategoryInfo[] {
  const map = new Map<string, CategoryInfo>();

  for (const q of questions) {
    let info = map.get(q.category);
    if (!info) {
      info = { name: q.category, count: 0, difficulties: { easy: 0, medium: 0, hard: 0 } };
      map.set(q.category, info);
    }
    info.count++;
    info.difficulties[q.difficulty]++;
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Pick N random questions from a category, optionally filtered by difficulty.
 */
export function pickQuestions(
  questions: BankQuestion[],
  category: string,
  count: number,
  difficulty?: "easy" | "medium" | "hard"
): BankQuestion[] {
  let pool = questions.filter((q) => q.category === category);
  if (difficulty) pool = pool.filter((q) => q.difficulty === difficulty);

  // Fisher-Yates shuffle and take first N
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Generate a wildcard game: 6 random categories, 8 questions each.
 * Returns a GameGenSession compatible with the Presenter.
 */
export function generateWildcardGame(
  questions: BankQuestion[],
  options?: {
    numRounds?: number;
    questionsPerRound?: number;
    categories?: string[]; // if provided, use these instead of random
    difficulty?: "easy" | "medium" | "hard" | "mixed";
  }
): GameGenSession {
  const numRounds = options?.numRounds ?? 6;
  const qPerRound = options?.questionsPerRound ?? 8;
  const difficulty = options?.difficulty === "mixed" ? undefined : options?.difficulty;

  // Pick categories
  let categories: string[];
  if (options?.categories?.length) {
    categories = options.categories;
  } else {
    // Pick random categories (weighted by question count, skip tiny categories)
    const allCats = getCategories(questions).filter((c) => c.count >= qPerRound);
    const shuffled = [...allCats];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    categories = shuffled.slice(0, numRounds).map((c) => c.name);
  }

  // Generate rounds
  const rounds: GeneratedRound[] = categories.map((cat, i) => {
    const picked = pickQuestions(questions, cat, qPerRound, difficulty);
    return {
      number: i + 1,
      title: cat,
      topic: cat,
      questions: picked.map((q, j) => ({
        number: j + 1,
        text: q.question,
        answer: q.answer,
        topic: cat,
        source: "bank" as const,
      })),
    };
  });

  // Pick a tiebreaker from any category
  const allForTiebreaker = questions.filter((q) => q.difficulty === "hard");
  const tiebreaker =
    allForTiebreaker[Math.floor(Math.random() * allForTiebreaker.length)] || questions[0];

  return {
    id: `wildcard-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    status: "ready",
    teams: [],
    rounds,
    tieBreaker: {
      question: tiebreaker.question,
      answer: tiebreaker.answer,
    },
  };
}
