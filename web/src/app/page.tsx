import fs from "fs";
import path from "path";
import type { Quiz } from "@/lib/types";
import { QuizList } from "@/components/QuizList";

async function getQuizzes(): Promise<Quiz[]> {
  const dataDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(dataDir)) return [];

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  const quizzes: Quiz[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
    quizzes.push(JSON.parse(content));
  }

  return quizzes.sort((a, b) => b.quiz_number - a.quiz_number);
}

export default async function Home() {
  const quizzes = await getQuizzes();
  return <QuizList initialQuizzes={quizzes} />;
}
