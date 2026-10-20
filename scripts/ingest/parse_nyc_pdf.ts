// One-off: parse NYC Trivia League .pdf packets with the platform's parsePdf
// and emit them as quiz JSON (same shape as parse_pub_quiz_docx.ts for the
// Atlanta .docx). The NYC league format differs from Dirty South, so inspect
// the round/question counts before trusting the output.
//
// Usage:
//   bun run scripts/ingest/parse_nyc_pdf.ts <input_dir> <output_dir>

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parsePdf } from "../../web/src/lib/parser";

const inputDir = process.argv[2];
const outputDir = process.argv[3];
if (!inputDir || !outputDir) {
  console.error("usage: parse_nyc_pdf.ts <input_dir> <output_dir>");
  process.exit(1);
}
mkdirSync(outputDir, { recursive: true });

const pdfs = readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
console.log(`Parsing ${pdfs.length} .pdf files from ${inputDir}`);

let total = 0;
for (const file of pdfs) {
  try {
    const quiz = await parsePdf(readFileSync(join(inputDir, file)));
    const qcount = quiz.rounds.reduce((s, r) => s + r.questions.length, 0);
    total += qcount;
    writeFileSync(join(outputDir, basename(file, ".pdf") + ".json"), JSON.stringify(quiz, null, 2));
    console.log(`  ${file}  ->  quiz #${quiz.quiz_number}, ${quiz.rounds.length} rounds, ${qcount} questions`);
  } catch (e) {
    console.error(`  ! ${file} failed: ${e}`);
  }
}
console.log(`\nTotal: ${total} questions`);
