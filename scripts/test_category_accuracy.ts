/**
 * Game-gen accuracy test: for every bank category, pull questions through the
 * SAME engine Wildcard / Game Gen use (resolveTopic + pickQuestions) and print
 * them with source + resolved category, so on-category accuracy is eyeballable.
 * Read-only, no writes.
 *
 *   bun run scripts/test_category_accuracy.ts            # all 16 categories, 6 each
 *   bun run scripts/test_category_accuracy.ts music 10   # one category, N each
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
process.chdir(WEB);
const { resolveTopic, pickQuestions } = await import("../web/src/lib/bank/queries.ts");
const { getBank } = await import("../web/src/lib/bank/duck.ts");

const only = process.argv[2];
const per = Number(process.argv[3] || 6);
const cats = getBank().categories.map((c: { slug: string }) => c.slug);
const targets = only ? [only] : cats;

for (const slug of targets) {
  const resolved = await resolveTopic(slug);
  const qs = await pickQuestions({
    categorySlug: resolved.categorySlug ?? slug,
    subcategorySlug: resolved.subcategorySlug ?? undefined,
    count: per,
    difficulty: "mixed",
    excludeSources: ["dirty-south"],
  });
  // off-target = not matching whichever level was resolved (subcat if present, else cat)
  const targetKey = resolved.subcategorySlug ? "subcategorySlug" : "categorySlug";
  const off = qs.filter((q) => (q as Record<string, unknown>)[targetKey] !== slug).length;
  console.log(`\n=== ${slug}  (resolved ${resolved.categorySlug}/${resolved.subcategorySlug ?? "-"}, matched=${resolved.matched})  ${qs.length} pulled, ${off} off-target ===`);
  for (const q of qs) {
    console.log(`  [${q.source}] ${q.text.slice(0, 66)}  ->  ${String(q.answer).slice(0, 26)}`);
  }
}
