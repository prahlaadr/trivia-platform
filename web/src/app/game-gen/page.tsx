"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getBrand } from "@/lib/branding";
import type { GameGenSession, SavedGameGen } from "@/lib/types";
import { buildRounds, type BankDifficulty } from "@/lib/bank-generate";
import {
  getGameGenSession,
  createGameGenSession,
  saveGameGenSession,
  clearGameGenSession,
  addTeam,
  removeTeam,
  aggregateTopics,
  buildRoundTopics,
  gameGenToQuiz,
  getSavedGames,
  saveGame,
  deleteSavedGame,
} from "@/lib/game-gen";

// Mirrors the 15 canonical categories in docs/category-taxonomy.md so
// Game Gen and Wildcard speak the same vocabulary. Teams can still type
// any free-form topic via the input below.
const SUGGESTED_TOPICS = [
  "Film & TV",
  "Music",
  "Sport",
  "Geography",
  "History",
  "Science & Nature",
  "Food & Drink",
  "Literature",
  "Art & Design",
  "Games & Toys",
  "Video Games",
  "Tech & Internet",
  "Politics & Society",
  "Mythology & Religion",
  "Language & Words",
  "Pop Culture & Misc",
];

// Game Gen pulls real questions from the same bundled bank that powers
// Wildcard, via the shared bank-generate engine.
const QUESTIONS_PER_ROUND = 6;

interface ApiCategory {
  slug: string;
  name: string;
  questionCount: number;
}

type Difficulty = BankDifficulty;
const DIFFICULTIES: Difficulty[] = ["mixed", "easy", "medium", "hard"];

// "film & tv" → "Film & TV" for round titles.
function titleCase(topic: string): string {
  return topic.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GameGenPage() {
  const [session, setSession] = useState<GameGenSession | null>(null);
  const [teamName, setTeamName] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [generated, setGenerated] = useState<GameGenSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [bankCategories, setBankCategories] = useState<ApiCategory[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [savedGames, setSavedGames] = useState<SavedGameGen[]>([]);

  useEffect(() => {
    setSession(getGameGenSession());

    // Seed the two example generated games if not already saved
    const SEED_GAMES: SavedGameGen[] = [
      {
        sessionId: "c32a7a01",
        name: "Mixed Topics",
        date: "March 8, 2026",
        roundTopics: ["Random", "Around the World", "Bites & Sips", "Name That Tune", "Back in My Day", "Record Breakers"],
        savedAt: "2026-03-08T00:00:00.000Z",
      },
      {
        sessionId: "b4fb274c",
        name: "Carnatic Music",
        date: "March 8, 2026",
        roundTopics: ["Swagatham", "The Legends", "Raga Raga Raga", "Stage & Sabhas", "Kritis & Compositions", "Carnatic Connections"],
        savedAt: "2026-03-08T00:01:00.000Z",
      },
    ];
    const existing = getSavedGames();
    for (const seed of SEED_GAMES) {
      if (!existing.some((g) => g.sessionId === seed.sessionId)) {
        saveGame(seed);
      }
    }
    setSavedGames(getSavedGames());

    // Bank categories let us swap any "random" padding round for a real
    // category so every round gets on-topic questions.
    fetch("/api/bank/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { categories: ApiCategory[] } | null) => {
        if (d?.categories) setBankCategories(d.categories);
      })
      .catch(() => {});
  }, []);

  const startNew = useCallback(() => {
    const s = createGameGenSession();
    setSession({ ...s });
  }, []);

  const handleAddTeam = useCallback(() => {
    if (!session || !teamName.trim() || selectedTopics.length === 0) return;
    const updated = addTeam(session, teamName.trim(), selectedTopics);
    setSession({ ...updated });
    setTeamName("");
    setSelectedTopics([]);
    setCustomTopic("");
  }, [session, teamName, selectedTopics]);

  const handleRemoveTeam = useCallback(
    (teamId: string) => {
      if (!session) return;
      const updated = removeTeam(session, teamId);
      setSession({ ...updated });
    },
    [session]
  );

  const toggleTopic = useCallback(
    (topic: string) => {
      setSelectedTopics((prev) => {
        if (prev.includes(topic)) return prev.filter((t) => t !== topic);
        if (prev.length >= 5) return prev;
        return [...prev, topic];
      });
    },
    []
  );

  const addCustomTopic = useCallback(() => {
    const t = customTopic.trim();
    if (!t || selectedTopics.length >= 5 || selectedTopics.includes(t)) return;
    setSelectedTopics((prev) => [...prev, t]);
    setCustomTopic("");
  }, [customTopic, selectedTopics]);

  const handleReset = useCallback(() => {
    if (!confirm("Clear this game and start over?")) return;
    clearGameGenSession();
    setSession(null);
    setGenerated(null);
    setGenError(null);
  }, []);

  // Build a real, playable quiz from the bundled question bank — the same
  // /api/wildcard/topic endpoint Wildcard uses — and stash it in
  // localStorage under the gen_<id> key the presenter reads.
  const handleGenerate = useCallback(async () => {
    if (!session || session.teams.length < 3) return;
    setGenerating(true);
    setGenError(null);
    try {
      const topics = buildRoundTopics(session.teams); // 6 lowercased topics
      const used = new Set(topics.filter((t) => t !== "random"));
      // Categories not already chosen, to fill any "random" padding rounds.
      const fillers = bankCategories.filter(
        (c) => !used.has(c.name.toLowerCase()) && c.questionCount >= QUESTIONS_PER_ROUND
      );
      let fillerIdx = 0;
      const picks = topics.map((t) => {
        if (t === "random" && fillers.length) {
          const c = fillers[fillerIdx % fillers.length];
          fillerIdx++;
          return { topic: c.slug, label: c.name };
        }
        return { topic: t, label: titleCase(t) };
      });

      const { rounds, tieBreaker } = await buildRounds(picks, {
        perRound: QUESTIONS_PER_ROUND,
        difficulty,
      });

      const empty = rounds.filter((r) => r.questions.length === 0).map((r) => r.title);

      const genSession: GameGenSession = {
        id: session.id,
        createdAt: new Date().toISOString(),
        status: "ready",
        teams: session.teams,
        rounds,
        tieBreaker,
      };

      const quiz = gameGenToQuiz(genSession);
      localStorage.setItem(`quiz_gen_${session.id}`, JSON.stringify(quiz));
      setGenerated(genSession);
      if (empty.length) {
        setGenError(
          `No bank questions found for: ${empty.join(", ")}. Those rounds came back empty — try different topics.`
        );
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [session, bankCategories, difficulty]);

  const handleSaveGame = useCallback(() => {
    if (!generated) return;
    const roundTopics = generated.rounds.map((r) => r.title);
    const game: SavedGameGen = {
      sessionId: generated.id,
      name: roundTopics.join(", "),
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      roundTopics,
      savedAt: new Date().toISOString(),
    };
    saveGame(game);
    setSavedGames(getSavedGames());
  }, [generated]);

  const handleDeleteSaved = useCallback((sessionId: string) => {
    deleteSavedGame(sessionId);
    localStorage.removeItem(`quiz_gen_${sessionId}`);
    setSavedGames(getSavedGames());
  }, []);

  const brand = typeof window !== "undefined" ? getBrand() : { name: "", tagline: "" };
  const roundTopics = session && session.teams.length >= 3 ? buildRoundTopics(session.teams) : [];
  const topicSummary = session ? aggregateTopics(session.teams) : [];

  // No session — show start button
  if (!session) {
    return (
      <div className="min-h-screen bg-[#E8DFC8] p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm text-[#3D3D3A]/55 hover:text-[#3D3D3A]/70">
            &larr; Back to quizzes
          </Link>
          <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#8B3530]/50">
            {brand.name}
          </p>
          <h1 className="mb-6 text-3xl sm:text-4xl font-black uppercase text-[#8B3530]">
            Game Gen
          </h1>
          <button
            onClick={startNew}
            className="w-full rounded-lg border-2 border-dashed border-[#3D3D3A]/25 bg-transparent p-8 sm:p-12 text-lg sm:text-xl font-bold text-[#3D3D3A]/75 transition-all hover:border-[#8B3530]/40 hover:text-[#3D3D3A]"
          >
            Start New Game
          </button>

          {/* Saved Games */}
          {savedGames.length > 0 && (
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#8FAA73]/20" />
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8FAA73]/40">
                  {savedGames.length} saved game{savedGames.length !== 1 ? "s" : ""}
                </p>
                <div className="h-px flex-1 bg-[#8FAA73]/20" />
              </div>
              <div className="space-y-3">
                {savedGames.map((game) => (
                  <div
                    key={game.sessionId}
                    className="flex items-center justify-between rounded-lg border border-[#3D3D3A]/20 bg-transparent p-4 sm:p-5 transition-all hover:border-[#8FAA73]/40"
                  >
                    <Link href={`/present/gen_${game.sessionId}`} className="flex-1">
                      <h3 className="font-bold text-[#3D3D3A]">{game.date}</h3>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {game.roundTopics.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[#8FAA73]/10 px-2.5 py-0.5 text-xs text-[#8FAA73]/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </Link>
                    <button
                      onClick={() => handleDeleteSaved(game.sessionId)}
                      className="ml-3 rounded px-2 py-1 text-xs text-[#C26B3E]/40 transition-colors hover:bg-[#C26B3E]/10 hover:text-[#C26B3E]"
                      title="Remove from saved"
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

  return (
    <div className="min-h-screen bg-[#E8DFC8] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#3D3D3A]/55 hover:text-[#3D3D3A]/70"
          >
            &larr; Back to quizzes
          </Link>
          <button
            onClick={handleReset}
            className="rounded px-3 py-1 text-xs text-[#C26B3E]/60 hover:bg-[#C26B3E]/10 hover:text-[#C26B3E]"
          >
            Reset
          </button>
        </div>

        <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#8B3530]/50">
          {brand.name}
        </p>
        <h1 className="mb-6 text-3xl sm:text-4xl font-black uppercase text-[#8B3530]">
          Game Gen
        </h1>

        {/* Team Registration */}
        <div className="mb-8 rounded-lg border border-[#8B3530]/20 bg-transparent p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-[#8B3530]">
            Register Team
          </h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-[#3D3D3A]/60">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Quizzy McQuizface"
              className="w-full rounded bg-[#3D3D3A]/8 px-4 py-2.5 text-[#3D3D3A] placeholder-[#3D3D3A]/45 outline-none focus:ring-2 focus:ring-[#8B3530]/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedTopics.length > 0)
                  handleAddTeam();
              }}
            />
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-sm text-[#3D3D3A]/60">
              Pick 3–5 topics{" "}
              <span className="text-[#8B3530]/60">
                ({selectedTopics.length}/5 selected)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedTopics.includes(topic)
                      ? "bg-[#8B3530] text-black"
                      : "bg-[#3D3D3A]/8 text-[#3D3D3A]/70 hover:bg-white/20 hover:text-[#3D3D3A]"
                  } ${selectedTopics.length >= 5 && !selectedTopics.includes(topic) ? "opacity-30 cursor-not-allowed" : ""}`}
                  disabled={
                    selectedTopics.length >= 5 &&
                    !selectedTopics.includes(topic)
                  }
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or type a custom topic..."
              className="flex-1 rounded bg-[#3D3D3A]/8 px-4 py-2 text-sm text-[#3D3D3A] placeholder-[#3D3D3A]/45 outline-none focus:ring-2 focus:ring-[#8B3530]/40"
              onKeyDown={(e) => e.key === "Enter" && addCustomTopic()}
            />
            <button
              onClick={addCustomTopic}
              disabled={
                !customTopic.trim() || selectedTopics.length >= 5
              }
              className="rounded bg-[#3D3D3A]/8 px-4 py-2 text-sm font-medium text-[#3D3D3A]/70 hover:bg-white/20 disabled:opacity-30"
            >
              Add
            </button>
          </div>

          {selectedTopics.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {selectedTopics.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full bg-[#8FAA73]/20 px-3 py-1 text-sm font-medium text-[#8FAA73]"
                >
                  {t}
                  <button
                    onClick={() => toggleTopic(t)}
                    className="ml-1 text-[#8FAA73]/60 hover:text-[#8FAA73]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleAddTeam}
            disabled={!teamName.trim() || selectedTopics.length === 0}
            className="rounded bg-[#8B3530] px-6 py-2 font-bold text-black transition-all hover:bg-[#8B3530]/90 disabled:opacity-30"
          >
            Add Team
          </button>
        </div>

        {/* Registered Teams */}
        {session.teams.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#8B3530]/20" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8B3530]/40">
                {session.teams.length} team
                {session.teams.length !== 1 ? "s" : ""} registered
              </p>
              <div className="h-px flex-1 bg-[#8B3530]/20" />
            </div>

            <div className="space-y-3">
              {session.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg border border-[#3D3D3A]/20 bg-transparent p-4"
                >
                  <div>
                    <h3 className="font-bold text-[#3D3D3A]">{team.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {team.topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-[#3D3D3A]/8 px-2.5 py-0.5 text-xs text-[#3D3D3A]/60"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className="rounded px-2 py-1 text-xs text-[#C26B3E]/40 hover:bg-[#C26B3E]/10 hover:text-[#C26B3E]"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Aggregation & Round Preview */}
        {session.teams.length >= 3 && (
          <div className="mb-8 rounded-lg border border-[#8FAA73]/30 bg-transparent p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-[#8FAA73]">
              Round Plan
            </h2>

            <div className="mb-4">
              <p className="mb-2 text-sm text-[#3D3D3A]/60">
                Topic popularity (from team picks):
              </p>
              <div className="flex flex-wrap gap-2">
                {topicSummary.map((t) => (
                  <span
                    key={t.topic}
                    className="rounded-full bg-[#8FAA73]/10 px-3 py-1 text-sm text-[#8FAA73]"
                  >
                    {t.topic}{" "}
                    <span className="text-[#8FAA73]/50">×{t.count}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6 space-y-2">
              {roundTopics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded bg-[#3D3D3A]/5 px-4 py-3"
                >
                  <span className="text-sm font-bold text-[#8B3530]/60">
                    R{i + 1}
                  </span>
                  <span className="font-medium text-[#3D3D3A] capitalize">
                    {topic}
                  </span>
                  <span className="ml-auto text-xs text-[#3D3D3A]/45">
                    6 questions
                  </span>
                </div>
              ))}
            </div>

            {/* Generate Section */}
            <div className="rounded-lg border border-dashed border-[#8B3530]/30 bg-[#8B3530]/5 p-4">
              <div className="mb-4">
                <p className="mb-2 text-sm text-[#3D3D3A]/60">Difficulty</p>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                        difficulty === d
                          ? "bg-[#8B3530] text-black"
                          : "bg-[#3D3D3A]/8 text-[#3D3D3A]/70 hover:bg-white/20 hover:text-[#3D3D3A]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {genError && (
                <p className="mb-3 rounded bg-[#C26B3E]/10 px-3 py-2 text-sm text-[#C26B3E]">
                  {genError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="rounded bg-[#8B3530] px-4 py-2 text-sm sm:px-5 sm:text-base font-bold text-black transition-all hover:bg-[#8B3530]/90 disabled:opacity-40"
                >
                  {generating
                    ? "Generating…"
                    : generated
                      ? "Regenerate"
                      : "Generate Game"}
                </button>
                {generated && (
                  <>
                    <button
                      onClick={handleSaveGame}
                      disabled={savedGames.some((g) => g.sessionId === session.id)}
                      className="rounded bg-[#8FAA73]/20 px-4 py-2 text-sm sm:px-5 sm:text-base font-bold text-[#8FAA73] transition-all hover:bg-[#8FAA73]/30 disabled:opacity-30"
                    >
                      {savedGames.some((g) => g.sessionId === session.id) ? "Saved" : "Save Game"}
                    </button>
                    <Link
                      href={`/present/gen_${session.id}`}
                      className="rounded bg-[#8FAA73] px-4 py-2 text-sm sm:px-5 sm:text-base font-bold text-black transition-all hover:bg-[#8FAA73]/90"
                    >
                      Present Game →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Question / Answer audit — verify each round pulled real Q&A */}
            {generated && (
              <div className="mt-6 space-y-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8FAA73]/60">
                  Audit · {generated.rounds.reduce((n, r) => n + r.questions.length, 0)} questions
                  {generated.tieBreaker ? " + tiebreaker" : ""}
                </p>
                {generated.rounds.map((round) => (
                  <div
                    key={round.number}
                    className="rounded-lg border border-[#3D3D3A]/15 bg-[#3D3D3A]/[0.03] p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-[#8B3530]/60">R{round.number}</span>
                      <span className="font-bold text-[#3D3D3A]">{round.title}</span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                          round.questions.length === QUESTIONS_PER_ROUND
                            ? "bg-[#8FAA73]/15 text-[#8FAA73]"
                            : "bg-[#C26B3E]/15 text-[#C26B3E]"
                        }`}
                      >
                        {round.questions.length}/{QUESTIONS_PER_ROUND} questions
                      </span>
                    </div>
                    {round.questions.length === 0 ? (
                      <p className="text-sm italic text-[#C26B3E]/80">
                        No questions returned for this topic.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {round.questions.map((q) => (
                          <li key={q.number} className="text-sm">
                            <span className="text-[#3D3D3A]">
                              <span className="text-[#3D3D3A]/40">{q.number}. </span>
                              {q.text}
                            </span>
                            <span className="mt-0.5 block text-[#8FAA73]">
                              → {q.answer || (
                                <span className="italic text-[#C26B3E]">missing answer</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
                {generated.tieBreaker && (
                  <div className="rounded-lg border border-[#8B3530]/20 bg-[#8B3530]/[0.04] p-4 text-sm">
                    <span className="font-bold text-[#8B3530]/70">Tiebreaker: </span>
                    <span className="text-[#3D3D3A]">{generated.tieBreaker.question}</span>
                    <span className="mt-0.5 block text-[#8FAA73]">→ {generated.tieBreaker.answer}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {session.teams.length > 0 && session.teams.length < 3 && (
          <p className="text-center text-sm text-[#3D3D3A]/55">
            Register at least 3 teams to generate rounds
          </p>
        )}

        {/* Saved Games */}
        {savedGames.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#8FAA73]/20" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8FAA73]/40">
                {savedGames.length} saved game{savedGames.length !== 1 ? "s" : ""}
              </p>
              <div className="h-px flex-1 bg-[#8FAA73]/20" />
            </div>
            <div className="space-y-3">
              {savedGames.map((game) => (
                <div
                  key={game.sessionId}
                  className="flex items-center justify-between rounded-lg border border-[#3D3D3A]/20 bg-transparent p-4 sm:p-5 transition-all hover:border-[#8FAA73]/40"
                >
                  <Link href={`/present/gen_${game.sessionId}`} className="flex-1">
                    <h3 className="font-bold text-[#3D3D3A]">{game.date}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {game.roundTopics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-[#8FAA73]/10 px-2.5 py-0.5 text-xs text-[#8FAA73]/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDeleteSaved(game.sessionId)}
                    className="ml-3 rounded px-2 py-1 text-xs text-[#C26B3E]/40 transition-colors hover:bg-[#C26B3E]/10 hover:text-[#C26B3E]"
                    title="Remove from saved"
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
