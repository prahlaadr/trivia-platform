"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { brand } from "@/lib/branding";

interface QuizSummary {
  quiz_number: number;
  date: string;
  rounds: number;
}

export function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch quiz list on mount
  useEffect(() => {
    fetch("/api/parse")
      .then((res) => res.json())
      .then((data) => {
        setQuizzes(data.quizzes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setMessage({
          text: "Server returned non-JSON: " + text.slice(0, 100),
          type: "error",
        });
        return;
      }

      if (!res.ok) {
        setMessage({ text: data.error || "Upload failed", type: "error" });
        return;
      }

      setMessage({
        text: "Parsed Quiz #" + data.quiz_number + " (" + data.date + ") — " + data.rounds + " rounds",
        type: "success",
      });

      // Refresh quiz list
      const listRes = await fetch("/api/parse");
      if (listRes.ok) {
        const listData = await listRes.json();
        setQuizzes(listData.quizzes || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessage({ text: "Upload failed: " + msg, type: "error" });
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
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-4xl font-black uppercase text-[#FFD700]">
            {brand.tagline}
          </h1>
          <Link
            href="/score"
            className="rounded bg-[#4EC9B0]/20 px-4 py-2 text-sm font-bold text-[#4EC9B0] transition-all hover:bg-[#4EC9B0]/30"
          >
            Scorekeeper
          </Link>
        </div>

        {/* Upload zone */}
        <label
          htmlFor="docx-upload"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all ${
            dragOver
              ? "border-[#FFD700] bg-[#FFD700]/10"
              : "border-white/20 bg-[#1B4D3E]/50 hover:border-[#FFD700]/40"
          }`}
        >
          <input
            id="docx-upload"
            type="file"
            accept=".docx"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <p className="text-lg font-bold text-white/70">
            {uploading ? "Parsing..." : "Drop a .docx quiz file here"}
          </p>
          <p className="mt-1 text-sm text-white/30">or click to browse</p>
        </label>

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
            {loading ? "Loading..." : quizzes.length + " quizzes in bank"}
          </p>
          <div className="h-px flex-1 bg-[#FFD700]/20" />
        </div>

        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.quiz_number}
              href={"/present/" + quiz.quiz_number}
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
                  {quiz.rounds} rounds
                </p>
              </div>
            </Link>
          ))}
        </div>

        {!loading && quizzes.length === 0 && (
          <p className="mt-8 text-center text-white/40">
            No quizzes yet. Drop a .docx file above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
