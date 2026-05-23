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

export async function pickQuestions(opts: PickOptions): Promise<BankQuestion[]> {
  const all = getBank().questions;
  const excluded = new Set(opts.excludeIds ?? []);
  const fuzzyLower = opts.fuzzyTopic?.toLowerCase();

  const candidates = all.filter((q) => {
    if (excluded.has(q.id)) return false;
    if (!opts.allowTimeSensitive && (q as BankQuestion & { timeSensitive?: boolean }).timeSensitive) return false;
    if (opts.categorySlug && q.categorySlug !== opts.categorySlug) return false;
    if (opts.subcategorySlug && q.subcategorySlug !== opts.subcategorySlug) return false;
    if (opts.difficulty && opts.difficulty !== "mixed" && q.difficulty !== opts.difficulty) return false;
    if (fuzzyLower) {
      const hay = (q.text + " " + q.answer).toLowerCase();
      if (!hay.includes(fuzzyLower)) return false;
    }
    return true;
  });

  // Sort by quality desc, then random within ties
  const ranked = candidates
    .map((q) => ({ q, key: q.qualityScore + Math.random() * 0.001 }))
    .sort((a, b) => b.key - a.key)
    .map(({ q }) => q);

  // Take top quality but with some randomness — pick from top 2*count
  const top = ranked.slice(0, Math.max(opts.count * 2, opts.count));
  return shuffle(top).slice(0, Math.max(1, Math.min(50, opts.count)));
}

export async function resolveTopic(topic: string): Promise<{
  categorySlug: string | null;
  subcategorySlug: string | null;
  matched: "exact-slug" | "fuzzy" | "unknown";
}> {
  const t = topic.trim().toLowerCase();
  if (!t) return { categorySlug: null, subcategorySlug: null, matched: "unknown" };

  const subs = getBank().subcategories;

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
    if (best) {
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
    if (hay.includes(t)) {
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
