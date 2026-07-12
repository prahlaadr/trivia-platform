import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const isVercel = !!process.env.VERCEL;
const ADMIN_PIN = process.env.ADMIN_PIN || "";

function checkAdmin(request: NextRequest): boolean {
  if (!ADMIN_PIN) return true; // no pin set = open access
  return (request.headers.get("x-admin-pin") || "") === ADMIN_PIN;
}

// POST: publish a hand-authored quiz JSON directly (bypasses docx/pdf parsing)
export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
  }

  let quiz;
  try {
    quiz = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  if (typeof quiz?.quiz_number !== "number" || !Array.isArray(quiz?.rounds)) {
    return NextResponse.json(
      { error: "Quiz JSON needs a numeric quiz_number and a rounds array" },
      { status: 400 }
    );
  }

  const filename = `quiz_${quiz.quiz_number}.json`;
  const jsonContent = JSON.stringify(quiz, null, 2);

  if (isVercel) {
    await put(filename, jsonContent, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, filename), jsonContent);
  }

  return NextResponse.json({
    success: true,
    quiz_number: quiz.quiz_number,
    rounds: quiz.rounds.length,
    questions: quiz.rounds.reduce(
      (sum: number, r: { questions?: unknown[] }) => sum + (r.questions?.length || 0),
      0
    ),
    present_url: `/present/${quiz.quiz_number}`,
  });
}

export async function GET(request: NextRequest) {
  const quizId = request.nextUrl.searchParams.get("id");
  if (!quizId) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  if (isVercel) {
    return getFromBlob(quizId);
  }
  return getFromFilesystem(quizId);
}

async function getFromBlob(quizId: string) {
  try {
    const { blobs } = await list({ prefix: `quiz_${quizId}.json` });
    const blob = blobs.find((b) =>
      b.pathname === `quiz_${quizId}.json`
    );
    if (!blob) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const res = await fetch(blob.url, { cache: "no-store" });
    const quiz = await res.json();
    return NextResponse.json(quiz);
  } catch {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
}

function getFromFilesystem(quizId: string) {
  const filePath = path.join(DATA_DIR, `quiz_${quizId}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return NextResponse.json(content);
}
