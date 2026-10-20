/**
 * Round builder (ASSEMBLE mode).
 *
 * Turns the vetted question bank into a publishable quiz_<N>.json that hosts
 * at /present/<N>, emitting the live site's exact Quiz schema. It reuses the
 * SAME retrieval the site's Wildcard / Game Gen use (resolveTopic +
 * pickQuestions), so an assembled round is accurate by construction, not a
 * parallel re-implementation.
 *
 * It never emits a question already used in a published data/quiz_*.json
 * (normalized-text dedup), and keeps multiple-choice only when the source
 * question carried options (open-answer is the default).
 *
 * Usage:
 *   bun run scripts/build_round.ts --spec scripts/specs/example-round.json
 *   bun run scripts/build_round.ts --theme "science-nature" --count 8 --title "Science"
 *   bun run scripts/build_round.ts --spec <f> --dry        # validate + preview, write nothing
 *
 * Output: writes web/public/data/quiz_<N>.json (served locally at /present/<N>)
 * and the repo-source copy data/quiz_<N>.json. Publishing to prod Blob is the
 * existing POST /api/quiz flow (printed at the end).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(REPO, "web");
const DATA_SRC = join(REPO, "data");            // local source dir (gitignored)
const DATA_WEB = join(WEB, "public", "data");   // what /present reads locally (gitignored)

// getBank() reads process.cwd()/.bank/bank.json, so point cwd at web/ before
// any retrieval call. All our own file I/O uses absolute paths, unaffected.
process.chdir(WEB);
const { resolveTopic, pickQuestions, salientTopic } = await import(
  "../web/src/lib/bank/queries.ts"
);
import type { Question, Round, Quiz } from "../web/src/lib/types.ts";
import type { BankQuestion } from "../web/src/lib/bank/types.ts";

type RoundSpec = {
  title: string;
  theme: string;                 // category/subcategory slug or free text
  count?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  round_type?: "standard" | "video" | "progressive" | "list";
  points_per_question?: number;
  joker_eligible?: boolean;
};
type QuizSpec = {
  quiz_number?: number;
  date?: string;
  rounds: RoundSpec[];
  tie_breaker?: { question: string; answer: string };
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseArgs(argv: string[]) {
  const a: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) { a[key] = next; i++; }
      else a[key] = true;
    }
  }
  return a;
}

/** Every normalized question text already used in a published quiz. */
function publishedTexts(): Set<string> {
  const seen = new Set<string>();
  for (const dir of [DATA_SRC, DATA_WEB]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!/^quiz_.*\.json$/.test(f)) continue;
      try {
        const q = JSON.parse(readFileSync(join(dir, f), "utf-8"));
        for (const r of q.rounds ?? [])
          for (const qq of r.questions ?? [])
            if (qq.text) seen.add(norm(qq.text));
      } catch { /* skip unreadable */ }
    }
  }
  return seen;
}

function nextQuizNumber(): number {
  let max = 0;
  for (const dir of [DATA_SRC, DATA_WEB]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = f.match(/^quiz_(\d+)\.json$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return max + 1;
}

/** BankQuestion -> site Question. Open-answer unless the source had options. */
function toQuestion(bq: BankQuestion, number: number): Question {
  const choices = Array.isArray(bq.choices) && bq.choices.length >= 2 ? bq.choices : [];
  return {
    number,
    text: bq.text,
    answer: bq.answer,
    choices,
    is_internet_only: false,
  };
}

async function buildRound(spec: RoundSpec, used: Set<string>, number: number): Promise<{ round: Round; picked: BankQuestion[] }> {
  const count = spec.count ?? 8;
  const difficulty = (spec.difficulty ?? "mixed") as "easy" | "medium" | "hard" | "mixed";
  const resolved = await resolveTopic(salientTopic(spec.theme));

  // Oversample so we can drop published + within-quiz dups and still fill count.
  // Exclude dirty-south like Wildcard does: those pub-quiz rows are
  // context-dependent (they read as standalone but belong to a specific round),
  // so they're for REPLICATE, not themed ASSEMBLE.
  const base = {
    count: count * 4,
    difficulty,
    allowTimeSensitive: false,
    excludeSources: ["dirty-south"],
  };
  let cand: BankQuestion[] = [];
  if (resolved.topicIsCategory && resolved.categorySlug) {
    cand = await pickQuestions({ ...base, categorySlug: resolved.categorySlug });
  } else if (resolved.subcategorySlug) {
    cand = await pickQuestions({
      ...base,
      categorySlug: resolved.categorySlug ?? undefined,
      subcategorySlug: resolved.subcategorySlug,
    });
    if (cand.length < count && resolved.categorySlug)
      cand = await pickQuestions({ ...base, categorySlug: resolved.categorySlug, fuzzyTopic: salientTopic(spec.theme) });
  } else if (resolved.categorySlug) {
    cand = await pickQuestions({ ...base, categorySlug: resolved.categorySlug, fuzzyTopic: salientTopic(spec.theme) });
  } else {
    cand = await pickQuestions({ ...base, fuzzyTopic: salientTopic(spec.theme) });
  }

  const picked: BankQuestion[] = [];
  for (const q of cand) {
    const n = norm(q.text);
    if (used.has(n)) continue;
    used.add(n);
    picked.push(q);
    if (picked.length >= count) break;
  }

  const round: Round = {
    number,
    title: spec.title,
    round_type: spec.round_type ?? "standard",
    points_per_question: spec.points_per_question ?? 1,
    joker_eligible: spec.joker_eligible ?? false,
    theme_description: spec.theme,
    questions: picked.map((q, i) => toQuestion(q, i + 1)),
    clues: [],
    progressive_answer: "",
  };
  return { round, picked };
}

const ROUND_TYPES = new Set(["standard", "video", "progressive", "list"]);
function validate(quiz: Quiz): string[] {
  const errs: string[] = [];
  if (typeof quiz.quiz_number !== "number") errs.push("quiz_number must be a number");
  if (!Array.isArray(quiz.rounds) || quiz.rounds.length === 0) errs.push("rounds[] empty");
  quiz.rounds.forEach((r, ri) => {
    if (!ROUND_TYPES.has(r.round_type)) errs.push(`round ${ri}: bad round_type "${r.round_type}"`);
    if (typeof r.points_per_question !== "number") errs.push(`round ${ri}: points_per_question not a number`);
    if (!Array.isArray(r.questions) || r.questions.length === 0) errs.push(`round ${ri} "${r.title}": no questions`);
    r.questions.forEach((q, qi) => {
      if (typeof q.number !== "number") errs.push(`round ${ri} q${qi}: number missing`);
      if (!q.text) errs.push(`round ${ri} q${qi}: empty text`);
      if (q.answer === undefined || q.answer === null) errs.push(`round ${ri} q${qi}: answer missing`);
      if (!Array.isArray(q.choices)) errs.push(`round ${ri} q${qi}: choices not an array`);
    });
  });
  return errs;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const dry = !!a.dry;

  let spec: QuizSpec;
  if (a.spec) {
    spec = JSON.parse(readFileSync(join(REPO, String(a.spec)), "utf-8"));
  } else if (a.theme) {
    spec = { rounds: [{ title: String(a.title ?? a.theme), theme: String(a.theme), count: a.count ? Number(a.count) : 8, difficulty: (a.difficulty as any) ?? "mixed" }] };
  } else {
    console.error("need --spec <file> or --theme <slug>");
    process.exit(1);
  }

  const used = publishedTexts();
  console.log(`dedup ledger: ${used.size} questions already published`);

  const quizNumber = spec.quiz_number ?? nextQuizNumber();
  const today = new Date().toISOString().slice(0, 10);
  const rounds: Round[] = [];
  for (let i = 0; i < spec.rounds.length; i++) {
    const { round, picked } = await buildRound(spec.rounds[i], used, i + 1);
    rounds.push(round);
    const short = picked.length < (spec.rounds[i].count ?? 8) ? "  (!) under target" : "";
    console.log(`round ${i + 1} "${round.title}" [${spec.rounds[i].theme}] -> ${round.questions.length} questions${short}`);
  }

  const quiz: Quiz = {
    quiz_number: quizNumber,
    date: spec.date ?? today,
    rounds,
    mini_games: [],
    tie_breaker_question: spec.tie_breaker?.question ?? "",
    tie_breaker_answer: spec.tie_breaker?.answer ?? "",
  };

  const errs = validate(quiz);
  if (errs.length) {
    console.error(`\nSCHEMA INVALID:\n  ${errs.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\nschema OK: quiz #${quizNumber}, ${rounds.length} rounds, ${rounds.reduce((s, r) => s + r.questions.length, 0)} questions, 0 published-dups`);

  // preview the first question of each round so accuracy is eyeballable
  console.log("\npreview:");
  for (const r of rounds) {
    const q = r.questions[0];
    if (q) console.log(`  [${r.title}] ${q.text.slice(0, 70)}  ->  ${q.answer.slice(0, 40)}`);
  }

  if (dry) {
    console.log("\n--dry: nothing written. Drop --dry to emit quiz_<N>.json.");
    return;
  }

  const body = JSON.stringify(quiz, null, 2);
  for (const dir of [DATA_WEB, DATA_SRC]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `quiz_${quizNumber}.json`), body);
  }
  console.log(`\nwrote quiz_${quizNumber}.json to web/public/data + data/`);
  console.log(`host locally:  cd web && bun run dev   ->  http://localhost:3000/present/${quizNumber}`);
  console.log(`publish prod:  curl -X POST https://trivia.pyaarproject.org/api/quiz -H 'content-type: application/json' -H "x-admin-pin: $ADMIN_PIN" --data @data/quiz_${quizNumber}.json`);
}

await main();
