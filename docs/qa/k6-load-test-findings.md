# Hey Ralli k6 load test — findings (first 20 schools)

**Status:** Living
**Owner:** Engineering / QA
**Last updated:** August 1, 2026
**Related:** [k6 suite README](../../load-tests/k6/README.md) · [Performance budget](./performance-budget.md)

Results from the staging (`heyralli-staging`) 20-school k6 suite: the initial
smoke/20-schools pass and the 15-VU light-peak launch-readiness phase. This is
a **capacity confidence check**, not a breaking-point stress test.

## Environment

- Supabase project: `heyralli-staging` (isolated from production; 111
  migrations applied, 20 seeded orgs, 8 users/org = 160 users, seeded events /
  approval items / inbox threads, `TEST_RUN_ID`-tagged for cleanup)
- Auth: Supabase SSR cookies minted directly via the Auth API
  (`mint-sessions.mjs`), not browser login — avoids rate limits and brittle
  Next.js server-action hashes
- External providers: no scenario calls a write/generate/send/publish route
  (OpenAI, Meta, Resend, Stripe, cron, webhooks are all out of scope by
  design — see suite README "Mocking external providers"); confirmed via
  Resend `list-emails` that no email was sent during any test window

## Finding 1 — `next dev` produced false-positive tenant-isolation failures

The first 20-schools run (ramp 4→8 VUs) against a local `next dev` server
reported 46 tenant-isolation check failures. Investigation traced this to
`next dev`'s on-demand route compilation and caching behavior under
concurrency, not a real data leak — confirmed by re-running the identical
suite against a production build (`next build && next start`) targeting the
same staging database:

| Run | Target | Tenant isolation failures | Checks passed | Auth failures |
|---|---|---:|---:|---:|
| 20-schools (dev) | `next dev` localhost | 46 | fail | 0 |
| 20-schools (prod build) | `next build && next start` localhost | **0** | **100%** | **0** |

**Conclusion:** tenant isolation is intact; only run load tests against
`next start` / a real deployment, never `next dev`.

**Localhost timing caveat:** even the production-build localhost run is not
authoritative for response-time SLAs — `http_req_duration{route:dashboard}`
p95 was 2760ms there (over budget) purely from single-machine, no-CDN
localhost overhead. Real timing required a real deployment (see below).

## Finding 2 — Vercel Preview deployments on this project are protected by SSO

The linked Vercel project (`campaignos`, `team_gJzg5wvUGIMcz3oCgq07b9L2`) has
**Vercel Authentication (SSO) enabled on all non-custom-domain deployments**
(`ssoProtection.deploymentType: all_except_custom_domains`), returning a 302
to `vercel.com/sso-api` for every unauthenticated request — including k6's
raw HTTP calls, and including the project's *existing* Preview environment
variables (which are shared with production-adjacent Resend/OpenAI/Stripe/
Meta keys, not staging-scoped).

Rather than changing that team-wide protection setting or the shared
Preview env vars (both out of scope for a load test), we deployed a **one-off
preview build** with build-time/runtime env overrides scoped to only that
deployment (`vercel deploy --build-env ... --env ...`, never persisted to
project settings) pointed at `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` for `heyralli-staging`, and used a
short-lived **Deployment Protection bypass cookie** (`_vercel_jwt`, ~7-day
TTL, scoped to that exact deployment) attached to every k6 request via the
new `VERCEL_JWT` environment variable. Documented in the suite README under
"Running against a Vercel Preview deployment."

Verified before running any load: a manual authenticated GET to `/dashboard`
returned **200** and the response body contained the seeded staging
organization ID (`Load Test School 01`), confirming the preview served
staging data, not production.

## Finding 3 — `workflow_duration_ms` thresholds were miscalibrated

The original 20-schools thresholds gated `workflow_duration_ms` (whole
multi-step-workflow wall time, including the intentional 2–8s think-time
pauses between steps) at 8–10s p95 despite the code comment already saying
"informational; soft ceilings." A multi-step workflow's realistic p95 is
20–35s by construction (several pauses of several seconds each), so this
threshold was virtually guaranteed to fail even with excellent server
performance — as it did on the first light-peak run (0 real problems; every
`http_req_duration` was sub-second). Fixed by removing the pass/fail
assertion and keeping the metric purely as a reported Trend
(`load-tests/k6/config/thresholds.js`). No safety, correctness, or
HTTP-timing threshold was loosened.

## 15-VU light-peak result (launch-readiness phase)

**Deployment:** Vercel Preview, production Next.js build, `heyralli-staging` only
`https://campaignos-3a0ijxpfi-campignos.vercel.app` (one-off deploy `dpl_HAQzegh1EMTwVKoAUag7dq28ooF8`, env-overridden, not persisted to shared project settings)
**Workload:** ramp 0→5→10→15 VUs (3m), hold 15 VUs (5m), ramp down (2m) — ~10 min, max 15 concurrent VUs
**Traffic mix:** 30% dashboard, 25% calendar/events, 15% comms creator (read), 10% approvals (read), 10% Communications Hub (read), 5% settings (read), 5% org-switch (fell back to dashboard — no seeded user belongs to 2+ orgs yet)

| Run | Checks | Tenant isolation failures | Auth failures | HTTP failure rate | Unexpected 4xx/5xx | Dropped iterations |
|---|---|---:|---:|---:|---:|---:|
| `light-peak-15vu-001` | 6391/6391 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| `light-peak-15vu-002` | 6487/6487 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| `light-peak-15vu-003` | 6376/6376 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| **Total** | **19254/19254 (100%)** | **0** | **0** | **0.00%** | **0** | **0** |

`http_req_duration` (ms), overall:

| Run | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| 001 | 567 | 762 | 849 | 2157 | 3508 |
| 002 | 559 | 761 | 838 | 1133 | 2054 |
| 003 | 550 | 724 | 788 | 1002 | 2624 |

All well inside the required ceilings (ordinary read p95 < 1500ms; dashboard
and calendar p95 < 2000ms) — dashboard p95 924–955ms, calendar p95 776–834ms,
events_list p95 682–701ms across all three runs, with no upward trend across
runs or during the 15-VU hold window. Occasional 2–3.5s max outliers are
consistent with individual serverless cold starts, not a systemic issue.

Five slowest routes by p95 (run 003, full per-route breakdown; consistent
with runs 001–002 where the same routes were tracked):

| Route | p95 (ms) |
|---|---:|
| `dashboard` | 924 |
| `event_approvals` | 891 |
| `event_detail` | 890 |
| `approvals` | 778 |
| `calendar` | 776 |

No Vercel function errors, Next.js errors, or Supabase errors were observed
in the k6 run logs (0 unexpected 401/403/429/500 across all three runs). No
Resend email was sent during any test window.

**Result: 15-VU light-peak profile PASSED all three runs.** Safe to proceed
to the 30-VU launch-spike test.

## Known coverage gaps to close before a higher-VU or write-path test

- No seeded user currently belongs to 2+ organizations, so the light-peak
  org-switch traffic slice never exercises a real switch. Extending the seed
  script to give a handful of users a second membership
  (`session.organizationIds` in the k6 session fixture) would activate the
  existing `scenarios/org-switch.js` without further code changes.
- Default suite is read-only by design (no OpenAI/Meta/Resend/Stripe writes);
  a future write-path profile would need its own explicit safe-adapter plan.
- Stripe side-effect verification for this run relied on scenario design
  (no billing/checkout route is exercised) rather than a direct Stripe API
  check, since the Stripe MCP connection was not authenticated in this
  session.
