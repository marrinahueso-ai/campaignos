# 100-school / 75-VU data-scale — Run 3 (Attention lean counts)

**Status:** **LATENCY STILL FAILING** — correctness perfect; ordinary-read and
hot-route p95 gates failed. Lean Attention counts did **not** clear the 1.5s
gate versus Run 1.
**Date:** August 3, 2026
**Run ID:** `100school-75vu-run3-attn-20260803-1952`
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
**Prior attempt:** [Run 2 query-collapse](./100-school-75vu-data-scale-run2-rca.md)
**RCA:** [100-school-75vu-latency-rca.md](./100-school-75vu-latency-rca.md)

---

## 1. What changed

| Item | Value |
|---|---|
| Application change | `getTodayAttentionCounts` no longer materializes `getDashboardRichListData`; uses sidebar approval/scheduling badge counts + short-circuit probes for volunteers/tasks |
| Files | `src/lib/today/attention-counts.ts`, `src/lib/today/__tests__/attention-counts-lean.test.ts` |
| Preview | `https://campaignos-rdvyadtak-campignos.vercel.app` (`dpl_3TruCupjYd16PEtMgeYN9GTsVzpi`) |
| Dataset / Auth / Micro / gates | Unchanged |

Also present from prior cycle (kept): dashboard event-range query collapse.

---

## 2. Why this change (evidence pivot)

Staging probe on `arch100` school 1 showed:

| Fact | Value |
|---|---|
| Classic `approval_requests` | **0** |
| CB2 `approval_scheduling_items` | **125** |
| `event_volunteer_sources` | **0** |
| `event_playbook_tasks` | **0** |

So a classic-queue project+cap would have been a **no-op** on this fixture.
Default dashboard Attention was still paying for Volunteer Master + Task Hub +
classic queue overview solely to compute three `.length` values (mostly zero).

---

## 3. Result vs Run 1

| Metric | Run 1 | Run 3 (Attention lean) |
|---|---:|---:|
| Auth / tenant / checks | 0 / 0 / 100% | **0 / 0 / 100%** |
| `kind:read` p95 | 2.77s | **3.35s** (**FAIL**) |
| `dashboard` p95 | 3.17s | **3.74s** (**FAIL**) |
| `calendar` / `events_list` p95 | 2.83 / 2.42s | **3.40 / 3.02s** (**FAIL**) |
| `http_req_waiting` p95 | 1.21s | **1.49s** |
| `http_req_receiving` p95 | 1.73s | **2.00s** |
| waiting / receiving **avg** | 630 / 838ms | **635 / 837ms** (~flat) |
| dashboard **avg** | 1.75s | **1.64s** (−0.11s) |
| Hold >3s / >5s / >10s | 134 / 2 / 0 | **344 / 53 / 0** |
| Overall max | 5.47s | **6.52s** |

k6: thresholds crossed on `kind:read`, dashboard, calendar, events_list.

---

## 4. Interpretation

1. Correctness still holds at 75 VU.
2. Attention lean removes real wasted work and should remain — but **p95 did not
   improve** versus Run 1 (and hold `>3s` rose). Avg wait/recv stayed flat.
3. Combined with Run 2 (query collapse), two waiting-path app fixes have not
   moved the ordinary-read gate. Receiving remains ~half+ of read p95.
4. Next leverage is **hot-route HTML size** (approvals ~224 KB / 125 CB2 rows)
   and/or a controlled **Micro → Small** A/B for concurrency headroom.

---

## 5. Decision

- **Keep** Attention lean counts (correctness-preserving; product-aligned
  reviewCount with sidebar badges; avoids empty rich-list fan-out).
- Do **not** proceed to 100 VU.
- Do **not** loosen gates.
