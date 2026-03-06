"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quiz, Slide } from "@/lib/types";
import { buildSlides } from "@/lib/slides";
import { SlideRenderer } from "./SlideRenderer";
import { getLatestSession, teamTotal, type GameSession } from "@/lib/scoring";

interface PresenterProps {
  quiz: Quiz;
}

export function Presenter({ quiz }: PresenterProps) {
  const router = useRouter();
  const slides = buildSlides(quiz);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideSeconds, setSlideSeconds] = useState(0);
  const [showScores, setShowScores] = useState(false);
  const [scoreSession, setScoreSession] = useState<GameSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load latest scoring session for leaderboard
  const refreshScores = useCallback(() => {
    setScoreSession(getLatestSession());
  }, []);

  useEffect(() => {
    refreshScores();
  }, [refreshScores]);

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
      } else if (e.key === "s" || e.key === "S") {
        setShowScores((v) => {
          if (!v) refreshScores(); // refresh data when opening
          return !v;
        });
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
  }, [goNext, goPrev, toggleFullscreen, exitPresenter, refreshScores, slides.length]);

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

  // Build jump nav index: group slide indices by round, split into rows
  type NavItem = { label: string; slideIndex: number; type: string };
  type NavRow = { label: string; items: NavItem[] };
  type NavRound = {
    roundNum: number;
    isLast: boolean;
    rows: NavRow[];
  };

  const jumpNav = useMemo(() => {
    const rounds: NavRound[] = [];
    const misc: NavItem[] = [
      { label: "Title", slideIndex: 0, type: "title" },
    ];

    let currentRound: NavRound | null = null;
    let questionsRow: NavRow | null = null;
    let revealRow: NavRow | null = null;
    let seenReview = false;

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (s.type === "title") continue;

      if (s.type === "round-title") {
        seenReview = false;
        questionsRow = { label: "Questions", items: [{ label: "Title", slideIndex: i, type: "round-title" }] };
        revealRow = { label: "Answers", items: [] };
        currentRound = {
          roundNum: s.roundNumber!,
          isLast: false,
          rows: [questionsRow],
        };
        rounds.push(currentRound);
      } else if (s.type === "tie-breaker-question") {
        misc.push({ label: "TB Q", slideIndex: i, type: "tie-breaker-question" });
      } else if (s.type === "tie-breaker-answer") {
        misc.push({ label: "TB A", slideIndex: i, type: "tie-breaker-answer" });
      } else if (currentRound && questionsRow && revealRow) {
        if (s.type === "questions-overview") {
          questionsRow.items.push({ label: "Review", slideIndex: i, type: "questions-overview" });
          seenReview = true;
          // Add the reveal row now that we know it's a standard round
          currentRound.rows.push(revealRow);
        } else if (s.type === "question" || s.type === "internet-question") {
          if (seenReview) {
            // This is the Q/A reveal section
            revealRow.items.push({ label: `Q${s.question?.number}`, slideIndex: i, type: s.type });
          } else {
            // Questions-only section
            questionsRow.items.push({ label: `Q${s.question?.number}`, slideIndex: i, type: s.type });
          }
        } else if (s.type === "answer") {
          revealRow.items.push({ label: `A${s.question?.number}`, slideIndex: i, type: "answer" });
        } else if (s.type === "progressive-clue") {
          questionsRow.items.push({ label: `Clue ${(s.clueIndex ?? 0) + 1}`, slideIndex: i, type: "progressive-clue" });
        } else if (s.type === "progressive-answer") {
          questionsRow.items.push({ label: "Answer", slideIndex: i, type: "progressive-answer" });
        } else if (s.type === "video-answers") {
          questionsRow.items.push({ label: "Answers", slideIndex: i, type: "video-answers" });
        }
      }
    }

    // Mark last round
    if (rounds.length > 0) {
      rounds[rounds.length - 1].isLast = true;
    }

    return { rounds, misc };
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

      {/* Always-visible action buttons — bottom left */}
      <div className="absolute bottom-4 left-4 z-40 flex gap-2">
        <button
          onClick={() => setShowJumpNav((v) => !v)}
          className="rounded bg-[#FFD700]/20 px-3 py-1.5 text-sm font-bold text-[#FFD700] backdrop-blur-sm transition-all hover:bg-[#FFD700]/30"
        >
          Jump
        </button>
        <button
          onClick={() => {
            refreshScores();
            setShowScores((v) => !v);
          }}
          className={`rounded px-3 py-1.5 text-sm font-bold backdrop-blur-sm transition-all ${
            showScores
              ? "bg-[#4EC9B0] text-black"
              : "bg-[#4EC9B0]/20 text-[#4EC9B0] hover:bg-[#4EC9B0]/30"
          }`}
        >
          Scores
        </button>
      </div>

      {/* Nav controls (bottom center, show on hover) */}
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
      </div>

      {/* Scores leaderboard overlay */}
      {showScores && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowScores(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-[#0F1B2D] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-center text-3xl font-black uppercase tracking-wider text-[#FFD700]">
              Score Check
            </h2>
            {scoreSession && (
              <p className="mb-6 text-center text-sm text-white/40">
                {scoreSession.name}
              </p>
            )}
            {!scoreSession || scoreSession.teams.length === 0 ? (
              <p className="text-center text-lg text-white/40">
                {scoreSession
                  ? "No teams yet — add them in the scorekeeper"
                  : "No scoring session — create one at /score"}
              </p>
            ) : (
              <div className="space-y-2">
                {[...scoreSession.teams]
                  .sort((a, b) => teamTotal(b) - teamTotal(a))
                  .map((team, rank) => {
                    const total = teamTotal(team);
                    return (
                      <div
                        key={rank}
                        className={`flex items-center gap-4 rounded-lg px-6 py-3 ${
                          rank === 0
                            ? "bg-[#FFD700]/15"
                            : rank === 1
                              ? "bg-white/5"
                              : rank === 2
                                ? "bg-white/[0.03]"
                                : "bg-transparent"
                        }`}
                      >
                        <span
                          className={`w-10 text-3xl font-black ${
                            rank === 0
                              ? "text-[#FFD700]"
                              : rank === 1
                                ? "text-gray-300"
                                : rank === 2
                                  ? "text-amber-700"
                                  : "text-white/30"
                          }`}
                        >
                          {rank + 1}
                        </span>
                        <span className="flex-1 text-2xl font-bold text-white">
                          {team.name}
                        </span>
                        <span className="text-3xl font-black text-[#4EC9B0]">
                          {total}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
            <p className="mt-6 text-center text-xs text-white/30">
              Press S to close
            </p>
          </div>
        </div>
      )}

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
            <div className="space-y-3">
              {jumpNav.rounds.map((round) => (
                <div
                  key={round.roundNum}
                  className={`rounded-lg border px-3 py-2 ${
                    currentRoundNum === round.roundNum
                      ? "border-[#FFD700]/30 bg-white/[0.03]"
                      : "border-transparent"
                  }`}
                >
                  {/* Round header */}
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={`text-xs font-black ${
                        currentRoundNum === round.roundNum
                          ? "text-[#FFD700]"
                          : "text-white/40"
                      }`}
                    >
                      R{round.roundNum}
                    </span>
                    {round.isLast && (
                      <span className="text-[10px] font-bold text-[#E84D5A]">
                        2x PTS
                      </span>
                    )}
                  </div>
                  {/* Rows */}
                  <div className="space-y-1.5">
                    {round.rows.map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-right text-[10px] font-bold uppercase tracking-wider text-white/25">
                          {row.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {row.items.map((item) => {
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
