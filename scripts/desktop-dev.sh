#!/usr/bin/env bash
set -euo pipefail

source "$HOME/.cargo/env" 2>/dev/null || true

# Resolve monorepo root from this script's location (not $0 — breaks under relative paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$ROOT/apps/desktop"
PORT="${STORYLOOM_API_PORT:-3847}"

api_healthy() {
  curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1
}

port_in_use() {
  ss -ltn 2>/dev/null | grep -q ":${PORT} " || \
    lsof -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1
}

API_PID=""
cleanup() {
  if [[ -n "${API_PID}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$ROOT"

if api_healthy; then
  echo "StoryLoom API already running on http://127.0.0.1:${PORT}"
elif port_in_use; then
  echo "Port ${PORT} is in use but StoryLoom API is not responding."
  echo "Stop the other process (e.g. kill \$(lsof -t -iTCP:${PORT} -sTCP:LISTEN)) or set STORYLOOM_API_PORT."
  exit 1
else
  echo "Starting StoryLoom API on http://127.0.0.1:${PORT} ..."
  pnpm --filter @storyloom/desktop-api dev &
  API_PID=$!

  for _ in $(seq 1 50); do
    if api_healthy; then
      break
    fi
    sleep 0.2
  done

  if ! api_healthy; then
    echo "StoryLoom API failed to start on port ${PORT}."
    exit 1
  fi
fi

cd "$DESKTOP_DIR"
exec pnpm exec vite
