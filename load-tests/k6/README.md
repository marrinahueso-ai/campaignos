# k6 load tests — first 20 schools (Hey Ralli)

Safe, production-like readiness checks for early launch. **Not** a maximum-capacity stress test.

Twenty schools means twenty **tenants** in the fixture — not twenty virtual users running forever. Ordinary profiles hold about **4–8 concurrent users** (light peak **≤ 15**).

## What this represents

| Profile | VUs | Duration | Schools |
|---------|-----|----------|---------|
| `smoke` | 2 | ~2 min | 01–02 |
| `twenty-schools` | ramp 4→8 | ~10 min | all 20 |
| `light-peak` | ramp 0→5→10→15, hold 5m, ramp down 2m | ~10 min | all 20 |

Traffic mix (`smoke` / `twenty-schools`): ~35% dashboard, 25% calendar/events, 15% Create with AI (read), 15% approvals (read), 10% Communications Hub (read).

Traffic mix (`light-peak`): 30% dashboard, 25% calendar/events, 15% Create with AI (read), 10% approvals (read), 10% Communications Hub (read), 5% team/settings (read), 5% organization switching (falls back to a dashboard view when no seeded user belongs to 2+ orgs — see "Known coverage limitations").

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
| `VERCEL_JWT` | Vercel Preview only | Deployment-Protection bypass cookie (see below) |

See [`env.example`](./env.example).

## Running against a Vercel Preview deployment (recommended for real timing)

`next dev` and even `next start` on localhost do **not** produce authoritative
response-time numbers. For real launch-readiness timing, deploy a one-off
preview build pinned to staging Supabase **without** touching the shared
Vercel project's saved environment variables:

```bash
set -a; source .env.staging.local; set +a

npx vercel deploy \
  --build-env NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --env NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --yes
```

`--build-env`/`--env` apply only to this one deployment and are never
persisted to the project's Preview settings, so other developers' previews
are unaffected. This project has team-wide **Vercel Authentication (SSO)**
enabled on all non-custom-domain deployments, which returns a 302 to
`vercel.com/sso-api` for every unauthenticated request — including k6's raw
HTTP calls. Do **not** disable that project-wide setting just to run a load
test. Instead, generate a scoped bypass cookie for this one deployment:

```bash
# Returns a shareable URL that, when fetched, sets a _vercel_jwt cookie
# valid for ~7 days and scoped to this exact deployment.
vercel_share_url="<get_access_to_vercel_url MCP tool output, or Vercel dashboard "Share" button>"
curl -s -D - -o /dev/null "$vercel_share_url" | grep -i set-cookie
# Copy the _vercel_jwt=... value (excluding attributes) into VERCEL_JWT
```

Then run the suite with `VERCEL_JWT` set; `sessionHeaders()` appends it to
every request's Cookie header automatically (no-op against non-Vercel hosts):

```bash
BASE_URL=https://your-preview-xxxxx.vercel.app \
TEST_RUN_ID=light-peak-15vu-001 \
VERCEL_JWT=eyJhbGciOi... \
npm run test:load:light-peak
```

Before running, confirm with one manual request that the deployment serves
staging data (not production) for a seeded session — e.g. that `/dashboard`
returns 200 and contains the expected seeded organization ID.

## Safety protections

- Default target must be staging/local
- Production-like hostnames (`heyralli.com`, …) **refuse to run** unless `K6_ALLOW_PRODUCTION=true`
- npm scripts never set that override
- Credentials live in gitignored `.env` / `cookies.env` / `data/*.local.json`
- Distinct `User-Agent`: `k6-heyralli-loadtest/1.0`
- No AI generate, Meta publish, inbox send, Stripe, or cron endpoints in default profiles

## Seed test accounts

```bash
# From repo root — uses .env.staging.local Supabase keys
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
npm run test:load:light-peak
```

Or directly:

```bash
k6 run load-tests/k6/smoke.js
k6 run load-tests/k6/twenty-schools.js
k6 run load-tests/k6/light-peak.js
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
| Settings | `/settings/organization`, `/settings/team-access` |

## Known coverage limitations

- Primary surface is **RSC HTML**, not JSON REST — checks use status, body size, login detection, and foreign org UUID absence
- Next.js **server-action** hashes are deploy-fragile; default suite does not POST approve/generate/save-draft actions
- Approve → Meta publish, inbox send, flyer/AI generate, Stripe, OAuth, and cron routes are **out of scope** (unsafe side effects)
- Cookie sessions expire — re-mint when warm-up fails
- Single `COOKIE` fallback cannot validate 20-tenant isolation
- No seeded user currently belongs to 2+ organizations, so `light-peak`'s 5%
  org-switch traffic slice has no eligible subject and falls back to a plain
  dashboard view (`scenarios/org-switch.js`). To exercise real org switching,
  extend the seed script to give a small number of users a second
  membership (`session.organizationIds` in the fixture) — the scenario
  already supports this shape and needs no other code changes.
- `workflow_duration_ms` is a reported Trend, not a threshold gate — it
  measures whole-workflow time including the intentional 2-8s think-time
  pauses between steps, so multi-step workflows legitimately show
  20-35s p95 even when every `http_req_duration` is sub-second.

## File layout

```text
load-tests/k6/
  smoke.js | twenty-schools.js | light-peak.js
  config/   environments.js thresholds.js workload.js
  helpers/  auth http checks organization test-data metrics
  scenarios/ dashboard calendar-events communications-* approvals settings-viewer org-switch run-mix
  data/     schools.js accounts.example.json
  scripts/  seed-load-test-data.mjs mint-sessions.mjs cleanup-test-data.mjs
```

## Related

- Playwright wall-clock budgets: `npm run test:hey-ralli:perf` → [docs/qa/performance-budget.md](../../docs/qa/performance-budget.md)
- Findings from recorded runs: [docs/qa/k6-load-test-findings.md](../../docs/qa/k6-load-test-findings.md)
