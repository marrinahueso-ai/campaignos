# k6 load tests — first 20 schools (Hey Ralli)

Safe, production-like readiness checks for early launch. **Not** a maximum-capacity stress test.

Twenty schools means twenty **tenants** in the fixture — not twenty virtual users running forever. Ordinary profiles hold about **4–8 concurrent users** (light peak **≤ 15**, launch spike **≤ 30**).

## What this represents

| Profile | VUs | Duration | Schools |
|---------|-----|----------|---------|
| `smoke` | 2 | ~2 min | 01–02 |
| `twenty-schools` | ramp 4→8 | ~10 min | all 20 |
| `light-peak` | ramp 0→5→10→15, hold 5m, ramp down 2m | ~10 min | all 20 |
| `launch-spike` | ramp 0→10→20→30 (4m), hold 5m, ramp down 2m | ~11 min | all 20 |
| `launch-spike-warmup` | ramp 0→4, hold ~1m40s | ~2 min (discarded) | all 20 |
| `headroom` (50 VU) | ramp 0→15→30→50 (4m), hold 5m, ramp down 2m | ~11 min | all 20 |
| `headroom-warmup` | ramp 0→5, hold ~1m40s | ~2 min (discarded) | all 20 |

Traffic mix (`smoke` / `twenty-schools`): ~35% dashboard, 25% calendar/events, 15% Create with AI (read), 15% approvals (read), 10% Communications Hub (read).

Traffic mix (`light-peak` / `launch-spike` / `headroom`): 30% dashboard, 25% calendar/events, 15% Create with AI (read), 10% approvals (read), 10% Communications Hub (read), 5% team/settings (read), 5% organization switching (falls back to a dashboard view when no seeded user belongs to 2+ orgs — see "Known coverage limitations").

`launch-spike` and `headroom` assign each VU one **exclusive, pinned session**
for its whole run (school-interleaved so VUs 1–20 cover all 20 schools)
instead of the time-varying `(VU + ITER)` selection the other profiles use —
see "Known coverage limitations" for why.

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

For the 30-VU profile, run a discardable warm-up first, then the recorded run:

```bash
BASE_URL=https://your-preview-xxxxx.vercel.app \
TEST_RUN_ID=launch-spike-warmup \
VERCEL_JWT=eyJhbGciOi... \
npm run test:load:launch-spike-warmup   # discarded, confirms routes/sessions/bypass

BASE_URL=https://your-preview-xxxxx.vercel.app \
TEST_RUN_ID=launch-spike-30vu-001 \
VERCEL_JWT=eyJhbGciOi... \
npm run test:load:launch-spike
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
npm run test:load:launch-spike-warmup   # discardable, run before launch-spike
npm run test:load:launch-spike
npm run test:load:headroom-warmup       # discardable, run before headroom
npm run test:load:headroom
```

Or directly:

```bash
k6 run load-tests/k6/smoke.js
k6 run load-tests/k6/twenty-schools.js
k6 run load-tests/k6/light-peak.js
k6 run load-tests/k6/launch-spike-warmup.js
k6 run load-tests/k6/launch-spike.js
k6 run load-tests/k6/launch-headroom-warmup.js
k6 run load-tests/k6/launch-headroom.js
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

## 100-school architecture validation (separate from the 20-school k6 fixture)

A one-off, larger dataset for validating schema/RLS/indexing behavior at 5x
scale — **not** a k6 load profile, and deliberately isolated from
`data/accounts.local.json` (used by every k6 profile above). See
[`docs/qa/100-school-pre-seed-baseline.md`](../../docs/qa/100-school-pre-seed-baseline.md)
and [`docs/qa/100-school-post-seed-nano-baseline.md`](../../docs/qa/100-school-post-seed-nano-baseline.md).

Builds 100 orgs / 800 users / 2,500 events / 12,500 milestones
(`approval_scheduling_items`) + representative communications, AI-asset
metadata, inbox threads, brand-kit items, calendar imports, and an
org-scoped communication playbook — using the real schema/FKs, no invented
tables or columns, and no real external-provider objects (see
`scripts/lib/architecture-profile.mjs` for exact volumes and content).

```bash
export TEST_RUN_ID=arch100
export K6_TEST_PASSWORD='your-strong-test-password'

# Preview intended inserts — no writes
npm run test:load:seed:100-schools:dry-run

# Explicit confirmation required to actually write
SEED_CONFIRM=100-school-architecture npm run test:load:seed:100-schools

# Verify counts, role coverage, no orphans/cross-tenant rows, RLS negative access
npm run test:load:validate:100-schools

# Row-count + storage-bucket snapshot (see script header for what it does NOT capture)
npm run test:load:snapshot:database -- --profile=100-school-architecture

# Cleanup (scoped to this profile's accounts file + TEST_RUN_ID name pattern)
npm run test:load:cleanup:100-schools
```

Safety: refuses to run against the known production Supabase project ref
(no override), always prints the target project ref, requires
`SEED_PROFILE=100-school-architecture`, requires `SEED_CONFIRM` to match the
profile before writing, and is idempotent (fetch-existing-then-insert-missing
for every table; safe to re-run after an interruption). Auth-user creation
uses bounded concurrency (6) with retry + exponential backoff on rate
limits and progress logging.

No k6 load profile has been run against this dataset yet — seeding,
integrity validation, and the post-seed snapshot are deliberately the last
step before any performance test at this scale.

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
- The default `pickSession()` selection is time-varying (`(VU + ITER) %
  pool.length`), which is intentional at ≤15 VUs (a VU samples many
  users/schools over a run) but can very occasionally let two *different*,
  concurrently-running VUs select the identical static session cookie at
  close to the same instant — a race a real deployment never sees (each
  browser session is unique), but that can trip Supabase's single-use
  refresh-token rotation for that shared cookie under enough concurrency.
  `launch-spike` (30 VUs) avoids this with a `pinned` assignment mode
  (`pickSession(data, { pinned: true })`): one exclusive session per VU for
  the whole run. If a future profile pushes VU count materially higher than
  the 160-session pool, mint more sessions (more roles/schools) or extend
  the pinned mode to other profiles.
- Session cookies expire (Supabase access-token TTL, ~1hr) — a fixture
  minted before a previous test round can look "valid" (200s) for a while
  via server-side refresh, then start failing partway through a later,
  longer-running test. Re-mint (`npm run test:load:mint-sessions`)
  immediately before any recorded run set, especially higher-VU / longer
  profiles.

## File layout

```text
load-tests/k6/
  smoke.js | twenty-schools.js | light-peak.js
  launch-spike.js | launch-spike-warmup.js
  launch-headroom.js | launch-headroom-warmup.js
  config/   environments.js thresholds.js workload.js
  helpers/  auth http checks organization test-data metrics
  scenarios/ dashboard calendar-events communications-* approvals settings-viewer org-switch run-mix
  data/     schools.js accounts.example.json
  scripts/  seed-load-test-data.mjs mint-sessions.mjs cleanup-test-data.mjs
            seed-architecture-dataset.mjs validate-architecture-seed.mjs
            snapshot-database.mjs
            lib/ env.mjs schools.mjs architecture-profile.mjs
```

## Related

- Playwright wall-clock budgets: `npm run test:hey-ralli:perf` → [docs/qa/performance-budget.md](../../docs/qa/performance-budget.md)
- Findings from recorded runs: [docs/qa/k6-load-test-findings.md](../../docs/qa/k6-load-test-findings.md)
