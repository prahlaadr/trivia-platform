import { getBank, getRhymeSeeds } from "./duck";
import type {
  BankCategory,
  BankSubcategory,
  BankQuestion,
  DifficultyFilter,
  PatternSpec,
} from "./types";

export async function listCategories(): Promise<BankCategory[]> {
  return [...getBank().categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listSubcategories(
  categorySlug?: string
): Promise<BankSubcategory[]> {
  const all = getBank().subcategories;
  if (!categorySlug) return all;
  return all.filter((s) => s.categorySlug === categorySlug);
}

export interface PickOptions {
  categorySlug?: string;
  subcategorySlug?: string;
  difficulty?: DifficultyFilter;
  count: number;
  excludeIds?: string[];
  excludeSources?: string[];   // e.g. ['dirty-south'] for random Wildcard,
                               // because those Qs depend on round context
  allowTimeSensitive?: boolean;
  fuzzyTopic?: string;
  /** Connection-round filter: keep only answers that share a letter-string /
   *  keyword / rhyme. Reuses every other filter above. */
  pattern?: PatternSpec;
}

// Hand-written pub-quiz sources read far better than the short open-API banks,
// so we float them up. (nyc-league is ingested separately; harmless until then.)
const HANDWRITTEN = new Set(["dirty-south", "nyc-league"]);

// A question that is mostly Title-Cased ("What Communication Aid Was Invented
// In 1905...") is a formatting tell of the terse API banks; demote it so the
// longer, sentence-cased, hand-written questions surface first.
function looksTitleCased(text: string): boolean {
  const alpha = text.split(/\s+/).filter((w) => /[a-z]/i.test(w) && w.length > 1);
  if (alpha.length < 4) return false;
  const caps = alpha.filter((w) => /^[A-Z]/.test(w)).length;
  return caps / alpha.length >= 0.65;
}

// A few hand-written pub-quiz questions reference OTHER questions in their round
// ("what do all the previous nine answers have in common?") and are unanswerable
// shown alone. Boosting hand-written sources would surface these, so drop them.
// Precise on purpose: cryptic self-descriptions ("This procedure is performed by
// a coroner..." -> Autopsy) are standalone and must NOT be caught.
const CONTEXT_DEPENDENT =
  /\b(previous|other|above|remaining|preceding|aforementioned)\s+(answers?|questions?|clues?)\b|\ball (nine|eight|ten|seven|six|five|four|three|\d+) answers?\b|\beach of (these|the) (answers?|clues?|questions?)\b/i;
function isContextDependent(text: string): boolean {
  return CONTEXT_DEPENDENT.test(text);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Whole-word match so a topic doesn't match a longer word ("office" must not
// hit "officer", "star" must not hit "starch").
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function wordHit(hay: string, term: string): boolean {
  return new RegExp(`\\b${escRe(term)}\\b`, "i").test(hay);
}

// ── Pattern (connection) rounds ──────────────────────────────────────────────
// Patterns read best on short, clean answers; mirror theme_round.py's gate:
// drop binary/numeric answers and anything over three words.
const lettersOnly = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const BINARY_ANS = new Set(["true", "false", "yes", "no", "none", "all of the above"]);

function cleanPatternAnswer(a: string): boolean {
  const t = a.trim();
  if (!t || !/^[\x20-\x7e]+$/.test(t)) return false;        // printable ASCII only
  if (t.split(/\s+/).length > 3) return false;              // short answers only
  if (BINARY_ANS.has(t.toLowerCase())) return false;
  if (/^[\d.,$%\s]+$/.test(t)) return false;                // no pure numbers
  return true;
}

// Rhyme can't be computed in JS at runtime (no phonetics). A user-typed seed is
// resolved to a CMU rhyming part two ways: the precomputed rhyme-seeds map
// (35k common words), then as a fallback any single-word answer in the bank.
let rhymeAnswerIndex: Map<string, string> | null = null;
function seedRhymeKey(value: string): string | null {
  const v = value.trim().toLowerCase();
  const fromSeeds = getRhymeSeeds()[v];
  if (fromSeeds) return fromSeeds;
  if (!rhymeAnswerIndex) {
    rhymeAnswerIndex = new Map();
    for (const q of getBank().questions) {
      if (q.rhymeKey && q.answer && !q.answer.includes(" ")) {
        const w = q.answer.toLowerCase();
        if (!rhymeAnswerIndex.has(w)) rhymeAnswerIndex.set(w, q.rhymeKey);
      }
    }
  }
  return rhymeAnswerIndex.get(v) ?? null;
}

function matchesPattern(q: BankQuestion, spec: PatternSpec, rhymeTarget: string | null): boolean {
  if (!cleanPatternAnswer(q.answer)) return false;
  const v = spec.value.trim().toLowerCase();
  if (spec.kind === "string") {
    const la = lettersOnly(q.answer);
    const vv = lettersOnly(v);
    return vv.length >= 2 && la.includes(vv) && la !== vv;
  }
  if (spec.kind === "keyword") {
    return wordHit(q.text, v) || wordHit(q.answer, v);
  }
  // rhyme: single-word answers only, matched on precomputed rhymeKey
  if (q.answer.includes(" ")) return false;
  return q.rhymeKey != null && rhymeTarget != null && q.rhymeKey === rhymeTarget;
}

/** Distinct-answer count for a pattern, so the UI can warn before an empty round. */
export async function countPattern(
  spec: PatternSpec,
  excludeSources: string[] = ["dirty-south"]
): Promise<number> {
  const target = spec.kind === "rhyme" ? seedRhymeKey(spec.value) : null;
  if (spec.kind === "rhyme" && !target) return 0;
  const excl = new Set(excludeSources);
  const seen = new Set<string>();
  for (const q of getBank().questions) {
    if (excl.has(q.source)) continue;
    if (matchesPattern(q, spec, target)) seen.add(q.answer.toLowerCase());
  }
  return seen.size;
}

export async function pickQuestions(opts: PickOptions): Promise<BankQuestion[]> {
  const all = getBank().questions;
  const excluded = new Set(opts.excludeIds ?? []);
  const fuzzyLower = opts.fuzzyTopic?.toLowerCase();

  const pattern = opts.pattern;
  const rhymeTarget = pattern?.kind === "rhyme" ? seedRhymeKey(pattern.value) : null;
  // An unresolvable rhyme seed can't match anything; bail early.
  if (pattern?.kind === "rhyme" && !rhymeTarget) return [];

  const excludedSources = new Set(opts.excludeSources ?? []);
  const candidates = all.filter((q) => {
    if (excluded.has(q.id)) return false;
    if (excludedSources.has(q.source)) return false;
    if (isContextDependent(q.text)) return false; // references other round items
    if (!opts.allowTimeSensitive && (q as BankQuestion & { timeSensitive?: boolean }).timeSensitive) return false;
    if (opts.categorySlug && q.categorySlug !== opts.categorySlug) return false;
    if (opts.subcategorySlug && q.subcategorySlug !== opts.subcategorySlug) return false;
    if (opts.difficulty && opts.difficulty !== "mixed" && q.difficulty !== opts.difficulty) return false;
    if (fuzzyLower) {
      const hay = (q.text + " " + q.answer).toLowerCase();
      if (!wordHit(hay, fuzzyLower)) return false;
    }
    if (pattern && !matchesPattern(q, pattern, rhymeTarget)) return false;
    return true;
  });

  // A connection round shouldn't repeat an answer (two "Madison" questions read
  // as a mistake), so collapse to one question per distinct answer.
  let pool = candidates;
  if (pattern) {
    const byAnswer = new Map<string, BankQuestion>();
    for (const q of candidates) {
      const k = q.answer.toLowerCase();
      if (!byAnswer.has(k)) byAnswer.set(k, q);
    }
    pool = [...byAnswer.values()];
  }

  // A keyword round reads best when the shared word is in the ANSWER, not just
  // the clue, so float answer-hits up (matchesPattern still allows clue-only
  // hits to fill the round if needed).
  const kwInAnswer = pattern?.kind === "keyword" ? pattern.value.trim().toLowerCase() : null;

  // Rank toward the better prose: base quality + a continuous length score
  // (longer, pub-quiz-style questions float up) + a hand-written-source bonus,
  // minus a penalty for Title-Cased API formatting, plus jitter for variety.
  const ranked = pool
    .map((q) => {
      const lengthScore = Math.min(0.35, q.text.length / 400); // 140 chars -> cap
      const sourceBonus = HANDWRITTEN.has(q.source) ? 0.2 : 0;
      const titlePenalty = looksTitleCased(q.text) ? 0.2 : 0;
      const keywordBonus = kwInAnswer && wordHit(q.answer, kwInAnswer) ? 0.4 : 0;
      const key =
        q.qualityScore + lengthScore + sourceBonus - titlePenalty + keywordBonus + Math.random() * 0.05;
      return { q, key };
    })
    .sort((a, b) => b.key - a.key)
    .map(({ q }) => q);

  // Take top quality, then shuffle within the top slice for picking
  const top = ranked.slice(0, Math.max(opts.count * 3, opts.count));
  return shuffle(top).slice(0, Math.max(1, Math.min(50, opts.count)));
}

// Generic words a crowd tacks onto a real topic ("Marvel movies", "Beyonce
// songs", "the Simpsons"). Stripping them leaves the distinctive term to match
// on, since bank questions say "Marvel", not "Marvel movies".
const TOPIC_FILLER = new Set([
  "movies", "movie", "film", "films", "cinema", "songs", "song", "music",
  "album", "albums", "tv", "television", "show", "shows", "series", "episode",
  "episodes", "trivia", "question", "questions", "stuff", "things", "thing",
  "the", "a", "an", "about", "my", "our", "your", "kid", "kids", "watches",
  "watching", "related", "general", "and", "of",
]);

/** Distinctive core of a topic, or the original if nothing meaningful remains. */
export function salientTopic(topic: string): string {
  const kept = topic
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length >= 2 && !TOPIC_FILLER.has(w));
  const joined = kept.join(" ").trim();
  return joined.length >= 2 ? joined : topic.trim();
}

export async function resolveTopic(topic: string): Promise<{
  categorySlug: string | null;
  subcategorySlug: string | null;
  matched: "exact-slug" | "fuzzy" | "unknown";
  /** True when the typed topic IS a category slug/name (so we should
   *  pull the WHOLE category, not filter by topic text). */
  topicIsCategory?: boolean;
}> {
  const t = topic.trim().toLowerCase();
  if (!t) return { categorySlug: null, subcategorySlug: null, matched: "unknown" };

  const cats = getBank().categories;
  const subs = getBank().subcategories;

  // Normalize away spaces, hyphens, and punctuation so a category's display
  // name ("Science & Nature"), its salient form ("science nature"), and its
  // slug ("science-nature") all match. Without this, display-name topics with
  // an "&" resolve to nothing and the round comes back empty.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const nt = norm(t);

  // Topic IS a category slug or name: return the whole category.
  for (const c of cats) {
    if (norm(c.slug) === nt || norm(c.name) === nt) {
      return {
        categorySlug: c.slug,
        subcategorySlug: null,
        matched: "exact-slug",
        topicIsCategory: true,
      };
    }
  }

  // Exact subcategory slug or name match
  for (const s of subs) {
    if (norm(s.slug) === nt || norm(s.name) === nt) {
      return { categorySlug: s.categorySlug, subcategorySlug: s.slug, matched: "exact-slug" };
    }
  }

  // Token-overlap against subcategory slug + name
  const tokens = t.split(/[\s,_\-]+/).filter((x) => x.length >= 3);
  if (tokens.length) {
    let best: { sub: BankSubcategory; score: number } | null = null;
    for (const s of subs) {
      const hay = (s.slug + " " + s.name).toLowerCase();
      const score = tokens.reduce((n, tok) => (hay.includes(tok) ? n + 1 : n), 0);
      if (score > 0 && (!best || score > best.score || (score === best.score && !s.isCatchall && best.sub.isCatchall))) {
        best = { sub: s, score };
      }
    }
    // Only trust a name-token match when it's strong: a multi-word topic must
    // hit >=2 tokens, else a single common word ("wars" in "star wars") maps to
    // an unrelated subcategory (world-wars-cold-war). Weak matches fall through
    // to the content-based fuzzy match below, which is actually on-topic.
    if (best && (best.score >= 2 || tokens.length === 1)) {
      return {
        categorySlug: best.sub.categorySlug,
        subcategorySlug: best.sub.slug,
        matched: "exact-slug",
      };
    }
  }

  // Fuzzy: find the subcategory with the most LIKE matches in question/answer
  const questions = getBank().questions;
  const counts = new Map<string, { cat: string; sub: string; n: number }>();
  for (const q of questions) {
    const hay = (q.text + " " + q.answer).toLowerCase();
    if (wordHit(hay, t)) {
      const key = q.categorySlug + "/" + q.subcategorySlug;
      const cur = counts.get(key);
      if (cur) cur.n++;
      else counts.set(key, { cat: q.categorySlug, sub: q.subcategorySlug, n: 1 });
    }
  }
  if (counts.size > 0) {
    const top = Array.from(counts.values()).sort((a, b) => b.n - a.n)[0];
    return { categorySlug: top.cat, subcategorySlug: top.sub, matched: "fuzzy" };
  }

  return { categorySlug: null, subcategorySlug: null, matched: "unknown" };
}
