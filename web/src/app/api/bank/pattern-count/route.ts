/**
 * Count distinct answers that match a connection pattern, so the Wildcard /
 * Game Gen UIs can warn BEFORE adding a round that would come back empty.
 *
 *   GET /api/bank/pattern-count?kind=string&value=mad  ->  { kind, value, count }
 */
import { NextResponse } from "next/server";
import { countPattern } from "@/lib/bank/queries";
import type { PatternKind } from "@/lib/bank/types";

export const runtime = "nodejs";

const KINDS: PatternKind[] = ["string", "keyword", "rhyme"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as PatternKind | null;
  const value = (url.searchParams.get("value") || "").trim();
  if (!kind || !KINDS.includes(kind) || !value) {
    return NextResponse.json({ error: "kind (string|keyword|rhyme) and value required" }, { status: 400 });
  }
  const count = await countPattern({ kind, value });
  return NextResponse.json({ kind, value, count });
}
