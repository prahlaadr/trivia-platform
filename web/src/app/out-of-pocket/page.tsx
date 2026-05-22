"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  OopCoverSlide,
  OopSectionSlide,
  OopQuestionSlide,
  OopRevealSlide,
  OopAnswersDividerSlide,
} from "@/components/oop/OopSlides";

// Sample deck — Sep 2025 OOP SQL trivia (subset, for the slideshow shell).
// Phase 2 will replace this with PPTX-parsed slides.
type Slide =
  | { type: "cover"; title: string; subtitle?: string; date?: string }
  | { type: "section"; sectionNumber: number; sectionTitle: string; subtitle?: string }
  | { type: "question"; number: number; text: string; points: number; bullets?: string[] }
  | {
      type: "reveal";
      number: number;
      text: string;
      points: number;
      answer: string;
      bullets?: { text: string; correct?: boolean }[];
    }
  | { type: "answers-divider"; date?: string };

const SAMPLE_DECK: Slide[] = [
  { type: "cover", title: "SQL trivia", subtitle: "LIMIT 100 questions", date: "Sep 2025" },
  {
    type: "section",
    sectionNumber: 0,
    sectionTitle: "Get into your teams + team name",
    subtitle: "we're all zero-indexed, right?",
  },
  { type: "section", sectionNumber: 1, sectionTitle: "Phase 1: SQL trivia!", subtitle: "SELECT *" },
  { type: "question", number: 1, text: "What does SQL stand for?", points: 1 },
  {
    type: "reveal",
    number: 1,
    text: "What does SQL stand for?",
    points: 1,
    answer: "Structured Query Language",
  },
  {
    type: "question",
    number: 2,
    text: "What does the “R” stand for in the R programming language?",
    points: 2,
  },
  {
    type: "reveal",
    number: 2,
    text: "What does the “R” stand for in the R programming language?",
    points: 2,
    answer: "Ross (Ihaka) or Robert (Gentleman): creators of R language",
  },
  {
    type: "section",
    sectionNumber: 2,
    sectionTitle: "Phase 2: Sequel trivia",
    subtitle: "oops name collision",
  },
  {
    type: "question",
    number: 1,
    text: "Which of the following are real Avatar movie sequels?",
    points: 3,
    bullets: ["Way of Water", "Search for the Air Seed", "Fire and Ash", "The Tulkun Rider", "The Wind Awakens"],
  },
  {
    type: "reveal",
    number: 1,
    text: "Which of the following are real Avatar movie sequels?",
    points: 3,
    answer: "",
    bullets: [
      { text: "Way of Water", correct: true },
      { text: "Search for the Air Seed" },
      { text: "Fire and Ash", correct: true },
      { text: "The Tulkun Rider", correct: true },
      { text: "The Wind Awakens" },
    ],
  },
  { type: "answers-divider", date: "Sep 2025" },
];

function RenderSlide({ slide }: { slide: Slide }) {
  switch (slide.type) {
    case "cover":
      return <OopCoverSlide title={slide.title} subtitle={slide.subtitle} date={slide.date} />;
    case "section":
      return (
        <OopSectionSlide
          sectionNumber={slide.sectionNumber}
          sectionTitle={slide.sectionTitle}
          subtitle={slide.subtitle}
        />
      );
    case "question":
      return (
        <OopQuestionSlide
          number={slide.number}
          text={slide.text}
          points={slide.points}
          bullets={slide.bullets}
        />
      );
    case "reveal":
      return (
        <OopRevealSlide
          number={slide.number}
          text={slide.text}
          points={slide.points}
          answer={slide.answer}
          bullets={slide.bullets}
        />
      );
    case "answers-divider":
      return <OopAnswersDividerSlide date={slide.date} />;
  }
}

export default function OutOfPocketPresenter() {
  const [index, setIndex] = useState(0);
  const total = SAMPLE_DECK.length;
  const slide = SAMPLE_DECK[index];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  return (
    <div className="oop-scope flex min-h-screen flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b-2 border-black px-6 py-3">
        <Link
          href="/"
          className="text-sm font-bold tracking-widest underline-offset-4 hover:underline"
        >
          ← BACK
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/60">
          Out of Pocket Mode · Sample deck
        </p>
        <p className="text-sm font-bold">
          {index + 1} / {total}
        </p>
      </div>

      {/* Slide viewport */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <RenderSlide slide={slide} />
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between border-t-2 border-black px-6 py-3">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="rounded border-2 border-black bg-white px-4 py-1.5 text-sm font-bold transition-all disabled:opacity-30 enabled:hover:bg-[var(--oop-cyan)]"
        >
          ← Prev
        </button>
        <p className="text-xs uppercase tracking-widest text-black/60">
          ← / → or Space to navigate
        </p>
        <button
          onClick={goNext}
          disabled={index === total - 1}
          className="rounded border-2 border-black bg-white px-4 py-1.5 text-sm font-bold transition-all disabled:opacity-30 enabled:hover:bg-[var(--oop-pink)]"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
