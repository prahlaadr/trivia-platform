import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const BANK_DIR = path.join(PROJECT_ROOT, "bank");
const DATA_DIR = path.join(process.cwd(), "public", "data");

export async function POST() {
  if (!fs.existsSync(BANK_DIR)) {
    return NextResponse.json(
      { error: "Bank folder not found" },
      { status: 404 }
    );
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const docFiles = fs
    .readdirSync(BANK_DIR)
    .filter((f) => f.endsWith(".docx") && !f.startsWith("~$"));

  const results: { file: string; quiz_number?: number; error?: string }[] = [];

  for (const file of docFiles) {
    const filePath = path.join(BANK_DIR, file);
    try {
      const output = execSync(`uv run python parser.py "${filePath}"`, {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        timeout: 15000,
      });

      const quiz = JSON.parse(output);
      const jsonPath = path.join(DATA_DIR, `quiz_${quiz.quiz_number}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(quiz, null, 2));
      results.push({ file, quiz_number: quiz.quiz_number });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parse failed";
      results.push({ file, error: message });
    }
  }

  return NextResponse.json({ parsed: results.length, results });
}
