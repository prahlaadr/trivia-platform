"use client";

import { useCallback, useEffect, useState } from "react";
import type { PatternKind } from "@/lib/bank/types";

// Below this a connection round reads too thin to host.
const MIN_PATTERN_MATCHES = 5;

const PATTERN_KINDS: { kind: PatternKind; label: string; hint: string }[] = [
  { kind: "string", label: "String", hint: 'letters hidden in every answer, e.g. "mad" -> Madison, Madonna' },
  { kind: "keyword", label: "Keyword", hint: 'a word shared by every answer or question, e.g. "king"' },
  { kind: "rhyme", label: "Rhyme", hint: 'answers that rhyme with a word, e.g. "rain"' },
];

interface Suggestion { value: string; label: string; count: number }

export interface PatternPick {
  patternKind: PatternKind;
  value: string;
  label: string;
  count: number;
}

/**
 * Host control for a connection round: pick string / keyword / rhyme, then
 * either click a ready-made suggestion or type a value. Either way we confirm
 * the bank's match count BEFORE adding so a round can never come back empty.
 * Shared by Wildcard and Game Gen so they can't drift.
 */
export default function PatternRoundAdder({
  onAdd,
  disabled,
}: {
  onAdd: (pick: PatternPick) => void;
  disabled?: boolean;
}) {
  const [kind, setKind] = useState<PatternKind>("string");
  const [value, setValue] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<PatternKind, Suggestion[]> | null>(null);

  useEffect(() => {
    fetch("/api/bank/pattern-suggestions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<PatternKind, Suggestion[]> | null) => d && setSuggestions(d))
      .catch(() => {});
  }, []);

  const add = useCallback(
    async (seed?: string) => {
      const v = (seed ?? value).trim();
      if (!v) return;
      setBusy(true);
      setNote(null);
      try {
        const res = await fetch(`/api/bank/pattern-count?kind=${kind}&value=${encodeURIComponent(v)}`);
        const data = (await res.json()) as { count?: number };
        const count = data.count ?? 0;
        if (count < MIN_PATTERN_MATCHES) {
          setNote(
            count === 0
              ? `No answers match that ${kind}. Try another.`
              : `Only ${count} answers match — need at least ${MIN_PATTERN_MATCHES} for a round.`
          );
          return;
        }
        const kindLabel = PATTERN_KINDS.find((k) => k.kind === kind)?.label ?? kind;
        const label = `${kindLabel}: ${kind === "string" ? v.toUpperCase() : v}`;
        onAdd({ patternKind: kind, value: v, label, count });
        setValue("");
      } catch {
        setNote("Couldn't check that pattern. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [kind, value, onAdd]
  );

  const picks = suggestions?.[kind] ?? [];

  return (
    <div className="rounded-lg border border-[#8B3530]/25 bg-[#8B3530]/4 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#3D3D3A]/60">
          Pattern round — answers share a thread
        </p>
        <span className="text-[10px] uppercase tracking-wide text-[#8B3530]/60">adds a new round</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PATTERN_KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => {
              setKind(k.kind);
              setNote(null);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-all ${
              kind === k.kind
                ? "bg-[#8B3530] text-white"
                : "bg-[#3D3D3A]/8 text-[#3D3D3A]/70 hover:bg-[#3D3D3A]/15"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[11px] text-[#3D3D3A]/50">
        {PATTERN_KINDS.find((k) => k.kind === kind)?.hint}
      </p>

      {/* Ready-made suggestions for the chosen kind (one click = add the round) */}
      {picks.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#3D3D3A]/45">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {picks.map((s) => (
              <button
                key={s.value}
                onClick={() => add(s.value)}
                disabled={busy || disabled}
                title={`${s.count} answers in the bank`}
                className="rounded-full border border-[#8B3530]/30 bg-[#8B3530]/8 px-2.5 py-1 text-xs font-medium text-[#8B3530] transition-all hover:bg-[#8B3530]/18 disabled:opacity-40"
              >
                {s.label} <span className="text-[#8B3530]/55">{s.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNote(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={kind === "string" ? "or type your own, e.g. mad" : kind === "keyword" ? "or type your own, e.g. king" : "or type your own, e.g. rain"}
          className="flex-1 rounded border border-[#3D3D3A]/25 bg-white/40 px-3 py-2 text-sm text-[#3D3D3A] placeholder-[#3D3D3A]/40 outline-none focus:border-[#8B3530] focus:ring-1 focus:ring-[#8B3530]/40"
        />
        <button
          onClick={() => add()}
          disabled={!value.trim() || busy || disabled}
          className="rounded border-2 border-[#8B3530] bg-[#8B3530]/10 px-4 text-sm font-bold text-[#8B3530] transition-all hover:bg-[#8B3530]/20 disabled:opacity-40"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
      {note && <p className="mt-2 text-[11px] font-medium text-[#C26B3E]">{note}</p>}
    </div>
  );
}
