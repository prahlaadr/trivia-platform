"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { inferKind, type DeckQuestion, type QuestionKind } from "@/app/out-of-pocket/deck";
import { uploadImage, moveItem } from "@/lib/oopDeck";
import { OopQuestionSlide, OopRevealSlide } from "./OopSlides";

const KINDS: { id: QuestionKind; label: string }[] = [
  { id: "standard", label: "Standard" },
  { id: "choices", label: "Multiple choice" },
  { id: "code", label: "Code / SQL" },
  { id: "matching", label: "Matching" },
  { id: "ordering", label: "Ordering" },
];
const kindLabel = (k: QuestionKind) => KINDS.find((x) => x.id === k)?.label ?? "Standard";

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

// ── Plain list editor (choices / ordering items) ────────────────────

function BulletList({
  label,
  addLabel,
  items,
  setItems,
}: {
  label: string;
  addLabel: string;
  items: string[];
  setItems: (next: string[]) => void;
}) {
  return (
    <div className={sectionCls}>
      <p className={groupTitleCls}>{label}</p>
      <div className="space-y-2">
        {items.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={inputCls}
              value={b}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                setItems(next);
              }}
            />
            <button
              type="button"
              onClick={() => setItems(moveItem(items, i, -1))}
              disabled={i === 0}
              className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold disabled:opacity-25"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold hover:bg-red-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems([...items, ""])}
        className="mt-2 rounded border-2 border-black bg-[var(--oop-yellow)] px-2 py-1 text-xs font-bold"
      >
        {addLabel}
      </button>
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
  const [showMore, setShowMore] = useState(false);

  const set = (partial: Partial<DeckQuestion>) => onChange({ ...question, ...partial });
  const isIncluded = question.enabled !== false;
  const kind = inferKind(question);

  const bullets = question.bullets ?? [];
  const setBullets = (next: string[]) => set({ bullets: next.length ? next : undefined });

  const revealBullets = question.revealBullets ?? [];
  const setRevealBullets = (next: { text: string; correct?: boolean }[]) =>
    set({ revealBullets: next.length ? next : undefined });

  const matchPairs = question.matchPairs ?? [];
  const setMatchPairs = (next: { term: string; definition: string }[]) =>
    set({ matchPairs: next.length ? next : undefined });

  return (
    <div
      className={`rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] ${
        isIncluded ? "bg-white" : "bg-black/[0.04] opacity-70"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 border-b-2 border-black/10 px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-black text-sm font-extrabold">
          {question.number}
        </span>
        <button
          type="button"
          onClick={() => set({ enabled: !isIncluded })}
          className={`shrink-0 rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
            isIncluded ? "bg-[var(--oop-cyan)]" : "bg-white text-black/50"
          }`}
          title={isIncluded ? "Included — click to bench" : "Benched — click to include"}
        >
          {isIncluded ? "In" : "Out"}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-bold"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="truncate">
            {question.text || <span className="text-black/40">Untitled question</span>}
          </span>
          <span className="shrink-0 rounded border border-black/30 bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black/50">
            {kindLabel(kind)}
          </span>
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
          {/* Type selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-black/60">
              Type
            </span>
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => set({ kind: k.id })}
                className={`rounded border-2 border-black px-2.5 py-1 text-xs font-bold ${
                  kind === k.id ? "bg-[var(--oop-cyan)]" : "bg-white hover:bg-black/[0.04]"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          {/* Core: text + points */}
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

          {/* Answer — every type except matching (matching carries its own pairs) */}
          {kind !== "matching" && (
            <div>
              <label className={labelCls}>
                {kind === "ordering" ? "Answer (correct order)" : "Answer"}
              </label>
              <textarea
                className={`${inputCls} mt-1 min-h-[44px] resize-y`}
                value={question.answer}
                onChange={(e) => set({ answer: e.target.value })}
              />
            </div>
          )}

          {/* ── Type-specific ─────────────────────────────────────── */}

          {kind === "code" && (
            <div className={sectionCls}>
              <p className={groupTitleCls}>Code block</p>
              <textarea
                className={`${inputCls} min-h-[60px] resize-y font-mono`}
                placeholder="SELECT * FROM …"
                value={question.codeBlock ?? ""}
                onChange={(e) => set({ codeBlock: e.target.value || undefined })}
              />
            </div>
          )}

          {kind === "ordering" && (
            <BulletList
              label="Items (shown on the question slide)"
              addLabel="+ Add item"
              items={bullets}
              setItems={setBullets}
            />
          )}

          {kind === "choices" && (
            <>
              <BulletList
                label="Choices — shown on question slide"
                addLabel="+ Add choice"
                items={bullets}
                setItems={setBullets}
              />
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
            </>
          )}

          {kind === "matching" && (
            <div className={sectionCls}>
              <p className={groupTitleCls}>Matching pairs (term ↔ definition)</p>
              <p className="mb-2 text-[11px] text-black/50">
                Question slide shows terms + shuffled definitions; the reveal pairs each
                term with its match.
              </p>
              <div className="space-y-2">
                {matchPairs.map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1.25rem_minmax(0,36%)_minmax(0,1fr)_auto] items-start gap-2"
                  >
                    <span className="mt-2 text-right text-xs font-bold text-black/50">
                      {i + 1}.
                    </span>
                    <input
                      className={inputCls}
                      placeholder="Term (e.g. ASC X12)"
                      value={p.term}
                      onChange={(e) => {
                        const next = [...matchPairs];
                        next[i] = { ...p, term: e.target.value };
                        setMatchPairs(next);
                      }}
                    />
                    <textarea
                      className={`${inputCls} min-h-[38px] resize-y`}
                      placeholder="Definition"
                      value={p.definition}
                      onChange={(e) => {
                        const next = [...matchPairs];
                        next[i] = { ...p, definition: e.target.value };
                        setMatchPairs(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMatchPairs(matchPairs.filter((_, j) => j !== i))}
                      className="mt-1 rounded border-2 border-black bg-white px-1.5 py-0.5 text-xs font-bold hover:bg-red-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMatchPairs([...matchPairs, { term: "", definition: "" }])}
                className="mt-2 rounded border-2 border-black bg-[var(--oop-yellow)] px-2 py-1 text-xs font-bold"
              >
                + Add pair
              </button>
            </div>
          )}

          {/* ── Media (any question, both slides) ─────────────────── */}
          <div className={sectionCls}>
            <p className={groupTitleCls}>Media (optional — works on any type)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ImageField
                label="Question slide image"
                value={question.questionImageSrc}
                onChange={(url) => set({ questionImageSrc: url })}
              />
              <ImageField
                label="Answer-reveal image"
                value={question.revealImageSrc}
                onChange={(url) => set({ revealImageSrc: url })}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="mt-3 text-xs font-bold text-black/60 underline-offset-2 hover:underline"
            >
              {showMore ? "− Fewer options" : "+ More media & options"}
            </button>
            {showMore && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ImageField
                  label="Question image 2"
                  value={question.questionImageSrc2}
                  onChange={(url) => set({ questionImageSrc2: url })}
                />
                <ImageField
                  label="Reveal image 2"
                  value={question.revealImageSrc2}
                  onChange={(url) => set({ revealImageSrc2: url })}
                />
                <div>
                  <label className={labelCls}>Question caption</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.questionCaption ?? ""}
                    onChange={(e) => set({ questionCaption: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reveal caption</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.revealCaption ?? ""}
                    onChange={(e) => set({ revealCaption: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Question source URL</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.questionSourceUrl ?? ""}
                    onChange={(e) => set({ questionSourceUrl: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reveal source URL</label>
                  <input
                    className={`${inputCls} mt-1`}
                    value={question.revealSourceUrl ?? ""}
                    onChange={(e) => set({ revealSourceUrl: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Source link label</label>
                  <input
                    className={`${inputCls} mt-1`}
                    placeholder="source"
                    value={question.sourceLabel ?? ""}
                    onChange={(e) => set({ sourceLabel: e.target.value || undefined })}
                  />
                </div>
              </div>
            )}
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
                  bullets={kind === "choices" || kind === "ordering" ? question.bullets : undefined}
                  matchPairs={kind === "matching" ? question.matchPairs : undefined}
                  codeBlock={kind === "code" ? question.codeBlock : undefined}
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
                  bullets={kind === "choices" ? question.revealBullets : undefined}
                  matchPairs={kind === "matching" ? question.matchPairs : undefined}
                  codeBlock={kind === "code" ? question.codeBlock : undefined}
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
