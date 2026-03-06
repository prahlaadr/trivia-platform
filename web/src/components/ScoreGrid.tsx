"use client";

import { useCallback, useEffect, useRef } from "react";
import type { GameSession } from "@/lib/scoring";
import { saveSession, teamTotal } from "@/lib/scoring";

interface ScoreGridProps {
  session: GameSession;
  onUpdate: (session: GameSession) => void;
}

/**
 * Editable score grid with arrow-key navigation between round cells.
 * Arrow keys move between score cells only (not team name).
 * Tab/Shift+Tab also works. Enter moves down.
 */
export function ScoreGrid({ session, onUpdate }: ScoreGridProps) {
  const gridRef = useRef<HTMLTableElement>(null);

  const persist = useCallback(
    (s: GameSession) => {
      saveSession(s);
      onUpdate({ ...s });
    },
    [onUpdate]
  );

  const updateTeamName = useCallback(
    (index: number, name: string) => {
      session.teams[index].name = name;
      persist(session);
    },
    [session, persist]
  );

  const updateScore = useCallback(
    (teamIndex: number, roundIndex: number, value: string) => {
      const num = value === "" ? null : parseInt(value);
      if (value !== "" && isNaN(num!)) return;
      session.teams[teamIndex].scores[roundIndex] = num;
      persist(session);
    },
    [session, persist]
  );

  const addTeam = useCallback(
    (name: string) => {
      if (!name.trim()) return;
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
      session.teams.splice(index, 1);
      persist(session);
    },
    [session, persist]
  );

  // Focus a score cell by team/round index
  const focusCell = useCallback(
    (teamIdx: number, roundIdx: number) => {
      if (!gridRef.current) return;
      const input = gridRef.current.querySelector<HTMLInputElement>(
        `[data-cell="${teamIdx}-${roundIdx}"]`
      );
      if (input) {
        input.focus();
        input.select();
      }
    },
    []
  );

  // Arrow key handler for score cells
  const handleScoreCellKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      teamIdx: number,
      roundIdx: number
    ) => {
      const teams = session.teams.length;
      const rounds = session.roundCount;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (roundIdx < rounds - 1) focusCell(teamIdx, roundIdx + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (roundIdx > 0) focusCell(teamIdx, roundIdx - 1);
      } else if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (teamIdx < teams - 1) focusCell(teamIdx + 1, roundIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (teamIdx > 0) focusCell(teamIdx - 1, roundIdx);
      }
    },
    [session, focusCell]
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table ref={gridRef} className="w-full border-collapse">
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
                  tabIndex={-1}
                />
              </td>
              {team.scores.map((score, roundIdx) => (
                <td key={roundIdx} className="px-1 py-1 text-center">
                  <input
                    data-cell={`${teamIdx}-${roundIdx}`}
                    type="text"
                    inputMode="numeric"
                    value={score ?? ""}
                    onChange={(e) =>
                      updateScore(teamIdx, roundIdx, e.target.value)
                    }
                    onKeyDown={(e) =>
                      handleScoreCellKeyDown(e, teamIdx, roundIdx)
                    }
                    onFocus={(e) => e.target.select()}
                    className="w-full rounded bg-transparent px-2 py-2 text-center text-lg tabular-nums text-white outline-none focus:bg-[#FFD700]/10 focus:ring-1 focus:ring-[#FFD700]/40"
                    placeholder="—"
                  />
                </td>
              ))}
              <td className="px-4 py-2 text-center text-xl font-black tabular-nums text-[#4EC9B0]">
                {teamTotal(team, session.roundCount)}
              </td>
              <td className="px-2 py-2">
                <button
                  onClick={() => removeTeam(teamIdx)}
                  className="text-sm text-white/20 hover:text-[#E84D5A]"
                  title="Remove team"
                  tabIndex={-1}
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
                type="text"
                placeholder="+ Add team name..."
                className="w-full rounded bg-transparent px-2 py-2 text-lg text-white/40 outline-none placeholder-white/20 focus:bg-white/5 focus:text-white focus:ring-1 focus:ring-[#FFD700]/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget;
                    addTeam(input.value);
                    input.value = "";
                  }
                }}
                tabIndex={-1}
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
  );
}
