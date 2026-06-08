import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

/**
 * Image upload for the Out of Pocket deck editor.
 *
 *   POST (multipart/form-data, field `file`) → { url }
 *
 * On Vercel: stored in Vercel Blob under `oop/uploads/`. Locally: written
 * to public/oop/uploads/ and served from `/oop/uploads/<name>`.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "oop", "uploads");
const ALLOWED = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const isVercel = !!process.env.VERCEL;
const ADMIN_PIN = process.env.ADMIN_PIN || "";

function checkAdmin(request: NextRequest): boolean {
  if (!ADMIN_PIN) return true;
  return (request.headers.get("x-admin-pin") || "") === ADMIN_PIN;
}

function safeName(name: string): string {
  const ext = "." + (name.split(".").pop()?.toLowerCase() || "png");
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  return `${base}-${Date.now()}${ext}`;
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported type. Allowed: ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = safeName(file.name);

  try {
    if (isVercel) {
      const blob = await put(`oop/uploads/${name}`, buffer, {
        access: "public",
        contentType: file.type || undefined,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return NextResponse.json({ url: blob.url });
    } else {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
      return NextResponse.json({ url: `/oop/uploads/${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
