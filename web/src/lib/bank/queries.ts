import { getBank } from "./duck";
import type {
  BankCategory,
  BankSubcategory,
  BankQuestion,
  DifficultyFilter,
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

export async function pickQuestions(opts: PickOptions): Promise<BankQuestion[]> {
  const all = getBank().questions;
  const excluded = new Set(opts.excludeIds ?? []);
  const fuzzyLower = opts.fuzzyTopic?.toLowerCase();

  const excludedSources = new Set(opts.excludeSources ?? []);
  const candidates = all.filter((q) => {
    if (excluded.has(q.id)) return false;
    if (excludedSources.has(q.source)) return false;
    if (!opts.allowTimeSensitive && (q as BankQuestion & { timeSensitive?: boolean }).timeSensitive) return false;
    if (opts.categorySlug && q.categorySlug !== opts.categorySlug) return false;
    if (opts.subcategorySlug && q.subcategorySlug !== opts.subcategorySlug) return false;
    if (opts.difficulty && opts.difficulty !== "mixed" && q.difficulty !== opts.difficulty) return false;
    if (fuzzyLower) {
      const hay = (q.text + " " + q.answer).toLowerCase();
      if (!wordHit(hay, fuzzyLower)) return false;
    }
    return true;
  });

  // Rank by: quality + length-bonus (pub-quiz-style questions float up) + jitter.
  // Length tiers: ≥150 chars +0.20, ≥80 chars +0.10, <80 chars 0.
  // Jitter is wide enough (0.05) that within a tier we still get variety
  // run-to-run, but tight enough not to drown out the length signal.
  const ranked = candidates
    .map((q) => {
      const len = q.text.length;
      const lengthBonus = len >= 150 ? 0.2 : len >= 80 ? 0.1 : 0;
      return { q, key: q.qualityScore + lengthBonus + Math.random() * 0.05 };
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

  // Topic IS a category slug or name — return the whole category.
  for (const c of cats) {
    if (c.slug.toLowerCase() === t || c.name.toLowerCase() === t) {
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
    if (s.slug.toLowerCase() === t || s.name.toLowerCase() === t) {
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
