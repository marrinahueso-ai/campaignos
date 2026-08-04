# 100-school / 75-VU data-scale — Run 1 (boundary discovery)

**Status:** **LATENCY BOUNDARY DISCOVERED** — all correctness/security gates
passed; ordinary-read and route p95 gates **failed**. Do **not** proceed to
100 VUs until this boundary is understood and addressed.
**Date:** August 3, 2026
**Run ID:** `100school-75vu-run1-20260803-2341`
**Related:** [50-VU Run 2](./100-school-50vu-data-scale-run2.md) ·
[Findings log](./k6-load-test-findings.md)

---

## 1. Why this 75-VU profile

After two clean 50-VU runs with a reproducible ordinary-read p95 of
~1.38–1.39s (92–93% of the 1.5s gate), the next useful question was whether
**75 concurrent VUs** is still stable headroom or the first meaningful
performance boundary.

**Shape chosen:** same **11-minute** stage durations as 50-VU / 20-school
headroom (`4m ramp + 5m hold + 2m down`) so hold-progress fractions
(`4/11`–`9/11`) remain valid, with peak raised to 75:

`0 → 25 (1m) → 50 (1m) → 75 (2m) → hold 75 (5m) → 0 (2m)`

Traffic mix, pinned owners (75 distinct orgs), GET-only scope, Micro compute,
Auth Absolute/10, and **unchanged hard gates** (including `kind:read` p95
`<1.5s`) were preserved. This is boundary discovery, not a forced pass.

**50-VU baseline preserved** on `main` at `831801f` before 75-VU-specific
harness/profile work.

---

## 2. Instrumentation / harness changes

| Change | Why |
|---|---|
| `shouldTrackHold()` matches any `Nvu` run/scenario id (not only `50vu`) | Prevent blind hold counters on 75-VU |
| `DATA_SCALE_100SCHOOL_75VU_*` workload + profile + warmup + npm scripts | Boundary profile |
| Preflight audits 75-VU profile; `MIN_EXCLUSIVE_SESSIONS=75` | Fail closed if fixture too small |
| Identical threshold builder alias (`buildDataScale100School75VuThresholds`) | Gates unchanged |

No application, threshold numeric, RLS, Auth allocation, Supabase capacity,
caching, or index changes.

**Exit-code note:** the shell `| tee` wrapper used for log capture returned
`0` from `tee` even though k6 logged threshold failures. Authoritative
outcome is **thresholds crossed** (see k6 error line). Future capture should
use `set -o pipefail` / `PIPESTATUS[0]`.

---

## 3. Deployment and environment

| Item | Value |
|---|---|
| Preview | `https://campaignos-p2ltky8cr-campignos.vercel.app` |
| Deployment | `dpl_D5348dMfdWTs3rCFmtBHtL8s9zdn` / commit `85caa0e` (`getClaims`) |
| Supabase | `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) Micro |
| Auth allocation | Absolute / 10 (unchanged) |
| Dataset | 100-school architecture (`TEST_RUN_ID=arch100`) |
| Staging HTML | inlined `hdoujyngcqrsgtvqehyt.supabase.co` — production ref absent |

Production project and external providers were not targeted or written.

---

## 4. Session and preflight

| Step | Result |
|---|---|
| Remint 75 pinned owners | 75/75 |
| Live auth + tenant (dashboard) | **75/75 OK** |
| Full preflight | **25/25 PASS** |
| Post-preflight remint heal + re-verify | 75/75 OK |
| Pre-run DB snapshot | `pre-75vu-run1` |

---

## 5. Warm-up

Discardable 8-VU warmup (`100school-75vu-warmup-20260803-2339`): completed
with correctness counters green. Metrics discarded (not authoritative).

---

## 6. Run result

| Item | Value |
|---|---|
| Run ID | `100school-75vu-run1-20260803-2341` |
| Duration | 12m12s (11m scenario + graceful) |
| HTTP requests | **5,286** |
| Completed iterations | **1,628** |
| Checks | **100%** (29,866 / 0) |
| Authoritative outcome | **LATENCY THRESHOLDS FAILED** |

### Correctness / security gates

| Gate | Result |
|---|---|
| Auth failures | **0** — PASS |
| Tenant-isolation failures | **0** — PASS |
| Checks `rate==1` | **PASS** |
| HTTP failures | **0.00%** — PASS |
| Unexpected 401 / 403 / 429 / 500 | **0 / 0 / 0 / 0** — PASS |
| Dropped iterations | **0** — PASS |

### Latency gates (unchanged; not loosened)

| Gate | Result | Verdict |
|---|---:|---|
| `kind:read` p95 `<1.5s` | **2.77s** | **FAIL** |
| `dashboard` p95 `<2s` | **3.17s** | **FAIL** |
| `calendar` p95 `<2s` | **2.83s** | **FAIL** |
| `events_list` p95 `<2s` | **2.42s** | **FAIL** |

---

## 7. Overall latency

| | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| `http_req_duration` | 1.36s | 2.42s | **2.77s** | 3.50s | **5.47s** |

### Route-level p95 / p99 / max (selected)

| Route | p95 | p99 | max |
|---|---:|---:|---:|
| dashboard | **3.17s** | 3.93s | 5.47s |
| calendar | **2.83s** | 4.03s | 4.55s |
| events_list | **2.42s** | 3.06s | 4.35s |
| approvals | 2.42s | 3.61s | 3.97s |
| communications | 2.26s | 2.78s | 3.97s |
| event_detail | 2.89s | 3.70s | 4.58s |
| branding | 3.19s | 3.70s | 4.71s |
| settings_team_access | 2.95s | 3.96s | 4.62s |
| create_with_ai | 2.15s | 2.32s | 3.45s |
| cross_tenant | 2.09s | 2.51s | 3.63s |

---

## 8. Slow-request distribution by phase

| Bucket | Total | Ramp | Hold | Ramp-down |
|---|---:|---:|---:|---:|
| >3s | **151** | 6 | **134** | 11 |
| >5s | **2** | 0 | **2** | 0 |
| >10s | 0 | 0 | 0 | 0 |
| >20s | 0 | 0 | 0 | 0 |

Hold >3s by route (top): dashboard 47, event_detail 26, calendar 15, then
approvals / branding / events_list / event_approvals (7 each).

All slow responses returned **200** (correctness preserved).

---

## 9. Behavior during the 75-VU hold

This is **sustained hold degradation**, not ramp-edge cold starts:

- 134 / 151 (>3s) events occurred **during hold**
- Hold-window deciles show a clear mid-hold cluster (decile 5 alone: 56 events)
- Late-hold slows (111) ≫ early-hold slows (23)
- Only 2 >5s events (both dashboard, mid-hold); none >10s

Error rate during hold: **unchanged at zero** (no auth/tenant/HTTP/5xx
failures). Latency rose; correctness did not break.

Secondary signal: `http_req_receiving` contributed a large share of duration
under load (p95 receiving ~1.73s), consistent with heavy HTML payloads under
concurrency — systemic saturation rather than a single buggy route.

---

## 10. Comparison

| Metric | 100-school 20-VU R2 | 100-school 50-VU R1 | 100-school 50-VU R2 | **100-school 75-VU R1** | 20-school 50-VU (band) |
|---|---:|---:|---:|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | 0 / 0 / 100% | 0 / 0 / 100% | **0 / 0 / 100%** | 0 / 0 / 100% |
| `kind:read` p95 | 1.02s | 1.39s | 1.38s | **2.77s** | 0.97–1.31s |
| `dashboard` p95 | 1.16s | 1.57s | 1.69s | **3.17s** | 1.13–1.43s |
| Overall max | 3.56s | 29.97s† | 3.88s | **5.47s** | 3.6–10.9s |
| Hold >3s | — | (counters blind) | 1 | **134** | ≤4 |
| Hold >5s | — | — | 0 | **2** | 0 |
| Read gate held? | yes | yes | yes | **no** | yes |

† Isolated ramp approvals outlier (not reproduced at 50-VU Run 2).

---

## 11. Interpretation

| Question | Answer |
|---|---|
| Did the 1.5s read gate hold? | **No** — 2.77s (≈1.84× the gate) |
| Is 75 VU stable headroom? | **No** — first clear **performance boundary** |
| Correctness at 75 VU? | **Yes** — auth, tenant, checks, integrity intact |
| Replicate needed? | **No** — breach is large, multi-route, and hold-sustained; not a noisy near-miss |
| Safe/useful to test 100 VU? | **No** — would amplify a known boundary without new architectural information |

### Root cause class (current best judgment)

**Capacity saturation under concurrent authenticated RSC/page loads**, not a
correctness defect:

- Multi-route elevation (dashboard, calendar, events, branding, …)
- Concentrated in the **steady hold**, not only ramp
- Zero auth 429 / login redirects (getClaims remediation still holding)
- Zero tenant leaks / 5xx / dropped iterations

Likely contributors to investigate (smallest-correct-first, not applied here):

1. Server-side work / data fan-out on hot routes (dashboard, calendar) at 75 concurrent owners
2. Response payload / TTFB+transfer (`http_req_receiving` elevated)
3. Supabase connection / query concurrency on Micro under 75 parallel tenants
4. Optional later hygiene: Auth Absolute → Percentage (not implicated by this run’s zero Auth failures)

**Do not** loosen the 1.5s gate. Treat the breach as the finding.

---

## 12. Post-run integrity

| Check | Result |
|---|---|
| Integrity validate | **25/25 PASS** |
| Row-count drift | **0** (totalRows 23,716) |

---

## 13. Follow-up recommendation

1. **Stop higher-VU progression** (no 100-VU) until the 75-VU latency boundary is diagnosed.
2. Profile hot routes (dashboard / calendar) under a staging-only 75-VU-like load or targeted concurrent GETs; identify query/payload bottlenecks.
3. Prefer the **smallest** product/infra fix that restores read p95 under the same 75-VU profile; re-validate at 75 VU before any further increase.
4. Optional: one 75-VU replicate **after** a remediation — not before — to confirm the boundary moved.

---

## 14. Files changed (this step)

- `load-tests/k6/data-scale-100school-75vu.js` (+ warmup)
- `load-tests/k6/config/workload.js`, `config/thresholds.js`
- `load-tests/k6/helpers/http.js` (Nvu hold tracking)
- `load-tests/k6/scripts/preflight-100-schools.mjs`
- `load-tests/k6/README.md`, `package.json`
- `docs/qa/100-school-75vu-data-scale-run1.md` (this report)
- `docs/qa/k6-load-test-findings.md`

## 15. Safety confirmation

Staging-only Preview → `heyralli-staging`. Production project hard-blocked.
GET-only k6 scenarios. No OpenAI / Meta / Resend / Stripe / webhook / publish
writes from the load harness. No secrets in reports. Auth Absolute/10 and Micro
compute left unchanged.
