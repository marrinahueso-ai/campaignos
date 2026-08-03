# 100-school / 50-VU data-scale — Run 1 (concurrency headroom)

**Status:** **PASSED** — all hard gates green. First clear latency stress
signal at data scale (ordinary-read p95 at **93%** of the 1.5s gate), with
correctness (auth, tenant isolation, integrity) intact.
**Date:** August 3, 2026
**Run ID:** `100school-50vu-run1-20260803-2236`
**Related:** [20-VU Run 2](./100-school-20vu-data-scale-run2.md) ·
[Auth remediation](./100-school-20vu-auth-rate-limit-remediation.md) ·
[Findings log](./k6-load-test-findings.md)

---

## 1. Why this validation

After Run 2 confirmed the `getClaims()` auth-path fix under a 20-VU / 20-minute
soak, the program objective shifted from “prove auth” to “find where the
architecture shows meaningful stress while staying correct.”

**Selected next step:** 100-school / **50-VU** data-scale headroom — same ramp
shape as the validated 20-school `HEADROOM_50VU` profile (0→15→30→50 over 4m,
hold 50 for 5m, ramp down 2m), same strict data-scale safety gates, 50 pinned
owners across 50 distinct orgs.

**Question answered:** Does 5× data volume (100 vs 20 schools) reduce
concurrency headroom relative to the 20-school / 50-VU pass?

**Not selected:** 30-VU spike — low incremental signal after a clean 20-VU /
20m soak. Auth Absolute→Percentage — optional capacity hygiene, not required
to answer the headroom question (left unchanged).

---

## 2. Deployment and code state

| Item | Value |
|---|---|
| Commit tested | `85caa0e` (`getClaims` middleware/RSC) — same Preview as 20-VU Run 2 |
| Preview URL | `https://campaignos-p2ltky8cr-campignos.vercel.app` |
| Deployment ID | `dpl_D5348dMfdWTs3rCFmtBHtL8s9zdn` |
| Supabase target | `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) |
| Auth allocation | **Unchanged** — Absolute, max **10**/60 |
| Dataset | 100-school architecture (`TEST_RUN_ID=arch100`) |

No product code change between 20-VU Run 2 and this run. New artifacts are the
`data-scale-100school-50vu` k6 profile (+ warmup), npm scripts, and preflight
checks for the 50-VU workload.

---

## 3. Preflight and methodology

| Step | Result |
|---|---|
| Reminted 800 sessions | Pass (`mintedAt` 2026-08-03T22:28:44Z) |
| Manual: 50/50 pinned owners → `/dashboard` 200, own org present, no foreign leak | Pass |
| Full 100-school preflight | **22/22 PASS** (includes new 50-VU profile audit) |
| Post-preflight remint of 50 pinned owners (heal RLS `signOut` of s001-owner) | Done (2.2s Auth pacing + retries) |
| Re-verify 50/50 after remint | Pass |
| Discardable 5-VU warmup | Pass (`K6_EXIT=0`) |
| Pre-run DB snapshot | Saved (`pre-50vu-run1`) |

Hard boundaries preserved: staging only, production build Preview, deterministic
dataset, pinned sessions, no external-provider writes, tenant + auth as hard
gates.

---

## 4. K6 results

| Metric | Result | Gate | Result |
|---|---:|---|---|
| HTTP requests | 3,760 | — | — |
| Completed iterations | 1,175 | — | — |
| Dropped iterations | 0 | `count==0` | **PASS** |
| Checks | **100.00%** (21,240 / 0) | `rate==1` | **PASS** |
| HTTP failure rate | 0.00% | `rate==0` | **PASS** |
| Auth failures | **0** | `count==0` | **PASS** |
| Tenant-isolation failures | 0 | `count==0` | **PASS** |
| Unexpected 401 / 403 / 429 / 500 | 0 / 0 / 0 / 0 | `count==0` | **PASS** |
| `kind:read` p95 | **1.39s** | `<1.5s` | **PASS** (93% of budget) |
| `dashboard` p95 | **1.57s** | `<2s` | **PASS** |
| `calendar` p95 | **1.36s** | `<2s` | **PASS** |
| `events_list` p95 | **1.27s** | `<2s` | **PASS** |
| Duration | 11m52.8s | — | completed |
| k6 exit | **0** | — | **PASS** |

### Overall latency

| | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| `http_req_duration` | 775ms | 1.21s | **1.39s** | 1.64s | **29.97s** |

### Route-level p95 (selected)

| Route | p95 | max |
|---|---:|---:|
| dashboard | 1.57s | 2.36s |
| calendar | 1.36s | 1.79s |
| events_list | 1.27s | 1.60s |
| approvals | 1.38s | **29.97s** |
| event_detail | 1.43s | 3.16s |
| branding | 1.45s | 1.72s |
| settings_team_access | 1.54s | 2.24s |
| cross_tenant | 1.09s | 1.47s |

Slow-request counters (observational): `over_3s=2`, `over_5s=1`, `over_10s=1`.
Both logged slow events occurred during **ramp-up by wall-clock** (~2–3 min
into the scenario; hold starts at 4 min). Note: `inHold`/`scenarioProgress`
were not authoritative on this run — hold tracking only activated for
`TEST_RUN_ID` containing `headroom` (fixed before Run 2). The single ~30s
`approvals` request returned **200** (correctness preserved).

---

## 5. Comparison

### vs 100-school / 20-VU Run 2 (same Preview, lower concurrency)

| Metric | 20-VU Run 2 | 50-VU Run 1 | Δ |
|---|---:|---:|---:|
| Auth failures | 0 | **0** | same |
| Checks | 100% | **100%** | same |
| Tenant isolation | 0 | 0 | same |
| Unexpected 429 | 0 | 0 | same |
| `kind:read` p95 | 1.02s | **1.39s** | **+36%** |
| `dashboard` p95 | 1.16s | **1.57s** | **+35%** |
| `calendar` p95 | 995ms | **1.36s** | **+37%** |
| `events_list` p95 | 926ms | **1.27s** | **+37%** |
| Overall max | 3.56s | 29.97s | ramp-up outlier |
| k6 exit | 0 | **0** | pass |

### vs 20-school / 50-VU headroom (same ramp shape, 5× less data)

| Metric | 20-school 50-VU (best→worst of 3) | 100-school 50-VU |
|---|---:|---:|
| `kind:read` p95 | 965–1310ms | **1390ms** |
| `dashboard` p95 | 1126–1431ms | **1571ms** |
| `calendar` p95 | 959–1070ms | **1360ms** |
| Auth / tenant / checks | all green | **all green** |
| Hold-window >5s | 0 across 3 runs | **0** (both slows during ramp) |

**Interpretation:** Correctness held at 50 concurrent owners across 50 orgs on
the 100-school dataset. Latency is the first meaningful stress signal —
ordinary-read p95 sits near the launch gate, higher than both the 100-school
20-VU soak and the 20-school 50-VU headroom. This is capacity pressure, not a
correctness or auth regression.

---

## 6. Post-run integrity

| Check | Result |
|---|---|
| Integrity validate (`TEST_RUN_ID=arch100`) | **25/25 PASS** |
| Row-count drift vs pre-run snapshot | **0** (totalRows 23,716 unchanged) |
| Storage bucket object counts | unchanged (all 0 objects in fixture buckets) |

---

## 7. Confidence and next step

**Launch-readiness confidence:** **increased** for correctness at 100-school /
50-VU; **tempered** for latency headroom — we are no longer “well inside” the
ordinary-read p95 budget.

If this class of result holds, the next logical probe is **100-school /
75-VU** with the same methodology (warmup → pinned owners → same safety gates),
to find whether the next concurrency step breaks a hard gate or only deepens
the latency stress. A second 50-VU replicate is optional if we want
warm-run variance like the 20-school suite; it is lower priority than 75-VU
given the objective is stress-boundary discovery.

Optional later hygiene (not a blocker for this pass): Auth Absolute →
Percentage allocation before a long high-VU soak.
