#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stopping dev servers on ports 3000 and 3001 (if running)..."
for port in 3000 3001; do
  if pids="$(lsof -ti:"$port" 2>/dev/null || true)"; then
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  fi
done

pkill -f "next dev" 2>/dev/null || true
sleep 0.5

echo "Removing .next and .next-dev..."
for dir in "$ROOT/.next" "$ROOT/.next-dev"; do
  if ! rm -rf "$dir"; then
    sleep 1
    rm -rf "$dir"
  fi
done

echo "Removing node_modules/.cache..."
rm -rf "$ROOT/node_modules/.cache"

rm -f "$ROOT/.next-dev.lock"

echo "Clean complete."
