/**
 * Tier-1 only for now: resolve audience-typed topic → local bank questions.
 * Tier-2 (Trivia API) and Tier-3 (Claude w/ source_url) will fall in later.
 */

import { NextResponse } from "next/server";
import { pickQuestions, resolveTopic } from "@/lib/bank/queries";
import type { DifficultyFilter } from "@/lib/bank/types";

export const runtime = "nodejs";

interface TopicRequest {
  topic: string;
  count?: number;
  difficulty?: DifficultyFilter;
  excludeIds?: string[];
  allowTimeSensitive?: boolean;
}

export async function POST(req: Request) {
  let body: TopicRequest;
  try {
    body = (await req.json()) as TopicRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.topic || typeof body.topic !== "string") {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const count = body.count ?? 8;
  const resolved = await resolveTopic(body.topic);

  // Tier 1: pull from bank using resolution + topic fallback
  let questions = await pickQuestions({
    categorySlug: resolved.categorySlug ?? undefined,
    subcategorySlug: resolved.subcategorySlug ?? undefined,
    fuzzyTopic: resolved.matched === "exact-slug" ? undefined : body.topic,
    count,
    difficulty: body.difficulty,
    excludeIds: body.excludeIds,
    allowTimeSensitive: body.allowTimeSensitive,
  });

  // If exact-slug match returned nothing (edge case), fall back to fuzzy
  if (questions.length === 0 && resolved.matched === "exact-slug") {
    questions = await pickQuestions({
      fuzzyTopic: body.topic,
      count,
      difficulty: body.difficulty,
      excludeIds: body.excludeIds,
      allowTimeSensitive: body.allowTimeSensitive,
    });
  }

  const warnings: string[] = [];
  if (questions.length < count) {
    warnings.push(
      `Bank only returned ${questions.length}/${count} questions for "${body.topic}". Tiers 2+3 not wired yet — try a different topic or smaller count.`
    );
  }

  return NextResponse.json({
    topic: body.topic,
    resolved,
    questions,
    tierUsed: 1,
    warnings,
  });
}
