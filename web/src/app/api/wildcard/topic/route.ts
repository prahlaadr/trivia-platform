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
  const warnings: string[] = [];
  let fallbackUsed: "subcategory" | "category" | "fuzzy" | null = null;

  // Try 1: subcategory exact (most precise). Only if we actually resolved something.
  let questions: Awaited<ReturnType<typeof pickQuestions>> = [];
  if (resolved.categorySlug || resolved.subcategorySlug) {
    questions = await pickQuestions({
      categorySlug: resolved.categorySlug ?? undefined,
      subcategorySlug: resolved.subcategorySlug ?? undefined,
      count,
      difficulty: body.difficulty,
      excludeIds: body.excludeIds,
      allowTimeSensitive: body.allowTimeSensitive,
    });
    if (questions.length > 0) fallbackUsed = "subcategory";
  }

  // Try 2: widen to parent category (the audience yelled a subtopic
  // we don't have content for, but the parent has plenty)
  if (questions.length === 0 && resolved.categorySlug) {
    questions = await pickQuestions({
      categorySlug: resolved.categorySlug,
      count,
      difficulty: body.difficulty,
      excludeIds: body.excludeIds,
      allowTimeSensitive: body.allowTimeSensitive,
    });
    if (questions.length > 0) {
      fallbackUsed = "category";
      warnings.push(
        `No questions found specifically for "${body.topic}" in ${resolved.subcategorySlug}; using broader ${resolved.categorySlug} category.`
      );
    }
  }

  // Try 3: fuzzy LIKE search across the bank
  if (questions.length === 0) {
    questions = await pickQuestions({
      fuzzyTopic: body.topic,
      count,
      difficulty: body.difficulty,
      excludeIds: body.excludeIds,
      allowTimeSensitive: body.allowTimeSensitive,
    });
    if (questions.length > 0) {
      fallbackUsed = "fuzzy";
      warnings.push(
        `"${body.topic}" wasn't a known category; pulled fuzzy matches from across the bank.`
      );
    }
  }

  if (questions.length === 0) {
    warnings.push(
      `No questions in the bank match "${body.topic}". Try a broader topic or pick a category tile.`
    );
  } else if (questions.length < count) {
    warnings.push(
      `Bank only returned ${questions.length}/${count} questions for "${body.topic}".`
    );
  }

  return NextResponse.json({
    topic: body.topic,
    resolved,
    fallbackUsed,
    questions,
    tierUsed: 1,
    warnings,
  });
}
