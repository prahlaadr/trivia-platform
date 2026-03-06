import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import type { Quiz } from "@/lib/types";
import { Presenter } from "@/components/Presenter";

interface PageProps {
  params: Promise<{ quizId: string }>;
}

async function getQuiz(quizId: string): Promise<Quiz | null> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    `quiz_${quizId}.json`
  );
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

export default async function PresentPage({ params }: PageProps) {
  const { quizId } = await params;
  const quiz = await getQuiz(quizId);

  if (!quiz) {
    notFound();
  }

  return <Presenter quiz={quiz} />;
}
