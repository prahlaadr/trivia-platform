/**
 * Smoke-test pattern rounds (string / keyword / rhyme) through the same engine
 * the API uses, plus a before/after peek at the re-ranked topic pull.
 *   bun run scripts/test_patterns.ts
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
process.chdir(WEB);
const { pickQuestions, countPattern } = await import("../web/src/lib/bank/queries.ts");
import type { PatternSpec } from "../web/src/lib/bank/types.ts";

const specs: PatternSpec[] = [
  { kind: "string", value: "mad" },
  { kind: "keyword", value: "king" },
  { kind: "rhyme", value: "rain" },
  { kind: "rhyme", value: "zzzznotaword" }, // should resolve to 0
];

for (const spec of specs) {
  const count = await countPattern(spec);
  const qs = await pickQuestions({ count: 8, pattern: spec, excludeSources: ["dirty-south"] });
  console.log(`\n=== ${spec.kind} "${spec.value}"  (count=${count}, pulled=${qs.length}) ===`);
  for (const q of qs) console.log(`  [${q.source}] ${q.text.slice(0, 64)}  ->  ${q.answer}`);
}

console.log("\n=== re-rank check: technology-ish category, top pulls ===");
const tech = await pickQuestions({ categorySlug: "science-nature", count: 8, excludeSources: [] });
for (const q of tech) console.log(`  [${q.source} len=${q.text.length}] ${q.text.slice(0, 70)}`);
