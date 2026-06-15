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
          matchPairs={slide.matchPairs}
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
          matchPairs={slide.matchPairs}
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
  const [jumpOpen, setJumpOpen] = useState(false);

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

  // Phase index for the "jump to" menu — scan the built deck so it stays in
  // sync with any edits. Each phase's questions start at its `section` divider;
  // its answers start at the `answers-divider` slide (absent for the team
  // intro, which has no questions).
  const phases = useMemo(() => {
    const list: {
      number: number;
      title: string;
      qIndex: number;
      aIndex?: number;
    }[] = [];
    deck.forEach((s, i) => {
      if (s.type === "section") {
        list.push({ number: s.sectionNumber, title: s.sectionTitle, qIndex: i });
      } else if (s.type === "answers-divider") {
        const last = list[list.length - 1];
        if (last) last.aIndex = i;
      }
    });
    return list;
  }, [deck]);

  // Which phase the current slide belongs to (last phase whose Q-block started
  // at or before the current index) — used to highlight the active row.
  const activePhase = useMemo(() => {
    let active = -1;
    phases.forEach((p, i) => {
      if (index >= p.qIndex) active = i;
    });
    return active;
  }, [phases, index]);

  const jumpTo = useCallback((i: number) => {
    setIndex(i);
    setJumpOpen(false);
  }, []);

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
      // While the jump menu is open, only Escape (closes it) is handled — let
      // arrow keys scroll the menu instead of advancing slides underneath.
      if (jumpOpen) {
        if (e.key === "Escape") setJumpOpen(false);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "j" || e.key === "J") {
        setJumpOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, toggleFullscreen, jumpOpen]);

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
        <p className="hidden text-xs uppercase tracking-widest text-black/60 md:block">
          ← / → or Space to navigate · F for fullscreen · J to jump
        </p>
        <div className="relative flex items-center gap-2">
          {/* Jump-to-phase menu */}
          {jumpOpen && (
            <button
              type="button"
              aria-label="Close jump menu"
              onClick={() => setJumpOpen(false)}
              className="fixed inset-0 z-30 cursor-default bg-black/10"
            />
          )}
          {jumpOpen && (
            <div className="absolute bottom-full right-0 z-40 mb-3 max-h-[65vh] w-72 overflow-y-auto rounded-xl border-4 border-black bg-white p-2 shadow-[6px_6px_0_0_#000]">
              <p className="px-1 pb-2 pt-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black/50">
                Jump to phase
              </p>
              <div className="space-y-1">
                {phases.map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                      i === activePhase ? "bg-[var(--oop-cyan)]/30" : ""
                    }`}
                  >
                    <span
                      className="w-5 shrink-0 text-center text-xs font-extrabold tabular-nums text-black/50"
                      title={`Phase ${p.number}`}
                    >
                      {p.number}
                    </span>
                    <span
                      className="flex-1 truncate text-xs font-bold"
                      title={p.title}
                    >
                      {p.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => jumpTo(p.qIndex)}
                      className="shrink-0 rounded border-2 border-black bg-white px-2 py-0.5 text-[11px] font-extrabold transition-all hover:bg-[var(--oop-cyan)]"
                      title="Jump to this phase's questions"
                    >
                      Q
                    </button>
                    <button
                      type="button"
                      onClick={() => p.aIndex !== undefined && jumpTo(p.aIndex)}
                      disabled={p.aIndex === undefined}
                      className="shrink-0 rounded border-2 border-black bg-white px-2 py-0.5 text-[11px] font-extrabold transition-all enabled:hover:bg-[var(--oop-pink)] disabled:opacity-25"
                      title="Jump to this phase's answers"
                    >
                      Ans
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setJumpOpen((v) => !v)}
            className={`rounded border-2 border-black px-4 py-1.5 text-sm font-bold transition-all hover:bg-[var(--oop-yellow)] ${
              jumpOpen ? "bg-[var(--oop-yellow)]" : "bg-white"
            }`}
            title="Jump to a phase (J)"
          >
            ☰ Jump
          </button>
          <button
            onClick={goNext}
            disabled={index === total - 1}
            className="rounded border-2 border-black bg-white px-4 py-1.5 text-sm font-bold transition-all disabled:opacity-30 enabled:hover:bg-[var(--oop-pink)]"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
