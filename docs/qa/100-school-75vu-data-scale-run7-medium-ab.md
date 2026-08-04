# 100-school / 75-VU — Run 7 Small → Medium compute A/B

**Status:** **LARGE INFRA WIN, GATE STILL FAILING BY ~53ms** — correctness perfect.
**Phase 1 final infra A/B** — see
[performance-engineering-phase1-complete.md](./performance-engineering-phase1-complete.md).
Medium moved ordinary-read p95 **2.46s → 1.55s** (−0.91s) versus identical-app
Small (Run 6). Route gates for dashboard/calendar/events_list **passed**; only
`kind:read` p95 **1.55s** missed the unchanged **1.5s** ceiling.
**Date:** August 3–4, 2026
**Run ID:** `100school-75vu-run7-medium-20260803-2321`
**Paired Small baseline (same app):** [Run 6 Event Approvals client](./100-school-75vu-data-scale-run6-event-approvals-client.md)
**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

---

## 1. Experimental control

| Control | Value |
|---|---|
| Intentional variable | Supabase compute **Small → Medium** only |
| App code / Preview | Identical to Run 6 (`dpl_CwydZEFTb9sPrFkczX4AaCaMaf5e`, Event Detail Approvals client-load + prior keeps) |
| Workload / thresholds / fixture | Identical 75-VU profile, `arch100`, Absolute/10 Auth (unchanged) |
| Methods | GET-only; production blocked |
| Verified Medium | Dashboard Infrastructure → Compute size **Medium** checked (4 GB / 2-core / $0.0822/hr) before run |
| Auth allocation | Absolute / **10** unchanged (not modified for this experiment) |

Safety: reminted 75 owners, preflight 25/25, warm-up discarded, then recorded run.
Post-run integrity **25/25**. Production / app code / thresholds untouched.

Pre-run note: after prior 75-VU work and the Medium resize, idle/post-idle gauges
were elevated (~75–78% compute/memory). Disk IO stayed ~1%. Dataset size
unchanged (DB **45.2 MB**).

---

## 2. Primary comparison — same app, Small vs Medium

| Metric | Run 6 Small | Run 7 Medium | Δ (Medium − Small) |
|---|---:|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** | flat (perfect) |
| `kind:read` p95 / p99 / max | 2.46 / 3.42 / 9.11s | **1.55 / 2.77 / 5.75s** | **−0.91 / −0.65 / −3.36s** |
| `http_req_waiting` p95 | 1.19s | **0.73s** | **−0.46s** |
| `http_req_receiving` p95 | 1.40s | **0.90s** | **−0.50s** |
| waiting / receiving **avg** | 565 / 661ms | **385 / 432ms** | −180 / −229ms |
| `dashboard` p95 | 2.79s | **1.91s** | −0.89s (**passes** &lt;2.0s) |
| `calendar` p95 | 2.77s | **1.58s** | −1.19s (**passes** &lt;2.0s) |
| `events_list` p95 | 2.52s | **1.63s** | −0.89s (**passes** &lt;2.0s) |
| `event_detail` p95 | 2.25s | **1.36s** | −0.90s |
| Hold >3s / >5s (counters) | 55 / 14 | **48 / 8** | −7 / −6 |
| http_reqs / iterations | 5396 / 1688 | **5770 / 1824** | +throughput |

k6 crossed **only** `http_req_duration{kind:read}` (1.553s vs 1.500s).
Dashboard / calendar / events_list route gates all passed.

### Hold-window route mix (Run 7, >3s in hold)

`dashboard` 6 · `event_detail` 6 · `calendar` 5 · `communications` 5 ·
`events_list` 5 · `event_planning` 4 · others ≤2.

Vs Run 6’s calendar/dashboard-dominated hold: tails are more evenly spread and
slightly fewer, but extreme `>5s` events still occur (8 total, down from 14).

---

## 3. Infrastructure / query observations

| Signal | Observation |
|---|---|
| Compute tier | **Medium** 4 GB / 2-core verified |
| Post-run gauges | Compute **78%**, CPU **75%**, Memory **78%**, Disk IO **1%** |
| Disk / DB size | 15% / **45.2 MB** (unchanged) |
| Query Performance (pre/adjacent) | Cache hit **100%**; dominant time still high-frequency `approval_scheduling_items` PostgREST shapes (~61% of sampled DB time from prior window) |
| Connections | No saturation signal in k6 (dropped=0, no 429/500); Disk IO near-idle implies working set fits RAM |

---

## 4. Engineering interpretation

### How much did the boundary move?

About **0.91s** of ordinary-read p95 (−37%) versus same-app Small. That is the
same *order* of win as Micro→Small (−0.80s), proving Small was still
amplifying the dual wait/recv bottleneck under the 75-VU hold.

### Waiting vs receiving?

**Both improved ~0.46–0.50s p95** (nearly equal). Medium is not a wait-only
story — less backend queueing **and** less contention inflating HTML TTFB/
transfer under concurrency.

### Material shift vs simple amplification trim?

**Material shift of the latency boundary.** Evidence:

- Aggregate read p95 lands **53ms** from the hard gate (was ~1s away on Small)
- All three hard route gates pass
- Throughput rose (more completed iterations under the same wall clock)
- Residual miss is thin — not a still-saturated profile

Hold `>3s` only fell modestly (55→48), so Medium did **not** erase long tails;
it compressed the bulk of the distribution. Extreme `>5s` also improved but
did not reach zero.

### Unexpected?

The gate is now a **single-metric near-miss** (`kind:read` only). That
reframes next work: one focused app receiving cut on the heaviest remaining
hubs (dashboard still 1.91s p95) is more valuable than another compute jump.

---

## 5. Decisions

| Question | Answer |
|---|---|
| Medium vs Small? | Medium is a large, real capacity win on this identical Preview/workload. |
| Recommended production tier? | **Prefer Medium** if production must sustain ~75 concurrent org-scoped readers with the 1.5s ordinary-read ambition. Small is correctness-fine but latency-gate insufficient at 75 VU. |
| Is Small enough for launch? | **For 50 VU / lower:** historically yes. **For 75 VU + 1.5s gate:** **no** — still ~2.46s on Small with current app. |
| Another app optimization justified? | **Yes — narrowly.** ~53ms aggregate miss + dashboard still near its 2s route gate. Prefer one dashboard/calendar HTML or query lean under Medium. Do **not** loosen thresholds. |
| Is 75 VU a stable operating point? | **Correctness: yes. Latency gate: not yet** (1.55s). Closest so far; treat as “almost” not “pass.” |
| Is 100 VU reasonable? | **Exploratory discovery only.** Expect fail; useful after a Medium+app near-clear, not as a pass candidate now. |
| Next engineering step | **Phase 1 closed.** Keep Medium. Post-launch roadmap: one dashboard/calendar lean under Medium — see [performance-engineering-phase1-complete.md](./performance-engineering-phase1-complete.md). Do **not** run 100 VU for Phase 1 close. |

---

## 6. Artifacts

- Console: `load-tests/k6/results/data-scale-100school-75vu-run7-console.log`
- Summary: `load-tests/k6/results/data-scale-100school-75vu-100school-75vu-run7-medium-20260803-2321-summary.json`
- Warm-up: `...-run7-medium-warmup-20260803-2319-summary.json`
