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
import type { PatternSpec } from "./bank/types";

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
  /** when set, this is a connection round (answers share a pattern), not a topic */
  pattern?: PatternSpec;
}

/** Host-facing sentence stating the connection, stored as the round's theme. */
export function patternDescription(p: PatternSpec): string {
  if (p.kind === "string") return `Every answer contains the letters "${p.value.toUpperCase()}".`;
  if (p.kind === "rhyme") return `Every answer rhymes with "${p.value}".`;
  return `Every answer (or its question) involves "${p.value}".`;
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

/** Fetch questions for one pick — a topic round or a pattern (connection) round. */
async function pullPick(
  pick: RoundPick,
  count: number,
  difficulty: BankDifficulty
): Promise<TopicResponse> {
  const body = pick.pattern
    ? { pattern: pick.pattern, topic: pick.label, count, difficulty }
    : { topic: pick.topic, count, difficulty };
  const res = await fetch("/api/wildcard/topic", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Round "${pick.label}" failed (${res.status})`);
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
    picks.map((p) => pullPick(p, opts.perRound, opts.difficulty))
  );

  const rounds: GeneratedRound[] = results.map((res, i) => {
    // A pattern round carries the connection as its theme; a topic round keeps
    // the topic. gameGenToQuiz surfaces round.topic as the theme_description.
    const theme = picks[i].pattern ? patternDescription(picks[i].pattern!) : picks[i].topic;
    return {
      number: i + 1,
      title: picks[i].label,
      topic: theme,
      questions: (res.questions || []).map(
        (q, j): GeneratedQuestion => ({
          number: j + 1,
          text: withTrueFalsePrefix(q),
          answer: q.answer,
          topic: theme,
          source: "bank",
        })
      ),
    };
  });

  // Tiebreaker: a plain hard question from the first TOPIC pick (pattern picks
  // have no topic to draw a fair numeric tiebreaker from).
  const tbPick = picks.find((p) => !p.pattern);
  let tieBreaker: { question: string; answer: string } | undefined;
  if (opts.tiebreaker !== false && tbPick) {
    try {
      const tb = (await pullTopic(tbPick.topic, 1, "hard")).questions?.[0];
      if (tb) tieBreaker = { question: withTrueFalsePrefix(tb), answer: tb.answer };
    } catch {
      // tiebreaker is optional
    }
  }
  return { rounds, tieBreaker };
}
