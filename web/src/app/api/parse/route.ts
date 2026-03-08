import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parser";
import { put, list } from "@vercel/blob";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const BANK_DIR = path.join(PROJECT_ROOT, "bank");
const DATA_DIR = path.join(process.cwd(), "public", "data");

const ALLOWED_EXTENSIONS = [".docx", ".pdf"];

const isVercel = !!process.env.VERCEL;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Please upload a .docx or .pdf file" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Save original file to bank/ (local only)
  if (!isVercel) {
    try {
      fs.mkdirSync(BANK_DIR, { recursive: true });
      fs.writeFileSync(path.join(BANK_DIR, file.name), buffer);
    } catch {
      // Non-critical
    }
  }

  // Parse
  try {
    const quiz = await parseFile(buffer, file.name);

    if (quiz.rounds.length === 0) {
      return NextResponse.json(
        {
          error: `Parsed "${file.name}" but found 0 rounds. The file format may not match the expected quiz structure.`,
          quiz_number: quiz.quiz_number,
          date: quiz.date,
        },
        { status: 422 }
      );
    }

    const jsonContent = JSON.stringify(quiz, null, 2);

    if (isVercel) {
      // Store parsed JSON in Vercel Blob
      await put(`quizzes/quiz_${quiz.quiz_number}.json`, jsonContent, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
    } else {
      // Store locally
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const jsonPath = path.join(
          DATA_DIR,
          `quiz_${quiz.quiz_number}.json`
        );
        fs.writeFileSync(jsonPath, jsonContent);
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      quiz_number: quiz.quiz_number,
      date: quiz.date,
      rounds: quiz.rounds.length,
      questions: quiz.rounds.reduce(
        (sum, r) => sum + r.questions.length,
        0
      ),
      file: file.name,
      quiz,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: list all quizzes
export async function GET() {
  if (isVercel) {
    return listFromBlob();
  }
  return listFromFilesystem();
}

async function listFromBlob() {
  try {
    const { blobs } = await list({ prefix: "quizzes/" });

    const quizzes = await Promise.all(
      blobs
        .filter((b) => b.pathname.endsWith(".json"))
        .map(async (blob) => {
          const res = await fetch(blob.url);
          const content = await res.json();
          return {
            quiz_number: content.quiz_number,
            date: content.date,
            rounds: content.rounds.length,
            file: blob.pathname,
          };
        })
    );

    return NextResponse.json({
      quizzes: quizzes.sort((a, b) => b.quiz_number - a.quiz_number),
    });
  } catch {
    // Blob not configured — return empty
    return NextResponse.json({ quizzes: [] });
  }
}

function listFromFilesystem() {
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

  const bankFiles = fs.existsSync(BANK_DIR)
    ? fs
        .readdirSync(BANK_DIR)
        .filter(
          (f) =>
            (f.endsWith(".docx") || f.endsWith(".pdf")) &&
            !f.startsWith("~$")
        )
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
