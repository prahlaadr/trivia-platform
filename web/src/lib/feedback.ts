/**
 * Host feedback on individual questions, stored in localStorage.
 *
 * The bank DB is read-only at runtime, so feedback can't persist to it.
 * We write to localStorage keyed by a stable hash of the question text +
 * answer. A future ingest pass can read this back via the admin UI or a
 * one-off script and apply quality_score adjustments to the bank.
 */

export type FeedbackVerdict =
  | "good"
  | "stale"
  | "wrong_answer"
  | "ambiguous"
  | "too_hard"
  | "too_easy";

export interface FeedbackRecord {
  verdict: FeedbackVerdict;
  ts: string;          // ISO timestamp
  questionText: string;
  answerText: string;
}

const STORAGE_KEY = "trivia-feedback-v1";

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  // Base36 + length-cap for compact key
  return (h >>> 0).toString(36);
}

export function questionKey(questionText: string, answerText: string): string {
  const norm = (s: string) =>
    (s || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return djb2(norm(questionText) + "::" + norm(answerText));
}

type Store = Record<string, FeedbackRecord[]>;

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function saveStore(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function recordFeedback(
  questionText: string,
  answerText: string,
  verdict: FeedbackVerdict
): FeedbackRecord {
  const rec: FeedbackRecord = {
    verdict,
    ts: new Date().toISOString(),
    questionText,
    answerText,
  };
  const key = questionKey(questionText, answerText);
  const store = loadStore();
  store[key] = [...(store[key] ?? []), rec];
  saveStore(store);
  return rec;
}

export function getFeedback(questionText: string, answerText: string): FeedbackRecord[] {
  const key = questionKey(questionText, answerText);
  return loadStore()[key] ?? [];
}

export function getAllFeedback(): Store {
  return loadStore();
}
