"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  type GameSession,
  getSession,
  sessionToCSV,
  teamTotal,
} from "@/lib/scoring";
import { ScoreGrid } from "@/components/ScoreGrid";

export default function ScoreSheetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<GameSession | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const s = getSession(id);
    if (!s) {
      router.push("/score");
      return;
    }
    setSession(s);
  }, [id, router]);

  const downloadCSV = () => {
    if (!session) return;
    const csv = sessionToCSV(session);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name.replace(/[^a-zA-Z0-9]/g, "_")}_scores.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut: L for leaderboard (only when not in an input)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "l" || e.key === "L") {
        setShowLeaderboard((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!session) return null;

  const sortedTeams = [...session.teams]
    .map((t, i) => ({ ...t, originalIndex: i }))
    .sort((a, b) => teamTotal(b, session.roundCount) - teamTotal(a, session.roundCount));

  return (
    <div className="min-h-screen bg-[#143B2E] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Link
              href="/score"
              className="text-sm text-white/40 hover:text-white/60"
            >
              &larr; All games
            </Link>
            <h1 className="text-3xl font-black text-[#FFD700]">
              {session.name}
            </h1>
            <p className="text-sm text-white/40">{session.date}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLeaderboard((v) => !v)}
              className={`rounded px-4 py-2 text-sm font-bold transition-all ${
                showLeaderboard
                  ? "bg-[#FFD700] text-black"
                  : "bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30"
              }`}
            >
              Leaderboard (L)
            </button>
            <button
              onClick={downloadCSV}
              className="rounded bg-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/20"
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="mb-6 rounded-xl border-2 border-[#FFD700]/30 bg-[#0F1B2D] p-6">
            <h2 className="mb-4 text-center text-2xl font-black uppercase tracking-wider text-[#FFD700]">
              Leaderboard
            </h2>
            {sortedTeams.length === 0 ? (
              <p className="text-center text-white/40">No teams yet</p>
            ) : (
              <div className="space-y-2">
                {sortedTeams.map((team, rank) => {
                  const total = teamTotal(team, session.roundCount);
                  return (
                    <div
                      key={team.originalIndex}
                      className={`flex items-center gap-4 rounded-lg px-5 py-3 ${
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
                        className={`w-8 text-2xl font-black ${
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
                      <span className="flex-1 text-xl font-bold text-white">
                        {team.name || "—"}
                      </span>
                      <span className="text-2xl font-black text-[#4EC9B0]">
                        {total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Score grid */}
        <ScoreGrid session={session} onUpdate={setSession} />

        <p className="mt-4 text-xs text-white/30">
          Tip: Arrow keys navigate between score cells. Press{" "}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">L</kbd> to toggle
          leaderboard. Last round scores are doubled in the total.
        </p>
      </div>
    </div>
  );
}
