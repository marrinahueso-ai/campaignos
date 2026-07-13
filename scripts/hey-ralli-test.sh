#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load .env.local into this shell only (never printed).
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(HEY_RALLI_|NEXT_PUBLIC_SENTRY_|SENTRY_|NEXT_PUBLIC_SITE_URL)' .env.local | sed 's/\r$//')
  set +a
fi

MODE="${1:-run}"

if [[ "$MODE" == "ui" ]]; then
  exec npx playwright test --config=playwright.config.ts --ui
fi

exec npx playwright test --config=playwright.config.ts
