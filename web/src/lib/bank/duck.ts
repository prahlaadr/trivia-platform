/**
 * Bank loader — reads a pre-exported JSON snapshot of the trivia bank.
 *
 * Why JSON not DuckDB at runtime: DuckDB's native binding requires
 * libduckdb.so which isn't present in Vercel's serverless runtime.
 * The bank is small enough (~7.6MB JSON, 18.6K questions) to load
 * once per Lambda cold start and filter in JS.
 *
 * Local ingest scripts still use Python DuckDB to edit the bank;
 * scripts/ingest/export_json.py dumps to web/.bank/bank.json after
 * every change.
 */

import fs from "node:fs";
import path from "node:path";
import type { BankCategory, BankSubcategory, BankQuestion } from "./types";

interface BankSnapshot {
  categories: BankCategory[];
  subcategories: BankSubcategory[];
  questions: BankQuestion[];
}

let _bank: BankSnapshot | null = null;

export function getBank(): BankSnapshot {
  if (_bank) return _bank;
  const p = path.join(process.cwd(), ".bank", "bank.json");
  const raw = fs.readFileSync(p, "utf-8");
  _bank = JSON.parse(raw) as BankSnapshot;
  return _bank;
}
