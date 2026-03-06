/**
 * Scoring module — session management and localStorage persistence.
 */

export interface Team {
  name: string;
  scores: (number | null)[]; // one entry per round
}

export interface GameSession {
  id: string;
  name: string;
  date: string;
  roundCount: number;
  teams: Team[];
  createdAt: string;
}

const SESSIONS_KEY = "trivia-sessions";

function getSessionKey(id: string) {
  return `trivia-session-${id}`;
}

/** List all session metadata (id, name, date). */
export function listSessions(): Pick<GameSession, "id" | "name" | "date" | "createdAt">[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Get a full session by ID. */
export function getSession(id: string): GameSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(getSessionKey(id));
  return raw ? JSON.parse(raw) : null;
}

/** Create a new session and return it. */
export function createSession(name: string, date: string, roundCount: number): GameSession {
  const id = crypto.randomUUID().slice(0, 8);
  const session: GameSession = {
    id,
    name,
    date,
    roundCount,
    teams: [],
    createdAt: new Date().toISOString(),
  };

  // Save session data
  localStorage.setItem(getSessionKey(id), JSON.stringify(session));

  // Add to index
  const sessions = listSessions();
  sessions.unshift({ id, name, date, createdAt: session.createdAt });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

  return session;
}

/** Save a session (after edits). */
export function saveSession(session: GameSession) {
  localStorage.setItem(getSessionKey(session.id), JSON.stringify(session));
}

/** Delete a session. */
export function deleteSession(id: string) {
  localStorage.removeItem(getSessionKey(id));
  const sessions = listSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/** Get the most recently created session (for presenter leaderboard). */
export function getLatestSession(): GameSession | null {
  const sessions = listSessions();
  if (sessions.length === 0) return null;
  return getSession(sessions[0].id);
}

/** Calculate total score for a team. */
export function teamTotal(team: Team): number {
  return team.scores.reduce((sum: number, s) => sum + (s ?? 0), 0);
}

/** Export session as CSV string. */
export function sessionToCSV(session: GameSession): string {
  const headers = [
    "Team Name",
    ...Array.from({ length: session.roundCount }, (_, i) => `Round ${i + 1}`),
    "Total",
  ];

  const rows = session.teams.map((team) => [
    team.name,
    ...team.scores.map((s) => (s ?? "").toString()),
    teamTotal(team).toString(),
  ]);

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}
