# 100-school / 75-VU — Run 6 Event Detail Approvals client-load

**Status:** **LOCAL WIN, GATE STILL FAILING** — correctness perfect.
Deferring Event Detail Approvals SSR-stream cut `event_detail` / `event_approvals`
p95 by ~0.55s and collapsed that route’s hold `>3s` share, but ordinary-read
p95 only moved **2.55s → 2.46s** (still ≫ **1.5s**).
**Date:** August 3–4, 2026
**Run ID:** `100school-75vu-run6-event-approvals-client-20260803-2152`
**Baseline (same compute):** [Run 5 Small A/B](./100-school-75vu-data-scale-run5-small-ab.md)
**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

---

## 1. Experimental control

| Control | Value |
|---|---|
| Intentional variable | Stop SSR-streaming Event Detail Approvals; load via `loadEventDetailTabAction` |
| Why chosen | Run 5 hold `>3s` leader was `event_detail` (23); bare `/events/{id}` waited on approvals Suspense before HTML finished |
| Unchanged | Small compute, Absolute/10 Auth, thresholds, fixture `arch100`, GET-only, tenant/auth gates |
| Preview | `https://campaignos-kujdkwghy-campignos.vercel.app` (`dpl_CwydZEFTb9sPrFkczX4AaCaMaf5e`) |
| App change | `approvalsSlot={undefined}` in `render-events-phase3.tsx`; `EventDetailApprovalsStream` kept for revert |

Safety: reminted 75 owners, preflight 25/25, warm-up discarded, recorded run.
Post-run integrity **25/25**. Production / Auth / thresholds untouched.

### Payload probe (school 1 owner, same event)

| Route | Run 5-era note | Run 6 |
|---|---:|---:|
| `/events/{id}` | ~85 KB (prior probe) | **71.7 KB**, `workflowStatus` hits **0** |
| `?tab=approvals` | SSR approvals stream | **71.7 KB**, hits **0** |
| `/dashboard` / `/calendar` / `/approvals` | ~143 / ~119 / ~131 KB | **142.6 / 118.8 / 130.6 KB** (unchanged) |

---

## 2. Primary comparison — Run 5 Small vs Run 6 (Small + client Approvals)

| Metric | Run 5 Small | Run 6 | Δ (R6 − R5) |
|---|---:|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** | flat (perfect) |
| `kind:read` p95 / p99 / max | 2.55 / 3.17 / 4.63s | **2.46 / 3.42 / 9.11s** | **−0.10 / +0.25 / +4.48s** |
| `http_req_waiting` p95 | 1.14s | **1.19s** | +0.05s |
| `http_req_receiving` p95 | 1.56s | **1.40s** | **−0.16s** |
| `event_detail` p95 | 2.81s | **2.25s** | **−0.56s** |
| `event_approvals` p95 | 2.70s | **2.13s** | **−0.57s** |
| `dashboard` / `calendar` p95 | 2.75 / 2.95s | **2.79 / 2.77s** | +0.04 / −0.17s |
| `approvals` (org hub) p95 | 2.24s | **2.84s** | +0.59s (hub code unchanged — treat as run variance) |
| Hold >3s / >5s (hold window) | 71 / 0 | **55 / 0** | −16 / 0 |
| All-phase >5s | 0 | **14** (ramp; hold still 0) | ramp outliers only |

k6 still crossed: `kind:read`, dashboard, calendar, events_list (latency gates).

### Hold-window route mix (Run 6, >3s in hold)

`calendar` 15 · `dashboard` 10 · `events_list` 9 · `settings_team_access` 6 ·
`branding` 5 · `approvals` 4 · **`event_detail` 3** · others ≤2.

**vs Run 5:** `event_detail` hold leaders **23 → 3**. The intervention hit its
target symptom. Remaining hold mass is calendar / dashboard / events_list.

---

## 3. Engineering interpretation

### Did the hypothesis hold?

**Yes, locally.** Bare Event Detail was blocked on SSR Approvals streaming.
Removing that stream:

- cut HTML (~85 → 72 KB) and removed approvals DTO from the document
- cut `event_detail` / `event_approvals` p95 by ~0.55s each
- collapsed Event Detail’s share of hold `>3s`

**No, for the gate.** Aggregate ordinary-read p95 barely moved (−96ms). Waiting
did not improve. Dashboard/calendar (still ~2.8s p95, ~143/119 KB) now dominate
the remaining hold mix. Further Event Detail Approvals SSR work will not clear
the 1.5s gate.

### Application vs infrastructure?

This was a **valid app receiving/TTFB lever on one hot route**. It does not
reclassify the residual 75-VU miss as app-only or infra-only: wait p95 still
~1.2s and recv p95 ~1.4s on Small. Global progress needs either a **larger
shared-route payload cut** (dashboard/calendar) or a **compute headroom**
experiment (Small→Medium).

---

## 4. Decisions

| Question | Answer |
|---|---|
| Keep the change? | **Yes** — real route win, correct shell-first UX, no correctness/security regression; `EventDetailApprovalsStream` remains for revert. |
| Clear the 1.5s gate? | **No** (2.46s read p95). |
| More Event Detail Approvals SSR tweaks? | **Stop** — diminishing returns for the aggregate gate. |
| Next engineering step (as of Run 6) | Prefer dashboard/calendar lean **or** Small→Medium A/B. **Later completed:** Medium A/B (Run 7); Phase 1 closed — [performance-engineering-phase1-complete.md](./performance-engineering-phase1-complete.md). Do **not** treat 100 VU as a Phase 1 pass candidate. |

---

## 5. Artifacts

- Console: `load-tests/k6/results/data-scale-100school-75vu-run6-console.log`
- Summary: `load-tests/k6/results/data-scale-100school-75vu-100school-75vu-run6-event-approvals-client-20260803-2152-summary.json`
