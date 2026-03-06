"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quiz, Slide } from "@/lib/types";
import { buildSlides } from "@/lib/slides";
import { SlideRenderer } from "./SlideRenderer";

interface PresenterProps {
  quiz: Quiz;
}

export function Presenter({ quiz }: PresenterProps) {
  const router = useRouter();
  const slides = buildSlides(quiz);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideSeconds, setSlideSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer whenever slide changes
  useEffect(() => {
    setSlideSeconds(0);
    timerRef.current = setInterval(() => {
      setSlideSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlide]);

  const exitPresenter = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    router.push("/");
  }, [router]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape") {
        exitPresenter();
      } else if (e.key === "Home") {
        setCurrentSlide(0);
      } else if (e.key === "End") {
        setCurrentSlide(slides.length - 1);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKey);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [goNext, goPrev, toggleFullscreen, exitPresenter, slides.length]);

  const slide = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;
  const [showJumpNav, setShowJumpNav] = useState(false);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : `${secs}s`;
  };

  // Build jump nav index: group slide indices by round
  const jumpNav = useMemo(() => {
    const nav: {
      label: string;
      roundNum: number;
      isLast: boolean;
      items: { label: string; slideIndex: number; type: string }[];
    }[] = [];

    // Title slide
    const misc: { label: string; slideIndex: number; type: string }[] = [
      { label: "Title", slideIndex: 0, type: "title" },
    ];

    let currentRound: (typeof nav)[number] | null = null;

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (s.type === "title") continue;

      if (s.type === "round-title") {
        currentRound = {
          label: `R${s.roundNumber}`,
          roundNum: s.roundNumber!,
          isLast: false,
          items: [{ label: "Title", slideIndex: i, type: "round-title" }],
        };
        nav.push(currentRound);
      } else if (s.type === "tie-breaker-question") {
        misc.push({ label: "TB Q", slideIndex: i, type: "tie-breaker-question" });
      } else if (s.type === "tie-breaker-answer") {
        misc.push({ label: "TB A", slideIndex: i, type: "tie-breaker-answer" });
      } else if (currentRound) {
        if (s.type === "question" || s.type === "internet-question") {
          currentRound.items.push({
            label: `Q${s.question?.number}`,
            slideIndex: i,
            type: s.type,
          });
        } else if (s.type === "answer") {
          currentRound.items.push({
            label: `A${s.question?.number}`,
            slideIndex: i,
            type: "answer",
          });
        } else if (s.type === "questions-overview") {
          currentRound.items.push({
            label: "Review",
            slideIndex: i,
            type: "questions-overview",
          });
        } else if (s.type === "progressive-clue") {
          currentRound.items.push({
            label: `Clue ${(s.clueIndex ?? 0) + 1}`,
            slideIndex: i,
            type: "progressive-clue",
          });
        } else if (s.type === "progressive-answer") {
          currentRound.items.push({
            label: "Answer",
            slideIndex: i,
            type: "progressive-answer",
          });
        } else if (s.type === "video-answers") {
          currentRound.items.push({
            label: "Answers",
            slideIndex: i,
            type: "video-answers",
          });
        }
      }
    }

    // Mark last round
    if (nav.length > 0) {
      nav[nav.length - 1].isLast = true;
    }

    return { rounds: nav, misc };
  }, [slides]);

  // Find which round the current slide belongs to
  const currentRoundNum = slide.roundNumber ?? null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0F1B2D]">
      {/* Slide content */}
      <div className="h-full w-full">
        <SlideRenderer slide={slide} />
      </div>

      {/* Timer — always visible, top-right corner */}
      <div className="absolute right-4 top-4 rounded bg-black/40 px-3 py-1.5 font-mono text-sm tabular-nums text-white/50">
        {formatTime(slideSeconds)}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-black/30">
        <div
          className="h-full bg-[#FFD700] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls overlay (bottom) */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-4 opacity-0 transition-opacity hover:opacity-100">
        <button
          onClick={exitPresenter}
          className="rounded bg-[#E84D5A]/80 px-3 py-1 text-sm font-bold text-white"
          title="Esc"
        >
          Exit
        </button>
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="rounded bg-black/60 px-3 py-1 text-sm text-white/80 disabled:opacity-30"
        >
          Prev
        </button>
        <span className="text-sm text-white/50">
          {currentSlide + 1} / {slides.length}
        </span>
        <button
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          className="rounded bg-black/60 px-3 py-1 text-sm text-white/80 disabled:opacity-30"
        >
          Next
        </button>
        <button
          onClick={toggleFullscreen}
          className="rounded bg-black/60 px-3 py-1 text-sm text-white/80"
        >
          {isFullscreen ? "Exit FS" : "Fullscreen"}
        </button>
        <button
          onClick={() => setShowJumpNav((v) => !v)}
          className="rounded bg-[#FFD700]/20 px-3 py-1 text-sm font-bold text-[#FFD700]"
        >
          Jump
        </button>
      </div>

      {/* Jump navigation overlay */}
      {showJumpNav && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 pb-12"
          onClick={() => setShowJumpNav(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-[#143B2E] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider text-[#FFD700]">
                Jump to Slide
              </p>
              <button
                onClick={() => setShowJumpNav(false)}
                className="text-sm text-white/40 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Misc: Title, Tie Breaker */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {jumpNav.misc.map((item) => (
                <button
                  key={item.slideIndex}
                  onClick={() => {
                    setCurrentSlide(item.slideIndex);
                    setShowJumpNav(false);
                  }}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                    currentSlide === item.slideIndex
                      ? "bg-[#FFD700] text-black"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Rounds */}
            <div className="space-y-2">
              {jumpNav.rounds.map((round) => (
                <div key={round.roundNum} className="flex items-start gap-2">
                  <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                    <span
                      className={`text-xs font-black ${
                        currentRoundNum === round.roundNum
                          ? "text-[#FFD700]"
                          : "text-white/40"
                      }`}
                    >
                      {round.label}
                    </span>
                    {round.isLast && (
                      <span className="mt-0.5 text-[10px] font-bold text-[#E84D5A]">
                        2x PTS
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {round.items.map((item) => {
                      const isAnswer = item.type === "answer" || item.type === "progressive-answer" || item.type === "video-answers";
                      return (
                        <button
                          key={item.slideIndex}
                          onClick={() => {
                            setCurrentSlide(item.slideIndex);
                            setShowJumpNav(false);
                          }}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                            currentSlide === item.slideIndex
                              ? "bg-[#FFD700] text-black"
                              : isAnswer
                                ? "bg-[#4EC9B0]/15 text-[#4EC9B0]/80 hover:bg-[#4EC9B0]/25"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
