"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inferKind, type DeckSection, type DeckQuestion } from "../deck";
import {
  loadDeck,
  saveDeck,
  resetDeck,
  newSection,
  newQuestion,
  nextQuestionNumber,
  renumberQuestions,
  moveItem,
  type DeckPayload,
} from "@/lib/oopDeck";
import { OopQuestionEditor } from "@/components/oop/OopQuestionEditor";
import { OopAdminGate } from "@/components/oop/OopAdminGate";

const fieldCls =
  "w-full rounded border-2 border-black bg-white px-2 py-1.5 text-sm text-black outline-none focus:bg-[var(--oop-yellow)]/30";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-black/60";

export default function OutOfPocketEditPage() {
  return (
    <OopAdminGate>
      <OutOfPocketEditor />
    </OopAdminGate>
  );
}

function OutOfPocketEditor() {
  const router = useRouter();
  const [payload, setPayload] = useState<DeckPayload | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadDeck().then(setPayload);
  }, []);

  // Warn on navigation away with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (!payload) {
    return (
      <div className="oop-scope flex min-h-dvh items-center justify-center">
        <p className="text-lg font-bold tracking-widest text-black/50">Loading deck…</p>
      </div>
    );
  }

  const sections = payload.sections;

  const update = (next: DeckSection[]) => {
    setPayload({ ...payload, sections: next });
    setDirty(true);
    setMsg(null);
  };

  const setSection = (idx: number, partial: Partial<DeckSection>) =>
    update(sections.map((s, i) => (i === idx ? { ...s, ...partial } : s)));

  const addSection = () => {
    const nextNum = sections.reduce((m, s) => Math.max(m, s.number), 0) + 1;
    update([...sections, newSection(nextNum)]);
  };

  const removeSection = (idx: number) => {
    if (!confirm(`Remove round "${sections[idx].title}" and all its questions?`)) return;
    update(sections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx: number, delta: number) =>
    update(moveItem(sections, idx, delta));

  const setQuestions = (secIdx: number, questions: DeckQuestion[]) =>
    update(
      sections.map((s, i) =>
        i === secIdx ? renumberQuestions({ ...s, questions }) : s
      )
    );

  const addQuestion = (secIdx: number) => {
    const s = sections[secIdx];
    // Inherit the round's prevailing type (rounds are usually homogeneous).
    const last = s.questions[s.questions.length - 1];
    const q = newQuestion(nextQuestionNumber(s));
    if (last) q.kind = inferKind(last);
    setQuestions(secIdx, [...s.questions, q]);
  };

  const changeQuestion = (secIdx: number, qIdx: number, q: DeckQuestion) =>
    setQuestions(
      secIdx,
      sections[secIdx].questions.map((old, i) => (i === qIdx ? q : old))
    );

  const removeQuestion = (secIdx: number, qIdx: number) =>
    setQuestions(
      secIdx,
      sections[secIdx].questions.filter((_, i) => i !== qIdx)
    );

  const moveQuestion = (secIdx: number, qIdx: number, delta: number) =>
    setQuestions(secIdx, moveItem(sections[secIdx].questions, qIdx, delta));

  const handleSave = async () => {
    setBusy(true);
    setMsg(null);
    const res = await saveDeck(payload);
    setBusy(false);
    if (res.ok) {
      setDirty(false);
      setMsg("Saved ✓");
    } else if (res.error !== "Cancelled") {
      setMsg(`⚠ ${res.error}`);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset to the original baked-in deck? This discards all saved edits.")) return;
    setBusy(true);
    setMsg(null);
    const res = await resetDeck();
    if (res.ok) {
      const fresh = await loadDeck();
      setPayload(fresh);
      setDirty(false);
      setMsg("Reset to original ✓");
    } else if (res.error !== "Cancelled") {
      setMsg(`⚠ ${res.error}`);
    }
    setBusy(false);
  };

  // Stash the on-screen deck so the print view reflects even unsaved edits,
  // then open the chosen document in a new tab for browser print / Save-as-PDF.
  const openPrint = (doc: "key" | "questions" | "answers") => {
    try {
      localStorage.setItem("oop-print-payload", JSON.stringify(payload));
    } catch {
      /* fall back to the saved deck if stashing fails */
    }
    window.open(`/out-of-pocket/print?doc=${doc}`, "_blank");
  };

  const handlePresent = async () => {
    if (dirty) {
      const res = await saveDeck(payload);
      if (!res.ok && res.error !== "Cancelled") {
        setMsg(`⚠ ${res.error}`);
        return;
      }
      if (res.ok) setDirty(false);
    }
    router.push("/out-of-pocket/present");
  };

  // "Live" = what will actually present: included questions in enabled rounds.
  const liveQuestions = sections
    .filter((s) => s.enabled !== false)
    .reduce(
      (sum, s) => sum + s.questions.filter((q) => q.enabled !== false).length,
      0
    );

  const allCollapsed = sections.length > 0 && sections.every((_, i) => collapsed[i]);
  const toggleAll = () =>
    setCollapsed(
      allCollapsed ? {} : Object.fromEntries(sections.map((_, i) => [i, true]))
    );

  return (
    <div className="oop-scope min-h-dvh pb-24">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-30 border-b-2 border-black bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Link
            href="/out-of-pocket"
            className="text-sm font-bold tracking-widest underline-offset-4 hover:underline"
          >
            ← BACK
          </Link>
          <p className="hidden text-xs font-bold uppercase tracking-[0.2em] text-black/50 sm:block">
            Edit Trivia · {liveQuestions} live questions
          </p>
          <button
            onClick={toggleAll}
            className="rounded border-2 border-black bg-white px-3 py-1.5 text-xs font-bold hover:bg-[var(--oop-cyan)]/30"
            title={allCollapsed ? "Expand all rounds" : "Collapse all rounds"}
          >
            {allCollapsed ? "⊕ Expand all" : "⊖ Collapse all"}
          </button>
          {/* Download fallbacks — browser print / Save as PDF from the live deck */}
          <div className="flex items-center gap-1.5" title="Printable backups of the live deck (browser → Save as PDF)">
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-black/40 lg:inline">
              ⤓ PDF
            </span>
            <button
              onClick={() => openPrint("key")}
              className="rounded border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-[var(--oop-yellow)]/40"
              title="Presenter answer key — questions + answers"
            >
              Answer key
            </button>
            <button
              onClick={() => openPrint("questions")}
              className="rounded border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-[var(--oop-cyan)]/40"
              title="Crowd question sheet — questions only, no answers"
            >
              Questions
            </button>
            <button
              onClick={() => openPrint("answers")}
              className="rounded border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold hover:bg-[var(--oop-cyan)]/40"
              title="Team answer sheet — numbered blanks to write on"
            >
              Answer sheet
            </button>
          </div>
          <div className="flex-1" />
          {msg && (
            <span className="text-xs font-bold text-black/70">{msg}</span>
          )}
          {dirty && !msg && (
            <span className="text-xs font-bold text-[var(--oop-pink)]">● Unsaved</span>
          )}
          <button
            onClick={handleReset}
            disabled={busy}
            className="rounded border-2 border-black bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={busy || !dirty}
            className="rounded border-2 border-black bg-[var(--oop-yellow)] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handlePresent}
            disabled={busy}
            className="rounded border-2 border-black bg-[var(--oop-pink)] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            ▶ Present
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        {sections.map((section, secIdx) => {
          const isCollapsed = collapsed[secIdx];
          const isEnabled = section.enabled !== false;
          return (
            <div
              key={secIdx}
              className={`rounded-2xl border-4 border-black shadow-[4px_4px_0_0_#000] ${
                isEnabled ? "bg-[var(--oop-cyan)]/20" : "bg-black/[0.04] opacity-70"
              }`}
            >
              {/* Round header */}
              <div className="flex flex-wrap items-center gap-2 border-b-4 border-black px-4 py-3">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [secIdx]: !c[secIdx] }))
                  }
                  className="rounded border-2 border-black bg-white px-2 py-0.5 text-xs font-bold"
                  title={isCollapsed ? "Expand round" : "Collapse round"}
                >
                  {isCollapsed ? "▸" : "▾"}
                </button>
                <button
                  type="button"
                  onClick={() => setSection(secIdx, { enabled: !isEnabled })}
                  className={`rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide ${
                    isEnabled ? "bg-[var(--oop-cyan)]" : "bg-white text-black/50"
                  }`}
                  title={isEnabled ? "Round is ON — click to turn off" : "Round is OFF — click to turn on"}
                >
                  {isEnabled ? "On" : "Off"}
                </button>
                <input
                  type="number"
                  className={`${fieldCls} w-16`}
                  value={section.number}
                  onChange={(e) =>
                    setSection(secIdx, { number: Number(e.target.value) || 0 })
                  }
                  title="Round number"
                />
                <input
                  className={`${fieldCls} min-w-[180px] flex-1 font-extrabold`}
                  value={section.title}
                  placeholder="Round title"
                  onChange={(e) => setSection(secIdx, { title: e.target.value })}
                />
                <span
                  className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-xs font-bold"
                  title="included / total questions"
                >
                  {section.questions.filter((q) => q.enabled !== false).length}
                  /{section.questions.length} Q
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSection(secIdx, -1)}
                    disabled={secIdx === 0}
                    className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(secIdx, 1)}
                    disabled={secIdx === sections.length - 1}
                    className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold disabled:opacity-25"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(secIdx)}
                    className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold hover:bg-red-500 hover:text-white"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-4 p-4">
                  {/* Round meta */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Subtitle</label>
                      <input
                        className={`${fieldCls} mt-1`}
                        value={section.subtitle ?? ""}
                        onChange={(e) =>
                          setSection(secIdx, { subtitle: e.target.value || undefined })
                        }
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Body (divider blurb, optional)</label>
                      <input
                        className={`${fieldCls} mt-1`}
                        value={section.body ?? ""}
                        onChange={(e) =>
                          setSection(secIdx, { body: e.target.value || undefined })
                        }
                      />
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    {section.questions.map((q, qIdx) => (
                      <OopQuestionEditor
                        key={qIdx}
                        question={q}
                        onChange={(nq) => changeQuestion(secIdx, qIdx, nq)}
                        onRemove={() => removeQuestion(secIdx, qIdx)}
                        onMoveUp={() => moveQuestion(secIdx, qIdx, -1)}
                        onMoveDown={() => moveQuestion(secIdx, qIdx, 1)}
                        canMoveUp={qIdx > 0}
                        canMoveDown={qIdx < section.questions.length - 1}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addQuestion(secIdx)}
                    className="w-full rounded-lg border-2 border-dashed border-black bg-white py-2.5 text-sm font-extrabold uppercase tracking-wide hover:bg-[var(--oop-yellow)]"
                  >
                    + Add question to this round
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addSection}
          className="w-full rounded-2xl border-4 border-dashed border-black bg-white py-4 text-base font-extrabold uppercase tracking-wide hover:bg-[var(--oop-cyan)]/30"
        >
          + Add round
        </button>
      </div>
    </div>
  );
}
