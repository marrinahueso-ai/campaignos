# 100-school / 75-VU latency — root-cause analysis

**Status:** **CLOSED with Phase 1** — see
[performance-engineering-phase1-complete.md](./performance-engineering-phase1-complete.md).
Dual bottleneck confirmed; infrastructure amplification largely removed by
**Medium**. Final measured ordinary-read p95 **1.55s** (Run 7) — **~53ms** over
the unchanged **1.5s** gate. Route gates pass on Medium. Residual thin
wait+recv, led by **dashboard**.
**Date:** August 4, 2026
**Baseline:** [75-VU Run 1](./100-school-75vu-data-scale-run1.md)
**Attempts:** [Run 2](./100-school-75vu-data-scale-run2-rca.md) ·
[Run 3](./100-school-75vu-data-scale-run3-attn.md) ·
[Run 4](./100-school-75vu-data-scale-run4-defer.md) ·
[Run 5 Small A/B](./100-school-75vu-data-scale-run5-small-ab.md) ·
[Run 6 Event Approvals client](./100-school-75vu-data-scale-run6-event-approvals-client.md) ·
[Run 7 Medium A/B](./100-school-75vu-data-scale-run7-medium-ab.md)

---

## Root cause summary

At 75 concurrent pinned owners, latency rises from concurrent RSC **waiting**
and **receiving**. Micro and Small amplified that pattern. Medium (same
Preview/app as Run 6) improved wait and recv ~equally and moved aggregate
read p95 by **−0.91s**, landing just above the 1.5s gate.

| Phase (k6 p95) | 50-VU | R6 Small | **R7 Medium (final)** |
|---|---:|---:|---:|
| waiting | 594ms | 1,192ms | **729ms** |
| receiving | 900ms | 1,400ms | **897ms** |
| `kind:read` | 1,376ms | 2,458ms | **1,553ms** |
| Hold >3s | 1 | 55 | **48** |

**Kept (all):**

1. Dashboard event-range collapse (Run 2)
2. Lean Attention counts (Run 3)
3. Approvals terminal deferral (Run 4)
4. Micro → Small compute (Run 5)
5. Event Detail Approvals client-load (Run 6)
6. **Small → Medium compute (Run 7)** — accepted staging / preferred prod tier

---

## Evidence pivot

| Fact | Value |
|---|---|
| Final compute | **Medium (4 GB / 2-core)** verified |
| Auth allocation | Absolute/10 unchanged; non-causal for latency |
| R7 gate crossings | **Only** `kind:read` (1.553s); dashboard/calendar/events_list pass &lt;2s |
| Post-run Medium gauges | Compute/CPU/Memory ~75–78%, Disk IO ~1% |

---

## Where latency remains (post–Phase 1)

### 1. Thin residual RSC + HTML on shared hubs — primary remaining lever

On Medium: wait p95 0.73s + recv p95 0.90s. Aggregate miss ~53ms. Dashboard
still the slowest hard-gated route (1.91s). **Post-launch roadmap:** one
dashboard/calendar lean under Medium — not a Phase 1 blocker.

### 2. Compute headroom — largely addressed

Keep **Medium**. Large is optional only after an app cut still misses.

### 3. Prior app remediations — keep

Product-correct; insufficient alone at Micro/Small.

---

## Phase 1 close decisions

| Question | Answer |
|---|---|
| Phase status | **Complete** — hand off to Security & Production Readiness |
| Staging compute | **Medium** |
| Production compute | **Medium** preferred for ~75-VU ambition |
| 75 VU stable? | Correctness yes; latency gate **not yet** (1.55s) |
| 100 VU now? | **Do not run** (Phase 1 doc §15) |
| Threshold / Auth change? | No |
| Reopen Phase 1? | Only on contradicting production evidence |
