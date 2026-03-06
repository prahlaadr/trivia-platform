import fs from "fs";
import path from "path";
import type { Quiz } from "@/lib/types";
import { QuizList, type QuizSummary } from "@/components/QuizList";

async function getQuizSummaries(): Promise<QuizSummary[]> {
  const dataDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(dataDir)) return [];

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  const summaries: QuizSummary[] = [];

  for (const file of files) {
    const quiz: Quiz = JSON.parse(
      fs.readFileSync(path.join(dataDir, file), "utf-8")
    );
    summaries.push({
      quiz_number: quiz.quiz_number,
      date: quiz.date,
      round_count: quiz.rounds.length,
      round_titles: quiz.rounds.map((r) => r.title),
    });
  }

  return summaries.sort((a, b) => b.quiz_number - a.quiz_number);
}

export default async function Home() {
  const quizzes = await getQuizSummaries();
  return <QuizList initialQuizzes={quizzes} />;
}
