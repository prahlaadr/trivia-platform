"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  type GameSession,
  type Team,
  getSession,
  saveSession,
  sessionToCSV,
  teamTotal,
} from "@/lib/scoring";

export default function ScoreSheetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<GameSession | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const newTeamRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = getSession(id);
    if (!s) {
      router.push("/score");
      return;
    }
    setSession(s);
  }, [id, router]);

  const persist = useCallback(
    (updated: GameSession) => {
      setSession({ ...updated });
      saveSession(updated);
    },
    []
  );

  const addTeam = useCallback(
    (name: string) => {
      if (!session || !name.trim()) return;
      session.teams.push({
        name: name.trim(),
        scores: Array(session.roundCount).fill(null),
      });
      persist(session);
    },
    [session, persist]
  );

  const removeTeam = useCallback(
    (index: number) => {
      if (!session) return;
      session.teams.splice(index, 1);
      persist(session);
    },
    [session, persist]
  );

  const updateTeamName = useCallback(
    (index: number, name: string) => {
      if (!session) return;
      session.teams[index].name = name;
      persist(session);
    },
    [session, persist]
  );

  const updateScore = useCallback(
    (teamIndex: number, roundIndex: number, value: string) => {
      if (!session) return;
      const num = value === "" ? null : parseInt(value);
      if (value !== "" && isNaN(num!)) return;
      session.teams[teamIndex].scores[roundIndex] = num;
      persist(session);
    },
    [session, persist]
  );

  const downloadCSV = useCallback(() => {
    if (!session) return;
    const csv = sessionToCSV(session);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name.replace(/[^a-zA-Z0-9]/g, "_")}_scores.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session]);

  const handleNewTeamKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const input = e.currentTarget;
        addTeam(input.value);
        input.value = "";
      }
    },
    [addTeam]
  );

  // Keyboard shortcut: L for leaderboard
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
    .sort((a, b) => teamTotal(b) - teamTotal(a));

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

        {/* Leaderboard overlay */}
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
                  const total = teamTotal(team);
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

        {/* Spreadsheet */}
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#1B4D3E]">
                <th className="sticky left-0 z-10 min-w-[200px] bg-[#1B4D3E] px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-[#FFD700]">
                  Team Name
                </th>
                {Array.from({ length: session.roundCount }, (_, i) => (
                  <th
                    key={i}
                    className="min-w-[80px] px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#FFD700]"
                  >
                    {i + 1}
                    {i === session.roundCount - 1 && (
                      <span className="ml-1 text-[10px] text-[#E84D5A]">
                        2x
                      </span>
                    )}
                  </th>
                ))}
                <th className="min-w-[90px] px-4 py-3 text-center text-sm font-black uppercase tracking-wider text-[#FFD700]">
                  Total
                </th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {session.teams.map((team, teamIdx) => (
                <tr
                  key={teamIdx}
                  className="border-t border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="sticky left-0 z-10 bg-[#143B2E] px-2 py-1">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeamName(teamIdx, e.target.value)}
                      className="w-full rounded bg-transparent px-2 py-2 text-lg font-bold text-white outline-none focus:bg-white/5 focus:ring-1 focus:ring-[#FFD700]/30"
                      placeholder="Team name"
                    />
                  </td>
                  {team.scores.map((score, roundIdx) => (
                    <td key={roundIdx} className="px-1 py-1 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={score ?? ""}
                        onChange={(e) =>
                          updateScore(teamIdx, roundIdx, e.target.value)
                        }
                        className="w-full rounded bg-transparent px-2 py-2 text-center text-lg tabular-nums text-white outline-none focus:bg-white/5 focus:ring-1 focus:ring-[#FFD700]/30"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center text-xl font-black tabular-nums text-[#4EC9B0]">
                    {teamTotal(team)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeTeam(teamIdx)}
                      className="text-sm text-white/20 hover:text-[#E84D5A]"
                      title="Remove team"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}

              {/* Add team row */}
              <tr className="border-t border-white/5">
                <td className="sticky left-0 z-10 bg-[#143B2E] px-2 py-1">
                  <input
                    ref={newTeamRef}
                    type="text"
                    placeholder="+ Add team name..."
                    className="w-full rounded bg-transparent px-2 py-2 text-lg text-white/40 outline-none placeholder-white/20 focus:bg-white/5 focus:text-white focus:ring-1 focus:ring-[#FFD700]/30"
                    onKeyDown={handleNewTeamKeyDown}
                  />
                </td>
                <td
                  colSpan={session.roundCount + 2}
                  className="px-4 py-2 text-sm text-white/20"
                >
                  Press Enter to add
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/30">
          Tip: Press <kbd className="rounded bg-white/10 px-1.5 py-0.5">L</kbd>{" "}
          to toggle leaderboard. Auto-saved to browser.
        </p>
      </div>
    </div>
  );
}
