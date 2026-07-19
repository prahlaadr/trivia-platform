/**
 * Topic → bank-questions API.
 *
 * Resolution strategy (returns first non-empty):
 *   1. resolved subcategory + topic-text filter   (most precise, "actual Marvel questions")
 *   2. resolved category    + topic-text filter   (still about the topic, broader bucket)
 *   3. resolved subcategory, no topic filter      (broader, with warning)
 *   4. resolved category,    no topic filter      (broader still, with warning)
 *   5. fuzzy LIKE across the bank                 (last resort)
 *   6. empty + clear "no questions match" warning
 *
 * If we widen past the topic-text filter, we surface a warning so the
 * host knows the questions aren't tightly on-topic.
 */

import { NextResponse } from "next/server";
import { pickQuestions, resolveTopic, salientTopic } from "@/lib/bank/queries";
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
  // Match on the distinctive term ("Marvel movies" -> "marvel") so filler words
  // don't sink an otherwise-coverable topic. Original kept for warning copy.
  const searchTopic = salientTopic(body.topic);
  const resolved = await resolveTopic(searchTopic);
  const warnings: string[] = [];
  let fallbackUsed:
    | "subcategory-with-topic"
    | "category-with-topic"
    | "subcategory-broad"
    | "category-broad"
    | "fuzzy"
    | null = null;

  const base = {
    count,
    difficulty: body.difficulty,
    excludeIds: body.excludeIds,
    allowTimeSensitive: body.allowTimeSensitive,
  };

  // Detect if the typed topic IS its resolved subcategory's slug or name,
  // so we skip text filtering and just pull all questions in the subcat
  // (e.g. "cricket" types in → subcat cricket; we don't require the word
  // "cricket" to appear in every question).
  const topicMatchesSub =
    resolved.matched === "exact-slug" &&
    resolved.subcategorySlug !== null &&
    (resolved.subcategorySlug.toLowerCase() === body.topic.trim().toLowerCase() ||
      resolved.subcategorySlug.replace(/-/g, " ").toLowerCase() ===
        body.topic.trim().toLowerCase());

  let questions: Awaited<ReturnType<typeof pickQuestions>> = [];

  // FAST PATH: topic is a known category — pull the whole category, no
  // text filtering. This is the random-wildcard case (page sends slugs
  // like "science-nature" as topics). dirty-south is included: the
  // reusable-only ingest already dropped context-dependent pub-quiz
  // rounds, so what remains are standalone Q:A safe to pick individually.
  if (resolved.topicIsCategory && resolved.categorySlug) {
    questions = await pickQuestions({
      ...base,
      categorySlug: resolved.categorySlug,
    });
    if (questions.length > 0) fallbackUsed = "category-broad";
  }

  // Try 1: subcategory + topic text — most precise.
  if (questions.length === 0 && resolved.subcategorySlug) {
    questions = await pickQuestions({
      ...base,
      categorySlug: resolved.categorySlug ?? undefined,
      subcategorySlug: resolved.subcategorySlug,
      fuzzyTopic: topicMatchesSub ? undefined : searchTopic,
    });
    if (questions.length > 0) fallbackUsed = "subcategory-with-topic";
  }

  // Try 2: category + topic text
  if (questions.length === 0 && resolved.categorySlug) {
    questions = await pickQuestions({
      ...base,
      categorySlug: resolved.categorySlug,
      fuzzyTopic: searchTopic,
    });
    if (questions.length > 0) {
      fallbackUsed = "category-with-topic";
      warnings.push(
        `No questions in ${resolved.subcategorySlug ?? "the subcategory"} match "${body.topic}". Pulled from broader ${resolved.categorySlug} where the topic appears.`
      );
    }
  }

  // Try 3: subcategory only, no topic-text filter
  if (questions.length === 0 && resolved.subcategorySlug) {
    questions = await pickQuestions({
      ...base,
      categorySlug: resolved.categorySlug ?? undefined,
      subcategorySlug: resolved.subcategorySlug,
    });
    if (questions.length > 0) {
      fallbackUsed = "subcategory-broad";
      warnings.push(
        `No questions specifically about "${body.topic}". Pulled broader questions from ${resolved.subcategorySlug}.`
      );
    }
  }

  // Try 4: category only, no topic-text filter
  if (questions.length === 0 && resolved.categorySlug) {
    questions = await pickQuestions({
      ...base,
      categorySlug: resolved.categorySlug,
    });
    if (questions.length > 0) {
      fallbackUsed = "category-broad";
      warnings.push(
        `No "${body.topic}" questions; pulled general questions from ${resolved.categorySlug}.`
      );
    }
  }

  // Try 5: fuzzy across the whole bank
  if (questions.length === 0) {
    questions = await pickQuestions({ ...base, fuzzyTopic: searchTopic });
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
