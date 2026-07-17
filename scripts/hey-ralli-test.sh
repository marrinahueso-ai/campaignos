#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load only Playwright-relevant keys from .env.local (never print values).
# Uses a temp file so process-substitution races cannot leave vars unset.
if [[ -f .env.local ]]; then
  ENV_TMP="$(mktemp)"
  # shellcheck disable=SC2064
  trap 'rm -f "$ENV_TMP"' EXIT
  # Allow only HEY_RALLI_* plus optional Sentry/site URL keys used by the app under test.
  grep -E '^(HEY_RALLI_|NEXT_PUBLIC_SENTRY_|SENTRY_|NEXT_PUBLIC_SITE_URL)' .env.local \
    | sed 's/\r$//' >"$ENV_TMP" || true
  set -a
  # shellcheck disable=SC1090
  source "$ENV_TMP"
  set +a
fi

MODE="${1:-run}"

if [[ "$MODE" == "ui" ]]; then
  exec npx playwright test --config=playwright.config.ts --ui
fi

exec npx playwright test --config=playwright.config.ts
