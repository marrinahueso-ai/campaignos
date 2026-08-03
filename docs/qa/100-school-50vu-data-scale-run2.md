# 100-school / 50-VU data-scale — Run 2 (stability replicate)

**Status:** **PASSED** — all hard gates green. Ordinary-read p95 **reproduced**
near the Run 1 level (~1.38s). The ~30s approvals outlier did **not** recur.
Hold-phase slow tracking confirmed working.
**Date:** August 3, 2026
**Run ID:** `100school-50vu-run2-20260803-2304`
**Related:** [Run 1](./100-school-50vu-data-scale-run1.md) ·
[20-VU Run 2](./100-school-20vu-data-scale-run2.md) ·
[Findings log](./k6-load-test-findings.md)

---

## 1. Why this validation (not 75-VU yet)

Run 1 left an ambiguous latency signal: ordinary-read p95 at 1.39s (93% of
gate), plus one ~30s approvals request during ramp-up. Jumping to 75 VUs would
have mixed three unknowns (stable capacity vs ramp transient vs route-specific
issue).

**Selected next step:** harness observability fix (hold-phase classification
was blind for non-`headroom` run IDs) **followed by a direct 50-VU replicate**
on the same Preview / Auth Absolute/10 / Micro / GET-only methodology.

**Not selected:**
- Direct 75-VU — premature until 50-VU latency reproducibility is known
- Approvals-only diagnostic — would not answer the broader read-p95 question
- Threshold / app / capacity changes — forbidden for “make it pass” reasons

---

## 2. Instrumentation note (Run 1 caveat)

`recordSlowRequest` only computed `inHold` / `scenarioProgress` when
`TEST_RUN_ID` contained `"headroom"` (or `K6_TRACK_HOLD_SLOW=true`). Run 1’s
ID (`100school-50vu-run1-…`) therefore always logged `inHold=false` and
`scenarioProgress=0`. Wall-clock still placed both Run 1 slows in ramp-up
(~2–3 minutes into the scenario; hold starts at 4 minutes) — that phase call
stands — but hold counters were not authoritative.

**Fix (harness only):** track hold for scenario/run IDs containing `50vu` or
`headroom`, set `K6_TRACK_HOLD_SLOW=true` on the 50-VU npm scripts, and add
observational `slow_req_over_20s` (+ hold variant). No application, threshold,
RLS, index, or Supabase capacity changes.

---

## 3. Environment and session verification

| Item | Value |
|---|---|
| Preview | `https://campaignos-p2ltky8cr-campignos.vercel.app` (`dpl_D5348dMfdWTs3rCFmtBHtL8s9zdn`, `85caa0e`) |
| Supabase | `heyralli-staging` Micro — Auth Absolute/10 unchanged |
| Preflight | **22/22 PASS** |
| Pinned owners | Reminted → 50/50 live auth+tenant OK → preflight → remint heal → 50/50 OK |
| Warmup | discardable 5-VU — `K6_EXIT=0` |
| Pre-run snapshot | `pre-50vu-run2` |

---

## 4. Run result

| Metric | Run 2 | Gate | Result |
|---|---:|---|---|
| HTTP requests | 3,761 | — | — |
| Completed iterations | 1,176 | — | — |
| Dropped iterations | 0 | `count==0` | **PASS** |
| Checks | **100.00%** (21,261 / 0) | `rate==1` | **PASS** |
| HTTP failure rate | 0.00% | `rate==0` | **PASS** |
| Auth failures | **0** | `count==0` | **PASS** |
| Tenant-isolation failures | 0 | `count==0` | **PASS** |
| Unexpected 401 / 403 / 429 / 500 | 0 / 0 / 0 / 0 | `count==0` | **PASS** |
| `kind:read` p95 | **1.38s** | `<1.5s` | **PASS** (92% of budget) |
| `dashboard` p95 | **1.69s** | `<2s` | **PASS** |
| `calendar` p95 | **1.40s** | `<2s` | **PASS** |
| `events_list` p95 | **1.22s** | `<2s` | **PASS** |
| Duration | 11m53.0s | — | completed |
| k6 exit | **0** | — | **PASS** |

### Overall latency

| | p50 | p90 | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| `http_req_duration` | 770ms | 1.21s | **1.38s** | 1.75s | **3.88s** |

### Route p95 / p99 / max (selected)

| Route | p95 | p99 | max |
|---|---:|---:|---:|
| dashboard | **1.69s** | 1.96s | 3.88s |
| calendar | 1.40s | 1.70s | 2.31s |
| events_list | 1.22s | 1.45s | 2.21s |
| approvals | 1.33s | 1.63s | **1.85s** |
| event_detail | 1.41s | 1.63s | 1.85s |
| communications | 1.20s | 1.42s | 3.20s |
| branding | 1.35s | 1.49s | 1.71s |
| settings_team_access | 1.47s | 1.79s | 1.90s |
| cross_tenant | 1.09s | 1.37s | 1.49s |

---

## 5. Slow-request distribution by phase

Hold tracking active (`K6_TRACK_HOLD_SLOW=true` + `50vu` run id).

| Bucket | Count | Ramp | Hold | Ramp-down |
|---|---:|---:|---:|---:|
| >3s | 3 | 2 | 1 | 0 |
| >5s | 0 | 0 | 0 | 0 |
| >10s | 0 | 0 | 0 | 0 |
| >20s | 0 | 0 | 0 | 0 |

Logged events (all status **200**):

| Phase | Route | Duration | `scenarioProgress` |
|---|---|---:|---:|
| ramp | dashboard | 3.88s | 0.060 |
| ramp | dashboard | 3.05s | 0.120 |
| hold | communications | 3.20s | 0.643 |

No evidence of latency rising across the hold into a failure mode — a single
mild >3s hold event, zero >5s anywhere.

---

## 6. Comparison

| Metric | 100-school 20-VU R2 | 100-school 50-VU R1 | 100-school 50-VU R2 | 20-school 50-VU (best→worst) |
|---|---:|---:|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | 0 / 0 / 100% | **0 / 0 / 100%** | 0 / 0 / 100% |
| `kind:read` p95 | 1.02s | **1.39s** | **1.38s** | 0.97–1.31s |
| `dashboard` p95 | 1.16s | 1.57s | **1.69s** | 1.13–1.43s |
| `approvals` max | — | **29.97s** | **1.85s** | — |
| Overall max | 3.56s | 29.97s | **3.88s** | 3.6–10.9s |
| >5s / >10s / >20s | — | 1 / 1 / 1 | **0 / 0 / 0** | hold: 0 / 0 |
| k6 exit | 0 | 0 | **0** | 0 |

### Answers to the open questions

| Question | Answer |
|---|---|
| Is 1.39s read p95 reproducible? | **Yes** — Run 2 = **1.38s** (stable capacity pattern at 50 VU) |
| Was ~30s approvals isolated or systemic? | **Isolated** — did not recur; approvals max 1.85s |
| Is 50 VU stable headroom? | **Yes for correctness**; **tight for latency** (read p95 ~92% of gate) |
| Proceed to 75 VU? | **Yes** — next useful cliff probe; expect possible read-p95 gate pressure |

---

## 7. Post-run integrity

| Check | Result |
|---|---|
| Integrity validate (`TEST_RUN_ID=arch100`) | **25/25 PASS** |
| Row-count drift | **0** (totalRows 23,716) |

---

## 8. Recommendation

1. Treat 100-school / 50-VU as **stable correctness headroom** with a
   **reproducible latency band** (read p95 ≈ 1.38–1.39s).
2. Do **not** chase the Run 1 approvals 30s as an application defect unless it
   reappears under hold — evidence points to a one-off ramp/cold-start.
3. Next validation: **100-school / 75-VU** with the same methodology and hold
   tracking enabled. Watch ordinary-read p95 and dashboard p95 closely; a gate
   breach at 75 VU would be informative capacity evidence, not a reason to
   loosen thresholds.
4. Optional later: Auth Absolute → Percentage before a long high-VU soak
   (hygiene, not required by these two 50-VU passes).
