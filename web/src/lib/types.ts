export interface Question {
  number: number;
  text: string;
  answer: string;
  choices: string[];
  is_internet_only: boolean;
}

export interface Round {
  number: number;
  title: string;
  round_type: "standard" | "video" | "progressive" | "list";
  points_per_question: number;
  joker_eligible: boolean;
  theme_description: string;
  questions: Question[];
  clues: { points: number; text: string }[];
  progressive_answer: string;
}

export interface MiniGame {
  number: number;
  title: string;
  description: string;
}

export interface Quiz {
  quiz_number: number;
  date: string;
  rounds: Round[];
  mini_games: MiniGame[];
  tie_breaker_question: string;
  tie_breaker_answer: string;
}

// A "slide" is a rendered view in the presenter
export type SlideType =
  | "title"
  | "round-title"
  | "internet-question"
  | "questions-overview"
  | "question"
  | "answer"
  | "progressive-clue"
  | "progressive-answer"
  | "video-answers"
  | "tie-breaker-question"
  | "tie-breaker-answer";

export interface Slide {
  type: SlideType;
  roundNumber?: number;
  roundTitle?: string;
  quiz?: Quiz;
  round?: Round;
  question?: Question;
  clueIndex?: number; // for progressive rounds
  isLastRound?: boolean; // last round = doubled points
}

// ── Game Gen types ──

export interface GameGenTeam {
  id: string;
  name: string;
  topics: string[]; // 3 topic picks
}

export interface GeneratedQuestion {
  number: number;
  text: string;
  answer: string;
  topic: string;
  source: "ai" | "bank";
}

export interface GeneratedRound {
  number: number;
  title: string;
  topic: string;
  questions: GeneratedQuestion[];
}

export interface GameGenSession {
  id: string;
  createdAt: string;
  status: "registering" | "generating" | "reviewing" | "ready";
  teams: GameGenTeam[];
  rounds: GeneratedRound[];
  tieBreaker?: { question: string; answer: string };
}
