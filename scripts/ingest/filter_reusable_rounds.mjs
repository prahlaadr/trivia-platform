#!/usr/bin/env node
// Pre-filter pub-quiz JSONs down to REUSABLE standalone Q:A rounds before the
// dirty-south ingest. Special-format rounds (video, progressive, list/
// classification, truth-lie, mis-parsed) don't survive as standalone questions
// and would pollute game-gen, so we drop them at the round level.
//
//   node filter_reusable_rounds.mjs <inDir> [outDir]
//     no outDir  -> report only (prints keep/exclude list, writes nothing)
//     outDir     -> also writes filtered quiz JSONs (reusable rounds only)

import fs from "fs";
import path from "path";

const inDir = process.argv[2];
const outDir = process.argv[3] || null;
if (!inDir) { console.error("usage: filter_reusable_rounds.mjs <inDir> [outDir]"); process.exit(1); }

// Normalize an answer to its category "head" for classification detection:
// take the part before a "(" gloss or a " — "/" – " dash tail. So "More (3.7
// million)" -> "more" and "IKEA — a bed frame series" -> "ikea".
const answerHead = (a) => (a || "").split(/\s[—–]\s|\(/)[0].replace(/[✅.]/g, "").trim().toLowerCase();

// Decide if a round is reusable standalone Q:A, else why it's excluded.
function classify(round) {
  if (round.round_type === "video") return { keep: false, reason: "video round" };
  if (round.round_type === "progressive") return { keep: false, reason: "progressive (guess-the-X)" };

  const qs = (round.questions || []).filter((q) => !q.is_internet_only && (q.answer || "").trim());
  if (qs.length === 0) return { keep: false, reason: "no answered questions" };

  const theme = (round.theme_description || "").trim().toLowerCase();

  // Mis-parse: the round theme leaked into the answers. Require a MAJORITY so a
  // single coincidental match doesn't drop an otherwise-good round.
  if (theme) {
    const eqTheme = qs.filter((q) => q.answer.trim().toLowerCase() === theme).length;
    if (eqTheme >= Math.ceil(qs.length / 2))
      return { keep: false, reason: `mis-parsed (${eqTheme}/${qs.length} answers == theme)` };
  }

  // Truth/lie round: a MAJORITY of answers carry ✅ / Truth-Lie markers (need paired
  // statements). One stray ✅ (a single mis-parsed MC question) must not nuke a
  // standard round — that's handled per-question in the keep path below.
  const marked = qs.filter((q) => /✅|\b(truth|lie)\b\s*[–—-]/i.test(q.answer)).length;
  if (marked >= Math.ceil(qs.length / 2))
    return { keep: false, reason: `truth/lie round (${marked}/${qs.length} marked)` };

  // List/classification: the answers collapse to a tiny closed set of labels
  // (More/Less, Red/Blue/Bipartisan, Drug/Pokemon, Car/Couch...).
  const heads = new Set(qs.map((q) => answerHead(q.answer)));
  if (qs.length >= 5 && heads.size <= 3)
    return { keep: false, reason: `classification (${heads.size} distinct answers over ${qs.length})` };

  // Matching/connection/list round: most "questions" are bare entities (team
  // names, word lists like "Heart, Death, Eyes, Fire") that only make sense with
  // the round's framing ("match each team to its conference"). Catches many-label
  // matching rounds the closed-set test above misses (e.g. Conference Call, 8
  // conferences). A real question has a wh-word or a "?".
  const WH = /\b(what|which|who|whom|whose|where|when|how|why|name|finish|complete|true or false)\b/i;
  const bare = (s) => s.trim().split(/\s+/).length <= 5 && !s.includes("?") && !WH.test(s);
  const bareN = qs.filter((q) => bare(q.text)).length;
  if (bareN >= Math.ceil(qs.length / 2))
    return { keep: false, reason: `matching/list round (${bareN}/${qs.length} bare-entity)` };

  return { keep: true, reason: `standard (${qs.length} Q:A)` };
}

const files = fs.readdirSync(inDir).filter((f) => f.endsWith(".json"));
if (outDir) fs.mkdirSync(outDir, { recursive: true });

// A single mis-parsed MC question: its answer is a choice-dump (✅ marker or
// "A) ... B) ..." letters) instead of the clean correct answer. Drop it.
// Also drop bare round-prompt rows where a connection/guess round collapsed to
// its instruction line instead of real Q:A (e.g. text just "Find the Connection").
const BARE_PROMPT = /^(find the connection|guess (who|where|the))\b/i;
const misparsedQ = (q) =>
  /✅/.test(q.answer) || /(^|\s)[A-D]\)\s/.test(q.answer) || BARE_PROMPT.test((q.text || "").trim());

const excluded = [], kept = [];
let keptQ = 0, droppedQ = 0;
for (const f of files.sort()) {
  const quiz = JSON.parse(fs.readFileSync(path.join(inDir, f), "utf8"));
  const keepRounds = [];
  for (const r of quiz.rounds || []) {
    const c = classify(r);
    const rec = { quiz: quiz.quiz_number, round: r.number, title: r.title, reason: c.reason,
      sample: (r.questions?.find((q) => (q.answer || "").trim()) || {}) };
    if (!c.keep) { excluded.push(rec); continue; }
    const clean = r.questions.filter((q) => !misparsedQ(q));
    droppedQ += r.questions.length - clean.length;
    keptQ += clean.filter((q) => !q.is_internet_only && (q.answer || "").trim()).length;
    kept.push(rec);
    keepRounds.push({ ...r, questions: clean });
  }
  if (outDir) fs.writeFileSync(path.join(outDir, f), JSON.stringify({ ...quiz, rounds: keepRounds }));
}

console.log(`\n===== EXCLUDED ROUNDS (${excluded.length}) =====`);
for (const e of excluded)
  console.log(`  Q${e.quiz} R${e.round} "${e.title}" — ${e.reason}\n      e.g. "${(e.sample.text||'').slice(0,50)}" -> "${(e.sample.answer||'').slice(0,40)}"`);

console.log(`\n===== KEPT: ${kept.length} rounds, ~${keptQ} questions (dropped ${droppedQ} mis-parsed MC questions from kept rounds) =====`);
const byReasonKept = {};
kept.forEach((k) => { const n = k.reason.split(" (")[0]; byReasonKept[n] = (byReasonKept[n] || 0) + 1; });
console.log("  kept round types:", JSON.stringify(byReasonKept));
if (outDir) console.log(`\nwrote filtered quizzes -> ${outDir}`);
else console.log(`\nreport only — pass an outDir to write filtered JSONs.`);
