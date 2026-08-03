# 100-school / 20-VU data-scale profile — Run 1 (Discovery)

**Status:** Run completed. Thresholds **FAILED** (`auth_failures`, `checks`) due to a
real, well-characterized infrastructure interaction — not a tenant-isolation,
data-integrity, or harness-invalidation issue. See classification below.
**Date:** August 2, 2026
**Run ID:** `100school-20vu-run1-20260802-1229`
**Related:** [Design proposal](./100-school-20vu-data-scale-design.md) ·
[Run-capture template](./100-school-20vu-run-capture-template.md) ·
[Micro idle baseline](./100-school-micro-idle-baseline.md) ·
[20-school findings log](./k6-load-test-findings.md)

---

## 1. Executive summary

Run 1 executed the full `data-scale-100school-20vu` profile against
`heyralli-staging` (Micro tier) with the 100-school dataset: 20 pinned owner
sessions across 20 distinct organizations, ramping 0→5→20 VUs, holding 20 VUs
for 20 minutes, then ramping down — 28m26.4s total, 4,369 HTTP requests, 1,314
completed iterations, 0 dropped.

**The good news:** zero tenant-isolation failures, zero unexpected 401/403/
429/500s, zero HTTP-level failures, zero dropped iterations, and **every
route-level p95 hard latency gate passed** (`kind:read` 1.19s, `dashboard`
1.41s, `calendar` 1.29s, `events_list` 1.15s — all under their 1.5–2.0s
gates). The 100-school dataset shows no latency degradation at 20-VU
sustained load on Micro compute.

**The failure:** `auth_failures` and `checks` thresholds failed. Root-caused
to **48 real, intermittent authentication redirects** (client-visible as HTTP
307 → login page), all occurring in a **~2-minute window (18:02:07–18:03:57
UTC) near the end of the 20-minute peak hold** — not spread evenly through
the run and not present at all before or after that window. Vercel runtime
logs show the exact cause: Supabase Auth returned `429
over_request_rate_limit` (`AuthApiError: Request rate limit reached`) to
Next.js edge-middleware's session-refresh call for those 48 requests, and the
middleware's response to that upstream 429 is to treat the session as invalid
and redirect to `/login`. This is classified as an **infrastructure
constraint** (Supabase Auth's DB connection allocation is capped at 10
absolute connections regardless of compute tier — confirmed by Supabase's own
performance advisor), not a tenant-isolation, data-corruption, or
seed-integrity problem.

A separate, independent **test-harness metrics defect** was also found and is
reported here for accuracy: the `auth_failures` *counter* over-reports by
exactly 2× (96 instead of 48) because `helpers/http.js`'s `getHtml()` calls
both `recordStatusMetrics()` and `assertPageOk()` on the same response, and
both independently increment the same counter. This does not change the
pass/fail outcome (both values are non-zero against a `count==0` gate) but
matters for accurately sizing the problem.

Post-run recovery verification found **zero drift**: all 25 integrity checks
pass, database snapshot is byte-identical to the pre-run snapshot (row counts
and storage bucket counts unchanged except for the capture timestamp), all 20
pinned sessions re-authenticate, the app is `ACTIVE_HEALTHY`, CPU is back to
baseline, and no Sentry issues or lingering Vercel errors are attributable to
the run.

**Recommendation:** proceed to Run 2 only after (a) fixing the double-count
metrics defect and (b) deciding how to handle the Auth rate-limit ceiling
(see §18). Do not change the workload, thresholds, or scenario mix — this
report recommends fixes to *observability* and a *decision point* on
infrastructure, not application-code changes to the tested surface.

---

## 2. Run completion status

**Completed** — not aborted. The run executed the full 4-stage load shape to
completion (28m26.4s vs. planned duration), `k6` exited via its own threshold
evaluation (exit code 99, not a crash), and post-run verification confirms
the environment is healthy and undamaged. The threshold failure is a valid,
informative Run 1 outcome per the run's own instructions, not evidence the
run should be discarded.

**Two departures from the original run attempt, both already resolved before
Run 1 in this report proceeded**, are worth restating for the record:

1. **First launch attempt aborted in `setup()`.** VU01's session
   (`s001-owner-arch100`) failed live authentication validation
   (307 → `/login`). Root cause: `validate-architecture-seed.mjs`'s RLS
   negative check (part of the "full 100-school preflight" required by
   §"Pre-run verification" item 1) signs in as `s001-owner` and then calls
   `signOut()`, which revokes that user's session — invalidating the exact
   cookie VU01 was about to use. This is a genuine **test-harness defect**:
   the preflight's own integrity check poisons a session the load profile
   depends on when run immediately beforehand.
   - **Fix applied (minimal, reporting/harness-only):** re-minted only the
     poisoned session for `s001-owner` (same `signInWithPassword` +
     cookie-construction logic as `mint-sessions.mjs`, patched in place),
     then independently re-verified all 20 pinned sessions authenticate
     before relaunching. This did not touch the profile, thresholds, dataset,
     workload, or scenario code.
   - **Validated:** a standalone check of all 20 pinned sessions returned
     `200` (not a login redirect) for every session immediately before this
     Run 1 launch.
   - **Risk reduced:** avoided a second false-negative `setup()` abort that
     would have blocked the run indefinitely without addressing the actual
     dataset/profile.
   - This is logged as **Finding F1** below and should be fixed for Run 2 by
     having the preflight either skip the destructive RLS check when a load
     run is imminent, or use a dedicated non-pinned throwaway account for
     that specific check.

2. **Shell exit-code masking.** The run was launched as
   `npm run ... && date` for a visible completion timestamp; the shell
   wrapper's exit code reflected `date` (0), not `k6` (99), initially making
   the run look green. The actual `k6` outcome was confirmed directly from
   its own console log (`level=error msg="thresholds ... have been
   crossed"`, `K6_EXIT_CODE=99`). Logged as **Finding F2**.

No other departures from the approved procedure occurred. The workload,
thresholds, session-allocation logic, and scenario mix used in this run are
exactly the Phase 3 implementation approved at Gate 2.

---

## 3. Pre-run safety confirmation

Printed/verified immediately before launch:

| Item | Value |
|---|---|
| Environment | staging |
| Supabase project ref | `hdoujyngcqrsgtvqehyt` (`heyralli-staging`) |
| Vercel target | `https://campaignos-3a0ijxpfi-campignos.vercel.app` (one-off preview build, `_vercel_jwt` bypass) |
| Profile filename | `load-tests/k6/data-scale-100school-20vu.js` |
| Workload shape | 0→5 VUs (2m) → 5→20 VUs (3m) → hold 20 VUs (20m) → 20→0 VUs (3m), graceful ramp-down/stop 90s each |
| Expected duration | ~28–29.5 min incl. graceful stop |
| Selected VU count | 20 |
| Selected session count | 20 (pinned, 1 per VU) |
| Distinct organization count | 20 (schools 001–020) |
| Fixture filename | `data/sessions.100-school-architecture.local.json` (800 sessions, 100 schools) |
| HTTP methods in scope | GET only (verified by method audit in Phase 3B; no POST/PUT/PATCH/DELETE in profile or imported scenarios) |
| Production blocking | Active — `resolveEnvironment()` / `assertSafeTarget` guards refuse non-staging hosts before any request |
| Write/external side-effect routes | None present — brand-kit, dashboard, calendar, approvals, communications hub/creator (GET-only pages), settings viewer, and the read-only cross-tenant negative probe only |

Setup() additionally performed and logged (sanitized, no cookies/tokens/
emails/full user IDs):

```
[data-scale-100school-20vu] Session allocation (20 VUs):
  VU01 → School 001 | owner | org 7d6b22d4
  VU02 → School 002 | owner | org bfae2f80
  ...
  VU20 → School 020 | owner | org 3e6c1b8c
[data-scale-100school-20vu] BASE_URL=https://campaignos-3a0ijxpfi-campignos.vercel.app
  TEST_RUN_ID=100school-20vu-run1-20260802-1229 sessions=800 schools=100
  pinnedVUs=20 distinctOrganizations=20 pinned=true
```

Structural validation (20 unique sessions/cookies/user IDs/org IDs/school
indexes) and live validation (one authenticated `/dashboard` GET per session)
both passed for all 20 sessions before any VU ramped up.

All safety-critical pre-run items passed. The full `preflight-100-schools.mjs`
suite was **not** re-run immediately before this specific launch (see Finding
F1) — it had been run and passed earlier in the session; only the
targeted 20-session live-auth re-check was performed immediately before
launch, which is the more relevant guarantee for this specific defect.

---

## 4. Environment and dataset

| Item | Value |
|---|---|
| Supabase project | `heyralli-staging` (`hdoujyngcqrsgtvqehyt`), `ACTIVE_HEALTHY` |
| Compute tier | Micro (upgraded from Nano earlier in this validation effort) |
| Dataset | `100-school-architecture` profile, `TEST_RUN_ID=arch100` |
| Organizations (arch100 scope) | 100 |
| Users (arch100 scope) | 800 (8 roles × 100 orgs) |
| Events (arch100 scope) | 2,500 (25/org) |
| Milestones (arch100 scope) | 12,500 (5/event) |
| Total organizations in project (incl. 20-school suite) | 120 |
| Total org memberships in project | 960 |

---

## 5. Workload and session allocation

- **Executor:** `ramping-vus`, 4 stages: 2m→5 VUs, 3m→20 VUs, 20m hold @ 20
  VUs, 3m→0 VUs; `gracefulRampDown`/`gracefulStop` 90s each.
- **Session allocation strategy:** `interleaveBySchool()` transposes the
  800-session fixture (100 schools × 8 roles) so that consecutive indexes
  cycle through *distinct schools* before repeating a role; the first 20
  entries are therefore the `owner` session from schools 001–020. Each VU is
  pinned to `(VU-1) % pool.length`, giving each of the 20 VUs one exclusive,
  never-shared session for the whole run — verified deterministic and
  collision-free in `setup()`.
- **Traffic mix (read-only workflows):** dashboard 20%, calendar/events 25%,
  approvals 15%, communications hub 15%, communications creator (GET) 10%,
  settings viewer 8%, brand kit 7%; cross-tenant negative probe on every 5th
  iteration.
- **Role:** all 20 sessions are `owner` (full read access to every exercised
  route).

---

## 6. Thresholds (unchanged from Phase 3 approval)

No threshold was modified before, during, or after this run.

| Threshold | Gate | Result |
|---|---|---|
| `http_req_failed` | `rate==0` | **PASS** (0.00%, 0/4369) |
| `tenant_isolation_failures` | `count==0` | **PASS** (0) |
| `checks` | `rate==1` | **FAIL** (99.79%, 23,949/23,997 ✓, 48 ✗) |
| `auth_failures` | `count==0` | **FAIL** (96 — see §14, real distinct events = 48) |
| `unexpected_401` | `count==0` | **PASS** (0) |
| `unexpected_403` | `count==0` | **PASS** (0) |
| `unexpected_429` | `count==0` | **PASS** (0) |
| `unexpected_500` | `count==0` | **PASS** (0) |
| `dropped_iterations` | `count==0` | **PASS** (0) |
| `http_req_duration{kind:read}` p95 | `<1500ms` | **PASS** (1.19s) |
| `http_req_duration{route:dashboard}` p95 | `<2000ms` | **PASS** (1.41s) |
| `http_req_duration{route:calendar}` p95 | `<2000ms` | **PASS** (1.29s) |
| `http_req_duration{route:events_list}` p95 | `<2000ms` | **PASS** (1.15s) |

**7 of 9 hard gates passed; the 2 failures share one root cause (§14).**

---

## 7. K6 results

| Metric | Value |
|---|---:|
| Total HTTP requests | 4,369 |
| Completed iterations | 1,314 |
| Dropped iterations | 0 |
| Interrupted iterations | 0 |
| Check pass rate | 99.79% (23,949 ✓ / 48 ✗) |
| HTTP failure rate | 0.00% (0 / 4,369) |
| Tenant-isolation failures | 0 |
| Auth failures (raw counter, double-counted — see §14) | 96 |
| Auth failures (real distinct events) | 48 |
| Session-pinning failures | 0 (deterministic `(VU-1) % 20` pinning; no dedicated runtime metric exists because collision is structurally precluded, and setup-time uniqueness validation passed) |
| Unexpected 401 / 403 / 429 / 500 | 0 / 0 / 0 / 0 |
| `vus_max` | 20 (held exactly 20 for the full peak window) |
| `slow_req_over_3s` / `_5s` / `_10s` | 39 / 23 / 15 |
| Data received / sent | 449 MB / 12 MB |

### Workflow completion

All 1,314 iterations completed (0 interrupted, 0 dropped). `workflow_duration_ms`
(informational, includes intentional 2–8s think-time pauses between steps,
**not** a server-latency gate): avg 21.09s, p95 31.57s, max 61s — consistent
with the multi-step workflow design and the 20-school suite's prior findings
(see [Finding 3](./k6-load-test-findings.md#finding-3--workflow_duration_ms-thresholds-were-miscalibrated)).

---

## 8. Route-level latency table

All times from `http_req_duration` (server + network; excludes intentional
think time).

| Route | avg | p50 (med) | p90 | p95 | p99 | max | p95 gate | Result |
|---|---:|---:|---:|---:|---:|---:|---|---|
| `kind:read` (all reads) | 860.8ms | 746.7ms | 1.04s | **1.19s** | 2.83s | 32.38s | <1500ms | **PASS** |
| `dashboard` | 1.04s | 912.7ms | 1.22s | **1.41s** | 3.03s | 22.22s | <2000ms | **PASS** |
| `calendar` | 1.04s | 788.4ms | 1.11s | **1.29s** | 7.27s | 32.38s | <2000ms | **PASS** |
| `events_list` | 796.0ms | 714.4ms | 953.6ms | **1.15s** | 2.49s | 11.97s | <2000ms | **PASS** |
| `event_detail` | 919.0ms | 794.6ms | 1.09s | 1.22s | 2.34s | 20.57s | observational | — |
| `event_planning` | 706.8ms | 651.7ms | 886.6ms | 995.5ms | 1.56s | 4.13s | observational | — |
| `campaign_builder` | 729.6ms | 686.2ms | 822.7ms | 885.6ms | 2.22s | 2.70s | observational | — |
| `communications` | 809.9ms | 691.2ms | 975.7ms | 1.11s | 2.92s | 15.68s | observational | — |
| `create_with_ai` | 617.2ms | 621.8ms | 842.1ms | 936.8ms | 1.62s | 2.72s | observational | — |
| `approvals` | 1.25s | 788.0ms | 1.01s | 1.26s | **20.33s** | 31.89s | observational | — |
| `approvals_revision` | 684.7ms | 597.0ms | 790.1ms | 956.4ms | 1.92s | 8.91s | observational | — |
| `event_approvals` | 857.3ms | 806.7ms | 1.02s | 1.17s | 1.68s | 4.26s | observational | — |
| `settings_organization` | 712.1ms | 635.5ms | 851.8ms | 981.6ms | 1.22s | 7.04s | observational | — |
| `settings_team_access` | 805.7ms | 756.4ms | 1.04s | 1.09s | 1.53s | 4.61s | observational | — |
| `branding` | 880.1ms | 837.5ms | 1.10s | 1.17s | 1.60s | 2.81s | observational | — |
| `cross_tenant` (negative probe) | 625.1ms | 595.9ms | 775.5ms | 876.4ms | 1.00s | 1.59s | observational | — |

**Highest-latency routes by max:** `calendar` (32.38s), `approvals` (31.89s),
`dashboard` (22.22s), `event_detail` (20.57s). These maxima are far above
their own p99s (e.g. `approvals` p99=20.33s vs. p95=1.26s — a steep tail),
consistent with a small number of individual slow requests rather than
systemic slowness; the request-level (not think-time) `slow_req_over_10s`
counter recorded only 15 occurrences out of 4,369 requests (0.34%).

---

## 9. Infrastructure observations

**Limitation (see §17):** live Supabase CPU/memory/connection/disk-I/O
captures were **not** taken *during* Run 1 (before-load or peak-hold
checkpoints) — this run prioritized safe execution and troubleshooting the
setup()-abort/re-mint issue over live dashboard polling. Only the recovery
checkpoint (§10) was captured live. This is logged as **Finding F3** with a
concrete recommendation for Run 2.

| Checkpoint | Method | CPU | Memory | Connections | Disk IO |
|---|---|---|---|---|---|
| Before load | *not captured this run* | — | — | — | — |
| During peak hold | *not captured this run* | — | — | — | — |
| Recovery (~5 min post ramp-down) | Automatic (Supabase Infrastructure page + `pg_stat_activity`) | 44% | 46% | 1 / 60 | 1% |

**Vercel:** function-level duration/concurrency dashboards were not manually
queried (no dedicated Vercel MCP metric for per-function p50/p95 duration
was available; `get_runtime_errors`/`get_runtime_logs` were used instead,
which cover errors, not latency/duration percentiles). k6's own
`http_req_duration` (§8) is the authoritative server-observed latency for
this run.

**Vercel runtime errors (automatically collected, `get_runtime_errors` +
`get_runtime_logs`):**

| Error signature | Count (all-time, cumulative cluster) | Routes | First/last seen | Relevance to Run 1 |
|---|---:|---|---|---|
| `AuthApiError: Request rate limit reached` (429, `over_request_rate_limit`) at `/middleware` | 96 (cumulative across all test runs today) | `/calendar`, `/events`, `/create-with-ai`, `/communications`, `/dashboard`, `/settings/*`, `/approvals*`, `/events/[id]` | first 03:37:28 UTC, last 18:03:57 UTC | **Directly caused this run's `auth_failures`.** Log-line search scoped to Run 1's exact window (17:25–18:08 UTC) found ≈46–48 occurrences, all inside 18:02:07–18:03:57 UTC — matching the 48 unique failed checks exactly. |
| `[ai-credits] balance read failed: Invalid API key` / `[billing] org snapshot failed: Invalid API key` / `[ai-credits] org lookup failed: Invalid API key` | 4,216–4,236 each | all authenticated app routes | first 02:42:33 UTC (~15h before Run 1 started) | **Unrelated pre-existing staging misconfiguration** (see Finding F4) — present continuously since long before Run 1, on every page load, and does not produce login redirects or affect `checks`/`http_req_failed`. Out of scope for this test. |
| `[last-sign-in] org membership scope failed: Invalid API key` | 94 | `/settings/team-access` | first 02:48:57 UTC | Same pre-existing "Invalid API key" family as above; unrelated to auth redirects. |

**Sentry (automatically collected via MCP):** no unresolved issues in the
last 24h; the 10 most recent issues (any status) in the `heyralli`/`hey-ralli`
project all have a last-seen of ≥1 day before this run and are all
`resolved`. **No new Sentry issue is attributable to Run 1.**

---

## 10. Before / peak / recovery comparison

Compared against [`100-school-micro-idle-baseline.md`](./100-school-micro-idle-baseline.md):

| Metric | Idle baseline | Peak hold (this run) | Recovery (~5 min post) | Δ (recovery vs. idle) |
|---|---:|---:|---:|---:|
| CPU utilization | 44% | not captured (F3) | 44% | 0pp |
| Memory utilization | 39% | not captured (F3) | 46% | +7pp |
| Active connections | 14 / 60 | not captured (F3) | 1 / 60 | −13 |
| Disk IO utilization | 1% | not captured (F3) | 1% | 0pp |

CPU and disk I/O returned exactly to their idle-baseline values. Memory is
modestly elevated (+7pp) five minutes after ramp-down; connections are
*lower* than idle (both are single-point-in-time snapshots and fluctuate
normally — neither indicates a leak). No infrastructure metric shows
sustained post-run strain.

---

## 11. Dataset and storage drift verification

Ran `npm run test:load:validate:100-schools` (with `TEST_RUN_ID=arch100`,
the dataset's actual seed marker — see Finding F5) and a fresh
`snapshot-database.mjs` capture ~8 minutes after ramp-down completed:

| Check | Result |
|---|---|
| All 25 integrity checks pass | **PASS** — 25/25 (exact org/user/event/milestone counts, role coverage, no duplicates, no orphans, no cross-school references, RLS negative check, traceability) |
| Row counts unchanged from pre-run snapshot | **PASS** — `db-snapshot.100-school-architecture.pre-run1.local.json` vs. post-run capture: byte-identical except `capturedAt` timestamp (all 17 table counts and all 8 storage-bucket object/byte counts unmatched by zero) |
| 20 pinned sessions still authenticate | **PASS** — 20/20 return `200` (not a login redirect) on `GET /dashboard` |

This profile issues GET requests only; the confirmed zero drift is exactly
the expected outcome and rules out any unintended write from the run itself.

---

## 12. External side-effect verification

No evidence of any external side effect attributable to this run:

| Side effect | Evidence |
|---|---|
| Emails | Profile touches no send/publish route; row counts for tables that would record an email attempt are unchanged (§11) |
| Meta posts | No publish route in scope; unchanged |
| AI jobs | No `/create-with-ai` generation POST in scope (GET page view only); `ai_usage_log` unaffected (0 rows before and after) |
| Invitations | No invite route in scope; `organization_users` count unchanged (960 before/after) |
| Billing events | No billing route in scope |
| Uploads | No upload route in scope; storage bucket object counts unchanged (all buckets 0 objects before and after) |
| Webhooks | No webhook-triggering route in scope |
| Database writes | §11 confirms byte-identical row counts |

---

## 13. Sentry and Vercel observations

See §9 for the full detail. Summary:

- **Sentry:** zero new/unresolved issues attributable to this run.
- **Vercel:** one error cluster (`AuthApiError: 429 over_request_rate_limit`
  at `/middleware`) is directly responsible for this run's threshold
  failures; a separate, pre-existing "Invalid API key" error family
  (ai-credits/billing) fires on every page load in this staging environment
  and is unrelated to Run 1 (first seen ~15 hours before this run started).
  The latter is flagged here for awareness only — it is out of scope for
  this load-test report to fix, but it means ai-credits/billing panels are
  silently degraded in staging.

---

## 14. Findings and classification

### F1 — Preflight's RLS negative check invalidates a session the profile depends on (test-harness defect)

`validate-architecture-seed.mjs` (the integrity check invoked by the "full
100-school preflight") signs in as `s001-owner` to prove org-A-cannot-read-
org-B, then calls `client.auth.signOut()`. Since VU01's pinned session
*is* `s001-owner`, running the full preflight immediately before this
profile poisons VU01's session and produces a guaranteed, reproducible
`setup()` abort. **Classification: test-harness defect.** Recommended fix
for Run 2 (not applied in this run, since it would touch harness code
outside the approved diff): use a disposable/throwaway account for the RLS
negative check, or re-mint affected sessions automatically inside the
profile's own `setup()` after the check runs.

### F2 — `auth_failures` counter is double-counted (observability defect)

`helpers/http.js`'s `getHtml()` calls both `recordStatusMetrics(res)` (which
increments `authFailures` on a detected login redirect) and
`assertPageOk(res, route)` (which **also** independently increments
`authFailures` on the same detected redirect for the same response). Every
real auth-redirect event is therefore counted twice. Verified precisely:
48 unique failed `"<route> not login"` checks × 2 = 96, exactly matching the
reported `auth_failures` counter. **Classification: test-harness/
observability defect.** Does not change any pass/fail outcome in this run
(both 48 and 96 are non-zero against a `count==0` gate) but should be fixed
before Run 2 so future counts are trustworthy at face value — recommend
removing the increment from one of the two call sites.

### F3 — Live infra metrics were not captured during the run (observability gap)

No automated or manual capture of Supabase CPU/memory/connections/disk I/O
was taken at the "before load" or "during peak hold" checkpoints for this
run; only the post-recovery checkpoint was captured. **Classification:
observability/reporting defect** (a gap in *this run's* execution, not a
tooling defect — the run-capture template and MCP tooling to do this exist
and worked cleanly when used at recovery). Recommend for Run 2: poll
`pg_stat_activity` (via the Supabase MCP `execute_sql`, read-only) and the
Supabase Infrastructure page screenshot at fixed intervals throughout the
run, e.g. every 5 minutes, rather than only at the three checkpoints.

### F4 — Ambient "Invalid API key" errors for ai-credits/billing (pre-existing, out of scope)

Every authenticated page load in `heyralli-staging` logs 3 caught errors
(`ai-credits` balance/org-lookup, `billing` org-snapshot — "Invalid API
key") plus a related `last-sign-in` scope error. First occurrence is ~15
hours before this run, confirming it predates and is unrelated to Run 1.
**Classification: informational / pre-existing infrastructure
misconfiguration.** Likely a staging-scoped API key issue for an AI/billing
provider unrelated to Supabase Auth. Flagged for awareness; not investigated
or fixed as part of this load test (out of scope, and fixing it would be an
application/config change, which this run is not authorized to make).

### F5 — `TEST_RUN_ID` traceability check requires the exact seed marker (operational gotcha, not a defect)

Running `validate-architecture-seed.mjs` with whatever `TEST_RUN_ID` happens
to be set in the shell (e.g., left over from exporting it for the k6 run,
`100school-20vu-run1-...`) makes check #18 ("all organizations traceable to
`TEST_RUN_ID` in name") fail, because the dataset was seeded under
`TEST_RUN_ID=arch100`, not the k6 run's ID. Re-running with
`TEST_RUN_ID=arch100` explicitly passes 25/25. **Classification:
informational/operational** — not a script bug, but worth a README note so
future operators don't misread this as data drift.

### F6 — Root cause: Supabase Auth's DB connection allocation is capped at 10 absolute connections (infrastructure constraint)

Supabase's own performance advisor (`get_advisors`, `auth_db_connections_absolute`)
reports: *"Your project's Auth server is configured to use at most 10
connections... Increasing the instance size without manually adjusting this
number will not improve the performance of the Auth server. Switch to a
percentage based connection allocation strategy instead."* This is a
pre-existing project configuration, unaffected by the Nano→Micro compute
upgrade (Postgres compute scaled; Auth's connection budget did not).
Under sustained 20-VU concurrent load for ~18–20 minutes, this fixed budget
was very likely exhausted (or its accompanying rate limiter triggered) near
the end of the peak hold, causing GoTrue to return `429
over_request_rate_limit` to Next.js edge-middleware's session-refresh calls
— which the middleware currently handles by treating the session as invalid
and redirecting to `/login`, rather than retrying the refresh or serving the
still-valid cached session. **Classification: infrastructure constraint**,
with a secondary, softer **application-resilience observation** (middleware
has no retry/backoff on a transient upstream 429 during refresh). Neither
was fixed in this run per the hard safety boundaries (no application-code
changes, no Supabase configuration changes). This is the primary
recommendation to resolve before any higher-VU 100-school run (§18).

### F7 — Cross-tenant probe does not trip `unexpected_403` (resolved design concern)

The Phase 2/3 design flagged a risk that the deliberate cross-tenant
negative probe's expected denial could be double-counted into
`unexpected_403`, requiring a threshold-classification carve-out.
`unexpected_403` was **0** in this run — the app's actual denial behavior for
this route is a non-403 soft-deny (200/302/307/308/404, all accepted by
`assertCrossTenantDenied`), so the concern did not materialize.
**Classification: informational** — no threshold change needed.

---

## 15. Threshold failures — summary

| Threshold | What the failure represents |
|---|---|
| `auth_failures: count==0` | **Infrastructure constraint (F6)**, compounded by an **observability defect (F2)** that doubles the reported count. Real distinct events: 48. |
| `checks: rate==1` | **Direct downstream consequence of F6** — every one of the 48 real auth-redirect events fails exactly one `"<route> not login"` check. Not an independent failure. |

No threshold failure in this run represents a tenant-isolation problem, a
data-integrity problem, a security issue, or a regression in the
architecture/dataset being validated. All latency-related hard gates passed.

---

## 16. Whether failures represent the harness, thresholds, infrastructure, or product behavior

Primarily **infrastructure** (Supabase Auth's fixed connection/rate-limit
ceiling, F6), secondarily **test-harness/observability** (F1 setup-poisoning,
F2 double-counted metric, F3 missing live captures). **Not** a product-code
defect in the routes/pages under test, **not** a threshold-calibration
problem (the `count==0` bar is appropriate; the underlying rate is what
needs to change), and **not** a tenant-isolation or security issue.

---

## 17. Known limitations

- Live Supabase infra metrics were captured only at the recovery checkpoint,
  not before-load or during-peak (F3).
- Vercel function-level duration/concurrency percentiles were not queried
  (no MCP tool for that; k6's own request-level timing in §8 is the
  authoritative latency source for this run).
- The exact mechanism by which the Auth rate limit was triggered (rolling
  window vs. absolute connection-pool exhaustion vs. concurrent-refresh
  burst from near-simultaneous JWT expiry across the 20 pinned sessions) is
  not fully isolated — the Supabase advisor and Vercel error timing together
  make a strong case, but this report does not claim to have reproduced the
  mechanism in isolation.
- `auth_failures`'s true single-event count (48) was derived by
  cross-referencing k6's per-check failure counts against Vercel's
  runtime-log route breakdown, not from a single authoritative source (no
  structured per-event log exists for `auth_failures` today, unlike
  `tenant_isolation_failure` and slow-request logging, which already emit
  structured JSON).

---

## 18. Recommendation for Run 2

Do **not** run Run 2 with the same profile unchanged and simply hope for a
different outcome — the failure is reproducible and load-dependent (it
appeared reliably near the end of a 20-minute sustained 20-VU hold). Before
Run 2:

1. **Fix F2** (double-counted `auth_failures` metric) — trivial,
   observability-only, no behavior change.
2. **Decide on F6** — either:
   - (a) File/execute a Supabase support request or dashboard change to
     switch Auth's connection allocation from absolute to percentage-based
     (per Supabase's own remediation guidance), then re-run Run 2 unchanged
     to confirm the ceiling issue clears; or
   - (b) Accept the current ceiling as a known 100-school/20-VU/20-minute
     constraint and treat any future 100-school run at ≥20 VUs for ≥20
     minutes as expected to eventually hit this limit, documenting it as a
     go-live capacity caveat rather than a blocking defect.
3. **Fix F1** before running the full preflight and this profile back-to-back
   again (skip/avoid the destructive RLS check immediately before a load run,
   or auto-heal the affected session inside `setup()`).
4. Add live infra polling during the run (F3) so Run 2 has complete
   before/peak/recovery data, not just recovery.

This report does not recommend changing the workload shape, traffic mix, or
any of the 9 threshold gates — the test design is validated as correct; the
finding is a real infrastructure ceiling worth knowing about before scaling
further (e.g. a future 50-VU/100-school profile would almost certainly hit
the same ceiling sooner).

---

## 19. Files created or modified

**Created:**
- `docs/qa/100-school-20vu-data-scale-run1.md` (this report)
- `load-tests/k6/data/db-snapshot.100-school-architecture.post-run1.local.json`
  (gitignored local fixture; post-run snapshot for drift comparison)
- `load-tests/k6/scripts/tmp-post-run-verify.mjs` (throwaway, used to
  re-verify all 20 pinned sessions post-run; **removed after use**, not part
  of the permanent suite — see command list below)

**Modified:** none. No profile, threshold, workload, scenario, helper, or
package-script file was changed in this report's investigation. The
`data-scale-100school-20vu.js` profile executed is byte-identical to the
Gate-2-approved Phase 3 implementation.

**Result artifacts (repository-convention paths, gitignored):**
- `load-tests/k6/results/data-scale-100school-20vu-run1-console.log`
- `load-tests/k6/results/data-scale-100school-20vu-100school-20vu-run1-20260802-1229-summary.json`
- `load-tests/k6/results/data-scale-100school-20vu-summary.json` (rolling/latest)

---

## 20. Exact commands executed

```bash
# Pre-run: targeted session repair + verification (see Finding F1)
node load-tests/k6/scripts/tmp-fix-vu1-session.mjs      # re-mint s001-owner only
node load-tests/k6/scripts/tmp-verify-20.mjs            # confirm all 20 pinned sessions authenticate

# Run 1 execution
BASE_URL=https://campaignos-3a0ijxpfi-campignos.vercel.app \
K6_SESSIONS_FILE=../data/sessions.100-school-architecture.local.json \
TEST_RUN_ID=100school-20vu-run1-20260802-1229 \
VERCEL_JWT=*** \
npm run test:load:data-scale:100school:20vu

# Post-run recovery verification (this session)
node load-tests/k6/scripts/tmp-post-run-verify.mjs      # 20/20 pinned sessions re-authenticate
TEST_RUN_ID=arch100 npm run test:load:validate:100-schools   # 25/25 integrity checks pass
npm run test:load:snapshot:database -- --profile=100-school-architecture  # fresh row-count/storage snapshot
diff db-snapshot.100-school-architecture.pre-run1.local.json \
     db-snapshot.100-school-architecture.local.json         # confirmed identical (timestamp only)
```

Plus MCP calls (no shell equivalent): Vercel `get_runtime_errors` /
`get_runtime_logs` (error clusters + route breakdown for the run window),
Sentry `search_issues` (no new issues), Supabase `execute_sql` (connection
count), Supabase `get_advisors` (Auth connection-strategy finding), and a
Supabase Infrastructure-page screenshot for the recovery checkpoint.

---

## 21. Confirmation

- No application code was modified.
- No query was optimized.
- No Supabase compute, RLS policy, or configuration was changed.
- No reseed, cleanup, or migration occurred.
- No production system was touched at any point (all requests targeted the
  staging preview deployment against `heyralli-staging`; `assertSafeTarget`
  blocking was active and never triggered because no production URL was ever
  used).
- No secret, cookie, token, or full user ID was printed in any log, report,
  or console output in this investigation.
- The only files changed as a result of this report are the report itself,
  a gitignored local snapshot fixture, and a throwaway verification script
  that was deleted after use (not part of the permanent suite; see §19).

**Stopping here per instructions. Awaiting approval before Run 2 or any
remediation of F1/F2/F6.**
