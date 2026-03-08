"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrand } from "@/lib/branding";
import {
  listSessions,
  createSession,
  deleteSession,
} from "@/lib/scoring";

export default function ScorePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState(listSessions);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  );
  const [roundCount, setRoundCount] = useState(6);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    const session = createSession(name.trim(), date, roundCount);
    router.push(`/score/${session.id}`);
  }, [name, date, roundCount, router]);

  const handleDelete = useCallback((id: string) => {
    deleteSession(id);
    setSessions(listSessions());
  }, []);

  return (
    <div className="min-h-screen bg-[#143B2E] p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-white/40 hover:text-white/60">
          &larr; Back to quizzes
        </Link>

        <p className="mt-4 mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700]/50">
          {getBrand().name}
        </p>
        <h1 className="mb-6 text-4xl font-black uppercase text-[#FFD700]">
          Scorekeeper
        </h1>

        {/* Create new session */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="mb-6 w-full rounded-lg border-2 border-dashed border-white/20 bg-[#1B4D3E]/50 p-6 text-lg font-bold text-white/70 transition-all hover:border-[#FFD700]/40"
          >
            + New Game Session
          </button>
        ) : (
          <div className="mb-6 rounded-lg border border-[#FFD700]/30 bg-[#1B4D3E] p-6">
            <h2 className="mb-4 text-lg font-bold text-[#FFD700]">
              New Game Session
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-white/50">
                  Session Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Pub Quiz #567"
                  className="w-full rounded bg-white/10 px-4 py-2.5 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-[#FFD700]/40"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/50">Date</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded bg-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[#FFD700]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/50">
                  Number of Rounds
                </label>
                <input
                  type="number"
                  value={roundCount}
                  onChange={(e) =>
                    setRoundCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min={1}
                  max={20}
                  className="w-full rounded bg-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[#FFD700]/40"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="rounded bg-[#FFD700] px-6 py-2 font-bold text-black transition-all hover:bg-[#FFD700]/90 disabled:opacity-30"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded px-4 py-2 text-white/50 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#FFD700]/20" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFD700]/40">
            {sessions.length} game{sessions.length !== 1 ? "s" : ""}
          </p>
          <div className="h-px flex-1 bg-[#FFD700]/20" />
        </div>

        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1B4D3E] p-5 transition-all hover:border-[#FFD700]/40"
            >
              <Link href={`/score/${s.id}`} className="flex-1">
                <h2 className="text-xl font-bold text-white">{s.name}</h2>
                <p className="text-sm text-[#F5E6C8]/50">{s.date}</p>
              </Link>
              <button
                onClick={() => handleDelete(s.id)}
                className="ml-4 rounded px-3 py-1 text-sm text-[#E84D5A]/60 hover:bg-[#E84D5A]/10 hover:text-[#E84D5A]"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {sessions.length === 0 && (
          <p className="mt-8 text-center text-white/40">
            No game sessions yet. Create one above to start scoring.
          </p>
        )}
      </div>
    </div>
  );
}
