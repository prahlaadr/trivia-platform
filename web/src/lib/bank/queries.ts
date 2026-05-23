import { query } from "./duck";
import type {
  BankCategory,
  BankSubcategory,
  BankQuestion,
  DifficultyFilter,
} from "./types";

interface DbCategoryRow {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
  count: number | bigint;
}

interface DbSubcategoryRow {
  id: number;
  category_id: number;
  cat_slug: string;
  slug: string;
  name: string;
  is_catchall: boolean;
  count: number | bigint;
}

interface DbQuestionRow {
  id: string;
  source: string;
  source_url: string | null;
  question_text: string;
  answer_text: string;
  answer_aliases: string[] | null;
  cat_slug: string;
  sub_slug: string;
  difficulty: string;
  question_type: string;
  options_json: string | null;
  quality_score: number;
}

const toNum = (v: number | bigint) =>
  typeof v === "bigint" ? Number(v) : v;

// Recursively convert any BigInts inside an object to Number so the result is JSON-safe.
function deBigInt<T>(value: T): T {
  if (typeof value === "bigint") return Number(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deBigInt(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deBigInt(v);
    }
    return out as T;
  }
  return value;
}

export async function listCategories(): Promise<BankCategory[]> {
  const rows = (await query(`
    SELECT c.id, c.slug, c.name, c.sort_order,
           COUNT(q.id) AS count
    FROM category c
    LEFT JOIN question q ON q.category_id = c.id AND q.superseded_by IS NULL
    WHERE c.active
    GROUP BY c.id, c.slug, c.name, c.sort_order
    ORDER BY c.sort_order
  `)) as DbCategoryRow[];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    sortOrder: r.sort_order,
    questionCount: toNum(r.count),
  }));
}

export async function listSubcategories(
  categorySlug?: string
): Promise<BankSubcategory[]> {
  const filter = categorySlug
    ? `AND c.slug = '${categorySlug.replace(/'/g, "''")}'`
    : "";
  const rows = (await query(`
    SELECT s.id, s.category_id, c.slug AS cat_slug,
           s.slug, s.name, s.is_catchall,
           COUNT(q.id) AS count,
           c.sort_order AS sort_order
    FROM subcategory s
    JOIN category c ON s.category_id = c.id
    LEFT JOIN question q ON q.subcategory_id = s.id AND q.superseded_by IS NULL
    WHERE s.active ${filter}
    GROUP BY s.id, s.category_id, c.slug, s.slug, s.name, s.is_catchall, c.sort_order
    ORDER BY sort_order, s.is_catchall DESC, s.slug
  `)) as DbSubcategoryRow[];
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    categorySlug: r.cat_slug,
    slug: r.slug,
    name: r.name,
    isCatchall: !!r.is_catchall,
    questionCount: toNum(r.count),
  }));
}

export interface PickOptions {
  categorySlug?: string;
  subcategorySlug?: string;
  difficulty?: DifficultyFilter;
  count: number;
  excludeIds?: string[];
  allowTimeSensitive?: boolean;
  fuzzyTopic?: string; // free-text fallback when no slug match
}

function difficultyClause(d?: DifficultyFilter): string {
  if (!d || d === "mixed") return "";
  return `AND q.difficulty = '${d}'`;
}

function excludeClause(ids?: string[]): string {
  if (!ids || ids.length === 0) return "";
  const list = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
  return `AND q.id NOT IN (${list})`;
}

export async function pickQuestions(opts: PickOptions): Promise<BankQuestion[]> {
  const where: string[] = ["q.superseded_by IS NULL"];
  if (!opts.allowTimeSensitive) where.push("q.time_sensitive = FALSE");
  if (opts.categorySlug)
    where.push(`c.slug = '${opts.categorySlug.replace(/'/g, "''")}'`);
  if (opts.subcategorySlug)
    where.push(`s.slug = '${opts.subcategorySlug.replace(/'/g, "''")}'`);

  // Fuzzy fallback: simple LIKE on question + answer text
  if (opts.fuzzyTopic && !opts.subcategorySlug) {
    const t = opts.fuzzyTopic.replace(/'/g, "''");
    where.push(
      `(LOWER(q.question_text) LIKE '%${t.toLowerCase()}%' OR LOWER(q.answer_text) LIKE '%${t.toLowerCase()}%')`
    );
  }

  const sql = `
    SELECT CAST(q.id AS VARCHAR) AS id,
           q.source, q.source_url, q.question_text, q.answer_text,
           q.answer_aliases, c.slug AS cat_slug, s.slug AS sub_slug,
           q.difficulty, q.question_type, q.options_json, q.quality_score
    FROM question q
    JOIN category c ON q.category_id = c.id
    JOIN subcategory s ON q.subcategory_id = s.id
    WHERE ${where.join(" AND ")}
      ${difficultyClause(opts.difficulty)}
      ${excludeClause(opts.excludeIds)}
    ORDER BY q.quality_score DESC, random()
    LIMIT ${Math.max(1, Math.min(50, opts.count))}
  `;

  // DuckDB LIST type comes back as { items: [...] } via the node API.
  type RawRow = Omit<DbQuestionRow, "answer_aliases"> & {
    answer_aliases: string[] | { items: string[] } | null;
  };
  const raw = deBigInt((await query(sql)) as RawRow[]);
  return raw.map((r) => {
    let choices: string[] = [];
    if (r.options_json) {
      try {
        const parsed = JSON.parse(r.options_json);
        choices = Array.isArray(parsed?.choices) ? parsed.choices : [];
      } catch {
        choices = [];
      }
    }
    let aliases: string[] = [];
    if (Array.isArray(r.answer_aliases)) aliases = r.answer_aliases;
    else if (r.answer_aliases && "items" in r.answer_aliases) aliases = r.answer_aliases.items;

    return {
      id: r.id,
      source: r.source,
      sourceUrl: r.source_url,
      text: r.question_text,
      answer: r.answer_text,
      aliases,
      categorySlug: r.cat_slug,
      subcategorySlug: r.sub_slug,
      difficulty: r.difficulty as BankQuestion["difficulty"],
      questionType: r.question_type as BankQuestion["questionType"],
      choices,
      qualityScore: r.quality_score,
    };
  });
}

/**
 * Resolve a host-typed topic to (category, subcategory, tags).
 * Order: exact subcategory slug → fuzzy LIKE topic search.
 * Returns nulls if nothing matches.
 */
export async function resolveTopic(topic: string): Promise<{
  categorySlug: string | null;
  subcategorySlug: string | null;
  matched: "exact-slug" | "fuzzy" | "unknown";
}> {
  const t = topic.trim().toLowerCase();
  if (!t) return { categorySlug: null, subcategorySlug: null, matched: "unknown" };

  // Exact subcategory slug or name match — e.g. "bollywood"
  const slugRows = (await query(
    `SELECT c.slug AS cat_slug, s.slug AS sub_slug
     FROM subcategory s JOIN category c ON s.category_id = c.id
     WHERE LOWER(s.slug) = '${t.replace(/'/g, "''")}'
        OR LOWER(s.name) = '${t.replace(/'/g, "''")}'
     LIMIT 1`
  )) as { cat_slug: string; sub_slug: string }[];

  if (slugRows.length) {
    return {
      categorySlug: slugRows[0].cat_slug,
      subcategorySlug: slugRows[0].sub_slug,
      matched: "exact-slug",
    };
  }

  // Token-overlap against subcategory slugs/names.
  // Tokenize the topic, find the subcategory that matches the most tokens.
  const tokens = t.split(/[\s,_-]+/).filter((x) => x.length >= 3);
  if (tokens.length) {
    const ors = tokens
      .map((tok) => {
        const esc = tok.replace(/'/g, "''");
        return `(LOWER(s.slug) LIKE '%${esc}%' OR LOWER(s.name) LIKE '%${esc}%')`;
      })
      .join(" OR ");
    const tokRows = (await query(
      `SELECT c.slug AS cat_slug, s.slug AS sub_slug,
              (${tokens.map((tok) => {
                const esc = tok.replace(/'/g, "''");
                return `CASE WHEN LOWER(s.slug) LIKE '%${esc}%' OR LOWER(s.name) LIKE '%${esc}%' THEN 1 ELSE 0 END`;
              }).join(" + ")}) AS matches
       FROM subcategory s JOIN category c ON s.category_id = c.id
       WHERE s.active AND (${ors})
       ORDER BY matches DESC, s.is_catchall
       LIMIT 1`
    )) as { cat_slug: string; sub_slug: string; matches: number | bigint }[];
    if (tokRows.length) {
      return {
        categorySlug: tokRows[0].cat_slug,
        subcategorySlug: tokRows[0].sub_slug,
        matched: "exact-slug",
      };
    }
  }

  // Fuzzy: find the subcategory with the most LIKE matches in question/answer
  const fuzzyRows = (await query(`
    SELECT c.slug AS cat_slug, s.slug AS sub_slug, COUNT(*) AS n
    FROM question q
    JOIN category c ON q.category_id = c.id
    JOIN subcategory s ON q.subcategory_id = s.id
    WHERE LOWER(q.question_text) LIKE '%${t.replace(/'/g, "''")}%'
       OR LOWER(q.answer_text) LIKE '%${t.replace(/'/g, "''")}%'
    GROUP BY 1, 2
    ORDER BY n DESC
    LIMIT 1
  `)) as { cat_slug: string; sub_slug: string; n: number | bigint }[];

  if (fuzzyRows.length) {
    return {
      categorySlug: fuzzyRows[0].cat_slug,
      subcategorySlug: fuzzyRows[0].sub_slug,
      matched: "fuzzy",
    };
  }

  return { categorySlug: null, subcategorySlug: null, matched: "unknown" };
}
