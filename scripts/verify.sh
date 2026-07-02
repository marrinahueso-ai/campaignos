#!/usr/bin/env bash
set -euo pipefail

BASE="${CAMPAIGNOS_BASE_URL:-http://localhost:3000}"
ROUTES=(
  "/dashboard"
  "/events"
  "/school-setup"
  "/calendar"
  "/calendar/review"
  "/settings/playbooks"
  "/settings/ai-brain"
)

failures=0

check_http_200() {
  local url="$1"
  local label="$2"
  local code

  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url")"
  if [[ "$code" == "200" ]]; then
    echo "OK: $label — HTTP 200"
    return 0
  fi

  echo "FAIL: $label — HTTP $code ($url)"
  failures=$((failures + 1))
  return 1
}

echo "Verifying CampaignOS at $BASE"
echo ""

for route in "${ROUTES[@]}"; do
  check_http_200 "$BASE$route" "$route" || true
done

html="$(curl -s --max-time 30 "$BASE/dashboard")"
css_path="$(echo "$html" | grep -oE 'href="/_next/static/css/app/layout.css[^"]+"' | head -1 | sed 's/href="//;s/"//')"

if [[ -z "$css_path" ]]; then
  echo "FAIL: /_next/static/css/app/layout.css link not found in /dashboard HTML"
  failures=$((failures + 1))
else
  check_http_200 "$BASE$css_path" "/_next/static/css/app/layout.css" || true
fi

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "CampaignOS Healthy"
  exit 0
fi

echo "$failures check(s) failed."
exit 1
