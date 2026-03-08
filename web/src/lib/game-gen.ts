/**
 * Game Gen module — session management and topic aggregation.
 * Persisted in localStorage like the scorekeeper.
 */

import type { GameGenSession, GameGenTeam, GeneratedRound, Quiz, SavedGameGen } from "./types";

const SESSION_KEY = "trivia-gamegen-session";
const SAVED_GAMES_KEY = "trivia-gamegen-saved";

export function getGameGenSession(): GameGenSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveGameGenSession(session: GameGenSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function createGameGenSession(): GameGenSession {
  const session: GameGenSession = {
    id: crypto.randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    status: "registering",
    teams: [],
    rounds: [],
  };
  saveGameGenSession(session);
  return session;
}

export function clearGameGenSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function addTeam(session: GameGenSession, name: string, topics: string[]): GameGenSession {
  const team: GameGenTeam = {
    id: crypto.randomUUID().slice(0, 8),
    name,
    topics: topics.slice(0, 5),
  };
  session.teams.push(team);
  saveGameGenSession(session);
  return session;
}

export function removeTeam(session: GameGenSession, teamId: string): GameGenSession {
  session.teams = session.teams.filter((t) => t.id !== teamId);
  saveGameGenSession(session);
  return session;
}

/**
 * Aggregate all team topic picks into a deduplicated, ranked list.
 * Topics picked by more teams appear first.
 */
export function aggregateTopics(teams: GameGenTeam[]): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const team of teams) {
    for (const topic of team.topics) {
      const normalized = topic.trim().toLowerCase();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate round assignments from aggregated topics.
 * Each round gets a topic. Aim for 4-6 rounds depending on team count.
 */
export function buildRoundTopics(teams: GameGenTeam[]): string[] {
  const ranked = aggregateTopics(teams);
  // Always 6 rounds. If fewer than 6 unique topics, pad with "Random".
  const topics = ranked.slice(0, 6).map((r) => r.topic);
  while (topics.length < 6) topics.push("random");
  return topics;
}

// ── Saved Games ──

export function getSavedGames(): SavedGameGen[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SAVED_GAMES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveGame(game: SavedGameGen) {
  const games = getSavedGames();
  // Don't duplicate
  if (games.some((g) => g.sessionId === game.sessionId)) return;
  games.unshift(game);
  localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
}

export function deleteSavedGame(sessionId: string) {
  const games = getSavedGames().filter((g) => g.sessionId !== sessionId);
  localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
}

/**
 * Convert a GameGenSession's rounds into a Quiz object
 * compatible with the existing Presenter.
 */
export function gameGenToQuiz(session: GameGenSession): Quiz {
  return {
    quiz_number: 0,
    date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    rounds: session.rounds.map((r) => ({
      number: r.number,
      title: r.title,
      round_type: "standard" as const,
      points_per_question: 1,
      joker_eligible: true,
      theme_description: r.topic,
      questions: r.questions.map((q) => ({
        number: q.number,
        text: q.text,
        answer: q.answer,
        choices: [],
        is_internet_only: false,
      })),
      clues: [],
      progressive_answer: "",
    })),
    mini_games: [],
    tie_breaker_question: session.tieBreaker?.question || "",
    tie_breaker_answer: session.tieBreaker?.answer || "",
  };
}
