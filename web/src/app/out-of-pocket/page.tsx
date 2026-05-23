"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  OopCoverSlide,
  OopSectionSlide,
  OopQuestionSlide,
  OopRevealSlide,
  OopAnswersDividerSlide,
} from "@/components/oop/OopSlides";
import { buildDeck, DECK_TITLE, type Slide } from "./deck";

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
          body={slide.body}
        />
      );
    case "question":
      return (
        <OopQuestionSlide
          number={slide.number}
          text={slide.text}
          points={slide.points}
          bullets={slide.bullets}
          codeBlock={slide.codeBlock}
          imageSrc={slide.imageSrc}
          imageSrc2={slide.imageSrc2}
          caption={slide.caption}
          sourceUrl={slide.sourceUrl}
          sourceLabel={slide.sourceLabel}
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
          codeBlock={slide.codeBlock}
          imageSrc={slide.imageSrc}
          imageSrc2={slide.imageSrc2}
          caption={slide.caption}
          sourceUrl={slide.sourceUrl}
          sourceLabel={slide.sourceLabel}
        />
      );
    case "answers-divider":
      return <OopAnswersDividerSlide title={slide.title} date={slide.date} />;
  }
}

export default function OutOfPocketPresenter() {
  const deck = useMemo(() => buildDeck(), []);
  const [index, setIndex] = useState(0);
  const total = deck.length;
  const slide = deck[index];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, toggleFullscreen]);

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
        <p className="hidden text-xs font-bold uppercase tracking-[0.3em] text-black/60 sm:block">
          Out of Pocket Mode · {DECK_TITLE}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="rounded border-2 border-black bg-white px-3 py-1 text-xs font-bold transition-all hover:bg-[var(--oop-yellow)]"
            title="Toggle fullscreen (F)"
          >
            ⛶ Fullscreen
          </button>
          <p className="text-sm font-bold">
            {index + 1} / {total}
          </p>
        </div>
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
          ← / → or Space to navigate · F for fullscreen
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
