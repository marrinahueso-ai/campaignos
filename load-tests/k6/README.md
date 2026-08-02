# k6 load tests — first 20 schools (Hey Ralli)

Safe, production-like readiness checks for early launch. **Not** a maximum-capacity stress test.

Twenty schools means twenty **tenants** in the fixture — not twenty virtual users running forever. Ordinary profiles hold about **4–8 concurrent users**.

## What this represents

| Profile | VUs | Duration | Schools |
|---------|-----|----------|---------|
| `smoke` | 2 | ~2 min | 01–02 |
| `twenty-schools` | ramp 4→8 | ~10 min | all 20 |

Traffic mix (`smoke` / `twenty-schools`): ~35% dashboard, 25% calendar/events, 15% Create with AI (read), 15% approvals (read), 10% Communications Hub (read).

Think time between actions: **2–8 seconds** (longer after page-level workflows). No machine-speed request loops.

## Why 20 schools ≠ 20 always-on VUs

Real PTOs are not all clicking at once. The suite rotates sessions across seeded orgs so tenant isolation and connection pools see multi-org traffic while concurrency stays modest.

## Prerequisites

1. [k6](https://k6.io/docs/get-started/installation/) (`brew install k6`)
2. Staging or local Preview — **not** production by default
3. Staging Supabase project with service role for seed/cleanup
4. External providers **inert** on the target: unset `OPENAI_API_KEY`, `RESEND_API_KEY`, Meta secrets/tokens, Stripe keys so generate/approve/send cannot bill or message parents

## Required environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `BASE_URL` | yes | Staging / local origin |
| `TEST_RUN_ID` | yes | Tag for seed + cleanup |
| `K6_TEST_PASSWORD` | seed/mint | Shared password for synthetic users |
| `NEXT_PUBLIC_SUPABASE_URL` | seed/mint | Staging Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | mint | Password grant → cookies |
| `SUPABASE_SERVICE_ROLE_KEY` | seed/cleanup | Admin seed only |
| `K6_ALLOW_PRODUCTION` | no | Must be `true` to hit production-like hosts |
| `K6_ALLOW_WRITES` | no | Opt-in write probes (still no OpenAI/Meta/Resend) |
| `COOKIE` | optional | Legacy single-session smoke without seed |

See [`env.example`](./env.example).

## Safety protections

- Default target must be staging/local
- Production-like hostnames (`heyralli.com`, …) **refuse to run** unless `K6_ALLOW_PRODUCTION=true`
- npm scripts never set that override
- Credentials live in gitignored `.env` / `cookies.env` / `data/*.local.json`
- Distinct `User-Agent`: `k6-heyralli-loadtest/1.0`
- No AI generate, Meta publish, inbox send, Stripe, or cron endpoints in default profiles

## Seed test accounts

```bash
# From repo root — uses .env.local Supabase keys
export TEST_RUN_ID=k6-$(date +%Y%m%d)-a1
export K6_TEST_PASSWORD='your-strong-test-password'

npm run test:load:seed
npm run test:load:mint-sessions
```

Creates:

- Organizations `Load Test School 01 (TEST_RUN_ID)` … `20`
- 8 users/school (Owner/admin, President, VP, Chair, Volunteer, Viewer, …)
- Upcoming events titled `[k6][TEST_RUN_ID] …`
- Pending `approval_scheduling_items` with **pre-generated** caption text (no OpenAI)
- Synthetic `inbox_threads` (DB only)

Outputs (gitignored):

- `load-tests/k6/data/accounts.local.json`
- `load-tests/k6/data/sessions.local.json`

### Auth approach

k6 uses **exported Supabase SSR cookies** per user (+ `campaignos-active-organization-id`). Password login through the Next.js `/login` server action is intentionally avoided (rate limits + brittle action hashes).

`mint-sessions.mjs` signs in via Supabase Auth API and encodes `@supabase/ssr`-compatible `sb-*-auth-token` cookies.

Legacy: set `COOKIE` from a browser DevTools export for a one-user smoke.

## Mocking external providers

| Provider | Load-test stance |
|----------|------------------|
| OpenAI | Never call generate*; seed captions instead. Unset `OPENAI_API_KEY` on target. |
| Meta / Instagram | Never approve-to-publish or inbox send. No page tokens on staging. |
| Resend | Unset `RESEND_API_KEY` — app soft-skips email. |
| Stripe | Unset — billing actions unused by suite. |
| Weather | App already mocks when `WEATHER_API_KEY` missing. |

There is no in-app OpenAI test adapter today; safety is **do not call generate routes** + staging keys unset.

## Run profiles

```bash
export BASE_URL=https://your-staging.example
export TEST_RUN_ID=k6-2026-08-01-a1
# sessions.local.json already minted

npm run test:load:smoke
npm run test:load:20-schools
```

Or directly:

```bash
k6 run load-tests/k6/smoke.js
k6 run load-tests/k6/twenty-schools.js
```

JSON summaries write under `load-tests/k6/results/` (gitignored).

### Local against `next start`

```bash
npm run build && npm run start
BASE_URL=http://localhost:3000 TEST_RUN_ID=… npm run test:load:smoke
```

## Interpreting results

- Thresholds live in [`config/thresholds.js`](./config/thresholds.js)
- `tenant_isolation_failures` must stay **0**
- `auth_failures` must stay **0** (expired cookies → re-run mint)
- p95 ordinary reads &lt; 1.5s; dashboard/events list &lt; 2s (smoke uses looser ceilings for cold wake)
- Unexpected 500s fail the run; a small number of 429s is allowed during mint/auth noise
- k6 terminal summary + `results/*-summary.json`

## Cleanup

```bash
TEST_RUN_ID=… npm run test:load:cleanup
# optional: also delete auth users
K6_CLEANUP_DELETE_USERS=true TEST_RUN_ID=… npm run test:load:cleanup
```

## Routes exercised (real App Router pages)

| Workflow | Paths |
|----------|--------|
| Dashboard | `/dashboard`, `/events` |
| Calendar / events | `/calendar`, `/events`, `/events/{id}`, `?tab=planning` |
| Comms creator | `/create-with-ai`, `/events/{id}/campaign-builder` |
| Approvals | `/approvals`, `/approvals/revision`, event approvals tab |
| Comms Hub | `/communications` |

## Known coverage limitations

- Primary surface is **RSC HTML**, not JSON REST — checks use status, body size, login detection, and foreign org UUID absence
- Next.js **server-action** hashes are deploy-fragile; default suite does not POST approve/generate/save-draft actions
- Approve → Meta publish, inbox send, flyer/AI generate, Stripe, OAuth, and cron routes are **out of scope** (unsafe side effects)
- Cookie sessions expire — re-mint when warm-up fails
- Single `COOKIE` fallback cannot validate 20-tenant isolation

## File layout

```text
load-tests/k6/
  smoke.js | twenty-schools.js
  config/   environments.js thresholds.js workload.js
  helpers/  auth http checks organization test-data metrics
  scenarios/ dashboard calendar-events communications-* approvals run-mix
  data/     schools.js accounts.example.json
  scripts/  seed-load-test-data.mjs mint-sessions.mjs cleanup-test-data.mjs
```

## Related

- Playwright wall-clock budgets: `npm run test:hey-ralli:perf` → [docs/qa/performance-budget.md](../../docs/qa/performance-budget.md)
