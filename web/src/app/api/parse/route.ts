import { NextRequest, NextResponse } from "next/server";
import { parseDocx } from "@/lib/parser";
import fs from "fs";
import path from "path";

const isVercel = !!process.env.VERCEL;
const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const BANK_DIR = isVercel ? "/tmp/bank" : path.join(PROJECT_ROOT, "bank");
const DATA_DIR = isVercel
  ? "/tmp/data"
  : path.join(process.cwd(), "public", "data");

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.name.endsWith(".docx")) {
    return NextResponse.json(
      { error: "Please upload a .docx file" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Save to bank/ (best-effort, non-critical)
  try {
    fs.mkdirSync(BANK_DIR, { recursive: true });
    fs.writeFileSync(path.join(BANK_DIR, file.name), buffer);
  } catch {
    // Filesystem may be read-only (Vercel) — that's fine
  }

  // Parse with TypeScript
  try {
    const quiz = await parseDocx(buffer);

    // Save parsed JSON (best-effort)
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const jsonPath = path.join(DATA_DIR, `quiz_${quiz.quiz_number}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(quiz, null, 2));
    } catch {
      // Non-critical — quiz data is returned in the response
    }

    return NextResponse.json({
      success: true,
      quiz_number: quiz.quiz_number,
      date: quiz.date,
      rounds: quiz.rounds.length,
      file: file.name,
      quiz,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: list all quizzes in the bank
export async function GET() {
  if (!fs.existsSync(DATA_DIR)) {
    return NextResponse.json({ quizzes: [] });
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const quizzes = files.map((f) => {
    const content = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, f), "utf-8")
    );
    return {
      quiz_number: content.quiz_number,
      date: content.date,
      rounds: content.rounds.length,
      file: f,
    };
  });

  // Also list docs in bank/ that haven't been parsed yet
  const bankFiles = fs.existsSync(BANK_DIR)
    ? fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".docx") && !f.startsWith("~$"))
    : [];

  const parsedNumbers = new Set(quizzes.map((q) => q.quiz_number));
  const unparsed = bankFiles.filter((f) => {
    const match = f.match(/(\d+)/);
    return match && !parsedNumbers.has(parseInt(match[1]));
  });

  return NextResponse.json({
    quizzes: quizzes.sort((a, b) => b.quiz_number - a.quiz_number),
    unparsed,
    bank_path: BANK_DIR,
  });
}
