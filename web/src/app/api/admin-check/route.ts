import { NextRequest, NextResponse } from "next/server";

/**
 * Verify an admin PIN without performing any write. Used by the editor's
 * front-door gate. Real protection still lives on the write routes
 * (oop-deck PUT/DELETE, oop-image POST) — this just controls the UI.
 *
 *   POST  (header x-admin-pin)  → { ok: true } on match, 403 otherwise.
 *
 * If ADMIN_PIN is unset (e.g. local dev), access is open.
 */

const ADMIN_PIN = process.env.ADMIN_PIN || "";

export async function POST(request: NextRequest) {
  if (!ADMIN_PIN) return NextResponse.json({ ok: true, open: true });
  const pin = request.headers.get("x-admin-pin") || "";
  if (pin === ADMIN_PIN) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: 403 });
}
