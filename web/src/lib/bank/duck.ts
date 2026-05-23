/**
 * DuckDB singleton — server-side only.
 *
 * The bank is read-only at runtime. The file lives at web/.bank/trivia.duckdb
 * (gitignored — populated at deploy time via prebuild step from Vercel Blob).
 *
 * Uses @duckdb/node-api (modern async API) — works cleanly with Turbopack.
 */

import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), ".bank", "trivia.duckdb");

let _connPromise: Promise<DuckDBConnection> | null = null;

async function makeConn(): Promise<DuckDBConnection> {
  // Read-only open via attach option
  const instance = await DuckDBInstance.create(DB_PATH, {
    access_mode: "READ_ONLY",
  });
  return instance.connect();
}

export function getConn(): Promise<DuckDBConnection> {
  if (!_connPromise) _connPromise = makeConn();
  return _connPromise;
}

/**
 * Run a SQL query and return rows as plain JS objects.
 * All values must be inlined into the SQL (escape with sql-escape helpers
 * in queries.ts). The DuckDB Node API supports prepared statements but the
 * query layer here uses static SQL composition.
 */
export async function query<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const conn = await getConn();
  const reader = await conn.runAndReadAll(sql);
  return reader.getRowObjects() as T[];
}
