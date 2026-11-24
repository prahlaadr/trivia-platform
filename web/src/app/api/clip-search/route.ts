import { NextRequest, NextResponse } from "next/server";
import type { ClipResult } from "@/lib/types";

// Live clip lookup for the presenter. Type a phrase (a movie line, a song, or
// the answer) and get the top ~10 YouTube clips to play during the game.
// Uses YouTube's public InnerTube endpoint — no API key, no quota — the same
// mechanism pyaar-radio's /api/search-yt already relies on in production.

export const runtime = "nodejs";
export const maxDuration = 15;

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const deEm = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/—/g, ", ");

interface Run { text?: string }
interface VideoRenderer {
  videoId?: string;
  title?: { runs?: Run[]; simpleText?: string };
  ownerText?: { runs?: Run[] };
  longBylineText?: { runs?: Run[] };
  lengthText?: { simpleText?: string };
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(`https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00" } },
        query: q,
      }),
    });
  } catch {
    return NextResponse.json({ error: "YouTube unreachable" }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ error: `YouTube ${res.status}` }, { status: 502 });

  const data: unknown = await res.json();
  const items: ClipResult[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown): void => {
    if (items.length >= 10) return;
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const vr = obj.videoRenderer as VideoRenderer | undefined;
    if (vr?.videoId && !seen.has(vr.videoId)) {
      seen.add(vr.videoId);
      const title = (vr.title?.runs?.map((r) => r.text ?? "").join("") || vr.title?.simpleText || "").trim();
      const channel = (vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || "").trim();
      items.push({
        videoId: vr.videoId,
        title: deEm(title),
        channel: deEm(channel),
        duration: vr.lengthText?.simpleText || "",
        thumbnail: `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg`,
      });
    }
    for (const key in obj) walk(obj[key]);
  };
  walk(data);

  return NextResponse.json({ items });
}
