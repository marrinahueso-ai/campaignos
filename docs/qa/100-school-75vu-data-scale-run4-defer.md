# 100-school / 75-VU data-scale — Run 4 (Approvals terminal deferral)

**Status:** **LATENCY STILL FAILING** — correctness perfect; ordinary-read and
hot-route p95 gates failed. Deferring scheduled/posted/published Approvals
detail rows cut HTML ~40% but did **not** materially clear the 1.5s gate
versus Run 1 or Run 3.
**Date:** August 3, 2026
**Run ID:** `100school-75vu-run4-defer-20260804-0131`
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
**Prior:** [Run 3 Attention lean](./100-school-75vu-data-scale-run3-attn.md)
**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

---

## 1. Intervention selected (and why)

**Defer terminal Approvals hub detail rows from SSR**, keep a thin status
index for accurate pulse/summary/campaigns, lazy-load
`scheduled` / `posted` / `published` when those pulses or search need them.

Why this over thinner DTO / pagination / streaming:

- Approvals was the largest initial document (~224 KB / 125 CB2 rows).
- First paint only needs actionable + failed rows; terminal pulses are
  below-the-fold filters.
- Cap/pagination would hide records unless explicit; deferral keeps counts
  visible and loads rows on demand.
- Revision deep-links use the complete fetch path.

Also kept from prior cycles: dashboard event-range collapse + lean Attention.

---

## 2. What changed

| Item | Value |
|---|---|
| Application change | Org hub SSR: `items` = in_queue / assigned_to_me / changes_requested / failed only; thin index drives `pulseCounts`; client lazy-loads deferred statuses |
| Files | `constants.ts`, `hub-initial-payload.ts`, `queries.ts`, `types.ts`, `actions.ts`, `ApprovalsSchedulingHub.tsx`, `revision/page.tsx`, `outcome-display.ts`, `hub-initial-payload.test.ts` |
| Preview | `https://campaignos-4ptvhq1r7-campignos.vercel.app` (`dpl_9UYAZDr49Fx6oQRwHqF758BWh2nu`) |
| Dataset / Auth / Micro / gates | Unchanged (`arch100`, Absolute/10, Micro, same thresholds) |

---

## 3. Approvals payload before / after (school 1 owner)

| | Before (Run 3 Preview) | After (Run 4 Preview) |
|---|---:|---:|
| HTML/RSC bytes | 223,789 (~218.5 KB) | 133,766 (~130.6 KB) |
| Detail rows (`schedulingItemId`) | 125 | 50 |
| Status mix in `items` | 50 in_queue + 25 scheduled + 25 posted + 25 published | 50 in_queue only |
| `defersTerminalDetailRows` | absent | `true` |
| Serialized list fields | Full list DTO × 125 | Full list DTO × 50 |
| Extra | — | Thin index (5 cols × all statuses) + `pulseCounts` |

≈ **40% smaller document**, **60% fewer detail rows**. Same per-row field set for
remaining items; terminal rows omitted until pulse/search/deep-link.

---

## 4. Result vs Run 1 and Run 3

| Metric | Run 1 | Run 3 | Run 4 (defer) |
|---|---:|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | 0 / 0 / 100% | **0 / 0 / 100%** |
| Dropped / unexpected 401/403/429/500 | 0 | 0 | **0** |
| `kind:read` p95 / p99 / max | 2.77 / 3.50 / 5.47s | 3.35 / 4.96 / 6.53s | **3.35 / 4.40 / 5.20s** (**FAIL**) |
| `approvals` p95 / p99 / max | 2.43 / 3.61 / 3.97s | 3.35 / 4.59 / 5.09s | **3.23 / 3.66 / 3.85s** |
| `dashboard` p95 | 3.17s | 3.74s | **3.72s** (**FAIL**) |
| `calendar` / `events_list` p95 | 2.83 / 2.42s | 3.40 / 3.02s | **3.95 / 3.20s** (**FAIL**) |
| `http_req_waiting` p95 | 1.21s | 1.49s | **1.51s** |
| `http_req_receiving` p95 | 1.73s | 2.00s | **1.93s** |
| waiting / receiving **avg** | 630 / 838ms | 635 / 837ms | **653 / 845ms** |
| Hold >3s / >5s / >10s / >20s | 134 / 2 / 0 / 0 | 344 / 53 / 0 / 0 | **343 / 9 / 0 / 0** |

k6: thresholds crossed on `kind:read`, dashboard, calendar, events_list.

### Hold-window route mix (Run 4, >3s in hold)

`event_detail` 85 · `dashboard` 61 · `events_list` 48 · `calendar` 46 ·
`event_approvals` 20 · `branding` 18 · `event_planning` 16 · `approvals` 15 ·
others ≤11. Approvals is no longer a top contributor.

Post-run integrity: **25/25 PASS**. Production / Auth allocation / external
providers: **untouched**.

---

## 5. Interpretation

1. Payload goal met locally (~40% Approvals HTML cut); Approvals route max/p99
   improved vs Run 3 and Approvals fell in the hold slow mix.
2. **Overall receiving and ordinary-read p95 did not materially improve** vs
   Run 1 (receiving still ~1.9s p95; read p95 stuck at ~3.35s like Run 3).
3. Multi-route hold contention remains the dominant story — dashboard /
   calendar / events / event_detail still dominate >3s hold counts.
4. Three focused app remediation cycles (query collapse, Attention lean,
   Approvals deferral) preserve correctness but do not clear the unchanged
   1.5s gate on Micro.

---

## 6. Decision

- **Keep** Approvals terminal deferral (explicit, reversible, real payload
  win, no security/correctness regression; improves Approvals tail vs Run 3).
- **Stop** further speculative app-side latency optimization for this gate.
- Do **not** proceed to 100 VU; do **not** loosen thresholds; do **not**
  change Auth Absolute/10 yet.
- **Next experiment:** controlled **Micro → Small** compute A/B under the
  identical 75-VU profile (receiving-focused attempt is done; dual bottleneck
  + multi-route hold slows persist).
