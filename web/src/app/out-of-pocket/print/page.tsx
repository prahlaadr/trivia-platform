"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  inferKind,
  type DeckSection,
  type DeckQuestion,
} from "../deck";
import { loadDeck, type DeckPayload } from "@/lib/oopDeck";

/**
 * Print / download fallback for the live Out of Pocket deck.
 *
 * Three documents, chosen via ?doc=
 *   key       — Presenter answer key (questions + answers + images)
 *   questions — Crowd question sheet (questions only, no answers)
 *   answers   — Team answer sheet (numbered blank lines to write on)
 *
 * Reads the deck the editor stashed in localStorage (so it reflects even
 * unsaved on-screen edits), falling back to the saved deck via the API.
 * This is the paper backup for the presenter view: if the live app or wifi
 * fails mid-event, you can still read questions out / hand out sheets and
 * reveal from the answer key.
 */

type DocKind = "key" | "questions" | "answers";

const DOC_META: Record<DocKind, { label: string; sub: string }> = {
  key: { label: "Answer Key", sub: "Presenter copy · do not hand out" },
  questions: { label: "Question Sheet", sub: "Read aloud or hand to teams" },
  answers: { label: "Team Answer Sheet", sub: "Write your answers here" },
};

/** Mirrors buildDeck: only enabled rounds, only enabled questions. */
function liveSections(sections: DeckSection[]): DeckSection[] {
  return sections
    .filter((s) => s.enabled !== false)
    .map((s) => ({
      ...s,
      questions: s.questions.filter((q) => q.enabled !== false),
    }))
    .filter((s) => s.questions.length > 0);
}

export default function OopPrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintDoc />
    </Suspense>
  );
}

function PrintDoc() {
  const params = useSearchParams();
  const doc = ((params.get("doc") as DocKind) || "key") as DocKind;
  const meta = DOC_META[doc] ?? DOC_META.key;

  const [payload, setPayload] = useState<DeckPayload | null>(null);

  useEffect(() => {
    // Prefer the editor's in-memory deck (captures unsaved edits), then the
    // saved deck. localStorage is shared across tabs on the same origin.
    let stashed: DeckPayload | null = null;
    try {
      const raw = localStorage.getItem("oop-print-payload");
      if (raw) {
        const parsed = JSON.parse(raw) as DeckPayload;
        if (Array.isArray(parsed?.sections)) stashed = parsed;
      }
    } catch {
      /* ignore */
    }
    if (stashed) setPayload(stashed);
    else loadDeck().then(setPayload);
  }, []);

  useEffect(() => {
    if (payload) document.title = `Out of Pocket — ${meta.label}`;
  }, [payload, meta.label]);

  if (!payload) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#666" }}>
        Loading deck…
      </div>
    );
  }

  const sections = liveSections(payload.sections);
  const totalQs = sections.reduce((n, s) => n + s.questions.length, 0);

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Screen-only toolbar (hidden when printing) */}
      <div className="screen-only toolbar">
        <span className="toolbar-title">{meta.label}</span>
        <span className="toolbar-sub">
          {totalQs} questions · {sections.length} rounds
        </span>
        <span className="toolbar-flex" />
        <span className="toolbar-hint">
          Use “Save as PDF” as the destination to download.
        </span>
        <button className="toolbar-btn" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="sheet">
        <header className="cover">
          <h1>
            SQL Trivia <span className="doc-tag">{meta.label}</span>
          </h1>
          <div className="sub">Out of Pocket · Data Camp · June 2026</div>
          <div className="meta">{meta.sub}</div>
          {doc === "answers" && (
            <div className="team-line">
              Team name: <span className="blank" />
            </div>
          )}
        </header>

        {sections.map((section, i) => (
          <RoundBlock key={i} section={section} doc={doc} />
        ))}
      </div>
    </>
  );
}

function RoundBlock({ section, doc }: { section: DeckSection; doc: DocKind }) {
  return (
    <section className="round">
      <h2 className="round-title">
        {section.title}
        <span className="round-pts">
          {section.questions.reduce((n, q) => n + (q.points || 0), 0)} pts
        </span>
      </h2>
      {section.subtitle && <div className="round-sub">{section.subtitle}</div>}

      {doc === "answers"
        ? section.questions.map((q) => <AnswerBlank key={q.number} q={q} />)
        : section.questions.map((q) => (
            <QuestionBlock key={q.number} q={q} showAnswers={doc === "key"} />
          ))}
    </section>
  );
}

/** Team answer sheet: just a number + points + a blank line to write on. */
function AnswerBlank({ q }: { q: DeckQuestion }) {
  return (
    <div className="ablank">
      <span className="anum">{q.number}.</span>
      <span className="blank" />
      <span className="pts">({q.points} pt{q.points === 1 ? "" : "s"})</span>
    </div>
  );
}

/** Question sheet (showAnswers=false) and answer key (showAnswers=true). */
function QuestionBlock({
  q,
  showAnswers,
}: {
  q: DeckQuestion;
  showAnswers: boolean;
}) {
  const kind = inferKind(q);

  return (
    <div className="q">
      <div className="qline">
        {q.number}. {q.text}{" "}
        <span className="pts">
          ({q.points} pt{q.points === 1 ? "" : "s"})
        </span>
      </div>

      {/* Images the crowd needs to answer (logos, photos, zoom crops). */}
      {(q.questionImageSrc || q.questionImageSrc2) && (
        <div className="imgrow">
          {q.questionImageSrc && (
            <img src={q.questionImageSrc} alt="" className="qimg" />
          )}
          {q.questionImageSrc2 && (
            <img src={q.questionImageSrc2} alt="" className="qimg" />
          )}
        </div>
      )}
      {q.questionCaption && <div className="cap">{q.questionCaption}</div>}

      {/* Code block (SQL-at-the-movies). */}
      {kind === "code" && q.codeBlock && (
        <pre className="code">{q.codeBlock}</pre>
      )}

      {/* Choices / ordering: list the options. On the key, mark correct ones. */}
      {(kind === "choices" || kind === "ordering") && q.bullets && (
        <ul className="opts">
          {q.bullets.map((b, i) => {
            const correct =
              showAnswers &&
              q.revealBullets?.find((rb) => rb.text === b)?.correct;
            return (
              <li key={i} className={correct ? "correct" : undefined}>
                {b}
                {correct ? " ✓" : ""}
              </li>
            );
          })}
        </ul>
      )}

      {/* Matching: terms on the left, definitions on the right. */}
      {kind === "matching" && q.matchPairs && (
        <table className="match">
          <tbody>
            {q.matchPairs.map((p, i) => (
              <tr key={i}>
                <td className="term">
                  {showAnswers ? "" : `${i + 1}. `}
                  {p.term}
                </td>
                <td className="def">{p.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Write-in line on the crowd question sheet (skip matching/choices). */}
      {!showAnswers && kind !== "matching" && (
        <div className="writein">
          <span className="blank" />
        </div>
      )}

      {/* Answers (presenter key only). */}
      {showAnswers && (
        <>
          {q.answer && (
            <div className="ans">
              <b>Answer:</b> {q.answer}
            </div>
          )}
          {kind === "matching" && q.matchPairs && (
            <div className="ans">
              <b>Matches:</b>{" "}
              {q.matchPairs.map((p) => p.term).join(", ")} ↔ as shown above
            </div>
          )}
          {q.revealCaption && <div className="note">{q.revealCaption}</div>}
          {q.revealSourceUrl && (
            <div className="src">{q.revealSourceUrl}</div>
          )}
        </>
      )}
    </div>
  );
}

const PRINT_CSS = `
  @page { margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f3f3f3; }
  .sheet {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.45;
    font-size: 11.5pt;
    max-width: 740px;
    margin: 0 auto;
    background: #fff;
    padding: 28px 32px 48px;
  }

  /* Toolbar — screen only */
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 20px;
    background: #111; color: #fff;
    font-family: "Helvetica Neue", Arial, sans-serif;
  }
  .toolbar-title { font-weight: 800; font-size: 15px; letter-spacing: 0.5px; }
  .toolbar-sub { font-size: 12px; color: #bbb; }
  .toolbar-flex { flex: 1; }
  .toolbar-hint { font-size: 12px; color: #aaa; }
  .toolbar-btn {
    background: #ff2d8b; color: #fff; border: 0; cursor: pointer;
    font-weight: 800; font-size: 13px; padding: 9px 16px; border-radius: 6px;
  }
  @media print { .screen-only { display: none !important; } body { background: #fff; } .sheet { box-shadow: none; max-width: none; padding: 0; } }
  @media screen { .sheet { margin-top: 22px; box-shadow: 0 2px 18px rgba(0,0,0,0.12); } }

  header.cover {
    text-align: center; margin-bottom: 26px;
    padding-bottom: 16px; border-bottom: 3px solid #111;
  }
  header.cover h1 { font-size: 28pt; margin: 0 0 6px; letter-spacing: -0.5px; }
  header.cover .doc-tag {
    display: inline-block; font-size: 13pt; vertical-align: middle;
    background: #111; color: #fff; padding: 2px 10px; border-radius: 5px;
    letter-spacing: 0; margin-left: 6px;
  }
  header.cover .sub { font-size: 12.5pt; color: #444; }
  header.cover .meta {
    font-size: 10pt; color: #777; margin-top: 6px;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .team-line {
    margin-top: 16px; font-size: 12pt; font-weight: 600;
    display: flex; align-items: baseline; justify-content: center; gap: 8px;
  }

  section.round { margin-top: 24px; page-break-inside: avoid; }
  h2.round-title {
    font-size: 15pt; margin: 0 0 2px;
    padding: 7px 12px; background: #111; color: #fff; border-radius: 5px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .round-pts { font-size: 9.5pt; color: #ffd6ec; font-weight: 700; }
  .round-sub {
    font-size: 10.5pt; color: #666; font-style: italic; margin: 5px 0 14px 2px;
  }

  .q { margin: 0 0 15px; padding-left: 2px; page-break-inside: avoid; }
  .q .qline { font-weight: 600; }
  .pts { color: #b5179e; font-weight: 700; font-size: 9.5pt; }

  .imgrow { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0; }
  .qimg { max-height: 150px; max-width: 46%; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
  .cap { font-size: 9.5pt; color: #666; font-style: italic; margin: 2px 0 4px; }

  .opts { margin: 5px 0 5px 22px; padding: 0; }
  .opts li { margin: 1px 0; }
  .correct { color: #1c7c33; font-weight: 600; }

  table.match { border-collapse: collapse; margin: 6px 0; width: 100%; }
  table.match td { border: 1px solid #ccc; padding: 4px 8px; vertical-align: top; font-size: 10.5pt; }
  table.match .term { font-weight: 700; width: 26%; white-space: nowrap; }

  pre.code {
    font-family: "SF Mono", Menlo, monospace; font-size: 10pt;
    background: #f4f4f4; border-left: 3px solid #888;
    padding: 7px 10px; margin: 6px 0; white-space: pre-wrap; border-radius: 3px;
  }

  .ans {
    margin-top: 5px; padding: 5px 10px;
    background: #eafaf0; border-left: 3px solid #2a9d4a; border-radius: 3px;
  }
  .ans b { color: #1c7c33; }
  .note { font-size: 9.5pt; color: #666; margin-top: 4px; font-style: italic; }
  .src { font-size: 8.5pt; color: #999; margin-top: 2px; word-break: break-all; }

  /* Write-in line (crowd question sheet) */
  .writein { margin-top: 6px; }
  .blank {
    flex: 1; min-width: 180px; display: inline-block;
    border-bottom: 1px solid #999; height: 1em;
  }

  /* Team answer sheet rows */
  .ablank {
    display: flex; align-items: baseline; gap: 10px;
    margin: 0 0 16px; page-break-inside: avoid;
  }
  .anum { font-weight: 700; min-width: 26px; }
`;
