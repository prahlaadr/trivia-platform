"use client";

import Link from "next/link";
import { brand } from "@/lib/branding";

export function QuizList() {
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
        <p className="text-white">Page loaded successfully.</p>
      </div>
    </div>
  );
}
