/**
 * Shared bank → quiz engine.
 *
 * Both Wildcard (host-driven) and Game Gen (team-driven) are thin front-ends
 * over this: pick a set of round topics, pull questions for each from the
 * bundled question bank (/api/wildcard/topic), and assemble GeneratedRounds
 * plus a hard tiebreaker. Keep all the bank-fetch/assembly logic here so the
 * two pages can't drift apart.
 */
import type { GeneratedQuestion, GeneratedRound } from "./types";

export type BankDifficulty = "mixed" | "easy" | "medium" | "hard";

export interface BankApiQuestion {
  id: string;
  text: string;
  answer: string;
  questionType?: "open_ended" | "multiple_choice" | "true_false";
}

export interface TopicResponse {
  topic: string;
  questions: BankApiQuestion[];
  resolved?: { categorySlug: string | null; subcategorySlug: string | null; matched: string };
  warnings?: string[];
}

export interface RoundPick {
  /** topic slug or free-text topic sent to the bank */
  topic: string;
  /** human-facing round title */
  label: string;
}

/**
 * A statement without a question mark reads like a fact at game time; flag
 * T/F questions so the host & audience know they're being asked to verdict.
 */
export function withTrueFalsePrefix(q: BankApiQuestion): string {
  if (q.text.startsWith("T/F:") || q.text.startsWith("True/False:")) return q.text;
  const ans = q.answer.trim().toLowerCase();
  const isTF = q.questionType === "true_false" || ans === "true" || ans === "false";
  return isTF ? `T/F: ${q.text}` : q.text;
}

export async function pullTopic(
  topic: string,
  count: number,
  difficulty: BankDifficulty
): Promise<TopicResponse> {
  const res = await fetch("/api/wildcard/topic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topic, count, difficulty }),
  });
  if (!res.ok) throw new Error(`Topic "${topic}" failed (${res.status})`);
  return res.json() as Promise<TopicResponse>;
}

/**
 * Pull questions for each pick and assemble rounds, plus an optional hard
 * tiebreaker drawn from the first pick's topic.
 */
export async function buildRounds(
  picks: RoundPick[],
  opts: { perRound: number; difficulty: BankDifficulty; tiebreaker?: boolean }
): Promise<{ rounds: GeneratedRound[]; tieBreaker?: { question: string; answer: string } }> {
  const results = await Promise.all(
    picks.map((p) => pullTopic(p.topic, opts.perRound, opts.difficulty))
  );

  const rounds: GeneratedRound[] = results.map((res, i) => ({
    number: i + 1,
    title: picks[i].label,
    topic: picks[i].topic,
    questions: (res.questions || []).map(
      (q, j): GeneratedQuestion => ({
        number: j + 1,
        text: withTrueFalsePrefix(q),
        answer: q.answer,
        topic: picks[i].topic,
        source: "bank",
      })
    ),
  }));

  let tieBreaker: { question: string; answer: string } | undefined;
  if (opts.tiebreaker !== false && picks.length) {
    try {
      const tb = (await pullTopic(picks[0].topic, 1, "hard")).questions?.[0];
      if (tb) tieBreaker = { question: withTrueFalsePrefix(tb), answer: tb.answer };
    } catch {
      // tiebreaker is optional
    }
  }
  return { rounds, tieBreaker };
}
