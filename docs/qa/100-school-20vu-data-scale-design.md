# 100-school / 20-VU data-scale design (accepted)

Status: **implemented** (Phase 3). Source of truth for
`load-tests/k6/data-scale-100school-20vu.js`. This document captures the
Phase 2 design proposal as approved, plus the refinements applied when the
user approved Phase 3.

## Purpose

A staging-only, read-heavy architecture validation of Hey Ralli against the
**100-school dataset** (100 orgs / 800 users, Micro Supabase compute) using
**20 pinned authenticated VUs** spread across 20 distinct organizations,
navigating core product areas the way ordinary users do. This is not a
peak-VU capacity search — 20 VUs is a modest, realistic concurrency level.
The question this test answers is whether the Micro-tier architecture stays
**stable, isolated, responsive, and free of dataset drift** at 100-school
data scale over a sustained (20-minute) hold, not "how many VUs can it
take."

## Workload shape

```js
{
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "2m", target: 5 },
    { duration: "3m", target: 20 },
    { duration: "20m", target: 20 },
    { duration: "3m", target: 0 },
  ],
  gracefulRampDown: "90s",
  gracefulStop: "90s",
}
```

Total planned duration: **~28 minutes** (2 + 3 + 20 + 3), plus up to 90s of
graceful ramp-down/stop for in-flight iterations to finish.

`gracefulRampDown`/`gracefulStop` are **90s** (vs the 60s used by
`launch-spike`/`headroom`) because this profile's workflows can chain up to
4 sequential page loads with 2–8s think-time between each — a single
in-flight iteration can legitimately take 35–45s to finish cleanly, and 90s
gives comfortable margin above that.

**setup() validates all 20 allocated sessions**, not just one — both
structurally (uniqueness, required fields, role) and live (an authenticated
`/dashboard` GET for each). This was the Phase 2 open question "should a
20-VU profile validate 20 sessions instead of warming one" — resolved
**yes**: at only 20 pinned VUs the fixed cost of validating all of them
before ramp-up is small (well under the 2-minute initial ramp), and it
converts a "session #14 silently fails at minute 12" failure mode into an
immediate, actionable setup() error that names the exact VU/school/status.

Randomized 2–8s think-time means the iteration count during the 20-minute
hold is a range, not a fixed number: at ~4 requests/iteration and ~3–8s
average think-time added on top of sub-second request time, each VU
completes roughly one iteration every 15–30s, so 20 VUs × 20 minutes ÷
~20s/iteration ≈ **~1,200 iterations** (order-of-magnitude estimate;
`workflow_duration_ms` in the run's own summary is the authoritative
number).

## Session allocation strategy

- Reuses `interleaveBySchool()` (now exported from `helpers/auth.js`,
  additive/pure — no behavior change to any existing profile) and the same
  formula `pickSession(data, { pinned: true })` uses internally:
  `interleaved[(VU - 1) % interleaved.length]`.
- `setup()` calls `interleaveBySchool()` directly to **pre-compute the
  exact 20 sessions** VUs 1–20 will use at runtime (setup() has no live
  `__VU` context — it always runs as VU 0), then validates those specific
  20 sessions rather than a sample.
- Because every VU independently re-derives the same deterministic
  `interleaveBySchool(pool)` array from the same fixture file, the 20
  sessions validated in `setup()` are **provably** the same 20 sessions
  used for real traffic — not an approximation.
- **Structural checks:** exactly 20 sessions; unique `cookie`, `userId`,
  `organizationId`, and `schoolIndex` (no duplicate assignment); required
  fields present (`cookie`, `organizationId`, `userId`, `schoolIndex`,
  `role`); all 20 sessions use the `owner` role.
- **Live checks:** one authenticated `GET /dashboard` per session; fails
  (aborts the whole run before any VU ramps) on a login redirect, non-200
  status, or a suspiciously short response body.
- **Role mix:** all 20 VUs use **`owner`** (the broadest-permission seeded
  role). This profile's route matrix touches `/settings/organization`,
  `/settings/team-access`, and `/settings/branding` — using a mixed
  role set (e.g. some `viewer`/`volunteer` sessions) risks a
  **permissions-driven** 403/redirect on those routes masquerading as an
  architecture/performance failure, which would be a false signal for this
  specific test's purpose. A future profile that wants to validate
  role-based access control at scale should be a separate, explicitly
  role-mixed test — not this one.
- Sanitized allocation summary printed once in `setup()`: `VU## → School
  ### | owner | org <8-char prefix>`. Never a cookie, token, email, or full
  user ID.

## Route / workflow matrix

| Workflow | Scenario file | Routes | Method | Tenant-isolation scan |
|---|---|---|---|---|
| Dashboard | `scenarios/dashboard.js` | `/dashboard`, `/events` | GET | Yes (foreign org UUID scan) |
| Calendar/events | `scenarios/calendar-events.js` | `/calendar`, `/events`, `/events/{id}`, `/events/{id}?tab=planning` | GET | Yes |
| Approvals | `scenarios/approvals.js` | `/approvals`, `/approvals/revision`, event approvals tab | GET | Yes, + dedicated negative cross-tenant probe (`assertCrossTenantDenied`) |
| Comms Hub | `scenarios/communications-hub.js` | `/communications` | GET | Yes |
| Comms creator (read) | `scenarios/communications-creator.js` | `/create-with-ai`, `/events/{id}/campaign-builder` | GET | Yes |
| Settings viewer | `scenarios/settings-viewer.js` | `/settings/organization`, `/settings/team-access` | GET | Yes |
| **Brand kit** (new) | `scenarios/brand-kit.js` | `/settings/branding` | GET | Yes |

`org-switch.js` is excluded — the 100-school fixture (like the 20-school
one) has no seeded user with 2+ organization memberships, so it would only
fall back to a duplicate dashboard view.

All requests are `http.get()` (via `helpers/http.js`'s `getHtml()`); no
`POST`/`PUT`/`PATCH`/`DELETE` call exists anywhere in the reused scenario
files, and none was added for `brand-kit.js`.

### Brand kit scenario

```js
// load-tests/k6/scenarios/brand-kit.js
export function runBrandKitViewer(data, session) {
  getHtml(data.baseUrl, "/settings/branding", session, {
    route: "branding",
    schools: data.schools,
    minThink: 2,
    maxThink: 6,
  });
  pauseBetweenActions(2, 5);
}
```

Read-only glance at organization branding settings (colors, logo metadata,
labels). Never calls upload, logo-processing, save, or delete endpoints —
the seeded brand-kit rows use placeholder `storage_path` values (no real
files), so this is a plain server-rendered HTML GET like every other
scenario, not an asset/CDN fetch.

## Traffic weights

| Workflow | Weight |
|---|---|
| Dashboard | 20% |
| Calendar/events | 25% |
| Approvals | 15% |
| Communications hub | 15% |
| Communications creator (read) | 10% |
| Settings viewer | 8% |
| Brand kit | 7% |
| **Total** | **100%** |

Matches the Phase 2 proposal unchanged — no scenario cost or usage-pattern
data surfaced during implementation that justified a different split.

## Metrics

Entirely reused — no new metric types were needed:

- `authFailures`, `tenantIsolationFailures`, `unexpected401/403/429/500`,
  `droppedIterations`, `httpFailures` (Counters, `helpers/metrics.js`)
- `workflowDuration` (Trend, tagged `workflow: "brand_kit"` for the new
  scenario, matching the existing per-workflow tagging convention)
- Route-level `http_req_duration{route:...}` Trends via k6's built-in
  per-tag breakdown (no new Trend objects needed — tags alone produce
  separate summary rows)
- `checks` (k6 built-in) — every `assertPageOk`/`assertTenantIsolation`/
  `assertCrossTenantDenied` call already registers here

Organization IDs and school names are **never** used as k6 metric tags
(only `route`, `workflow`, `kind`, `name`) to avoid unbounded tag
cardinality; they appear only in the sanitized `setup()` allocation log and
in ad hoc failure `console.log`s inside the existing checks helpers (org-ID
prefix only, per the existing convention already used by `launch-spike`/
`headroom`).

## Thresholds

`buildDataScale100School20VuThresholds()` in `config/thresholds.js` — a
**standalone** builder, not composed from `buildThresholds()` /
`buildLaunchSpikeThresholds()`, because this profile intentionally uses
literal 100%/0% "final architecture gate" values instead of the 20-school
suite's 99%/1% safety-net defaults.

**Hard gates:**

| Metric | Threshold |
|---|---|
| `tenant_isolation_failures` | `count==0` |
| `auth_failures` | `count==0` |
| `unexpected_401` | `count==0` |
| `unexpected_403` | `count==0` |
| `unexpected_429` | `count==0` |
| `unexpected_500` | `count==0` |
| `dropped_iterations` | `count==0` |
| `checks` | `rate==1` |
| `http_req_failed` | `rate==0` |
| `http_req_duration{kind:read}` | `p(95)<1500` |
| `http_req_duration{route:dashboard}` | `p(95)<2000` |
| `http_req_duration{route:calendar}` | `p(95)<2000` |
| `http_req_duration{route:events_list}` | `p(95)<2000` |

**Observational only** (reporting-ceiling `p(95)<60000`, not a launch gate
— no prior documented hard threshold exists for these routes at this scale):
`event_detail`, `event_planning`, `approvals`, `approvals_revision`,
`event_approvals`, `communications`, `create_with_ai`, `campaign_builder`,
`settings_organization`, `settings_team_access`, `branding`, `cross_tenant`.

`workflow_duration_ms` remains **informational only** (no threshold) — see
Finding 3 in [`docs/qa/k6-load-test-findings.md`](./k6-load-test-findings.md):
it measures whole-workflow wall time including intentional 2-8s think-time
pauses, so multi-step workflows legitimately show 20-35s p95 even when
every individual `http_req_duration` is sub-second.

### `unexpected_403`/`unexpected_429` tightened to zero — explicit caveat

The base 20-school builder tolerates a small nonzero count for both, to
absorb expected cross-tenant-probe/rate-limit noise. This profile tightens
both to `count==0` per explicit instruction, on the basis that all 9 prior
recorded 20-school runs (light-peak through 50-VU headroom) already
reported 0 for both counters under the identical `crossTenantEvery=5` probe
mechanism — so 0 matches observed reality rather than inventing new slack.

**Known architectural limitation, not silently patched with tolerance:**
`recordStatusMetrics()` (`helpers/checks.js`) increments `unexpected_403`
unconditionally on any 403 response, **including the deliberate negative
cross-tenant probe's own request**. There is no separate
"expected-vs-unexpected" 403/429 counter in the current architecture. If
the app ever legitimately returns a bare 403 (rather than the 404/302/
200-non-disclosing outcomes `assertCrossTenantDenied` also accepts) for
that probe, this profile's `unexpected_403==0` gate would fail even though
tenant isolation itself is intact (`tenant_isolation_failures` would still
read 0). If a future run hits this specific failure mode, treat it as a
metrics-architecture gap to fix (a dedicated `expected_403` counter for the
probe), not a security regression — cross-check
`tenant_isolation_failures` first.

## Preflight changes

`load-tests/k6/scripts/preflight-100-schools.mjs` check #8 previously only
reported "no 100-school profile exists yet" (informational pass). It now
runs `auditDataScaleProfile()`, which:

- Confirms `data-scale-100school-20vu.js` exists.
- Confirms the profile references the 100-school fixture
  (`K6_SESSIONS_FILE` / `sessions.100-school-architecture.local.json` in
  its header) and uses pinned session assignment (`pinned: true` /
  `pinnedSession: true`).
- Confirms it reuses the production-blocking guard
  (`prepareTestContext()` from `helpers/auth.js`).
- **Dynamically imports** `config/workload.js` and `config/thresholds.js`
  (both plain ESM with no k6-only imports, so Node can load them directly)
  to introspect the *real* `DATA_SCALE_100SCHOOL_20VU_WORKLOAD.stages` max
  VU target (must be ≥20) and the *real*
  `buildDataScale100School20VuThresholds()` output (must contain all 9
  required safety keys; must **not** contain `workflow_duration_ms`) —
  more reliable than regex-guessing structured values from source text.
- Scans the profile file + every file under `scenarios/` + `helpers/http.js`
  (files that import from `k6`/`k6/http` and so cannot be `import()`-ed by
  plain Node) for `http.post|put|patch|del|delete(` calls. **Zero** matches
  required. This is the sole hard gate for write-capability — deliberately
  **method-based, not a route-substring denylist**, so a read-only route
  whose name merely contains a write-sounding word (e.g. `/create-with-ai`,
  which is GET-only) is never falsely flagged.
- Separately logs (informational only, never a fail condition) any
  write-sounding route/keyword literals found (`invite`, `billing`,
  `checkout`, `generate`, `publish`, `webhook`) for a human to spot-check —
  `calendar-events.js`'s `/events/create` GET (a form-page *read*, gated
  behind `K6_ALLOW_WRITES`, which this profile's run instructions never
  set) is a known, expected, non-failing example.

The existing checks #9–#11 (session freshness, ≥20 exclusive sessions, no
concurrent seed/cleanup lock) already matched this profile's requirements
exactly (`MIN_EXCLUSIVE_SESSIONS = 20`) and needed no changes.

## File-change plan (as implemented)

**Created:**

- `load-tests/k6/data-scale-100school-20vu.js`
- `load-tests/k6/scenarios/brand-kit.js`
- `docs/qa/100-school-20vu-data-scale-design.md` (this file)
- `docs/qa/100-school-20vu-run-capture-template.md`

**Modified (additive in every case — no existing behavior changed):**

- `load-tests/k6/helpers/auth.js` — exported the existing (already-tested)
  `interleaveBySchool()` pure function; zero behavior change to
  `pickSession()` or any other caller.
- `load-tests/k6/config/workload.js` — added
  `DATA_SCALE_100SCHOOL_20VU_WORKLOAD` and
  `DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS`.
- `load-tests/k6/config/thresholds.js` — added
  `buildDataScale100School20VuThresholds()`.
- `load-tests/k6/scenarios/run-mix.js` — one new import + one new `case
  "brandKit":` in the existing `switch`.
- `load-tests/k6/scripts/preflight-100-schools.mjs` — replaced the
  informational "no profile yet" check #8 with `auditDataScaleProfile()`.
- `package.json` — added `test:load:data-scale:100school:20vu`.
- `load-tests/k6/README.md` — documented the new profile, preflight
  command, and run-capture template.

**Intentionally left unchanged:** `helpers/http.js`, `helpers/checks.js`,
`helpers/metrics.js`, `helpers/organization.js`, `helpers/test-data.js`,
`config/environments.js`, every other scenario file's internals, every
existing profile file, the seed/validate/mint/cleanup scripts, and all
application code.

## Risks and decisions

| # | Question | Decision |
|---|---|---|
| 1 | Validate 20 sessions in setup() vs. warm 1? | **Validate all 20** — cheap at this VU count, converts a mid-run failure into an immediate, actionable setup() error. |
| 2 | Org names/IDs as metric tags? | **No** — only route/workflow/kind/name tags; org identifiers stay in sanitized logs only. |
| 3 | Per-org tags overload k6 cardinality? | N/A given decision 2 — not attempted. |
| 4 | Org identifiers belong only in failure logs? | Yes, and only an 8-char prefix even there (matches existing convention). |
| 5 | Brand-kit route triggers large image downloads? | No — seeded brand-kit rows use placeholder `storage_path` values; the page itself is server-rendered HTML like every other scenario. |
| 6 | Vercel preview caching skew later runs? | Possible for static assets only; all scenario routes are per-user, cookie-scoped RSC pages, which Vercel does not cache by default. Not mitigated further; flagged for the human running the test to watch `http_req_duration` trend shape during the hold. |
| 7 | Randomized workflow selection makes 3-run comparison noisy? | Accepted — matches every prior profile's approach (`pickWorkflow()`); large iteration count (~1,200 est.) over 20 minutes smooths sampling noise per route. |
| 8 | Deterministic seeded workflow selection instead? | **Not adopted** — would diverge from the established `pickWorkflow()` convention across the whole suite for one profile; the iteration volume already makes this unnecessary. |
| 9 | Cross-tenant probe frequency? | Reused unchanged: `crossTenantEvery: 5` (existing `foreignProbe` mechanism, `scenarios/approvals.js`). |
| 10 | Is a 20-minute hold sufficient at this data scale? | Judged sufficient for this pass (architecture/stability check, not endurance/soak testing); a longer soak can be a follow-up profile if this run shows any drift over the hold window. |

## Confirmation

No code outside the listed files was changed. No k6 test was run while
producing this design/implementation. No production, seed, cleanup,
migration, RLS, compute, or application-code change occurred. Static
validation results are reported separately (see the Phase 3 completion
report in the assistant's response, and
`docs/qa/k6-load-test-findings.md` once Run 1 is recorded).
