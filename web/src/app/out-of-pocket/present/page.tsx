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
import { buildDeck, type Slide, type DeckSection } from "../deck";
import { loadDeck } from "@/lib/oopDeck";

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
  const [sections, setSections] = useState<DeckSection[] | null>(null);
  const [title, setTitle] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    loadDeck().then((deck) => {
      setSections(deck.sections);
      setTitle(deck.title);
    });
  }, []);

  const deck = useMemo(
    () => (sections ? buildDeck(sections) : []),
    [sections]
  );
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

  // Session timer — counts up from when the presenter opens.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  };

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

  if (!slide) {
    return (
      <div className="oop-scope flex h-dvh items-center justify-center">
        <p className="text-lg font-bold tracking-widest text-black/50">Loading deck…</p>
      </div>
    );
  }

  return (
    <div className="oop-scope flex h-dvh flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b-2 border-black px-6 py-3">
        <Link
          href="/out-of-pocket"
          className="text-sm font-bold tracking-widest underline-offset-4 hover:underline"
        >
          ← BACK
        </Link>
        <p className="hidden text-xs font-bold uppercase tracking-[0.3em] text-black/60 sm:block">
          Out of Pocket Mode · {title}
        </p>
        <div className="flex items-center gap-3">
          <span
            className="rounded border-2 border-black bg-[var(--oop-yellow)] px-3 py-1 text-base font-extrabold tabular-nums tracking-wide"
            title="Session time"
          >
            {formatElapsed(elapsed)}
          </span>
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

      {/* Slide viewport — a size container so the card can be sized off the
          REAL available area (no hard-coded chrome offsets). */}
      <div className="relative flex flex-1 items-center justify-center p-4 [container-type:size]">
        {/* Largest 16:9 card that fits: width is the lesser of the container
            width (100%) and what the container height allows (100cqh × 16/9). */}
        <div
          className="w-full"
          style={{ maxWidth: "min(100%, calc(100cqh * 16 / 9))" }}
        >
          <RenderSlide slide={slide} />
        </div>
        {/* Tap zones — left half = prev, right half = next. */}
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Previous slide"
          className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-w-resize bg-transparent disabled:cursor-default"
        />
        <button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
          aria-label="Next slide"
          className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-e-resize bg-transparent disabled:cursor-default"
        />
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
