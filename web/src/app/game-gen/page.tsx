"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getBrand } from "@/lib/branding";
import type { GameGenSession, GameGenTeam, SavedGameGen } from "@/lib/types";
import {
  getGameGenSession,
  createGameGenSession,
  saveGameGenSession,
  clearGameGenSession,
  addTeam,
  removeTeam,
  aggregateTopics,
  buildRoundTopics,
  getSavedGames,
  saveGame,
  deleteSavedGame,
} from "@/lib/game-gen";

const SUGGESTED_TOPICS = [
  "Pop Culture",
  "Geography",
  "Food & Drink",
  "Music",
  "Movies",
  "TV Shows",
  "Sports",
  "Science",
  "History",
  "Literature",
  "Art",
  "Technology",
  "Animals",
  "Video Games",
  "Hip Hop",
  "90s Nostalgia",
  "True Crime",
  "Celebrities",
  "World Records",
  "Myths & Legends",
];

export default function GameGenPage() {
  const [session, setSession] = useState<GameGenSession | null>(null);
  const [teamName, setTeamName] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [generatedQuiz, setGeneratedQuiz] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
    setGeneratedQuiz(null);
  }, []);

  const checkForGeneratedQuiz = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/quiz?id=gen_${session.id}`);
      if (res.ok) {
        setGeneratedQuiz(`gen_${session.id}`);
      }
    } catch {
      // not generated yet
    }
  }, [session]);

  const handleSaveGame = useCallback(async () => {
    if (!session || !generatedQuiz) return;
    try {
      const res = await fetch(`/api/quiz?id=gen_${session.id}`);
      if (!res.ok) return;
      const quiz = await res.json();
      const roundTopics = (quiz.rounds || []).map((r: { title: string }) => r.title);
      const game: SavedGameGen = {
        sessionId: session.id,
        name: roundTopics.join(", "),
        date: quiz.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        roundTopics,
        savedAt: new Date().toISOString(),
      };
      saveGame(game);
      setSavedGames(getSavedGames());
    } catch {
      // ignore
    }
  }, [session, generatedQuiz]);

  const handleDeleteSaved = useCallback((sessionId: string) => {
    deleteSavedGame(sessionId);
    setSavedGames(getSavedGames());
  }, []);

  // Build the prompt for Claude Code
  const buildPrompt = useCallback(() => {
    if (!session || session.teams.length < 3) return "";
    const roundTopics = buildRoundTopics(session.teams);
    const topicSummary = aggregateTopics(session.teams);
    const teamList = session.teams
      .map((t) => `  ${t.name}: ${t.topics.join(", ")}`)
      .join("\n");
    return `/game-gen ${session.id}\nTeams:\n${teamList}\nRound topics: ${roundTopics.join(", ")}\nAll topics ranked: ${topicSummary.map((t) => `${t.topic} (${t.count})`).join(", ")}`;
  }, [session]);

  const copyPrompt = useCallback(() => {
    const prompt = buildPrompt();
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [buildPrompt]);

  const brand = typeof window !== "undefined" ? getBrand() : { name: "", tagline: "" };
  const roundTopics = session && session.teams.length >= 3 ? buildRoundTopics(session.teams) : [];
  const topicSummary = session ? aggregateTopics(session.teams) : [];

  // No session — show start button
  if (!session) {
    return (
      <div className="min-h-screen bg-[#143B2E] p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm text-white/40 hover:text-white/60">
            &larr; Back to quizzes
          </Link>
          <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700]/50">
            {brand.name}
          </p>
          <h1 className="mb-6 text-3xl sm:text-4xl font-black uppercase text-[#FFD700]">
            Game Gen
          </h1>
          <button
            onClick={startNew}
            className="w-full rounded-lg border-2 border-dashed border-white/20 bg-[#1B4D3E]/50 p-8 sm:p-12 text-lg sm:text-xl font-bold text-white/70 transition-all hover:border-[#FFD700]/40 hover:text-white"
          >
            Start New Game
          </button>

          {/* Saved Games */}
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
                    <Link href={`/present/gen_${game.sessionId}`} className="flex-1">
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
    <div className="min-h-screen bg-[#143B2E] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-white/40 hover:text-white/60"
          >
            &larr; Back to quizzes
          </Link>
          <button
            onClick={handleReset}
            className="rounded px-3 py-1 text-xs text-[#E84D5A]/60 hover:bg-[#E84D5A]/10 hover:text-[#E84D5A]"
          >
            Reset
          </button>
        </div>

        <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700]/50">
          {brand.name}
        </p>
        <h1 className="mb-6 text-3xl sm:text-4xl font-black uppercase text-[#FFD700]">
          Game Gen
        </h1>

        {/* Team Registration */}
        <div className="mb-8 rounded-lg border border-[#FFD700]/20 bg-[#1B4D3E] p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-[#FFD700]">
            Register Team
          </h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-white/50">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Quizzy McQuizface"
              className="w-full rounded bg-white/10 px-4 py-2.5 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-[#FFD700]/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedTopics.length > 0)
                  handleAddTeam();
              }}
            />
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-sm text-white/50">
              Pick 3–5 topics{" "}
              <span className="text-[#FFD700]/60">
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
                      ? "bg-[#FFD700] text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
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
              className="flex-1 rounded bg-white/10 px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-[#FFD700]/40"
              onKeyDown={(e) => e.key === "Enter" && addCustomTopic()}
            />
            <button
              onClick={addCustomTopic}
              disabled={
                !customTopic.trim() || selectedTopics.length >= 5
              }
              className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/20 disabled:opacity-30"
            >
              Add
            </button>
          </div>

          {selectedTopics.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {selectedTopics.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full bg-[#4EC9B0]/20 px-3 py-1 text-sm font-medium text-[#4EC9B0]"
                >
                  {t}
                  <button
                    onClick={() => toggleTopic(t)}
                    className="ml-1 text-[#4EC9B0]/60 hover:text-[#4EC9B0]"
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
            className="rounded bg-[#FFD700] px-6 py-2 font-bold text-black transition-all hover:bg-[#FFD700]/90 disabled:opacity-30"
          >
            Add Team
          </button>
        </div>

        {/* Registered Teams */}
        {session.teams.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#FFD700]/20" />
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFD700]/40">
                {session.teams.length} team
                {session.teams.length !== 1 ? "s" : ""} registered
              </p>
              <div className="h-px flex-1 bg-[#FFD700]/20" />
            </div>

            <div className="space-y-3">
              {session.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1B4D3E] p-4"
                >
                  <div>
                    <h3 className="font-bold text-white">{team.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {team.topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className="rounded px-2 py-1 text-xs text-[#E84D5A]/40 hover:bg-[#E84D5A]/10 hover:text-[#E84D5A]"
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
          <div className="mb-8 rounded-lg border border-[#4EC9B0]/30 bg-[#1B4D3E] p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-[#4EC9B0]">
              Round Plan
            </h2>

            <div className="mb-4">
              <p className="mb-2 text-sm text-white/50">
                Topic popularity (from team picks):
              </p>
              <div className="flex flex-wrap gap-2">
                {topicSummary.map((t) => (
                  <span
                    key={t.topic}
                    className="rounded-full bg-[#4EC9B0]/10 px-3 py-1 text-sm text-[#4EC9B0]"
                  >
                    {t.topic}{" "}
                    <span className="text-[#4EC9B0]/50">×{t.count}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6 space-y-2">
              {roundTopics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded bg-white/5 px-4 py-3"
                >
                  <span className="text-sm font-bold text-[#FFD700]/60">
                    R{i + 1}
                  </span>
                  <span className="font-medium text-white capitalize">
                    {topic}
                  </span>
                  <span className="ml-auto text-xs text-white/30">
                    6 questions
                  </span>
                </div>
              ))}
            </div>

            {/* Generate Section */}
            <div className="rounded-lg border border-dashed border-[#FFD700]/30 bg-[#FFD700]/5 p-4">
              <p className="mb-3 text-sm text-[#FFD700]/70">
                Copy the prompt below and run it in Claude Code to generate
                questions:
              </p>
              <pre className="mb-3 overflow-x-auto rounded bg-black/30 p-3 text-xs text-white/70">
                {buildPrompt()}
              </pre>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={copyPrompt}
                  className="rounded bg-[#FFD700] px-4 py-2 text-sm sm:px-5 sm:text-base font-bold text-black transition-all hover:bg-[#FFD700]/90"
                >
                  {copied ? "Copied!" : "Copy Prompt"}
                </button>
                <button
                  onClick={checkForGeneratedQuiz}
                  className="rounded bg-white/10 px-4 py-2 text-sm sm:px-5 sm:text-base font-medium text-white/60 transition-all hover:bg-white/20 hover:text-white"
                >
                  Check for Results
                </button>
                {generatedQuiz && (
                  <>
                    <button
                      onClick={handleSaveGame}
                      disabled={savedGames.some((g) => g.sessionId === session.id)}
                      className="rounded bg-[#4EC9B0]/20 px-4 py-2 text-sm sm:px-5 sm:text-base font-bold text-[#4EC9B0] transition-all hover:bg-[#4EC9B0]/30 disabled:opacity-30"
                    >
                      {savedGames.some((g) => g.sessionId === session.id) ? "Saved" : "Save Game"}
                    </button>
                    <Link
                      href={`/present/${generatedQuiz}`}
                      className="rounded bg-[#4EC9B0] px-4 py-2 text-sm sm:px-5 sm:text-base font-bold text-black transition-all hover:bg-[#4EC9B0]/90"
                    >
                      Present Game →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {session.teams.length > 0 && session.teams.length < 3 && (
          <p className="text-center text-sm text-white/40">
            Register at least 3 teams to generate rounds
          </p>
        )}

        {/* Saved Games */}
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
                  <Link href={`/present/gen_${game.sessionId}`} className="flex-1">
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
