import { NextRequest, NextResponse } from "next/server";

// On-demand host commentary for a single question, generated live in the
// presenter (the "Generate" button) instead of pre-loaded via gen-host-notes.
// Gemini + Google Search grounding, same no-giveaway rules as the CLI/skill.

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-2.5-flash";
const deEm = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/—/g, ", ");

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  let body: { text?: string; answer?: string; kind?: "hints" | "facts" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad JSON" }, { status: 400 }); }
  const text = (body.text || "").trim();
  const answer = (body.answer || "").trim();
  const kind = body.kind === "facts" ? "facts" : "hints";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const core = answer.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const ask =
    kind === "hints"
      ? `Return exactly 3 short lines the host says WHILE asking, to add flavor or a gentle nudge, that must NOT contain or reveal the answer "${core}". Funny is welcome, accuracy required.`
      : `Return exactly 3 short, surprising, accurate fun facts to say WHEN revealing the answer.`;
  const prompt = `You help a pub-quiz host add spoken color. Use Google Search to VERIFY every fact; do not guess.
QUESTION: ${text}
CORRECT ANSWER: ${answer}
${ask}
Return ONLY a JSON object: {"items": ["...","...","..."]}. Each line under ~25 words. No em dashes.`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
      }
    );
  } catch {
    return NextResponse.json({ error: "Gemini unreachable" }, { status: 502 });
  }
  if (!res.ok) {
    const status = res.status === 429 ? 429 : 502;
    return NextResponse.json({ error: `Gemini ${res.status}` }, { status });
  }

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  const m = raw.match(/\{[\s\S]*\}/);
  let items: string[] = [];
  try { items = (JSON.parse(m ? m[0] : raw).items || []).map(deEm); } catch {
    return NextResponse.json({ error: "parse failed" }, { status: 502 });
  }
  // Leak guard for hints: drop any line that gives the answer away.
  if (kind === "hints" && core.length >= 4 && !/^\d+$/.test(core)) {
    items = items.filter((h) => !h.toLowerCase().includes(core.toLowerCase()));
  }
  return NextResponse.json({ items, kind });
}
