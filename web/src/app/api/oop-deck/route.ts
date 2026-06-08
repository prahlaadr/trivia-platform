import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { DEFAULT_SECTIONS, DECK_TITLE, type DeckSection } from "@/app/out-of-pocket/deck";

/**
 * Storage for the editable Out of Pocket deck.
 *
 *   GET    → saved deck, or the baked-in default if nothing saved yet.
 *   PUT    → overwrite the saved deck (admin-gated).
 *   DELETE → drop the saved deck → reverts to the baked-in default.
 *
 * On Vercel: Vercel Blob (pathname `oop-deck.json`). Locally: public/data.
 */

const DATA_DIR = path.join(process.cwd(), "public", "data");
const BLOB_NAME = "oop-deck.json";
const LOCAL_PATH = path.join(DATA_DIR, BLOB_NAME);

const isVercel = !!process.env.VERCEL;
const ADMIN_PIN = process.env.ADMIN_PIN || "";

interface DeckPayload {
  version: number;
  title: string;
  sections: DeckSection[];
}

function defaultPayload(): DeckPayload {
  return { version: 1, title: DECK_TITLE, sections: DEFAULT_SECTIONS };
}

function checkAdmin(request: NextRequest): boolean {
  if (!ADMIN_PIN) return true; // no pin set = open access
  return (request.headers.get("x-admin-pin") || "") === ADMIN_PIN;
}

function isValidPayload(data: unknown): data is DeckPayload {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as DeckPayload).sections)
  );
}

export async function GET() {
  if (isVercel) {
    try {
      const { blobs } = await list({ prefix: BLOB_NAME });
      const blob = blobs.find((b) => b.pathname === BLOB_NAME);
      if (blob) {
        const res = await fetch(blob.url, { cache: "no-store" });
        const data = await res.json();
        if (isValidPayload(data)) return NextResponse.json(data);
      }
    } catch {
      // fall through to default
    }
    return NextResponse.json(defaultPayload());
  }

  try {
    if (fs.existsSync(LOCAL_PATH)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_PATH, "utf-8"));
      if (isValidPayload(data)) return NextResponse.json(data);
    }
  } catch {
    // fall through to default
  }
  return NextResponse.json(defaultPayload());
}

export async function PUT(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Body must include a `sections` array" },
      { status: 400 }
    );
  }

  const payload: DeckPayload = {
    version: 1,
    title: body.title || DECK_TITLE,
    sections: body.sections,
  };
  const json = JSON.stringify(payload, null, 2);

  if (isVercel) {
    try {
      await put(BLOB_NAME, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(LOCAL_PATH, json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
  }

  if (isVercel) {
    try {
      const { blobs } = await list({ prefix: BLOB_NAME });
      const blob = blobs.find((b) => b.pathname === BLOB_NAME);
      if (blob) await del(blob.url);
    } catch {
      // already gone is fine
    }
  } else {
    try {
      if (fs.existsSync(LOCAL_PATH)) fs.unlinkSync(LOCAL_PATH);
    } catch {
      // already gone is fine
    }
  }

  return NextResponse.json({ success: true, reset: true });
}
