import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const isVercel = !!process.env.VERCEL;

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
    const { blobs } = await list({ prefix: `quizzes/quiz_${quizId}.json` });
    const blob = blobs.find((b) =>
      b.pathname === `quizzes/quiz_${quizId}.json`
    );
    if (!blob) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const res = await fetch(blob.url);
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
