#!/bin/bash
# Launch Pyaar Trivia locally — opens browser, kills server on exit
cd "$(dirname "$0")/web"

cleanup() {
  kill $SERVER_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

bun dev &
SERVER_PID=$!

# Wait for server to be ready, then open browser
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
  sleep 0.3
done
open http://localhost:3000

echo ""
echo "Pyaar Trivia running at http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

wait $SERVER_PID
