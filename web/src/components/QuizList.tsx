"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getBrand, getBrandKey, setBrandKey, brands, type BrandKey } from "@/lib/branding";

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
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [brandKey, setBrandKeyState] = useState<BrandKey>("pyaar");

  useEffect(() => {
    setBrandKeyState(getBrandKey());
  }, []);

  const currentBrand = brands[brandKey];

  const toggleBrand = () => {
    const next: BrandKey = brandKey === "pyaar" ? "dirty-south" : "pyaar";
    setBrandKey(next);
    setBrandKeyState(next);
  };

  useEffect(() => {
    fetch("/api/parse")
      .then((res) => res.json())
      .then((data) => setQuizzes(data.quizzes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx" && ext !== "pdf") {
      setMessage("Only .docx and .pdf files are supported");
      setMessageType("error");
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
        setMessage("Server returned non-JSON: " + text.slice(0, 100));
        setMessageType("error");
        return;
      }

      if (!res.ok) {
        setMessage(String(data.error || "Upload failed"));
        setMessageType("error");
        return;
      }

      setMessage(
        "Parsed Quiz #" + data.quiz_number + " (" + data.date + ")"
      );
      setMessageType("success");

      // Refresh quiz list
      const listRes = await fetch("/api/parse");
      if (listRes.ok) {
        const listData = await listRes.json();
        setQuizzes(listData.quizzes || []);
      }
    } catch (err) {
      setMessage("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setMessageType("error");
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
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700]/50">
            {currentBrand.name}
          </p>
          <button
            onClick={toggleBrand}
            className="rounded px-2 py-1 text-xs font-medium text-white/30 transition-colors hover:bg-white/5 hover:text-white/50"
            title={`Switch to ${brandKey === "pyaar" ? "Dirty South" : "Pyaar"} branding`}
          >
            {brandKey === "pyaar" ? "DST" : "PT"}
          </button>
        </div>
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-4xl font-black uppercase text-[#FFD700]">
            {currentBrand.tagline}
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
            accept=".docx,.pdf"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <p className="text-lg font-bold text-white/70">
            {uploading ? "Parsing..." : "Drop a .docx or .pdf quiz file here"}
          </p>
          <p className="mt-1 text-sm text-white/30">or click to browse</p>
        </label>

        {/* Status message */}
        {message !== null && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium ${
              messageType === "success"
                ? "bg-[#4EC9B0]/10 text-[#4EC9B0]"
                : "bg-[#E84D5A]/10 text-[#E84D5A]"
            }`}
          >
            {message}
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
                  {currentBrand.quizLabel} #{quiz.quiz_number}
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
            No quizzes yet. Drop a .docx or .pdf file above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
