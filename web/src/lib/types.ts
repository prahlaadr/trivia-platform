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
}
