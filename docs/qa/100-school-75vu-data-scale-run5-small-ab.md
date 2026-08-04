# 100-school / 75-VU — Run 5 Micro → Small compute A/B

**Status:** **LATENCY IMPROVED, GATE STILL FAILING** — correctness perfect.
Small compute materially moved the boundary versus identical-app Micro (Run 4)
but ordinary-read p95 **2.55s** remains above the unchanged **1.5s** gate.
**Date:** August 3–4, 2026
**Run ID:** `100school-75vu-run5-small-20260804-0211`
**Paired Micro baseline (same app):** [Run 4 Approvals deferral](./100-school-75vu-data-scale-run4-defer.md)
**Earlier Micro (older app):** [Run 1](./100-school-75vu-data-scale-run1.md)
**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

---

## 1. Experimental control

| Control | Value |
|---|---|
| Intentional variable | Supabase compute **Micro → Small** only |
| App code / Preview | Identical to Run 4 (`dpl_9UYAZDr49Fx6oQRwHqF758BWh2nu`, Approvals deferral + Attention lean + query collapse) |
| Workload / thresholds / fixture | Identical 75-VU profile, `arch100`, Absolute/10 Auth |
| Methods | GET-only; production blocked |
| Verified Small | Dashboard Infrastructure → Compute size radio **Small** checked (2 GB / 2-core / $0.0206/hr) |
| Auth allocation | Absolute / **10** unchanged |

Safety: reminted 75 owners, preflight 25/25, warm-up discarded, then recorded run.
Post-run integrity **25/25**. Production / external providers untouched.

---

## 2. Primary comparison — same app, Micro vs Small

| Metric | Run 4 Micro | Run 5 Small | Δ (Small − Micro) |
|---|---:|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** | flat (perfect) |
| `kind:read` p95 / p99 / max | 3.35 / 4.40 / 5.20s | **2.55 / 3.17 / 4.63s** | **−0.80 / −1.23 / −0.57s** |
| `http_req_waiting` p95 | 1.51s | **1.14s** | **−0.37s** |
| `http_req_receiving` p95 | 1.93s | **1.56s** | **−0.37s** |
| waiting / receiving **avg** | 653 / 845ms | **571 / 729ms** | −82 / −116ms |
| `approvals` p95 | 3.23s | **2.24s** | −0.99s |
| `dashboard` p95 | 3.72s | **2.75s** | −0.97s |
| `calendar` / `events_list` p95 | 3.95 / 3.20s | **2.95 / 2.41s** | −1.00 / −0.79s |
| Hold >3s / >5s / >10s / >20s | 343 / 9 / 0 / 0 | **71 / 0 / 0 / 0** | **−272 / −9 / 0 / 0** |

k6 still crossed: `kind:read`, dashboard, calendar, events_list (all p95 gates).

### Hold-window route mix (Run 5, >3s in hold)

`event_detail` 23 · `calendar` 11 · `dashboard` 11 · `branding` 7 ·
`events_list` 6 · `event_approvals` 6 · others ≤3. **No >5s hold events.**

---

## 3. Context vs Run 1 (Micro, older app)

| Metric | Run 1 Micro | Run 5 Small |
|---|---:|---:|
| `kind:read` p95 | 2.77s | **2.55s** |
| waiting / receiving p95 | 1.21 / 1.73s | **1.14 / 1.56s** |
| Hold >3s | 134 | **71** |

Small + current app is **better than the original Micro boundary**, not only
better than Run 4’s worse Micro tails.

---

## 4. Engineering interpretation

### How much did the boundary move?

About **0.8s** of ordinary-read p95 versus same-app Micro (−24%), and hold
`>3s` collapsed by **~79%**. That is a large, real infrastructure effect — not
noise.

### Waiting vs receiving?

**Both improved by ~0.37s p95** (nearly equal absolute deltas). Avg receiving
improved slightly more (−116ms vs −82ms waiting). Under concurrency, more
compute headroom reduced backend queueing **and** the contention that
inflates transfer/time-to-last-byte for large RSC documents. Not a pure
waiting-only story.

### Infrastructure vs application?

| Signal | Reading |
|---|---|
| Same Preview + same fixture + only compute change | Isolates infra |
| Large multi-route improvement (dashboard/calendar/events/approvals) | Shared backend/contention was amplifying everything |
| Hold >3s 343 → 71, >5s → 0 | Micro was saturating under the 75-VU hold |
| Residual read p95 **2.55s** (wait 1.14 + recv 1.56) still ≫ 1.5s | Remaining budget miss is still a **dual** wait+recv problem — not fixed by Small alone |

**Conclusion:** the Micro 75-VU failure was **infrastructure-amplified dual
bottleneck**, not “app-only” and not “infra-only.” Small removes much of the
amplification; residual latency still looks like concurrent RSC work + HTML
transfer on hot routes.

### Long-tail hold behavior?

Materially healthier. Run 4’s hold was pathological (343 >3s, 9 >5s). Run 5
is closer to (and better than) Run 1’s hold profile, with **zero** >5s/10s/20s
hold events.

---

## 5. Decisions

| Question | Answer |
|---|---|
| Keep Small on staging? | **Yes** — clear capacity win; Micro was under-provisioned for this 75-VU hold. |
| Is 75 VU a stable operating point? | **Not yet for the 1.5s gate** (2.55s read p95). Correctness is stable; latency gate is not met. |
| Is 100 VU reasonable to test? | **Exploratory only, not a pass candidate.** Prefer clearing or tightly bounding 75 first; if run, expect fail and treat as discovery. |
| Next engineering step | Prefer **one** of: (a) controlled **Small → Medium** A/B if you want to know remaining infra headroom, or (b) **targeted app receiving work** on remaining hot routes (`dashboard` / `calendar` / `event_detail`) now that hold contention is quieter. Do **not** loosen thresholds; do **not** touch Auth Absolute/10; do **not** deploy production. |

---

## 6. Infra notes captured around the run

- Pre-run dashboard: Compute size **Small** checked; Auth Absolute/10 confirmed.
- Idle/post-prior-load gauges had been elevated (~80% CPU after earlier Micro
  runs); Small memory headroom is 2 GB vs Micro 1 GB.
- During/after this A/B, correctness and integrity stayed green — no Auth or
  connection-exhaustion failure mode appeared in k6 counters.
