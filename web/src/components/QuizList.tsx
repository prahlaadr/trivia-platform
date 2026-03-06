"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { Quiz } from "@/lib/types";
import { brand } from "@/lib/branding";

interface QuizListProps {
  initialQuizzes: Quiz[];
}

export function QuizList({ initialQuizzes }: QuizListProps) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      setMessage({ text: "Only .docx files are supported", type: "error" });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Upload failed", type: "error" });
        return;
      }

      setMessage({
        text: `Parsed Quiz #${data.quiz_number} (${data.date}) — ${data.rounds} rounds`,
        type: "success",
      });

      // Refresh quiz list
      const listRes = await fetch("/api/parse");
      if (listRes.ok) {
        // Reload the page to get fresh server-rendered data
        window.location.reload();
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="min-h-screen bg-[#143B2E] p-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-1 text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700]/50">
          {brand.name}
        </p>
        <h1 className="mb-6 text-4xl font-black uppercase text-[#FFD700]">
          {brand.tagline}
        </h1>

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all ${
            dragOver
              ? "border-[#FFD700] bg-[#FFD700]/10"
              : "border-white/20 bg-[#1B4D3E]/50 hover:border-[#FFD700]/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-lg font-bold text-white/70">
            {uploading ? "Parsing..." : "Drop a .docx quiz file here"}
          </p>
          <p className="mt-1 text-sm text-white/30">
            or click to browse
          </p>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-[#4EC9B0]/10 text-[#4EC9B0]"
                : "bg-[#E84D5A]/10 text-[#E84D5A]"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Quiz list */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#FFD700]/20" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFD700]/40">
            {quizzes.length} quizzes in bank
          </p>
          <div className="h-px flex-1 bg-[#FFD700]/20" />
        </div>

        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.quiz_number}
              href={`/present/${quiz.quiz_number}`}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1B4D3E] p-5 transition-all hover:border-[#FFD700]/40 hover:bg-[#1B4D3E]/80"
            >
              <div>
                <h2 className="text-xl font-bold text-white">
                  {brand.quizLabel} #{quiz.quiz_number}
                </h2>
                <p className="text-sm text-[#F5E6C8]/50">{quiz.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#FFD700]/60">
                  {quiz.rounds.length} rounds
                </p>
                <p className="max-w-xs truncate text-xs text-white/30">
                  {quiz.rounds.map((r) => r.title).join(" / ")}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {quizzes.length === 0 && (
          <p className="mt-8 text-center text-white/40">
            No quizzes yet. Drop a .docx file above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
