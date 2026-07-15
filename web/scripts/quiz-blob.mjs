#!/usr/bin/env node
// Pull / push a live quiz JSON directly to Vercel Blob (the store behind
// trivia.pyaarproject.org). Use this to hand-fix a quiz the docx parser got
// wrong without redeploying.
//
// Token: run `vercel env pull /tmp/trivia.env --environment=production` from
// the repo root first, then point QUIZ_ENV at it (defaults to /tmp/trivia.env).
// The web/.env.local token is a different/stale store and will 403.
//
// Usage (run from web/):
//   node scripts/quiz-blob.mjs pull 618            -> writes /tmp/quiz_618.json (also reachable via the public GET API)
//   node scripts/quiz-blob.mjs push /tmp/quiz_618.json
//
// Typical flow: pull -> edit the JSON (fix rounds[].questions) -> push -> reload /present/<id>.

import fs from "fs";
import { put } from "@vercel/blob";

const ENV_FILE = process.env.QUIZ_ENV || "/tmp/trivia.env";

function token() {
  const raw = fs.readFileSync(ENV_FILE, "utf8");
  const m = raw.match(/BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?/);
  if (!m) throw new Error(`No BLOB_READ_WRITE_TOKEN in ${ENV_FILE}. Run: vercel env pull ${ENV_FILE} --environment=production`);
  return m[1];
}

const [cmd, arg] = process.argv.slice(2);

if (cmd === "pull") {
  // Public read via the deployed API — no token needed.
  const res = await fetch(`https://trivia.pyaarproject.org/api/quiz?id=${arg}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET quiz ${arg} failed: ${res.status}`);
  const out = `/tmp/quiz_${arg}.json`;
  fs.writeFileSync(out, JSON.stringify(await res.json(), null, 2));
  console.log(`wrote ${out}`);
} else if (cmd === "push") {
  const content = fs.readFileSync(arg, "utf8");
  const quiz = JSON.parse(content);
  const name = `quiz_${quiz.quiz_number}.json`;
  const r = await put(name, content, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    token: token(),
  });
  console.log(`pushed ${name} -> ${r.url}`);
  console.log(`verify: https://trivia.pyaarproject.org/present/${quiz.quiz_number}`);
} else {
  console.log("usage: node scripts/quiz-blob.mjs <pull <id> | push <file>>");
  process.exit(1);
}
