#!/usr/bin/env node
// Generate host commentary (host_hints + fun_facts) for a live quiz using the
// Gemini API with Google Search grounding, so facts are retrieved, not recalled.
//
// Targetable at any granularity, and preview-first: it writes the merged JSON
// locally and prints it for review; nothing goes to the live quiz until --push.
//
//   node scripts/gen-host-notes.mjs --quiz 618                  whole quiz, only Qs missing notes
//   node scripts/gen-host-notes.mjs --quiz 618 --round 2        one round
//   node scripts/gen-host-notes.mjs --quiz 618 --round 2 --q 3,5   specific questions
//     --overwrite   redo questions that already have notes
//     --push        publish the result to Blob (needs /tmp/trivia.env; else preview only)
//     --model X     Gemini model (default gemini-2.5-flash — free tier)
//
// Key: GEMINI_API_KEY from env or ~/Projects/.secrets/secrets.env.
// Push token: BLOB_READ_WRITE_TOKEN from /tmp/trivia.env
//   (run: vercel env pull /tmp/trivia.env --environment=production, from repo root).

import fs from "fs";
import os from "os";
import path from "path";

// ── args ──
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? "") : null;
};
const has = (name) => argv.includes(`--${name}`);
const quizId = flag("quiz");
const onlyRound = flag("round") ? parseInt(flag("round")) : null;
const onlyQs = flag("q") ? flag("q").split(",").map((n) => parseInt(n.trim())) : null;
const overwrite = has("overwrite");
const doPush = has("push");
const MODEL = flag("model") || "gemini-2.5-flash";
if (!quizId) { console.error("usage: --quiz <N> [--round N] [--q 3,5] [--overwrite] [--push]"); process.exit(1); }

// ── gemini key ──
function geminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const secrets = path.join(os.homedir(), "Projects/.secrets/secrets.env");
  const m = fs.existsSync(secrets) && fs.readFileSync(secrets, "utf8").match(/GEMINI_API_KEY="?([^"\n]+)"?/);
  if (m) return m[1];
  throw new Error("No GEMINI_API_KEY (env or ~/Projects/.secrets/secrets.env)");
}
const KEY = geminiKey();

const strip = (s) => (s || "").replace(/\s*\([^)]*\)\s*/g, " ").trim(); // drop parentheticals
const deEm = (s) => s.replace(/\s*—\s*/g, ", ").replace(/—/g, ", "); // house rule: no em dashes
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── one grounded Gemini call ──
async function gemini(prompt) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY }, body }
    );
    if (res.ok) {
      const data = await res.json();
      return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    }
    if ((res.status === 429 || res.status === 503) && attempt < 3) {
      await sleep(1500 * 2 ** attempt);
      continue;
    }
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
}

function extractJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const b = fenced ? fenced[1] : raw;
  const s = b.search(/[[{]/);
  if (s === -1) return b;
  const close = b[s] === "{" ? "}" : "]";
  const e = b.lastIndexOf(close);
  return e > s ? b.slice(s, e + 1) : b.slice(s);
}

// ── generate notes for one question (with a one-shot leak retry) ──
async function notesFor(q, isVideo) {
  const answer = q.answer || q.text; // video: the city lives in text
  const core = strip(answer);
  const subject = isVideo
    ? `The video round shows a city; the answer is: ${answer}.`
    : `QUESTION: ${q.text}\nCORRECT ANSWER: ${answer}`;
  const hintRule = isVideo
    ? `"hints": [] (video round has no spoken question, leave empty)`
    : `"hints": exactly 3 short lines the host says WHILE asking — flavor or a gentle nudge — that must NOT contain or reveal the answer "${core}". Funny is welcome, accuracy is required.`;

  const build = (extra) => `You help a pub-quiz host add spoken color. Use Google Search to VERIFY every fact; do not guess.
${subject}
Return ONLY a JSON object, no prose:
{"hints": [...], "facts": [...]}
- ${hintRule}
- "facts": exactly 3 short, surprising, accurate fun facts to say WHEN revealing the answer.
- Each line under ~25 words. No em dashes. Be genuinely funny but never wrong.${extra || ""}`;

  const parse = (raw) => { try { return JSON.parse(extractJson(raw)); } catch { return null; } };
  const leaks = (hints) => core.length >= 4 && !/^\d+$/.test(core) &&
    !["yes", "no", "true", "false"].includes(core.toLowerCase()) &&
    hints.some((h) => h.toLowerCase().includes(core.toLowerCase()));

  let out = parse(await gemini(build()));
  if (!out) return null;
  if (!isVideo && Array.isArray(out.hints) && leaks(out.hints)) {
    const retry = parse(await gemini(build(`\nIMPORTANT: your hints must NOT mention "${core}" in any form.`)));
    if (retry) out = retry;
  }
  const hints = (out.hints || []).map(deEm);
  const facts = (out.facts || []).map(deEm);
  return { hints, facts, leaked: !isVideo && leaks(hints) };
}

// ── main ──
const quiz = await (await fetch(`https://trivia.pyaarproject.org/api/quiz?id=${quizId}`, { cache: "no-store" })).json();
if (!quiz?.rounds) throw new Error(`quiz ${quizId} not found`);

let done = 0, leakFlags = [];
for (const r of quiz.rounds) {
  if (onlyRound && r.number !== onlyRound) continue;
  if (r.round_type === "progressive") { console.log(`R${r.number}: progressive, skipped (clue-based)`); continue; }
  const isVideo = r.round_type === "video";
  for (const q of r.questions) {
    if (onlyQs && !onlyQs.includes(q.number)) continue;
    if (q.is_internet_only) continue;
    const hasNotes = (q.host_hints?.length || q.fun_facts?.length);
    if (hasNotes && !overwrite) continue;

    process.stdout.write(`R${r.number}Q${q.number} … `);
    const n = await notesFor(q, isVideo);
    if (!n) { console.log("failed (no JSON)"); continue; }
    if (n.hints.length) q.host_hints = n.hints;
    if (n.facts.length) q.fun_facts = n.facts;
    done++;
    console.log(n.leaked ? "done ⚠ possible answer leak" : "done");
    if (n.leaked) leakFlags.push(`R${r.number}Q${q.number}`);
    await sleep(600); // gentle on free-tier rate limits
  }
}

// ── preview ──
console.log(`\n===== PREVIEW (${done} question${done === 1 ? "" : "s"}) =====`);
for (const r of quiz.rounds) {
  if (onlyRound && r.number !== onlyRound) continue;
  for (const q of r.questions) {
    if (onlyQs && !onlyQs.includes(q.number)) continue;
    if (!q.host_hints?.length && !q.fun_facts?.length) continue;
    console.log(`\nR${r.number}Q${q.number}. ${q.text}  → ${q.answer || q.text}`);
    (q.host_hints || []).forEach((h) => console.log(`   hint: ${h}`));
    (q.fun_facts || []).forEach((f) => console.log(`   fact: ${f}`));
  }
}
if (leakFlags.length) console.log(`\n⚠ Review these for answer leaks: ${leakFlags.join(", ")}`);

const outPath = `/tmp/quiz_${quizId}_notes.json`;
fs.writeFileSync(outPath, JSON.stringify(quiz, null, 2));
console.log(`\nwrote ${outPath}`);

// ── publish (only with --push) ──
if (doPush) {
  const envFile = "/tmp/trivia.env";
  const tok = fs.existsSync(envFile) && fs.readFileSync(envFile, "utf8").match(/BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?/);
  if (!tok) { console.error("--push needs BLOB_READ_WRITE_TOKEN in /tmp/trivia.env (vercel env pull ...)"); process.exit(1); }
  const { put } = await import("@vercel/blob");
  const r = await put(`quiz_${quizId}.json`, JSON.stringify(quiz, null, 2), {
    access: "public", contentType: "application/json", addRandomSuffix: false,
    allowOverwrite: true, cacheControlMaxAge: 60, token: tok[1],
  });
  console.log(`pushed → ${r.url}\nlive: https://trivia.pyaarproject.org/present/${quizId}`);
} else {
  console.log(`preview only — re-run with --push to publish.`);
}
