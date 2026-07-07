#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

is_next_cache_corrupt() {
  local next_dir="$ROOT/.next"

  if [[ ! -d "$next_dir" ]]; then
    return 1
  fi

  # Partial .next output (common after clean/build races) causes MODULE_NOT_FOUND 500s.
  if [[ -d "$next_dir/server" || -d "$next_dir/static" ]] && [[ ! -f "$next_dir/routes-manifest.json" ]]; then
    return 0
  fi

  return 1
}

stop_stale_dev_servers

if is_next_cache_corrupt; then
  echo "Detected corrupted .next cache. Running clean..."
  bash "$ROOT/scripts/clean.sh"
fi

exec npx next dev "$@"
