"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { ClipResult } from "@/lib/types";

// Standalone clip-search section. Look up a line, song, or answer and play the
// YouTube clip — usable anytime (prep or mid-game), independent of a quiz.
// Backed by /api/clip-search (InnerTube, no key).
export default function ClipsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClipResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClipResult | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clip-search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok || !data.items?.length) setError(data.error || "No clips found");
      else setResults(data.items);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#E8DFC8] p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-1">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#8B3530]/50">
            Trivia Tools
          </p>
        </div>
        <div className="mb-6 flex items-end justify-between gap-3">
          <h1 className="text-3xl font-black uppercase text-[#8B3530] sm:text-4xl">Clips</h1>
          <Link
            href="/"
            className="rounded bg-[#8B3530]/20 px-4 py-2 text-sm font-bold text-[#8B3530] transition-all hover:bg-[#8B3530]/30"
          >
            ← Quizzes
          </Link>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(query); }}
            placeholder="Type a line, song, or answer — e.g. you're under arrest movie clip"
            className="flex-1 rounded-lg border border-[#3D3D3A]/30 bg-white/60 px-4 py-3 text-[#3D3D3A] outline-none placeholder:text-[#3D3D3A]/40 focus:border-[#8B3530]/60"
          />
          <button
            onClick={() => search(query)}
            disabled={busy}
            className="rounded-lg bg-[#8B3530] px-6 py-3 font-bold text-white transition-all hover:bg-[#8B3530]/90 disabled:opacity-50"
          >
            {busy ? "…" : "Search"}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#3D3D3A]/50">
          Tip: for a movie line add <span className="font-semibold text-[#3D3D3A]/80">clip</span> or{" "}
          <span className="font-semibold text-[#3D3D3A]/80">scene</span>; for a song add{" "}
          <span className="font-semibold text-[#3D3D3A]/80">music video</span>. Clips stream from YouTube.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-[#C26B3E]/10 px-4 py-3 text-sm font-medium text-[#C26B3E]">
            {error}
          </div>
        )}

        {/* Player */}
        {selected && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-[#3D3D3A]" title={selected.title}>
                {selected.title}
              </p>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 rounded px-2 py-1 text-xs font-bold text-[#8B3530]/60 hover:text-[#8B3530]"
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#3D3D3A]/20 shadow-lg">
              <iframe
                key={selected.videoId}
                title="clip"
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${selected.videoId}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mt-6 space-y-2">
          {results.map((c) => (
            <div
              key={c.videoId}
              className={`flex items-center gap-3 rounded-lg border p-2 transition-all ${
                selected?.videoId === c.videoId
                  ? "border-[#8B3530]/50 bg-[#1C2E22]"
                  : "border-white/10 bg-[#1C2E22] hover:border-[#8B3530]/40"
              }`}
            >
              <button
                onClick={() => setSelected(c)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.thumbnail} alt="" className="h-14 w-24 shrink-0 rounded object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">{c.title}</span>
                  <span className="block truncate text-xs text-[#E8DFC8]/50">
                    {c.channel}{c.duration ? ` · ${c.duration}` : ""}
                  </span>
                </span>
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${c.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 px-3 text-sm text-[#E8DFC8]/30 hover:text-[#E8DFC8]/70"
                title="Open on YouTube"
              >
                ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
