"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type { DeckQuestion } from "@/app/out-of-pocket/deck";
import { uploadImage, moveItem } from "@/lib/oopDeck";
import { OopQuestionSlide, OopRevealSlide } from "./OopSlides";

interface Props {
  question: DeckQuestion;
  onChange: (q: DeckQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const inputCls =
  "w-full rounded border-2 border-black bg-white px-2 py-1.5 text-sm text-black outline-none focus:bg-[var(--oop-yellow)]/30";
const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-black/60";
const sectionCls = "rounded-lg border-2 border-black/15 bg-black/[0.02] p-3";
const groupTitleCls = "mb-2 text-xs font-extrabold uppercase tracking-widest text-black/70";

// ── Image field: text input + upload ────────────────────────────────

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    const res = await uploadImage(file);
    setBusy(false);
    if (res.ok && res.url) onChange(res.url);
    else setErr(res.error || "Upload failed");
  }

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          className={inputCls}
          placeholder="/oop/img-name.png or https://…"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded border-2 border-black bg-[var(--oop-cyan)] px-2 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          {busy ? "…" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="shrink-0 rounded border-2 border-black bg-white px-2 py-1.5 text-xs font-bold"
            title="Clear"
          >
            ✕
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {err && <p className="mt-1 text-xs font-bold text-red-600">{err}</p>}
      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 max-h-24 w-auto rounded border border-black/20 object-contain"
        />
      )}
    </div>
  );
}

// ── Question editor ─────────────────────────────────────────────────

export function OopQuestionEditor({
  question,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [preview, setPreview] = useState<"none" | "question" | "reveal">("none");

  const set = (partial: Partial<DeckQuestion>) => onChange({ ...question, ...partial });

  // Question-slide choices (string[])
  const bullets = question.bullets ?? [];
  const setBullets = (next: string[]) =>
    set({ bullets: next.length ? next : undefined });

  // Reveal-slide options with correct flags
  const revealBullets = question.revealBullets ?? [];
  const setRevealBullets = (next: { text: string; correct?: boolean }[]) =>
    set({ revealBullets: next.length ? next : undefined });

  return (
    <div className="rounded-xl border-2 border-black bg-white shadow-[3px_3px_0_0_#000]">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b-2 border-black/10 px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black text-sm font-extrabold">
          {question.number}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex-1 truncate text-left text-sm font-bold"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {question.text || <span className="text-black/40">Untitled question</span>}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold disabled:opacity-25"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold disabled:opacity-25"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold hover:bg-red-500 hover:text-white"
            title="Remove question"
          >
            🗑
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3 p-3">
          {/* Core */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label className={labelCls}>Question text</label>
              <textarea
                className={`${inputCls} mt-1 min-h-[60px] resize-y`}
                value={question.text}
                onChange={(e) => set({ text: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Points</label>
              <input
                type="number"
                min={0}
                className={`${inputCls} mt-1 w-20`}
                value={question.points}
                onChange={(e) => set({ points: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Answer</label>
            <textarea
              className={`${inputCls} mt-1 min-h-[44px] resize-y`}
              value={question.answer}
              onChange={(e) => set({ answer: e.target.value })}
            />
          </div>

          {/* Code block */}
          <div className={sectionCls}>
            <p className={groupTitleCls}>Code block (optional)</p>
            <textarea
              className={`${inputCls} min-h-[44px] resize-y font-mono`}
              placeholder="SELECT * FROM …"
              value={question.codeBlock ?? ""}
              onChange={(e) => set({ codeBlock: e.target.value || undefined })}
            />
          </div>

          {/* Question choices */}
          <div className={sectionCls}>
            <p className={groupTitleCls}>Choices — shown on question slide</p>
            <div className="space-y-2">
              {bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputCls}
                    value={b}
                    onChange={(e) => {
                      const next = [...bullets];
                      next[i] = e.target.value;
                      setBullets(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setBullets(moveItem(bullets, i, -1))}
                    disabled={i === 0}
                    className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => setBullets(bullets.filter((_, j) => j !== i))}
                    className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBullets([...bullets, ""])}
              className="mt-2 rounded border-2 border-black bg-[var(--oop-yellow)] px-2 py-1 text-xs font-bold"
            >
              + Add choice
            </button>
          </div>

          {/* Reveal options with correct flags */}
          <div className={sectionCls}>
            <p className={groupTitleCls}>Answer options w/ correct — shown on reveal slide</p>
            <div className="space-y-2">
              {revealBullets.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label
                    className={`flex shrink-0 cursor-pointer items-center gap-1 rounded border-2 border-black px-2 py-1.5 text-xs font-bold ${
                      b.correct ? "bg-[var(--oop-cyan)]" : "bg-white"
                    }`}
                    title="Mark correct"
                  >
                    <input
                      type="checkbox"
                      className="accent-black"
                      checked={!!b.correct}
                      onChange={(e) => {
                        const next = [...revealBullets];
                        next[i] = { ...b, correct: e.target.checked || undefined };
                        setRevealBullets(next);
                      }}
                    />
                    real
                  </label>
                  <input
                    className={inputCls}
                    value={b.text}
                    onChange={(e) => {
                      const next = [...revealBullets];
                      next[i] = { ...b, text: e.target.value };
                      setRevealBullets(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealBullets(revealBullets.filter((_, j) => j !== i))}
                    className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setRevealBullets([...revealBullets, { text: "" }])}
                className="rounded border-2 border-black bg-[var(--oop-yellow)] px-2 py-1 text-xs font-bold"
              >
                + Add option
              </button>
              {bullets.length > 0 && revealBullets.length === 0 && (
                <button
                  type="button"
                  onClick={() => setRevealBullets(bullets.map((t) => ({ text: t })))}
                  className="rounded border-2 border-black bg-white px-2 py-1 text-xs font-bold"
                  title="Copy the choices above into the reveal, then tick the correct ones"
                >
                  ⇣ Copy from choices
                </button>
              )}
            </div>
          </div>

          {/* Media */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={sectionCls}>
              <p className={groupTitleCls}>Question slide media</p>
              <div className="space-y-2">
                <ImageField
                  label="Image"
                  value={question.questionImageSrc}
                  onChange={(url) => set({ questionImageSrc: url })}
                />
                <ImageField
                  label="Image 2"
                  value={question.questionImageSrc2}
                  onChange={(url) => set({ questionImageSrc2: url })}
                />
                <div>
                  <label className={labelCls}>Caption</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.questionCaption ?? ""}
                    onChange={(e) => set({ questionCaption: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Source URL</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.questionSourceUrl ?? ""}
                    onChange={(e) => set({ questionSourceUrl: e.target.value || undefined })}
                  />
                </div>
              </div>
            </div>

            <div className={sectionCls}>
              <p className={groupTitleCls}>Reveal slide media</p>
              <div className="space-y-2">
                <ImageField
                  label="Image"
                  value={question.revealImageSrc}
                  onChange={(url) => set({ revealImageSrc: url })}
                />
                <ImageField
                  label="Image 2"
                  value={question.revealImageSrc2}
                  onChange={(url) => set({ revealImageSrc2: url })}
                />
                <div>
                  <label className={labelCls}>Caption</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.revealCaption ?? ""}
                    onChange={(e) => set({ revealCaption: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Source URL</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.revealSourceUrl ?? ""}
                    onChange={(e) => set({ revealSourceUrl: e.target.value || undefined })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Source link label (both slides)</label>
            <input
              className={`${inputCls} mt-1`}
              placeholder="source"
              value={question.sourceLabel ?? ""}
              onChange={(e) => set({ sourceLabel: e.target.value || undefined })}
            />
          </div>

          {/* Preview */}
          <div className={sectionCls}>
            <div className="mb-2 flex items-center gap-2">
              <p className={`${groupTitleCls} mb-0`}>Preview</p>
              <div className="flex gap-1">
                {(["none", "question", "reveal"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreview(mode)}
                    className={`rounded border-2 border-black px-2 py-0.5 text-[11px] font-bold capitalize ${
                      preview === mode ? "bg-black text-white" : "bg-white"
                    }`}
                  >
                    {mode === "none" ? "off" : mode}
                  </button>
                ))}
              </div>
            </div>
            {preview === "question" && (
              <div className="overflow-hidden rounded border-2 border-black">
                <OopQuestionSlide
                  number={question.number}
                  text={question.text}
                  points={question.points}
                  bullets={question.bullets}
                  codeBlock={question.codeBlock}
                  imageSrc={question.questionImageSrc}
                  imageSrc2={question.questionImageSrc2}
                  caption={question.questionCaption}
                  sourceUrl={question.questionSourceUrl}
                  sourceLabel={question.sourceLabel}
                />
              </div>
            )}
            {preview === "reveal" && (
              <div className="overflow-hidden rounded border-2 border-black">
                <OopRevealSlide
                  number={question.number}
                  text={question.text}
                  points={question.points}
                  answer={question.answer}
                  bullets={question.revealBullets}
                  codeBlock={question.codeBlock}
                  imageSrc={question.revealImageSrc}
                  imageSrc2={question.revealImageSrc2}
                  caption={question.revealCaption}
                  sourceUrl={question.revealSourceUrl}
                  sourceLabel={question.sourceLabel}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
