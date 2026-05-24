// One-off: parse a directory of Pub Quiz .docx files using the existing
// platform parser and emit them as JSON. The Python ingester reads the
// JSON and pushes questions into the DuckDB bank.
//
// Usage:
//   bun run scripts/ingest/parse_pub_quiz_docx.ts <input_dir> <output_dir>

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parseDocx } from "../../web/src/lib/parser";

const inputDir = process.argv[2];
const outputDir = process.argv[3];

if (!inputDir || !outputDir) {
  console.error("usage: parse_pub_quiz_docx.ts <input_dir> <output_dir>");
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const docxFiles = readdirSync(inputDir).filter((f) => f.toLowerCase().endsWith(".docx"));
console.log(`Parsing ${docxFiles.length} .docx files from ${inputDir}`);

let totalQuestions = 0;
for (const file of docxFiles) {
  const path = join(inputDir, file);
  try {
    const buf = readFileSync(path);
    const quiz = await parseDocx(buf);
    const qcount = quiz.rounds.reduce((s, r) => s + r.questions.length, 0);
    totalQuestions += qcount;
    const outPath = join(outputDir, basename(file, ".docx") + ".json");
    writeFileSync(outPath, JSON.stringify(quiz, null, 2));
    console.log(`  ${file}  →  quiz #${quiz.quiz_number} (${quiz.date}), ${quiz.rounds.length} rounds, ${qcount} questions`);
  } catch (e) {
    console.error(`  ! ${file} failed: ${e}`);
  }
}

console.log(`\nTotal: ${totalQuestions} questions across ${docxFiles.length} quizzes`);
