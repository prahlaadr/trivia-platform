/* Export the Out of Pocket deck to a CSV tracking ledger.
 *
 * deck.ts is the SINGLE SOURCE OF TRUTH. This script reads its `sections`
 * and writes a flat questions.csv for at-a-glance tracking / pitching rounds.
 * Never hand-edit the CSV — regenerate it: `bun run export-csv`.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sections } from "../src/app/out-of-pocket/deck";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "src", "app", "out-of-pocket", "questions.csv");

/** RFC-4180 CSV field: wrap in quotes and double any embedded quotes. */
function csv(value: string | number): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

/** Full question text for the ledger: fold the SQL code block (if any) into
 * the question so each row is self-contained when pitching rounds. */
function questionText(q: { text: string; codeBlock?: string }): string {
  if (!q.codeBlock) return q.text;
  const sql = q.codeBlock.replace(/\s*\n\s*/g, " ").trim();
  return `${q.text} [SQL: ${sql}]`;
}

/** Flag media-heavy / special questions so the creator knows at a glance. */
function notesFor(q: {
  codeBlock?: string;
  questionImageSrc?: string;
  revealImageSrc?: string;
  bullets?: unknown[];
  revealBullets?: unknown[];
}): string {
  const flags: string[] = [];
  if (q.codeBlock) flags.push("SQL code block");
  if (q.questionImageSrc || q.revealImageSrc) flags.push("image");
  if (q.revealBullets?.length) flags.push("multi-select (pick all)");
  else if (q.bullets?.length) flags.push("multiple choice");
  return flags.join("; ");
}

/** Derive a readable answer, including multi-select questions whose answer
 * text lives in revealBullets (e.g. the Avatar sequels question). */
function answerFor(q: {
  answer: string;
  revealBullets?: { text: string; correct?: boolean }[];
}): string {
  if (q.answer) return q.answer;
  if (q.revealBullets) {
    const correct = q.revealBullets.filter((b) => b.correct).map((b) => b.text);
    if (correct.length) return `${correct.join(", ")} (correct)`;
  }
  return "";
}

const header = ["Phase", "Phase Title", "Q#", "Question", "Points", "Answer", "Notes"];
const rows: string[] = [header.map(csv).join(",")];

let totalQuestions = 0;
let totalPoints = 0;

for (const section of sections) {
  if (section.questions.length === 0) continue; // skip team-intro / dividers
  for (const q of section.questions) {
    totalQuestions += 1;
    totalPoints += q.points;
    rows.push(
      [
        csv(section.number),
        csv(section.title),
        csv(q.number),
        csv(questionText(q)),
        csv(q.points),
        csv(answerFor(q)),
        csv(notesFor(q)),
      ].join(","),
    );
  }
}

writeFileSync(OUT, rows.join("\n") + "\n", "utf8");

const phaseCount = sections.filter((s) => s.questions.length > 0).length;
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${phaseCount} phases · ${totalQuestions} questions · ${totalPoints} points`);
