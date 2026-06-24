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

      <div className="oop-print sheet">
        <header className="cover">
          <img className="wordmark" src="/oop/oop-wordmark.svg" alt="OUT-OF-POCKET" />
          <h1>SQL Trivia</h1>
          <div className="doc-tag">{meta.label}</div>
          <div className="sub">Data Camp · June 2026</div>
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

/* Out of Pocket brand: pink #fe8cc2 / cyan #45dcfb / yellow #faf18c /
 * navy #051f38, Baloo Da 2, thick black borders + hard offset shadows.
 * Mirrors the live /out-of-pocket trivia look. print-color-adjust:exact
 * forces the colored fills to actually print (browsers strip them by
 * default). */
const PRINT_CSS = `
  @page { margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f3f3f3; }
  .oop-print {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    font-family: "Baloo Da 2", "Poppins", sans-serif;
    color: #051f38;
    line-height: 1.4;
    font-size: 11.5pt;
    max-width: 760px;
    margin: 0 auto;
    background: #fff;
    padding: 28px 30px 48px;
  }

  /* Toolbar — screen only, OOP comic styling */
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 20px;
    background: #45dcfb; color: #051f38;
    border-bottom: 4px solid #000;
    font-family: "Baloo Da 2", sans-serif;
  }
  .toolbar-title { font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
  .toolbar-sub { font-size: 12px; font-weight: 700; color: #051f38; opacity: 0.6; }
  .toolbar-flex { flex: 1; }
  .toolbar-hint { font-size: 12px; font-weight: 600; color: #051f38; opacity: 0.6; }
  .toolbar-btn {
    background: #fe8cc2; color: #000; border: 3px solid #000; cursor: pointer;
    font-weight: 800; font-size: 13px; padding: 8px 16px; border-radius: 8px;
    box-shadow: 3px 3px 0 0 #000; font-family: inherit;
  }
  .toolbar-btn:active { box-shadow: 1px 1px 0 0 #000; transform: translate(2px,2px); }
  @media print {
    .screen-only { display: none !important; }
    body { background: #fff; }
    .sheet { box-shadow: none; max-width: none; padding: 0; }
  }
  @media screen { .sheet { margin-top: 22px; box-shadow: 0 2px 18px rgba(0,0,0,0.12); } }

  header.cover {
    text-align: center; margin-bottom: 24px;
    padding: 0 0 18px; border-bottom: 4px solid #000;
  }
  header.cover .wordmark { height: 26px; width: auto; margin: 0 auto 14px; display: block; }
  header.cover h1 {
    font-size: 34pt; font-weight: 800; margin: 0; line-height: 1;
    letter-spacing: -0.5px;
  }
  header.cover .doc-tag {
    display: inline-block; margin-top: 10px;
    font-size: 13pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    background: #faf18c; color: #000;
    border: 3px solid #000; border-radius: 999px; padding: 3px 16px;
    box-shadow: 3px 3px 0 0 #000;
  }
  header.cover .sub { font-size: 12pt; font-weight: 700; color: #051f38; margin-top: 10px; }
  header.cover .meta {
    font-size: 9.5pt; font-weight: 700; color: #051f38; opacity: 0.55; margin-top: 4px;
    text-transform: uppercase; letter-spacing: 1.5px;
  }
  .team-line {
    margin-top: 16px; font-size: 12pt; font-weight: 700;
    display: flex; align-items: baseline; justify-content: center; gap: 8px;
  }

  section.round { margin-top: 22px; page-break-inside: avoid; }
  h2.round-title {
    font-size: 14.5pt; font-weight: 800; margin: 0;
    padding: 8px 14px;
    background: #45dcfb; color: #000;
    border: 3px solid #000; border-radius: 10px;
    box-shadow: 3px 3px 0 0 #000;
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
  }
  .round-pts {
    font-size: 9pt; font-weight: 800; color: #000;
    background: #fff; border: 2px solid #000; border-radius: 999px; padding: 1px 9px;
    white-space: nowrap;
  }
  .round-sub {
    font-size: 10.5pt; font-weight: 600; color: #051f38; opacity: 0.65;
    font-style: italic; margin: 7px 0 14px 4px;
  }

  .q { margin: 0 0 14px; padding-left: 2px; page-break-inside: avoid; }
  .q .qline { font-weight: 700; }
  .pts {
    font-size: 8.5pt; font-weight: 800; color: #000;
    background: #fe8cc2; border: 1.5px solid #000; border-radius: 999px;
    padding: 0 7px; white-space: nowrap;
  }

  .imgrow { display: flex; gap: 12px; flex-wrap: wrap; margin: 8px 0; }
  .qimg {
    max-height: 150px; max-width: 46%; object-fit: contain;
    border: 3px solid #000; border-radius: 8px; padding: 4px; background: #fff;
  }
  .cap { font-size: 9.5pt; font-weight: 600; color: #051f38; opacity: 0.7; font-style: italic; margin: 3px 0 4px; }

  .opts { list-style: none; margin: 6px 0 6px 6px; padding: 0; }
  .opts li {
    margin: 3px 0; padding: 2px 10px;
    border: 2px solid #000; border-radius: 8px; background: #fff;
    display: inline-block; margin-right: 6px; font-weight: 600;
  }
  .opts li.correct { background: #faf18c; font-weight: 800; }

  table.match { border-collapse: separate; border-spacing: 0; margin: 8px 0; width: 100%; border: 3px solid #000; border-radius: 8px; overflow: hidden; }
  table.match td { border-top: 2px solid #000; padding: 5px 9px; vertical-align: top; font-size: 10.5pt; }
  table.match tr:first-child td { border-top: 0; }
  table.match .term { font-weight: 800; width: 27%; background: #45dcfb; border-right: 2px solid #000; }

  pre.code {
    font-family: "SF Mono", Menlo, monospace; font-size: 10pt;
    background: #051f38; color: #45dcfb;
    border: 3px solid #000; border-radius: 8px;
    padding: 9px 12px; margin: 7px 0; white-space: pre-wrap;
  }

  .ans {
    margin-top: 6px; padding: 6px 12px;
    background: #faf18c; border: 3px solid #000; border-radius: 8px;
    font-weight: 600; box-shadow: 2px 2px 0 0 #000;
  }
  .ans b { font-weight: 800; }
  .note { font-size: 9.5pt; font-weight: 600; color: #051f38; opacity: 0.7; margin-top: 5px; font-style: italic; }
  .src { font-size: 8pt; color: #051f38; opacity: 0.5; margin-top: 2px; word-break: break-all; }

  /* Write-in line (crowd question sheet) */
  .writein { margin-top: 7px; }
  .blank {
    flex: 1; min-width: 180px; display: inline-block;
    border-bottom: 2px solid #000; height: 1.1em;
  }

  /* Team answer sheet rows */
  .ablank {
    display: flex; align-items: baseline; gap: 10px;
    margin: 0 0 17px; page-break-inside: avoid;
  }
  .anum { font-weight: 800; min-width: 28px; }
`;
