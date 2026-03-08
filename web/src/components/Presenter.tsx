"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quiz, Slide } from "@/lib/types";
import { buildSlides } from "@/lib/slides";
import { SlideRenderer } from "./SlideRenderer";
import { getLatestSession, saveSession, teamTotal, type GameSession } from "@/lib/scoring";
import { ScoreGrid } from "./ScoreGrid";

interface PresenterProps {
  quiz: Quiz;
}

export function Presenter({ quiz }: PresenterProps) {
  const router = useRouter();
  const slides = useMemo(() => buildSlides(quiz), [quiz]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideSeconds, setSlideSeconds] = useState(0);
  const [showScores, setShowScores] = useState(false);
  const [scoreTab, setScoreTab] = useState<"leaderboard" | "scorekeeper">("leaderboard");
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
      const inInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // Always allow S to toggle scorekeeper, even from inputs
      if (e.key === "Escape") {
        // If scorekeeper is open, close it instead of exiting presenter
        setShowScores((v) => {
          if (v) return false;
          // Defer navigation to avoid setState during render
          setTimeout(exitPresenter, 0);
          return false;
        });
        return;
      }

      if ((e.key === "s" || e.key === "S") && !inInput) {
        setShowScores((v) => {
          if (!v) refreshScores(); // refresh data when opening
          return !v;
        });
        return;
      }

      // Don't handle navigation keys when typing in score inputs
      if (inInput) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Measure actual visible viewport and lock body scroll
  useEffect(() => {
    const measure = () => setViewportHeight(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);

    // Lock body to prevent scroll and match presenter background
    const prevBg = document.body.style.background;
    const prevOverflow = document.body.style.overflow;
    document.body.style.background = "#0F1B2D";
    document.body.style.overflow = "hidden";
    document.documentElement.style.background = "#0F1B2D";

    return () => {
      window.removeEventListener("resize", measure);
      document.body.style.background = prevBg;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.background = "";
    };
  }, []);

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
    <div className="fixed inset-0 bg-[#0F1B2D]">
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100vh' }}
    >
      {/* Slide content */}
      <div className="relative flex-1 overflow-hidden">
        <SlideRenderer slide={slide} />
        {/* Timer — top-right corner */}
        <div className="absolute right-4 top-4 rounded bg-black/40 px-3 py-1.5 font-mono text-sm tabular-nums text-white/50">
          {formatTime(slideSeconds)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full shrink-0 bg-black/30">
        <div
          className="h-full bg-[#FFD700] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Bottom toolbar — in flex flow, always visible */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 bg-[#0F1B2D] px-2 py-1.5 sm:px-4 sm:py-2">
        {/* Left: Jump + Scores */}
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setShowJumpNav((v) => !v)}
            className="rounded bg-[#FFD700]/20 px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-bold text-[#FFD700] transition-all hover:bg-[#FFD700]/30"
          >
            Jump
          </button>
          <button
            onClick={() => {
              refreshScores();
              setShowScores((v) => !v);
            }}
            className={`rounded px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-bold transition-all ${
              showScores
                ? "bg-[#4EC9B0] text-black"
                : "bg-[#4EC9B0]/20 text-[#4EC9B0] hover:bg-[#4EC9B0]/30"
            }`}
          >
            Scores
          </button>
        </div>

        {/* Center: nav controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={exitPresenter}
            className="rounded bg-[#E84D5A]/80 px-2 py-1 text-xs sm:px-3 sm:text-sm font-bold text-white"
            title="Esc"
          >
            Exit
          </button>
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="rounded bg-black/60 px-2 py-1 text-xs sm:px-3 sm:text-sm text-white/80 disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-xs sm:text-sm text-white/50">
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentSlide === slides.length - 1}
            className="rounded bg-black/60 px-2 py-1 text-xs sm:px-3 sm:text-sm text-white/80 disabled:opacity-30"
          >
            Next
          </button>
          <button
            onClick={toggleFullscreen}
            className="hidden sm:block rounded bg-black/60 px-3 py-1 text-sm text-white/80"
          >
            {isFullscreen ? "Exit FS" : "Fullscreen"}
          </button>
        </div>

        {/* Right: spacer to balance layout — hidden on mobile */}
        <div className="hidden sm:block w-[140px]" />
      </div>

      {/* Scores overlay — tabbed: Leaderboard / Scorekeeper */}
      {showScores && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowScores(false)}
        >
          <div
            className={`max-h-[90vh] overflow-y-auto rounded-xl bg-[#0F1B2D] p-6 shadow-2xl ${
              scoreTab === "scorekeeper" ? "w-full max-w-5xl" : "w-full max-w-2xl"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tab bar + close */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                <button
                  onClick={() => setScoreTab("leaderboard")}
                  className={`rounded-md px-4 py-1.5 text-sm font-bold transition-all ${
                    scoreTab === "leaderboard"
                      ? "bg-[#FFD700] text-black"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Leaderboard
                </button>
                <button
                  onClick={() => setScoreTab("scorekeeper")}
                  className={`rounded-md px-4 py-1.5 text-sm font-bold transition-all ${
                    scoreTab === "scorekeeper"
                      ? "bg-[#4EC9B0] text-black"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Scorekeeper
                </button>
              </div>
              <button
                onClick={() => setShowScores(false)}
                className="rounded bg-white/10 px-3 py-1.5 text-sm font-bold text-white/60 hover:bg-white/20"
              >
                Back to game (S)
              </button>
            </div>

            {!scoreSession ? (
              <p className="text-center text-lg text-white/40">
                No scoring session — create one at /score
              </p>
            ) : scoreTab === "leaderboard" ? (
              /* Leaderboard view */
              <>
                <h2 className="mb-2 text-center text-3xl font-black uppercase tracking-wider text-[#FFD700]">
                  Leaderboard
                </h2>
                <p className="mb-6 text-center text-sm text-white/40">
                  {scoreSession.name}
                </p>
                {scoreSession.teams.length === 0 ? (
                  <p className="text-center text-lg text-white/40">
                    No teams yet — add them in the scorekeeper tab
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...scoreSession.teams]
                      .sort((a, b) => teamTotal(b, scoreSession.roundCount) - teamTotal(a, scoreSession.roundCount))
                      .map((team, rank) => {
                        const total = teamTotal(team, scoreSession.roundCount);
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
                              {team.name || "—"}
                            </span>
                            <span className="text-3xl font-black text-[#4EC9B0]">
                              {total}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            ) : (
              /* Scorekeeper view */
              <>
                <p className="mb-4 text-sm text-white/40">
                  {scoreSession.name} — {scoreSession.date}
                </p>
                <ScoreGrid
                  session={scoreSession}
                  onUpdate={(updated) => {
                    setScoreSession({ ...updated });
                  }}
                />
                <p className="mt-3 text-xs text-white/30">
                  Arrow keys navigate between score cells. Last round is doubled.
                </p>
              </>
            )}
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
            className="w-full max-w-[95vw] rounded-xl bg-[#143B2E] px-4 py-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title + Round shortcuts + TB + Close */}
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                Jump
              </p>
              {/* Title slide */}
              <button
                onClick={() => {
                  setCurrentSlide(0);
                  setShowJumpNav(false);
                }}
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                  currentSlide === 0
                    ? "bg-[#FFD700] text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Title
              </button>
              {/* Round title shortcuts */}
              {jumpNav.rounds.map((round) => {
                const titleItem = round.rows[0]?.items[0];
                if (!titleItem) return null;
                return (
                  <button
                    key={round.roundNum}
                    onClick={() => {
                      setCurrentSlide(titleItem.slideIndex);
                      setShowJumpNav(false);
                    }}
                    className={`rounded px-2 py-0.5 text-[11px] font-bold transition-all ${
                      currentRoundNum === round.roundNum
                        ? "bg-[#FFD700] text-black"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    R{round.roundNum}
                    {round.isLast && (
                      <span className="ml-0.5 text-[9px] text-[#E84D5A]">2x</span>
                    )}
                  </button>
                );
              })}
              {/* Tiebreaker items */}
              {jumpNav.misc.filter((m) => m.type !== "title").map((item) => (
                <button
                  key={item.slideIndex}
                  onClick={() => {
                    setCurrentSlide(item.slideIndex);
                    setShowJumpNav(false);
                  }}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                    currentSlide === item.slideIndex
                      ? "bg-[#FFD700] text-black"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setShowJumpNav(false)}
                className="text-xs text-white/40 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Rounds — compact grid */}
            <div className="space-y-1">
              {jumpNav.rounds.map((round) => (
                <div
                  key={round.roundNum}
                  className={`rounded px-2 py-1 ${
                    currentRoundNum === round.roundNum
                      ? "bg-white/[0.04]"
                      : ""
                  }`}
                >
                  {round.rows.map((row, rowIdx) => (
                    <div key={row.label} className="flex items-center gap-1.5 py-[2px]">
                      {/* Round label only on first row */}
                      <div className="flex w-20 shrink-0 items-center gap-1">
                        {rowIdx === 0 ? (
                          <>
                            <span
                              className={`text-[11px] font-black ${
                                currentRoundNum === round.roundNum
                                  ? "text-[#FFD700]"
                                  : "text-white/40"
                              }`}
                            >
                              R{round.roundNum}
                            </span>
                            {round.isLast && (
                              <span className="text-[9px] font-bold text-[#E84D5A]">2x</span>
                            )}
                          </>
                        ) : (
                          <span className="w-full" />
                        )}
                      </div>
                      <span className="w-14 shrink-0 text-right text-[9px] font-bold uppercase text-white/20">
                        {row.label}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {row.items.map((item) => {
                          const isAnswer = item.type === "answer" || item.type === "progressive-answer" || item.type === "video-answers";
                          return (
                            <button
                              key={item.slideIndex}
                              onClick={() => {
                                setCurrentSlide(item.slideIndex);
                                setShowJumpNav(false);
                              }}
                              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                                currentSlide === item.slideIndex
                                  ? "bg-[#FFD700] text-black"
                                  : isAnswer
                                    ? "bg-[#4EC9B0]/15 text-[#4EC9B0]/70 hover:bg-[#4EC9B0]/25"
                                    : "bg-white/10 text-white/60 hover:bg-white/20"
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
