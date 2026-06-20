"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getBrand } from "@/lib/branding";
import { gameGenToQuiz, saveGame, getSavedGames, deleteSavedGame } from "@/lib/game-gen";
import type { GameGenSession, SavedGameGen } from "@/lib/types";
import { buildRounds, type BankDifficulty, type RoundPick } from "@/lib/bank-generate";

interface ApiCategory {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  questionCount: number;
}

type Difficulty = BankDifficulty;

const QUESTIONS_PER_ROUND = 8;
const DEFAULT_ROUNDS = 6;

export default function WildcardPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected items can be either a category slug (from tile click) or a
  // free-text topic the host typed (audience yelled it). Marked by `.kind`.
  type Pick = { kind: "category"; slug: string; label: string } | { kind: "topic"; topic: string };
  const [selected, setSelected] = useState<Pick[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [generated, setGenerated] = useState<GameGenSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGameGen[]>([]);

  const brand = typeof window !== "undefined" ? getBrand() : { name: "" };

  useEffect(() => {
    fetch("/api/bank/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load categories"))))
      .then((d: { categories: ApiCategory[] }) => {
        setCategories(d.categories.filter((c) => c.questionCount >= QUESTIONS_PER_ROUND));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    setSavedGames(getSavedGames().filter((g) => g.sessionId.startsWith("wildcard-")));
  }, []);

  const totalQuestions = categories.reduce((sum, c) => sum + c.questionCount, 0);

  const toggleCategory = useCallback(
    (slug: string, label: string) => {
      setSelected((prev) => {
        const has = prev.find((p) => p.kind === "category" && p.slug === slug);
        if (has) return prev.filter((p) => !(p.kind === "category" && p.slug === slug));
        if (prev.length >= DEFAULT_ROUNDS) return prev;
        return [...prev, { kind: "category", slug, label }];
      });
    },
    []
  );

  const addTopic = useCallback(() => {
    const t = topicInput.trim();
    if (!t) return;
    setSelected((prev) => {
      if (prev.length >= DEFAULT_ROUNDS) return prev;
      if (prev.find((p) => p.kind === "topic" && p.topic.toLowerCase() === t.toLowerCase())) return prev;
      return [...prev, { kind: "topic", topic: t }];
    });
    setTopicInput("");
  }, [topicInput]);

  const removeSelected = useCallback((i: number) => {
    setSelected((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const generate = useCallback(
    async (mode: "wildcard" | "custom") => {
      if (mode === "custom" && selected.length === 0) return;
      setGenerating(true);
      setError(null);

      // Build the list of round picks. Either:
      //   "wildcard" → 6 random categories
      //   "custom"   → host's selected mix of categories + audience-yelled topics
      const picks: RoundPick[] =
        mode === "custom"
          ? selected.map((p) =>
              p.kind === "category"
                ? { topic: p.slug, label: p.label }
                : { topic: p.topic, label: p.topic }
            )
          : [...categories]
              .sort(() => Math.random() - 0.5)
              .slice(0, DEFAULT_ROUNDS)
              .map((c) => ({ topic: c.slug, label: c.name }));

      try {
        const { rounds, tieBreaker } = await buildRounds(picks, {
          perRound: QUESTIONS_PER_ROUND,
          difficulty,
        });

        const session: GameGenSession = {
          id: `wildcard-${crypto.randomUUID().slice(0, 8)}`,
          createdAt: new Date().toISOString(),
          status: "ready",
          teams: [],
          rounds,
          tieBreaker,
        };

        setGenerated(session);
        const quiz = gameGenToQuiz(session);
        localStorage.setItem(`quiz_${session.id}`, JSON.stringify(quiz));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setGenerating(false);
      }
    },
    [selected, categories, difficulty]
  );

  const handleSave = useCallback(() => {
    if (!generated) return;
    const saved: SavedGameGen = {
      sessionId: generated.id,
      name: generated.rounds.map((r) => r.title).join(", "),
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      roundTopics: generated.rounds.map((r) => r.title),
      savedAt: new Date().toISOString(),
    };
    saveGame(saved);
    setSavedGames(getSavedGames().filter((g) => g.sessionId.startsWith("wildcard-")));
  }, [generated]);

  const handleDelete = useCallback((sid: string) => {
    deleteSavedGame(sid);
    localStorage.removeItem(`quiz_${sid}`);
    setSavedGames(getSavedGames().filter((g) => g.sessionId.startsWith("wildcard-")));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8DFC8]">
        <p className="text-[#3D3D3A]/60">Loading question bank…</p>
      </div>
    );
  }
  if (error && !generated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8DFC8]">
        <p className="text-[#C26B3E]">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8DFC8] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-[#3D3D3A]/60 hover:text-[#3D3D3A]">
          &larr; Back to quizzes
        </Link>

        <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#8B3530]/60">
          {brand.name}
        </p>
        <h1 className="mb-2 text-3xl font-black uppercase text-[#8B3530] sm:text-4xl">Wildcard</h1>
        <p className="mb-6 text-sm text-[#3D3D3A]/60">
          {totalQuestions.toLocaleString()} questions across {categories.length} categories — pick up to 6 or go random
        </p>

        {!generated && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#3D3D3A]/60">Difficulty:</span>
              {(["mixed", "easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
                    difficulty === d
                      ? "bg-[#8B3530] text-white"
                      : "bg-[#3D3D3A]/8 text-[#3D3D3A]/70 hover:bg-[#3D3D3A]/15"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={() => generate("wildcard")}
              disabled={generating}
              className="mb-6 w-full rounded-lg bg-[#8B3530] py-3.5 text-center font-bold text-white transition-all hover:bg-[#8B3530]/90 disabled:opacity-60 sm:py-4"
            >
              {generating ? "Generating…" : "Random Wildcard Game"}
            </button>

            {/* Audience-yelled topic input */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#3D3D3A]/60">
                Audience yelled a topic? Type it in
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTopic();
                    }
                  }}
                  placeholder="e.g. Bollywood, Premier League, Marvel"
                  className="flex-1 rounded border border-[#3D3D3A]/25 bg-white/40 px-3 py-2 text-sm text-[#3D3D3A] placeholder-[#3D3D3A]/40 outline-none focus:border-[#8B3530] focus:ring-1 focus:ring-[#8B3530]/40"
                />
                <button
                  onClick={addTopic}
                  disabled={!topicInput.trim() || selected.length >= DEFAULT_ROUNDS}
                  className="rounded border-2 border-[#8B3530] bg-[#8B3530]/10 px-4 text-sm font-bold text-[#8B3530] transition-all hover:bg-[#8B3530]/20 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected chips (mix of category + topic picks) */}
            {selected.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selected.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full bg-[#8B3530] py-1 pl-3 pr-1 text-sm font-medium text-white"
                  >
                    {p.kind === "topic" && <span className="text-[10px] uppercase text-white/70">topic</span>}
                    <span>{p.kind === "category" ? p.label : p.topic}</span>
                    <button
                      onClick={() => removeSelected(i)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-xs text-white hover:bg-white/30"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Category grid for tile picking */}
            <div className="mb-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#3D3D3A]/60">
                Or pick categories ({selected.length}/{DEFAULT_ROUNDS})
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => {
                  const isSel = selected.some((p) => p.kind === "category" && p.slug === c.slug);
                  return (
                    <button
                      key={c.slug}
                      onClick={() => toggleCategory(c.slug, c.name)}
                      className={`flex items-center justify-between rounded border px-3 py-2 text-left text-sm transition-all ${
                        isSel
                          ? "border-[#8B3530] bg-[#8B3530]/10 text-[#8B3530]"
                          : "border-[#3D3D3A]/20 bg-transparent text-[#3D3D3A] hover:border-[#8B3530]/40"
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-[#3D3D3A]/50">{c.questionCount.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => generate("custom")}
              disabled={generating || selected.length === 0}
              className="mt-3 w-full rounded-lg border-2 border-[#8B3530] bg-transparent py-3 font-bold text-[#8B3530] transition-all hover:bg-[#8B3530]/10 disabled:opacity-40"
            >
              {generating ? "Generating…" : `Generate from ${selected.length || "—"} selected`}
            </button>
          </>
        )}

        {generated && (
          <div className="mb-8 rounded-lg border border-[#8B3530]/30 bg-transparent p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#8B3530]">Generated Game</h2>
              <button
                onClick={() => setGenerated(null)}
                className="rounded px-3 py-1 text-xs text-[#3D3D3A]/60 hover:bg-[#3D3D3A]/8 hover:text-[#3D3D3A]"
              >
                Back
              </button>
            </div>

            <div className="mb-6 space-y-2">
              {generated.rounds.map((round) => (
                <details key={round.number} className="group">
                  <summary className="flex cursor-pointer items-center gap-3 rounded border border-[#3D3D3A]/15 bg-transparent px-4 py-3 transition-colors hover:bg-[#3D3D3A]/5">
                    <span className="text-sm font-bold text-[#8B3530]">R{round.number}</span>
                    <span className="font-medium text-[#3D3D3A]">{round.title}</span>
                    <span className={`ml-auto text-xs ${round.questions.length === 0 ? "font-bold text-[#C26B3E]" : "text-[#3D3D3A]/50"}`}>
                      {round.questions.length} questions
                    </span>
                  </summary>
                  <div className="mt-1 space-y-1 pl-4 sm:pl-10">
                    {round.questions.map((q) => (
                      <div key={q.number} className="flex items-start gap-2 rounded bg-[#3D3D3A]/4 px-3 py-2 text-sm">
                        <span className="mt-0.5 text-xs text-[#3D3D3A]/50">{q.number}.</span>
                        <div className="flex-1">
                          <p className="text-[#3D3D3A]">{q.text}</p>
                          <p className="mt-0.5 text-xs font-medium text-[#8B3530]">{q.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/present/${generated.id}`}
                className="rounded bg-[#8B3530] px-5 py-2 font-bold text-white transition-all hover:bg-[#8B3530]/90"
              >
                Present →
              </Link>
              <button
                onClick={handleSave}
                className="rounded border-2 border-[#8B3530] bg-transparent px-5 py-2 font-bold text-[#8B3530] transition-all hover:bg-[#8B3530]/10"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {savedGames.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#8B3530]/30" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8B3530]/60">
                Saved games
              </p>
              <div className="h-px flex-1 bg-[#8B3530]/30" />
            </div>
            <div className="space-y-2">
              {savedGames.map((g) => (
                <div key={g.sessionId} className="flex items-center justify-between rounded-lg border border-[#3D3D3A]/15 bg-transparent p-3">
                  <Link href={`/present/${g.sessionId}`} className="flex-1">
                    <p className="text-sm font-medium text-[#3D3D3A]">{g.name}</p>
                    <p className="mt-0.5 text-xs text-[#3D3D3A]/50">{g.date}</p>
                  </Link>
                  <button
                    onClick={() => handleDelete(g.sessionId)}
                    className="rounded px-2 py-1 text-xs text-[#C26B3E]/60 hover:bg-[#C26B3E]/10 hover:text-[#C26B3E]"
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
