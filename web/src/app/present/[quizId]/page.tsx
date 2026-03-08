"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Quiz } from "@/lib/types";
import { Presenter } from "@/components/Presenter";

export default function PresentPage() {
  const params = useParams();
  const quizId = params.quizId as string;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz?id=${quizId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setQuiz)
      .catch(() => setError(true));
  }, [quizId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#143B2E]">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#FFD700]">Quiz Not Found</h1>
          <p className="mt-2 text-white/50">Quiz #{quizId} doesn&apos;t exist.</p>
          <a href="/" className="mt-4 inline-block text-[#4EC9B0] hover:underline">
            Back to quizzes
          </a>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#143B2E]">
        <p className="text-xl text-white/50">Loading...</p>
      </div>
    );
  }

  return <Presenter quiz={quiz} />;
}
