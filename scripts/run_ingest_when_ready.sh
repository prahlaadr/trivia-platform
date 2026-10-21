#!/bin/bash
# Auto-run the full TriviaQA ingest ONCE the Gemini paid-tier rate limit has
# propagated. Scheduled via launchd (com.pyaar.trivia-ingest-ready) every ~2h.
#
# Each run: calibrate the request rate with 25 preview requests (no writes). If
# they finish fast (paid tier is live), run the full ingest in resumable 20K
# chunks until the corpus is in, then export + snapshot locally. Otherwise log
# "still throttled" and exit so the next scheduled run retries. Self-skips once
# a done-marker exists. Does NOT git-commit or deploy; that stays a human step.
set -uo pipefail

REPO="/Users/prahlaad/Projects/01-web-apps/trivia-platform"
UV="/Users/prahlaad/.local/bin/uv"
DEPS="--with model2vec --with numpy --with duckdb --with polars --with httpx"
LOG="$REPO/logs/p3-ingest.log"
DONE="$REPO/.p3-ingest-done"
LOCK="$REPO/.p3-ingest-lock"
READY_SECS=90   # 25 requests under this = paid tier live; the throttled rate takes ~250s+

cd "$REPO" || exit 1
mkdir -p "$REPO/logs"
ts() { date "+%Y-%m-%d %H:%M:%S"; }

[ -f "$DONE" ] && exit 0
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  echo "$(ts) previous run still active; skipping" >> "$LOG"; exit 0
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

# --- calibrate: 25 requests (preview, no writes); burst clears, sustained rate shows ---
start=$(date +%s)
$UV run $DEPS python -m scripts.ingest.tag_questions_gemini --limit 500 --batch 20 --sleep 0 >/dev/null 2>&1
elapsed=$(( $(date +%s) - start ))
echo "$(ts) calibration: 25 requests in ${elapsed}s (ready threshold ${READY_SECS}s)" >> "$LOG"
if [ "$elapsed" -gt "$READY_SECS" ]; then
  echo "$(ts) still throttled; will retry next schedule" >> "$LOG"; exit 0
fi

# --- paid tier is live: ingest the whole corpus in resumable 20K chunks ---
echo "$(ts) paid tier live (${elapsed}s). Running full TriviaQA ingest..." >> "$LOG"
for i in $(seq 1 10); do
  out=$($UV run $DEPS python -m scripts.ingest.ingest_triviaqa --limit 20000 2>&1)
  echo "$out" | grep -E 'candidates after|after semantic gate|inserted|nothing new' >> "$LOG"
  echo "$out" | grep -q "nothing new to ingest" && break
done
echo "$(ts) rebuilding bank.json + snapshot..." >> "$LOG"
$UV run $DEPS python -m scripts.ingest.export_json  >> "$LOG" 2>&1
$UV run $DEPS python -m scripts.ingest.snapshot      >> "$LOG" 2>&1
touch "$DONE"
echo "$(ts) P3 INGEST COMPLETE. Review + deploy (commit web/.bank/bank.json, push) to push new questions live." >> "$LOG"
