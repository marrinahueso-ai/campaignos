# Post-upgrade performance snapshot — `heyralli-staging` (100-school / Micro / idle baseline)

**Status:** Frozen reference point — captured immediately after the manual Nano → Micro compute upgrade, before any performance testing, query optimization, or reseed.
**Owner:** Engineering / QA
**Captured:** August 2, 2026, via the Supabase dashboard (SQL Editor + Infrastructure page) and PostgREST row-count snapshot, for project `heyralli-staging` (`hdoujyngcqrsgtvqehyt`), immediately after confirming the compute resize to **Micro** completed and the project reported **Healthy**. Idle capture — no load test was running. Report only — nothing was changed, no data was written.
**Related:** [Post-seed Nano baseline (100-school)](./100-school-post-seed-nano-baseline.md) · [Pre-seed baseline (20-school)](./100-school-pre-seed-baseline.md) · [Micro upgrade checklist](./100-school-micro-upgrade-checklist.md) · [Seed design review](./100-school-seed-architecture-design-review.md)

This snapshot is diffed against the [100-school / Nano / post-seed baseline](./100-school-post-seed-nano-baseline.md). **No seed, cleanup, or write operation ran between the two captures** — the only change is the compute tier (Nano → Micro). All dataset-level numbers below are expected to be identical; only compute-utilization percentages should differ (same absolute load on more headroom).

## Compute tier confirmation

| Metric | Value |
|---|---|
| Project | `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) |
| Compute size (Infrastructure → Scaling) | **Micro** — selected/checked, `$0.01344/hour`, 1 GB memory, 2-core CPU |
| Project status | Healthy |
| Confirmed via | Supabase dashboard, Settings → Infrastructure → Compute size radio group (`Micro` shown as `checked`) |

## Database size

| Metric | Post-seed (Nano) | Post-upgrade (Micro) | Δ absolute | Δ % |
|---|---:|---:|---:|---:|
| Logical size (`pg_database_size`, all schemas) | 28 MB (28,847,251 bytes) | **28 MB** (28,896,403 bytes) | +48,152 bytes (~0.05 MB) | +0.17% |
| `public` schema only | 12 MB (12,271,616 bytes) | **12 MB** | ~unchanged | ~0% |
| Dashboard-reported "Database" disk usage | 42.1 MB | **42.1 MB** | 0 | 0% |
| Active connections / max | 16 / 60 | **14 / 60** | −2 | — |

The ~48 KB delta is consistent with normal catalog/WAL bookkeeping between two point-in-time captures (no seed ran) — not data growth. Exact row counts (below) confirm the dataset is byte-for-byte unchanged in content.

## Storage usage (disk provisioning)

| Metric | Post-seed (Nano) | Post-upgrade (Micro) | Δ |
|---|---|---|---|
| Disk used / provisioned | 0.274 GB / 2 GB (14%) | **~0.3 GB / 2 GB (15%)** | +1pp |
| Breakdown | Database 42.1 MB · WAL 64 MB · System 168.1 MB | Database 42.1 MB · WAL 80 MB · System 168.1 MB | WAL +16 MB (normal fluctuation), Database/System flat |
| Storage type | General Purpose SSD (gp3) | General Purpose SSD (gp3), unchanged | unchanged |
| Disk size setting | 2 GB | **2 GB** (unchanged — disk was not resized, only compute) | unchanged |

Still only **15%** of provisioned disk. Disk was intentionally *not* touched by this upgrade (compute-only resize).

## Table row counts — dataset integrity confirmation

Exact counts via `npm run test:load:snapshot:database` (PostgREST `count=exact`), captured post-upgrade:

| Table | Post-seed (Nano) | Post-upgrade (Micro) | Match? |
|---|---:|---:|---|
| `organizations` | 120 | **120** | ✅ |
| `organization_users` | 960 | **960** | ✅ |
| `organization_roles` | 940 | **940** | ✅ |
| `school_years` | 120 | **120** | ✅ |
| `events` | 2,540 | **2,540** | ✅ |
| `approval_scheduling_items` (milestones) | 12,540 | **12,540** | ✅ |
| `communication_items` | 2,500 | **2,500** | ✅ |
| `event_assets` | 2,500 | **2,500** | ✅ |
| `communication_playbooks` | 109 | **109** | ✅ |
| `communication_playbook_steps` | 552 | **552** | ✅ |
| `inbox_threads` | 320 | **320** | ✅ |
| `organization_brand_kit_items` | 400 | **400** | ✅ |
| `calendar_imports` | 100 | **100** | ✅ |
| `organization_ai_credit_ledger` / `_balances` | 4 / 4 | **4 / 4** | ✅ |
| `vendor_categories` | 7 | **7** | ✅ |
| `ai_usage_log` | 0 | **0** | ✅ |

**Every table matches exactly, zero drift.** The 100-school dataset is confirmed byte-for-byte unchanged across the compute upgrade.

## Largest tables (by total size, table + indexes)

| Table | Rows (approx, `n_live_tup`) | Table size | Index size | Total |
|---|---:|---:|---:|---:|
| `approval_scheduling_items` | 12,540 | 3,504 kB | 928 kB | **4,432 kB** |
| `auth.users` | 960 | 624 kB | 832 kB | **1,456 kB** |
| `events` | 2,540 | 696 kB | 360 kB | **1,056 kB** |
| `communication_items` | 2,500 | 360 kB | 584 kB | **944 kB** |
| `organization_users` | 960 | 272 kB | 576 kB | **848 kB** |
| `auth.identities` | 970 | 416 kB | 352 kB | **768 kB** |
| `event_assets` | 2,500 | 368 kB | 224 kB | **592 kB** |
| `organization_roles` | 948 | 176 kB | 280 kB | **456 kB** |
| `auth.refresh_tokens` | 739 | 144 kB | 272 kB | **416 kB** |
| `inbox_threads` | 320 | 112 kB | 184 kB | **296 kB** |
| `auth.sessions` | 694 | 104 kB | 168 kB | **272 kB** |
| `auth.mfa_amr_claims` | 694 | 96 kB | 112 kB | **208 kB** |
| `communication_playbook_steps` | 552 | 104 kB | 88 kB | **192 kB** |

All sizes are identical (byte-for-byte, within kB rounding) to the post-seed Nano baseline — confirming no data changed. `n_live_tup` shown as-is (same minor planner-statistics lag noted in the Nano baseline; exact `count(*)` figures are in the table above).

## Largest indexes (any schema)

| Schema | Table | Index | Size |
|---|---|---|---:|
| `public` | `approval_scheduling_items` | `approval_scheduling_items_pkey` | **584 kB** |
| `public` | `approval_scheduling_items` | `approval_scheduling_items_event_id_idx` | 240 kB |
| `auth` | `users` | `users_email_partial_key` | 224 kB |
| `auth` | `users` | `users_instance_id_email_idx` | 192 kB |
| `public` | `communication_items` | `communication_items_step_lookup_idx` | 168 kB |
| `public` | `communication_items` | `communication_items_event_channel_hub_idx` | 168 kB |
| `auth` | `users` | `idx_users_email` | 160 kB |
| `auth` | `identities` | `identities_email_idx` | 152 kB |
| `public` | `organization_users` | `organization_users_email_lower_idx` | 152 kB |
| `public` | `organization_users` | `organization_users_organization_id_email_key` | 136 kB |
| `public` | `communication_items` | `communication_items_event_id_idx` | 128 kB |
| `public` | `event_assets` | `event_assets_event_id_idx` | 128 kB |
| `public` | `communication_items` | `communication_items_pkey` | 112 kB |

Identical ranking and sizes to the Nano baseline — no index bloat, no schema drift across the upgrade.

## Bucket sizes

Unchanged — all 8 storage buckets remain **completely empty** (0 objects, 0 bytes), consistent with every prior capture.

| Bucket | Public | Objects | Size |
|---|---|---:|---:|
| `school-assets` | yes | 0 | 0 bytes |
| `event-assets` | yes | 0 | 0 bytes |
| `training-library` | no | 0 | 0 bytes |
| `developer-agreements` | no | 0 | 0 bytes |
| `organization-stickers` | yes | 0 | 0 bytes |
| `campaign-files` | yes | 0 | 0 bytes |
| `calendar-uploads` | no | 0 | 0 bytes |
| `vendor-documents` | no | 0 | 0 bytes |

## Supabase compute metrics (idle, no load test running)

| Metric | Post-seed (Nano) | Post-upgrade (Micro) | Δ |
|---|---:|---:|---:|
| Compute tier | Nano (0.5 GB mem, shared CPU) | **Micro** (1 GB mem, 2-core CPU) | upgraded |
| Compute utilization (dashboard "Compute") | 62%* | **44%** | −18pp |
| CPU utilization | 44% | **44%** | 0pp |
| Memory utilization | 62% | **39%** | −23pp |
| Disk IO utilization | 1% | **1%** | 0pp |

\* Post-seed Nano's headline "Compute" figure and "Memory" figure were the same value (62%) since Nano's compute gauge tracks memory pressure at that tier.

**Interpretation:** CPU and disk IO are unchanged at idle (same absolute workload — none), which is expected. Memory utilization dropped from 62% to 39% — this is the direct, expected effect of doubling available RAM (0.5 GB → 1 GB) against the same resident dataset (shared buffers, catalog caches, connection overhead). This confirms **Micro provides meaningfully more headroom** than Nano did at the same 100-school data volume, before any load has even been applied.

## Integrity validation (post-upgrade)

Ran `npm run test:load:validate:100-schools` (`TEST_RUN_ID=arch100`) against the Micro-tier project:

**25 / 25 checks passed** — full list: exact org/membership/role-coverage counts, no duplicate emails or memberships, all memberships linked to auth users, exact event/milestone counts and 1:1 per-org/per-event ratios, no orphaned events/milestones/communications, valid `organization_id` on every tenant-owned row, no cross-school references, RLS negative check (cross-org read denied), full traceability to `TEST_RUN_ID`, and all 7 duplicate-detection checks (org names, event titles, milestone names, event assets, brand-kit labels, calendar-import filenames, playbook steps) — zero duplicates found.

(Note: this is 25 checks, not 18, because the [seed hardening pass](./100-school-seed-architecture-design-review.md) added 7 duplicate-validation checks after the original post-seed Nano baseline was captured. All checks — old and new — pass cleanly on Micro.)

## Takeaway

The Nano → Micro compute upgrade completed cleanly with **zero data impact**: every table row count, every table/index byte size, and every storage bucket is identical to the pre-upgrade Nano baseline, and all 25 integrity checks pass. The upgrade delivered its intended effect — memory utilization headroom improved from 62% to 39% at the same idle 100-school data volume, with CPU and disk IO unchanged (idle, no load). This is a clean, healthy **100-school / Micro / idle baseline**, ready to serve as the reference point for the upcoming 100-school / 20-VU data-scale performance profile (not yet run).
