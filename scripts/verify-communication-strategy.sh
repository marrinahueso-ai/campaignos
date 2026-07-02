#!/usr/bin/env bash
# Live verification for Communication Strategy (Engine 6.1)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
fi

failures=0
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

echo "=== Communication Strategy Live Verification ==="
echo ""
echo "=== Database checks ==="
db_output="$(node "$ROOT/scripts/verify-communication-strategy.mjs" 2>&1)" || db_exit=$?
echo "$db_output" | grep -E '^PASS:|^FAIL:' || true
test_id="$(echo "$db_output" | sed -n 's/^CALENDAR_ONLY_EVENT_ID=//p')"
full_id="$(echo "$db_output" | sed -n 's/^FULL_CAMPAIGN_EVENT_ID=//p')"
if echo "$db_output" | grep -q '^FAIL:'; then
  failures=$((failures + $(echo "$db_output" | grep -c '^FAIL:' || true)))
fi

echo ""
echo "=== UI probes ==="
BASE="${CAMPAIGNOS_BASE_URL:-http://localhost:3000}"

if [[ -n "${test_id:-}" ]]; then
  ws_html="$(curl -s --max-time 45 "$BASE/events/$test_id" || true)"
  if echo "$ws_html" | grep -Ei "This event is calendar-only. No campaign is needed." >/dev/null; then
    pass "Event Workspace shows calendar-only calm empty state"
  else
    fail "Event Workspace missing calendar-only empty state message"
  fi
  if echo "$ws_html" | grep -qi "Calendar Only"; then
    pass "Event Workspace shows Calendar Only strategy badge"
  else
    fail "Event Workspace missing Calendar Only badge"
  fi
else
  fail "skipped calendar-only workspace UI checks (no test event id)"
fi

events_html="$(curl -s --max-time 45 "$BASE/events" || true)"
if echo "$events_html" | grep -qi "Calendar Only"; then
  pass "Events list shows strategy badge"
else
  fail "Events list missing strategy badge"
fi

calendar_html="$(curl -s --max-time 45 "$BASE/calendar?tab=planning" || true)"
if echo "$calendar_html" | grep -Ei "Calendar Only|Full Campaign|Reminder Only" >/dev/null; then
  pass "Calendar shows strategy badge"
else
  fail "Calendar missing strategy badge"
fi

if [[ -n "${full_id:-}" ]]; then
  if curl -s --max-time 45 "$BASE/events/$full_id" | grep -Ei "Communication Timeline|Assigned Playbook|Generate All Drafts" >/dev/null; then
    pass "full_campaign Event Workspace shows playbook/timeline/drafts surfaces"
  else
    fail "full_campaign Event Workspace missing campaign surfaces"
  fi
else
  fail "skipped full_campaign workspace UI checks (no comparison event id)"
fi

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "OVERALL: PASS"
  exit 0
fi
echo "OVERALL: FAIL ($failures check(s))"
exit 1
