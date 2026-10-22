export type DifficultyFilter = "easy" | "medium" | "hard" | "mixed";

export interface BankCategory {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  questionCount: number;
}

export interface BankSubcategory {
  id: number;
  categoryId: number;
  categorySlug: string;
  slug: string;
  name: string;
  isCatchall: boolean;
  questionCount: number;
}

export interface BankQuestion {
  id: string;
  source: string;
  sourceUrl: string | null;
  text: string;
  answer: string;
  aliases: string[];
  categorySlug: string;
  subcategorySlug: string;
  difficulty: "easy" | "medium" | "hard";
  questionType: "open_ended" | "multiple_choice" | "true_false";
  choices: string[];
  qualityScore: number;
  /** CMU rhyming part, precomputed for single-word answers (rhyme patterns). */
  rhymeKey?: string | null;
}

/** A connection round where the ANSWERS share a structural thread, not a topic. */
export type PatternKind = "string" | "keyword" | "rhyme";
export interface PatternSpec {
  kind: PatternKind;
  /** letters to hide (string), the shared word (keyword), or a word to rhyme with (rhyme). */
  value: string;
}
