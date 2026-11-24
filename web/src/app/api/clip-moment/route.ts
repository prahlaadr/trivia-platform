import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

// Given a YouTube video id (v) and a search phrase (q), read the video's
// transcript and find the timestamp where the phrase is spoken, so the player
// can jump to that exact moment (Yarn-style). Prefers an exact phrase match,
// falls back to the best-overlap caption line. Best-effort: many clip videos
// only have auto-generated (fuzzy) captions and some have none.

export const runtime = "nodejs";
export const maxDuration = 20;

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

// Fetch transcript segments. On the deployed site (SUPADATA_API_KEY set) go
// through Supadata, which reaches YouTube from an allowed IP; locally fall back
// to the free youtube-transcript scrape (works from residential IPs). Both
// return {text, offset(ms), duration(ms)}.
async function getSegments(videoId: string): Promise<{ text: string; offset: number; duration: number }[]> {
  const key = process.env.SUPADATA_API_KEY;
  if (key) {
    const res = await fetch(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent("https://youtu.be/" + videoId)}`,
      { headers: { "x-api-key": key } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.content) ? data.content : [];
  }
  return YoutubeTranscript.fetchTranscript(videoId);
}

export async function GET(req: NextRequest) {
  const v = (req.nextUrl.searchParams.get("v") || "").trim();
  const q = norm(req.nextUrl.searchParams.get("q") || "");
  if (!v || !q) return NextResponse.json({ found: false, error: "v and q required" }, { status: 400 });

  let raw: { text: string; offset: number; duration: number }[];
  try {
    raw = await getSegments(v);
  } catch {
    return NextResponse.json({ found: false, reason: "no-transcript" });
  }
  if (!raw?.length) return NextResponse.json({ found: false, reason: "no-transcript" });

  // Concatenate normalized caption lines, tracking each line's char range + time.
  let concat = "";
  const ranges: { start: number; end: number; t0: number; t1: number }[] = [];
  for (const s of raw) {
    const t = norm(s.text);
    if (!t) continue;
    concat += (concat ? " " : "") + t;
    ranges.push({
      start: concat.length - t.length,
      end: concat.length,
      t0: s.offset / 1000,
      t1: (s.offset + s.duration) / 1000,
    });
  }
  const lineAt = (charIdx: number) => ranges.find((r) => charIdx >= r.start && charIdx < r.end);

  let t0: number | null = null;
  let t1: number | null = null;
  let exact = false;

  // 1) exact phrase as a substring of the transcript
  const idx = concat.indexOf(q);
  if (idx >= 0) {
    const a = lineAt(idx);
    const b = lineAt(idx + q.length - 1) || a;
    if (a && b) { t0 = a.t0; t1 = b.t1; exact = true; }
  }

  // 2) fallback: the caption line sharing the most words with the phrase
  if (t0 === null) {
    const words = q.split(" ").filter(Boolean);
    let best: { score: number; r: (typeof ranges)[number] } | null = null;
    for (const r of ranges) {
      const line = concat.slice(r.start, r.end);
      const score = words.filter((w) => line.includes(w)).length;
      if (score > 0 && (!best || score > best.score)) best = { score, r };
    }
    if (best && best.score >= Math.max(1, Math.ceil(words.length / 2))) {
      t0 = best.r.t0; t1 = best.r.t1;
    }
  }

  if (t0 === null || t1 === null) return NextResponse.json({ found: false, reason: "no-match" });

  // pad slightly, clamp to integer seconds (YouTube embed start/end are seconds)
  const start = Math.max(0, Math.floor(t0 - 0.3));
  const end = Math.max(start + 2, Math.ceil(t1 + 0.6));
  return NextResponse.json({ found: true, start, end, exact });
}
