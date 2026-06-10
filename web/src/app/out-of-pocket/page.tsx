"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDeck } from "@/lib/oopDeck";

export default function OutOfPocketLobby() {
  const [title, setTitle] = useState("Out of Pocket");
  const [stats, setStats] = useState<{ rounds: number; questions: number } | null>(
    null
  );

  useEffect(() => {
    loadDeck().then((deck) => {
      setTitle(deck.title);
      // Count what will actually present: enabled rounds, included questions.
      const active = deck.sections
        .filter((s) => s.enabled !== false)
        .map((s) => s.questions.filter((q) => q.enabled !== false).length)
        .filter((n) => n > 0);
      const rounds = active.length;
      const questions = active.reduce((sum, n) => sum + n, 0);
      setStats({ rounds, questions });
    });
  }, []);

  return (
    <div className="oop-scope flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl text-center">
        <img
          src="/oop/oop-wordmark.svg"
          alt="OUT-OF-POCKET"
          className="mx-auto mb-10 h-8 w-auto"
        />
        <h1 className="text-5xl font-extrabold leading-none sm:text-6xl">{title}</h1>
        {stats && (
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-black/50">
            {stats.rounds} {stats.rounds === 1 ? "round" : "rounds"} ·{" "}
            {stats.questions} {stats.questions === 1 ? "question" : "questions"}
          </p>
        )}

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/out-of-pocket/edit"
            className="rounded-xl border-4 border-black bg-[var(--oop-cyan)] px-8 py-5 text-xl font-extrabold uppercase tracking-wide shadow-[6px_6px_0_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-y-0 active:shadow-[3px_3px_0_0_#000]"
          >
            ✎ Edit Trivia
          </Link>
          <Link
            href="/out-of-pocket/present"
            className="rounded-xl border-4 border-black bg-[var(--oop-pink)] px-8 py-5 text-xl font-extrabold uppercase tracking-wide shadow-[6px_6px_0_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-y-0 active:shadow-[3px_3px_0_0_#000]"
          >
            ▶ Present Game
          </Link>
        </div>

        <Link
          href="/"
          className="mt-10 inline-block text-xs font-bold uppercase tracking-widest text-black/40 underline-offset-4 hover:text-black hover:underline"
        >
          ← All trivia
        </Link>
      </div>
    </div>
  );
}
