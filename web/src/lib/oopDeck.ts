"use client";

import {
  DEFAULT_SECTIONS,
  DECK_TITLE,
  type DeckSection,
  type DeckQuestion,
} from "@/app/out-of-pocket/deck";

/**
 * Client-side helpers for loading, saving, and editing the Out of Pocket deck.
 * Talks to /api/oop-deck (deck JSON) and /api/oop-image (uploads). Admin PIN is
 * shared with the rest of the platform via the `trivia-admin-pin` localStorage
 * key and the `x-admin-pin` header.
 */

export interface DeckPayload {
  version: number;
  title: string;
  sections: DeckSection[];
}

// ── Admin PIN (mirrors QuizList) ────────────────────────────────────

export function getAdminPin(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("trivia-admin-pin") || "";
}

function setAdminPin(pin: string) {
  localStorage.setItem("trivia-admin-pin", pin);
}

/** Returns a PIN (prompting once if needed), or null if the user cancels. */
export function ensurePin(): string | null {
  let pin = getAdminPin();
  if (!pin) {
    pin = (typeof window !== "undefined" && prompt("Enter admin PIN to continue:")) || "";
    if (!pin) return null;
    setAdminPin(pin);
  }
  return pin;
}

// ── Deck load / save / reset ────────────────────────────────────────

export async function loadDeck(): Promise<DeckPayload> {
  try {
    const res = await fetch("/api/oop-deck", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as DeckPayload;
      if (Array.isArray(data?.sections)) return data;
    }
  } catch {
    // fall through to baked-in default
  }
  return { version: 1, title: DECK_TITLE, sections: DEFAULT_SECTIONS };
}

/** Save the deck. Returns {ok} or {ok:false, error}. */
export async function saveDeck(
  payload: DeckPayload
): Promise<{ ok: boolean; error?: string }> {
  const pin = ensurePin();
  if (pin === null) return { ok: false, error: "Cancelled" };

  const res = await fetch("/api/oop-deck", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-pin": pin },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error || `Save failed (${res.status})` };
}

/** Reset to the baked-in deck. Returns {ok} or {ok:false, error}. */
export async function resetDeck(): Promise<{ ok: boolean; error?: string }> {
  const pin = ensurePin();
  if (pin === null) return { ok: false, error: "Cancelled" };

  const res = await fetch("/api/oop-deck", {
    method: "DELETE",
    headers: { "x-admin-pin": pin },
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error || `Reset failed (${res.status})` };
}

/** Upload an image, returning its URL. */
export async function uploadImage(
  file: File
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const pin = ensurePin();
  if (pin === null) return { ok: false, error: "Cancelled" };

  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/oop-image", {
    method: "POST",
    headers: { "x-admin-pin": pin },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.url) return { ok: true, url: data.url };
  return { ok: false, error: data.error || `Upload failed (${res.status})` };
}

// ── Factories ───────────────────────────────────────────────────────

/** Next free question number within a section (1-based, sequential). */
export function nextQuestionNumber(section: DeckSection): number {
  return section.questions.reduce((max, q) => Math.max(max, q.number), 0) + 1;
}

export function newQuestion(number: number): DeckQuestion {
  return { number, text: "", points: 1, answer: "" };
}

export function newSection(number: number): DeckSection {
  return { number, title: "New round", subtitle: "", questions: [] };
}

/** Renumber questions in a section to 1..n after add/remove/reorder. */
export function renumberQuestions(section: DeckSection): DeckSection {
  return {
    ...section,
    questions: section.questions.map((q, i) => ({ ...q, number: i + 1 })),
  };
}

/** Move an item in an array by delta (-1 up / +1 down), returning a new array. */
export function moveItem<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}
