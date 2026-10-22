/**
 * Ready-made connection-round picks: the bank's strongest string / keyword /
 * rhyme threads, each with a match count, so the host can one-click a pattern
 * round instead of guessing a value.
 *
 *   GET /api/bank/pattern-suggestions  ->  { string:[...], keyword:[...], rhyme:[...] }
 */
import { NextResponse } from "next/server";
import { getPatternSuggestions } from "@/lib/bank/queries";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getPatternSuggestions());
}
