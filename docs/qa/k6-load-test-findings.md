# Hey Ralli k6 load test — findings (first 20 schools)

**Status:** 20-school phase closed and passed; 100-school / 20-VU Run 2
**passed** after `getClaims` remediation — see
[Run 2 report](./100-school-20vu-data-scale-run2.md) and
[auth remediation](./100-school-20vu-auth-rate-limit-remediation.md)
**Owner:** Engineering / QA
**Last updated:** August 4, 2026
**Related:** [k6 suite README](../../load-tests/k6/README.md) · [Performance budget](./performance-budget.md)

Results from the staging (`heyralli-staging`) 20-school k6 suite: the initial
smoke/20-schools pass, the 15-VU light-peak, 30-VU launch-spike, and 50-VU
headroom phases. This is a **capacity confidence check**, not a
breaking-point stress test.

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

## Finding 4 — stale session fixture and same-session collisions caused auth blips at 30 VUs

The first 30-VU attempt (`launch-spike-30vu-001`, later discarded) showed 68
`auth_failures` and dashboard/read p95 breaching their gates. The seeded
session fixture's Supabase access tokens had expired ~55 minutes before that
run started (minted well before the 15-VU runs; k6 replays a static cookie
and never persists a refreshed one), so a growing share of the 160 sessions
were being redirected to `/login` as the run progressed. **Fix:** re-minted
all 160 sessions immediately before testing (`npm run test:load:mint-sessions`).

After re-minting, a clean run (`auth_failures=0`) was followed by a third run
with a smaller blip (8/2336 requests, 0.34%). All 401/403/429/500 counters
stayed at 0 and tenant isolation stayed at 0 in both cases, so this was not a
security or capacity issue. Root cause: `pickSession()`'s original
`(VU + ITER) % pool.length` selection is time-varying by design (intentional,
so a VU samples many users/schools over a run), which means two different
concurrently-running VUs can occasionally select the *identical* static
session cookie at close to the same instant — a scenario a real deployment
never sees (each browser session is unique) but a fixed test fixture can hit
under higher concurrency, most likely racing Supabase's single-use
refresh-token rotation for that shared cookie.

**Fix:** added a `pinned` assignment mode to `pickSession()`
(`load-tests/k6/helpers/auth.js`) used by the launch-spike profile only: each
VU is assigned one exclusive session for its *entire* run, chosen from a
school-interleaved ordering so VUs 1–20 land on all 20 distinct schools (and
21–30 reuse a second role) — guaranteeing zero cross-VU session collisions
whenever VU count ≤ pool size. The 15-VU/20-schools/smoke profiles keep the
original time-varying behavior (already validated, not disturbed). After
this fix, all three recorded 30-VU runs completed with **zero** auth
failures. See suite README "Known coverage limitations."

## 30-VU launch-spike result

**Deployment:** same Vercel Preview, production Next.js build, `heyralli-staging` only
`https://campaignos-3a0ijxpfi-campignos.vercel.app`
**Workload:** ramp 0→10→20→30 VUs (4m), hold 30 VUs (5m), ramp down (2m) — ~11 min, max 30 concurrent VUs
**Traffic mix:** same validated 15-VU mix (30% dashboard, 25% calendar, 15% comms creator, 10% approvals, 10% Communications Hub, 5% settings, 5% org-switch — fallback to dashboard, no seeded multi-org user yet)
**Session assignment:** pinned, one exclusive session per VU for the whole run (Finding 4)

| Run | Checks | Tenant isolation failures | Auth failures | HTTP failure rate | Unexpected 4xx/5xx | Dropped iterations |
|---|---|---:|---:|---:|---:|---:|
| `launch-spike-30vu-001` | 13844/13844 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| `launch-spike-30vu-002` | 14042/14042 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| `launch-spike-30vu-003` | 13956/13956 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| **Total** | **41842/41842 (100%)** | **0** | **0** | **0.00%** | **0** | **0** |

`http_req_duration` (ms), overall:

| Run | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| 001 | 563 | 837 | 1097 | 6905 | 10135 |
| 002 | 535 | 768 | 898 | 2113 | 7798 |
| 003 | 543 | 838 | 1173 | 6173 | 10997 |

Route-level p95 (ms) against the required gates (dashboard/calendar < 2000ms, ordinary read < 1500ms):

| Route | 001 | 002 | 003 | Gate |
|---|---:|---:|---:|---:|
| `dashboard` | 1571 | 971 | 1404 | < 2000 |
| `calendar` | 1226 | 960 | 1250 | < 2000 |
| overall read | 1097 | 898 | 1173 | < 1500 |

All route/read p95 gates passed in all three runs. **p99 and max latency grew
substantially vs. the 15-VU baseline** (p99 ~2.1–6.9s vs. 1.0–2.2s; max
~7.8–11.0s vs. 2.1–3.5s) — a small share (~1%) of requests, concentrated in
`dashboard`, `calendar`, and `event_detail`, took 7–11s. This did not breach
any p95 gate and did not worsen across the three runs (no trend), so it is
most consistent with occasional Vercel serverless cold starts as new function
instances scale up under the 20→30 VU ramp on a Preview deployment, not a
sustained capacity ceiling. **Flagged for follow-up**, not a launch blocker:
watch this specifically during the next (50-VU) test to see if it worsens
with concurrency or stays flat.

No Vercel function errors, Next.js errors, or Supabase errors were observed
in the k6 run logs (0 unexpected 401/403/429/500 across all three runs). No
Resend email was sent during any test window (most recent email predates the
entire 30-VU test window by 9+ hours; zero sent to any `loadtest+` address).

**Result: 30-VU launch-spike profile PASSED all three runs** against every
required hard gate. Safe to proceed to a 50-VU headroom test, with the
tail-latency pattern above tracked as a watch item.

## 50-VU headroom result

**Deployment:** same Vercel Preview, production Next.js build, `heyralli-staging` only
`https://campaignos-3a0ijxpfi-campignos.vercel.app`
**Workload:** ramp 0→15→30→50 VUs (4m), hold 50 VUs (5m), ramp down (2m) — ~11 min, max 50 concurrent VUs
**Traffic mix / sessions:** same validated mix; pinned exclusive session per VU (Finding 4)
**Purpose:** measure whether meaningful headroom exists above expected launch traffic

| Run | Checks | Tenant isolation failures | Auth failures | HTTP failure rate | Unexpected 4xx/5xx | Dropped iterations |
|---|---|---:|---:|---:|---:|---:|
| `launch-headroom-50vu-001` | 22766/22766 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| `launch-headroom-50vu-002` | 22950/22950 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| `launch-headroom-50vu-003` | 23227/23227 (100%) | 0 | 0 | 0.00% | 0 | 0 |
| **Total** | **68943/68943 (100%)** | **0** | **0** | **0.00%** | **0** | **0** |

`http_req_duration` (ms), overall:

| Run | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| 001 | 613 | 985 | 1310 | 4606 | 10896 |
| 002 | 606 | 891 | 1017 | 2087 | 9886 |
| 003 | 593 | 860 | 965 | 1200 | 3584 |

Route-level p95 gates (all met):

| Route | 001 | 002 | 003 | Gate |
|---|---:|---:|---:|---:|
| `dashboard` | 1431 | 1158 | 1126 | < 2000 |
| `calendar` | 1070 | 1039 | 959 | < 2000 |
| overall read | 1310 | 1017 | 965 | < 1500 |

Slow-request counters (observational):

| Run | >3s | >5s | >10s | >3s during 50-VU hold | >5s / >10s during hold |
|---|---:|---:|---:|---:|---:|
| 001 | 55 (1.39%) | 34 (0.86%) | 7 (0.18%) | 4 | 0 / 0 |
| 002 | 31 (0.78%) | 27 (0.68%) | 0 | 0 | 0 / 0 |
| 003 | 1 (0.02%) | 0 | 0 | 1 | 0 / 0 |

**Tail-latency interpretation vs 15/30 VU:** overall p95 rose modestly from
15→50 VU (~+33% mean) but was essentially flat vs 30 VU (~+4%). p99 and max
at 50 VU were **lower** than the 30-VU worst case (p99 mean −48% vs 30 VU).
Most >3s requests clustered during ramp-up/ramp-down (cold-start scaling),
not during the 50-VU hold — hold windows had ≤4 requests >3s and **zero**
requests >5s across all three runs. Latency also improved across the three
recorded runs (warm cache / warmed function instances), which is the opposite
of a growing-capacity failure mode.

**Result: 50-VU headroom profile PASSED all three runs.** Meaningful headroom
exists above expected launch traffic. Safe to proceed to 100-school validation,
still watching cold-start tails during ramp transitions.

## Final summary — 20-school phase (closed)

Across four staged profiles against the same `heyralli-staging` 20-school /
160-user environment (smoke → 15-VU light-peak → 30-VU launch-spike → 50-VU
headroom), Hey Ralli passed every required launch gate on every recorded run:

| Gate | Requirement | Result across all recorded runs |
|---|---|---|
| Tenant isolation failures | 0 | **0** (9/9 runs) |
| Auth failures | 0 | **0** (9/9 runs, after Finding 4 fix) |
| HTTP failure rate | < 1% | **0.00%** (9/9 runs) |
| Unexpected 401/403/429/500 | 0 | **0** (9/9 runs) |
| Dropped iterations | 0 | **0** (9/9 runs) |
| Checks passed | ≥ 99% | **100%** (130,039/130,039 checks) |
| Dashboard / calendar p95 | < 2000ms | met on every run (max 1571ms) |
| Ordinary read p95 | < 1500ms | met on every run (max 1310ms) |

Tail latency (p99/max) rose from 15→30 VU, driven by Preview-deployment
cold starts during ramp transitions, then **held flat-to-improved** from
30→50 VU with near-zero >5s requests during the steady hold window —
evidence of meaningful headroom, not a capacity ceiling being approached.
No external-provider side effects (no Resend email, no OpenAI/Meta/Stripe
calls) were triggered in any of the 9 recorded runs.

**Status: 20-school phase is closed and PASSED.** Hey Ralli is confirmed
launch-ready for the first 20 school organizations at up to 50 concurrent
users with headroom to spare.

## 100-school / 20-VU data-scale — Run 1

**Deployment:** same Vercel Preview, production Next.js build,
`heyralli-staging` Micro tier, 100-school architecture dataset (100 orgs, 800
users, 2,500 events, 12,500 milestones)
**Workload:** ramp 0→5→20 VUs (5m), hold 20 VUs (20m), ramp down (3m) — ~28.5
min, 20 pinned owner sessions across 20 distinct organizations
**Full report:** [100-school-20vu-data-scale-run1.md](./100-school-20vu-data-scale-run1.md)

| Metric | Result | Gate |
|---|---:|---|
| Checks | 99.79% (23,949/23,997) | **FAIL** (`rate==1`) |
| Tenant isolation failures | 0 | PASS |
| Auth failures (real distinct events; raw counter double-counts to 96 — see report) | 48 | **FAIL** (`count==0`) |
| HTTP failure rate | 0.00% | PASS |
| Unexpected 401/403/429/500 | 0/0/0/0 | PASS |
| Dropped iterations | 0 | PASS |
| `kind:read` / `dashboard` / `calendar` / `events_list` p95 | 1.19s / 1.41s / 1.29s / 1.15s | **PASS** (all under gate) |

**Root cause:** all 48 auth failures were clustered in a ~2-minute window
near the end of the 20-minute peak hold and are directly explained by
Supabase Auth returning `429 over_request_rate_limit` to Next.js
middleware's session-refresh calls (confirmed via Vercel runtime logs).
Supabase's own performance advisor confirms the Auth service's database
connection allocation is capped at a fixed 10 absolute connections
regardless of compute tier — an infrastructure constraint, not a
tenant-isolation, data-integrity, or application-code defect. Post-run
verification found zero dataset/storage drift, all 25 integrity checks
passing, and full session/app recovery. See the full report for the
complete finding classification (including two independently-discovered
test-harness/observability defects: a preflight step that can poison a
session the profile depends on, and a metrics counter that double-counts
`auth_failures`).

**Status: 100-school / 20-VU Run 1 complete, awaiting a decision on the
Auth rate-limit ceiling before Run 2.** Not yet cleared for a higher-VU
100-school profile.

## 100-school / 20-VU data-scale — Run 2 (auth remediation)

**Deployment:** new staging-pinned Preview
`https://campaignos-p2ltky8cr-campignos.vercel.app`
(`dpl_D5348dMfdWTs3rCFmtBHtL8s9zdn`) on commit `85caa0e` (`getClaims`
middleware/RSC path). Auth allocation left at Absolute/10.
**Full report:** [100-school-20vu-data-scale-run2.md](./100-school-20vu-data-scale-run2.md)

| Metric | Run 1 | Run 2 |
|---|---:|---:|
| Auth failures (real) | 48 | **0** |
| Checks | 99.79% | **100%** |
| Auth 429s in run window | ~48 | **0** |
| `kind:read` / dashboard / calendar / events_list p95 | 1.19s / 1.41s / 1.29s / 1.15s | **1.02s / 1.16s / 0.99s / 0.93s** |
| Overall max | 32.4s | **3.56s** |
| k6 exit | 99 | **0** |

**Status: remediation confirmed. Safe to continue the remaining 100-school
load-test sequence.** Absolute→Percentage Auth allocation remains optional
capacity hygiene for higher-VU soaks, not a blocker for this profile.

## 100-school / 50-VU data-scale — Run 1 (concurrency headroom)

**Deployment:** same staging-pinned Preview as 20-VU Run 2
(`campaignos-p2ltky8cr`, `85caa0e` / `getClaims`). Auth Absolute/10 unchanged.
**Workload:** ramp 0→15→30→50 (4m), hold 50 (5m), ramp down (2m) — same shape
as 20-school headroom; 50 pinned owners across 50 orgs; 100-school traffic mix.
**Full report:** [100-school-50vu-data-scale-run1.md](./100-school-50vu-data-scale-run1.md)

| Metric | Result | Gate |
|---|---:|---|
| Checks | 100% (21,240/21,240) | PASS |
| Auth / tenant / unexpected 401·403·429·500 / dropped | all 0 | PASS |
| `kind:read` / dashboard / calendar / events_list p95 | **1.39s / 1.57s / 1.36s / 1.27s** | PASS (read at 93% of 1.5s gate) |
| k6 exit | **0** | PASS |

**Interpretation:** first meaningful architecture stress at data scale —
correctness intact, latency elevated ~35% vs 100-school/20-VU and above the
20-school/50-VU band. Both logged slow requests (>3s / ~30s) were ramp-up
cold starts, not hold-window failures. Post-run integrity 25/25; row-count
drift 0.

**Status: PASSED.** Hold-phase slow counters were later found to have been
blind for this run ID (see Run 2); wall-clock still placed both slows in
ramp-up. Absolute→Percentage Auth remains optional hygiene.

## 100-school / 50-VU data-scale — Run 2 (stability replicate)

**Deployment / Auth / dataset:** unchanged from Run 1. Harness-only fix:
hold tracking for `50vu` run IDs + `K6_TRACK_HOLD_SLOW=true` on the npm
scripts; observational `slow_req_over_20s`.
**Full report:** [100-school-50vu-data-scale-run2.md](./100-school-50vu-data-scale-run2.md)

| Metric | Run 1 | Run 2 |
|---|---:|---:|
| `kind:read` p95 | 1.39s | **1.38s** (reproduced) |
| `dashboard` p95 | 1.57s | 1.69s |
| Approvals max | 29.97s | **1.85s** (30s outlier isolated) |
| >5s / >10s / >20s | 1 / 1 / 1 | **0 / 0 / 0** |
| Hold >3s | (counters blind) | **1** (communications 3.2s) |
| Auth / tenant / checks / k6 exit | all green / 0 | **all green / 0** |

**Interpretation:** 1.38–1.39s ordinary-read p95 is a **stable 50-VU capacity
pattern**, not a one-off. The ~30s approvals request was **isolated
ramp/cold-start**. Correctness headroom at 50 VU is solid; latency headroom
is tight (~92% of the 1.5s read gate).

**Status: PASSED. Proceeded to 100-school / 75-VU boundary probe.**

## 100-school / 75-VU data-scale — Run 1 (boundary discovery)

**Deployment / Auth / dataset:** unchanged from 50-VU Run 2. Profile uses the
same 11-minute stage durations with peak 75 (`0→25→50→75`). Hard gates
unchanged.
**Full report:** [100-school-75vu-data-scale-run1.md](./100-school-75vu-data-scale-run1.md)

| Metric | 50-VU Run 2 | 75-VU Run 1 |
|---|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** |
| `kind:read` p95 | 1.38s | **2.77s** (gate 1.5s — **FAIL**) |
| `dashboard` / `calendar` / `events_list` p95 | 1.69 / 1.40 / 1.22s | **3.17 / 2.83 / 2.42s** (all **FAIL**) |
| Hold >3s / >5s / >10s | 1 / 0 / 0 | **134 / 2 / 0** |
| Overall max | 3.88s | 5.47s |
| Post-run integrity | 25/25 | **25/25**, drift 0 |

**Interpretation:** **first meaningful performance boundary.** Correctness
holds at 75 concurrent pinned owners; latency does not. Degradation is
**hold-sustained and multi-route**, not an isolated ramp spike. Do **not**
loosen the 1.5s read gate. Do **not** proceed to 100 VUs until diagnosed and
re-validated at 75 VU after a fix.

**Status: LATENCY BOUNDARY — correctness PASS, p95 gates FAIL. Stop
higher-VU progression.**

## 100-school / 75-VU — RCA + Run 2 re-validation

**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md) ·
**Run 2:** [100-school-75vu-data-scale-run2-rca.md](./100-school-75vu-data-scale-run2-rca.md)

**Root cause class:** dual bottleneck — `http_req_waiting` and
`http_req_receiving` both inflate under a sustained 75-VU hold while
correctness stays perfect. Auth Absolute/10 is not causal. Database-only is
not supported (receiving remains ~half+ of read p95).

**Smallest app fix tried:** collapse three overlapping dashboard
`getEventsInDateRange` scans into one planning-window fetch.

| Metric | Run 1 | Run 2 (after query collapse) |
|---|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** |
| `kind:read` p95 | 2.77s | **3.95s** (still **FAIL**) |
| waiting / receiving p95 | 1.21 / 1.73s | **1.86 / 2.15s** |
| Hold >3s / >10s | 134 / 0 | **395 / 92** |

**Interpretation:** query collapse is **insufficient** (as predicted). Run 2
tails were worse/noisier under the same profile — multi-route hold slows
(dashboard, event_detail, events_list, calendar, …) indicate systemic
concurrency + large RSC HTML, not a single Today query. Next remediation:
hot-route payload/streaming (and only then a Micro→Small A/B if waiting
tails remain). Do **not** proceed to 100 VU.

**Status: RCA COMPLETE for this cycle — 75-VU gates still FAIL; stop
higher-VU progression.**

## 100-school / 75-VU — Run 3 (Attention lean counts)

**Report:** [100-school-75vu-data-scale-run3-attn.md](./100-school-75vu-data-scale-run3-attn.md)

**Change:** Attention widget counts use lean sidebar/scheduling badge APIs and
short-circuit volunteer/task probes instead of materializing
`getDashboardRichListData` (Volunteer Master + Task Hub + classic queue) on
every default dashboard load.

**Fixture pivot:** `arch100` has **0** classic `approval_requests`, **0**
volunteer sources, **0** playbook tasks — classic-queue diet would be a no-op;
Attention was paying for empty rich lists.

| Metric | Run 1 | Run 3 |
|---|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** |
| `kind:read` p95 | 2.77s | **3.35s** (still **FAIL**) |
| waiting / receiving **avg** | 630 / 838ms | **635 / 837ms** (~flat) |
| Hold >3s | 134 | **344** |

**Keep** the change (correctness-preserving; removes wasted work). Combined with
Run 2 query-collapse, two waiting-path fixes have not cleared the gate. Next:
approvals HTML receiving diet and/or Micro→Small A/B.

**Status: 75-VU gates still FAIL after second app remediation; stop higher-VU.**

## 100-school / 75-VU — Run 4 (Approvals terminal deferral)

**Report:** [100-school-75vu-data-scale-run4-defer.md](./100-school-75vu-data-scale-run4-defer.md)
**RCA (updated):** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

**Change:** Org Approvals hub SSR omits `scheduled` / `posted` / `published`
detail rows; thin status index keeps pulse counts accurate; client lazy-loads
terminal rows on Scheduled/Posted pulse or search. Revision uses complete fetch.

| Metric | Run 1 | Run 3 | Run 4 |
|---|---:|---:|---:|
| Approvals HTML / detail rows | ~224 KB / 125 | ~218.5 KB / 125 | **130.6 KB / 50** |
| Auth / tenant / checks | 0 / 0 / 100% | 0 / 0 / 100% | **0 / 0 / 100%** |
| `kind:read` p95 | 2.77s | 3.35s | **3.35s** (still **FAIL**) |
| receiving p95 | 1.73s | 2.00s | **1.93s** |
| Hold >3s / >5s | 134 / 2 | 344 / 53 | **343 / 9** |

**Keep** deferral (explicit, ~40% Approvals HTML cut, no correctness hit). Overall
receiving/read p95 did **not** materially improve; stop further speculative
app-side latency work. **Next:** controlled Micro→Small A/B under identical 75-VU.

**Status: 75-VU gates still FAIL after receiving-focused remediation; Micro→Small is now the best next experiment.**

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
- Re-mint sessions immediately before any recorded higher-VU run set
  (access-token TTL ~1hr); see Finding 4.
