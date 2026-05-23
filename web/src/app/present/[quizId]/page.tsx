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
    // Check localStorage first (wildcard games are stored there)
    if (quizId.startsWith("wildcard-")) {
      const stored = localStorage.getItem(`quiz_${quizId}`);
      if (stored) {
        setQuiz(JSON.parse(stored));
        return;
      }
    }

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
      <div className="flex min-h-screen items-center justify-center bg-[#E8DFC8]">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#8B3530]">Quiz Not Found</h1>
          <p className="mt-2 text-white/50">Quiz #{quizId} doesn&apos;t exist.</p>
          <a href="/" className="mt-4 inline-block text-[#8FAA73] hover:underline">
            Back to quizzes
          </a>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8DFC8]">
        <p className="text-xl text-white/50">Loading...</p>
      </div>
    );
  }

  return <Presenter quiz={quiz} />;
}
