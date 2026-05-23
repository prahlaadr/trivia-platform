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
}
