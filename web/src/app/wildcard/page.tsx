"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getBrand } from "@/lib/branding";
import {
  loadQuestionBank,
  getCategories,
  generateWildcardGame,
  type BankQuestion,
  type CategoryInfo,
} from "@/lib/question-bank";
import { gameGenToQuiz, saveGame, getSavedGames, deleteSavedGame } from "@/lib/game-gen";
import type { GameGenSession, SavedGameGen } from "@/lib/types";

export default function WildcardPage() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game config
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [generatedGame, setGeneratedGame] = useState<GameGenSession | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGameGen[]>([]);

  const brand = typeof window !== "undefined" ? getBrand() : { name: "" };

  useEffect(() => {
    loadQuestionBank()
      .then((qs) => {
        setQuestions(qs);
        setCategories(getCategories(qs));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    setSavedGames(getSavedGames().filter((g) => g.sessionId.startsWith("wildcard-")));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= 6) return prev;
      return [...prev, cat];
    });
  }, []);

  const handleGenerate = useCallback(
    (mode: "wildcard" | "custom") => {
      if (mode === "custom" && selectedCategories.length < 1) return;

      const game = generateWildcardGame(questions, {
        categories: mode === "custom" ? selectedCategories : undefined,
      });
      setGeneratedGame(game);

      // Auto-save to localStorage so presenter can access it
      const quiz = gameGenToQuiz(game);
      localStorage.setItem(`quiz_${game.id}`, JSON.stringify(quiz));
    },
    [questions, selectedCategories]
  );

  const handleSave = useCallback(() => {
    if (!generatedGame) return;
    const saved: SavedGameGen = {
      sessionId: generatedGame.id,
      name: generatedGame.rounds.map((r) => r.title).join(", "),
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      roundTopics: generatedGame.rounds.map((r) => r.title),
      savedAt: new Date().toISOString(),
    };
    saveGame(saved);
    setSavedGames(getSavedGames().filter((g) => g.sessionId.startsWith("wildcard-")));
  }, [generatedGame]);

  const handleRegenerate = useCallback(() => {
    setGeneratedGame(null);
  }, []);

  const handleDeleteSaved = useCallback((sessionId: string) => {
    deleteSavedGame(sessionId);
    localStorage.removeItem(`quiz_${sessionId}`);
    setSavedGames(getSavedGames().filter((g) => g.sessionId.startsWith("wildcard-")));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#143B2E]">
        <p className="text-white/50">Loading question bank...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#143B2E]">
        <p className="text-[#E84D5A]">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#143B2E] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-white/40 hover:text-white/60">
          &larr; Back to quizzes
        </Link>

        <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700]/50">
          {brand.name}
        </p>
        <h1 className="mb-2 text-3xl font-black uppercase text-[#FFD700] sm:text-4xl">
          Wildcard
        </h1>
        <p className="mb-6 text-sm text-white/40">
          {questions.length.toLocaleString()} questions across {categories.length} categories
        </p>

        {/* Instructions + Random button — hidden when game is generated */}
        {!generatedGame && (
          <div className="mb-6">
            <p className="mb-4 text-sm text-white/50">
              Select 1–6 categories below and hit <span className="font-semibold text-white/70">Generate Game</span>, or go fully random:
            </p>
            <button
              onClick={() => handleGenerate("wildcard")}
              className="w-full rounded-lg bg-[#FFD700] py-3.5 text-center font-bold text-black transition-all hover:bg-[#FFD700]/90 sm:py-4"
            >
              Random Wildcard Game
            </button>
            <p className="mt-1.5 text-center text-xs text-white/30">
              6 random categories, 8 questions each
            </p>
          </div>
        )}

        {/* Generated Game Preview */}
        {generatedGame && (
          <div className="mb-8 rounded-lg border border-[#4EC9B0]/30 bg-[#1B4D3E] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#4EC9B0]">Generated Game</h2>
              <button
                onClick={handleRegenerate}
                className="rounded px-3 py-1 text-xs text-white/40 hover:bg-white/10 hover:text-white/60"
              >
                Back
              </button>
            </div>

            <div className="mb-6 space-y-2">
              {generatedGame.rounds.map((round) => (
                <details key={round.number} className="group">
                  <summary className="flex cursor-pointer items-center gap-3 rounded bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
                    <span className="text-sm font-bold text-[#FFD700]/60">
                      R{round.number}
                    </span>
                    <span className="font-medium text-white">{round.title}</span>
                    <span className="ml-auto text-xs text-white/30">
                      {round.questions.length} questions
                    </span>
                  </summary>
                  <div className="mt-1 space-y-1 pl-4 sm:pl-10">
                    {round.questions.map((q) => (
                      <div
                        key={q.number}
                        className="flex items-start gap-2 rounded bg-white/[0.02] px-3 py-2 text-sm"
                      >
                        <span className="mt-0.5 text-xs text-white/30">
                          {q.number}.
                        </span>
                        <div className="flex-1">
                          <p className="text-white/70">{q.text}</p>
                          <p className="mt-0.5 text-xs text-[#4EC9B0]/60">
                            {q.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            {generatedGame.tieBreaker && (
              <div className="mb-4 rounded bg-white/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#FFD700]/40">
                  Tiebreaker
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {generatedGame.tieBreaker.question}
                </p>
                <p className="mt-0.5 text-xs text-[#4EC9B0]/60">
                  {generatedGame.tieBreaker.answer}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/present/${generatedGame.id}`}
                className="rounded bg-[#4EC9B0] px-5 py-2 font-bold text-black transition-all hover:bg-[#4EC9B0]/90"
              >
                Present Game
              </Link>
              <button
                onClick={handleSave}
                disabled={savedGames.some((g) => g.sessionId === generatedGame.id)}
                className="rounded bg-[#4EC9B0]/20 px-5 py-2 font-bold text-[#4EC9B0] transition-all hover:bg-[#4EC9B0]/30 disabled:opacity-30"
              >
                {savedGames.some((g) => g.sessionId === generatedGame.id)
                  ? "Saved"
                  : "Save Game"}
              </button>
              <button
                onClick={() => handleGenerate(selectedCategories.length > 0 ? "custom" : "wildcard")}
                className="rounded bg-white/10 px-5 py-2 font-medium text-white/60 transition-all hover:bg-white/20 hover:text-white"
              >
                Shuffle Again
              </button>
            </div>
          </div>
        )}

        {/* Category Selection — shown when no game generated */}
        {!generatedGame && (
          <>
            {/* Category Selection */}
            <div className="mb-6">
              <p className="mb-3 text-sm text-white/40">
                Select up to 6 categories{" "}
                <span className="text-[#FFD700]/60">
                  ({selectedCategories.length}/6)
                </span>
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategory(cat.name)}
                    disabled={
                      selectedCategories.length >= 6 &&
                      !selectedCategories.includes(cat.name)
                    }
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${
                      selectedCategories.includes(cat.name)
                        ? "border-[#FFD700]/50 bg-[#FFD700]/10"
                        : "border-white/10 bg-[#1B4D3E] hover:border-white/20"
                    } ${
                      selectedCategories.length >= 6 &&
                      !selectedCategories.includes(cat.name)
                        ? "opacity-30 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div>
                      <span
                        className={`font-medium ${
                          selectedCategories.includes(cat.name)
                            ? "text-[#FFD700]"
                            : "text-white/70"
                        }`}
                      >
                        {cat.name}
                      </span>
                      <span className="ml-2 text-xs text-white/30">
                        {cat.count} questions
                      </span>
                    </div>
                    <div className="flex gap-1.5 text-[10px]">
                      <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-400/60">
                        {cat.difficulties.easy}
                      </span>
                      <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-yellow-400/60">
                        {cat.difficulties.medium}
                      </span>
                      <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400/60">
                        {cat.difficulties.hard}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedCategories.length > 0 && (
                <button
                  onClick={() => handleGenerate("custom")}
                  className="mt-4 w-full rounded-lg bg-[#FFD700] py-3 text-center font-bold text-black transition-all hover:bg-[#FFD700]/90"
                >
                  Generate Game ({selectedCategories.length} rounds)
                </button>
              )}
            </div>
          </>
        )}

        {/* Saved Wildcard Games */}
        {savedGames.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#4EC9B0]/20" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#4EC9B0]/40">
                {savedGames.length} saved game{savedGames.length !== 1 ? "s" : ""}
              </p>
              <div className="h-px flex-1 bg-[#4EC9B0]/20" />
            </div>
            <div className="space-y-3">
              {savedGames.map((game) => (
                <div
                  key={game.sessionId}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1B4D3E] p-4 sm:p-5 transition-all hover:border-[#4EC9B0]/40"
                >
                  <Link href={`/present/${game.sessionId}`} className="flex-1">
                    <h3 className="font-bold text-white">{game.date}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {game.roundTopics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-[#4EC9B0]/10 px-2.5 py-0.5 text-xs text-[#4EC9B0]/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDeleteSaved(game.sessionId)}
                    className="ml-3 rounded px-2 py-1 text-xs text-[#E84D5A]/40 transition-colors hover:bg-[#E84D5A]/10 hover:text-[#E84D5A]"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
