#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# `next dev` writes to .next-dev (see next.config.ts) so that a local
# `next build` (NODE_ENV=production -> .next) can never clobber the chunks
# a live dev server already has loaded in memory. That cross-contamination
# was the root cause of repeated "Cannot find module './NNNN.js'" crashes.
NEXT_DIR="$ROOT/.next-dev"
LOCK_FILE="$ROOT/.next-dev.lock"

stop_stale_dev_servers() {
  for port in 3000 3001; do
    if pids="$(lsof -ti:"$port" 2>/dev/null || true)"; then
      if [[ -n "$pids" ]]; then
        echo "Stopping stale dev server on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
      fi
    fi
  done

  pkill -f "next dev" 2>/dev/null || true
  sleep 0.5
}

# Guard against two `npm run dev` invocations racing over the same
# NEXT_DIR (e.g. two terminals/agents starting a dev server at once).
# That race can corrupt the shared webpack output the same way a
# concurrent `next build` can.
acquire_lock() {
  if [[ -f "$LOCK_FILE" ]]; then
    local existing_pid
    existing_pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "Another dev.sh (pid $existing_pid) is already running/starting for this repo." >&2
      echo "Stop it first (kill $existing_pid) or wait for it to finish before starting another." >&2
      exit 1
    fi
    echo "Found stale lock file (process $existing_pid no longer running). Removing it."
    rm -f "$LOCK_FILE"
  fi
  echo "$$" > "$LOCK_FILE"
  trap 'rm -f "$LOCK_FILE"' EXIT
}

# Partial/inconsistent .next-dev output causes MODULE_NOT_FOUND crashes.
# Checks for two known corruption signatures:
#   1. server/static output present but routes-manifest.json missing
#      (common after a clean/build race).
#   2. webpack-runtime.js references a numbered chunk
#      (require("./NNNN.js")) that doesn't actually exist on disk -- the
#      exact "Cannot find module './NNNN.js'" crash signature, which
#      happens when the output was overwritten mid-write (e.g. by a
#      concurrent build sharing the same dir, or an interrupted clean).
is_next_cache_corrupt() {
  if [[ ! -d "$NEXT_DIR" ]]; then
    return 1
  fi

  if [[ -d "$NEXT_DIR/server" || -d "$NEXT_DIR/static" ]] && [[ ! -f "$NEXT_DIR/routes-manifest.json" ]]; then
    return 0
  fi

  local runtime_file="$NEXT_DIR/server/webpack-runtime.js"
  if [[ -f "$runtime_file" ]]; then
    local missing_chunk
    missing_chunk="$(node -e '
      const fs = require("fs");
      const path = require("path");
      const runtimeFile = process.argv[1];
      const nextDir = process.argv[2];
      const src = fs.readFileSync(runtimeFile, "utf8");
      const ids = new Set();
      for (const m of src.matchAll(/require\("\.\/(\d+)\.js"\)/g)) ids.add(m[1]);
      for (const id of ids) {
        const candidates = [
          path.join(nextDir, "server", `${id}.js`),
          path.join(nextDir, "server", "chunks", `${id}.js`),
        ];
        if (!candidates.some((p) => fs.existsSync(p))) {
          console.log(id);
          break;
        }
      }
    ' "$runtime_file" "$NEXT_DIR" 2>/dev/null || true)"

    if [[ -n "$missing_chunk" ]]; then
      echo "webpack-runtime.js references missing chunk './${missing_chunk}.js'"
      return 0
    fi
  fi

  return 1
}

acquire_lock
stop_stale_dev_servers

if is_next_cache_corrupt; then
  echo "Detected corrupted .next-dev cache. Running clean..."
  bash "$ROOT/scripts/clean.sh"
fi

exec npx next dev "$@"
