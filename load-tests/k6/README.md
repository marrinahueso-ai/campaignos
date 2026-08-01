# k6 load tests (Hey Ralli)

Read-heavy smoke/load against authenticated dashboard hubs. **Prefer staging or a Vercel preview**, not production with real schools.

Full walkthrough: ask eng / see chat notes from the k6 setup task. This file is run commands only.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) (`brew install k6` on macOS)
- A **test org** with events/tasks/approvals seeded
- A logged-in browser session on the target host (cookie export)

## Auth (cookie jar)

Password login through k6 is **not** supported here (Next.js server action + login rate limits). Export Supabase `sb-*` cookies instead:

1. Sign in at `BASE_URL` in Chrome/Safari.
2. DevTools → Application → Cookies → copy every `sb-*-auth-token*` value (include `.0`, `.1` chunks).
3. Or DevTools → Network → any document request → Request Headers → copy `Cookie:`.
4. Put the full cookie string in `cookies.env` (see `cookies.env.example`).

Cookies expire; re-export when auth checks fail.

## Run

```bash
cd /path/to/CampignOS

# Install once
brew install k6 && k6 version

# Configure (never commit cookies.env)
cp load-tests/k6/cookies.env.example load-tests/k6/cookies.env
# edit BASE_URL + COOKIE

set -a && source load-tests/k6/cookies.env && set +a

# Smoke (default): 2 VUs, 1 minute
k6 run load-tests/k6/smoke.js

# Load / soak / spike
SCENARIO=load  k6 run load-tests/k6/smoke.js
SCENARIO=soak  k6 run load-tests/k6/smoke.js
SCENARIO=spike k6 run load-tests/k6/smoke.js
```

## Paths exercised

`/dashboard`, `/events`, `/tasks`, `/approvals`, `/calendar`

**Do not** point these scripts at Create with AI, artwork generate, Ask Ralli, Canva, Meta publish, or mutation storms.

## Related

- Playwright wall-clock budget: `npm run test:hey-ralli:perf` → [docs/qa/performance-budget.md](../../docs/qa/performance-budget.md)
- That doc explicitly avoids full k6 soak against Production.
