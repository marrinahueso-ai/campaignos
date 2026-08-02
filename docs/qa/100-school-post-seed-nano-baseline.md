# Post-seed performance snapshot — `heyralli-staging` (100-school / Nano / post-seed idle baseline)

**Status:** Frozen reference point — captured immediately after the 100-school architecture seed passed integrity validation, before any performance testing, index changes, or compute upgrade.
**Owner:** Engineering / QA
**Captured:** August 2, 2026, via the Supabase dashboard (SQL Editor + Infrastructure page) for project `heyralli-staging` (`hdoujyngcqrsgtvqehyt`), immediately after the `100-school-architecture` seed (`TEST_RUN_ID=arch100`) passed all 18 integrity checks. Idle capture — no load test was running. Report only — nothing was changed.
**Related:** [Pre-seed baseline (20-school)](./100-school-pre-seed-baseline.md) · [k6 load test findings](./k6-load-test-findings.md) · [Performance budget](./performance-budget.md)

This snapshot is diffed directly against the [20-school / Nano pre-seed baseline](./100-school-pre-seed-baseline.md). The database now holds **both** fixtures side by side: the original 20-school k6 load-test dataset (untouched) **plus** the new 100-school architecture-validation dataset. All totals below are for the whole database (both fixtures combined) unless noted; the growth analysis isolates the 100-school seed's contribution.

## Database size

| Metric | Pre-seed (20-school) | Post-seed (120-org total) | Δ absolute | Δ % |
|---|---:|---:|---:|---:|
| Logical size (`pg_database_size`, all schemas) | 18 MB (18,549,907 bytes) | **28 MB** (28,847,251 bytes) | +9.82 MB (+10,297,344 bytes) | **+55.5%** |
| `public` schema only | 3.65 MB (3,825,664 bytes) | **12 MB** (12,271,616 bytes) | +8.06 MB (+8,445,952 bytes) | **+220.8%** |
| Dashboard-reported "Database" disk usage | 32.3 MB | **42.1 MB** | +9.8 MB | +30.3% |
| Active connections / max | 12 / 60 | **16 / 60** | +4 | — |

## Storage usage (disk provisioning)

| Metric | Pre-seed | Post-seed | Δ |
|---|---|---|---|
| Disk used / provisioned | 0.26 GB / 2 GB (13%) | **0.274 GB / 2 GB (14%)** | +14 MB (+1pp) |
| Breakdown | Database 32.3 MB · WAL 64 MB · System 168 MB | Database 42.1 MB · WAL 64 MB · System 168.1 MB | WAL/System flat; Database +9.8 MB |
| Storage type | General Purpose SSD (gp3) | General Purpose SSD (gp3), 3000 IOPS / 125 MB/s | unchanged |

Still only **14%** of provisioned disk after adding 5x the organizations — no near-term storage-capacity concern at this scale.

## Table row counts (both fixtures combined)

Exact counts below are from `SELECT count(*)` via PostgREST (`npm run test:load:snapshot:database`), cross-validated by the [validation script](../../load-tests/k6/scripts/validate-architecture-seed.mjs)'s 18/18 passing checks (exact organizations/memberships/events/milestones counts). See note below the table on a stale-statistics discrepancy observed in `pg_stat_user_tables`.

| Table | Pre-seed rows | Post-seed rows (exact) | New rows (100-school seed) |
|---|---:|---:|---:|
| `organizations` | 20 | **120** | +100 |
| `organization_users` | 160 | **960** | +800 |
| `organization_roles` | 140 | **940** | +800 |
| `school_years` | 20 | **120** | +100 |
| `events` | 40 | **2,540** | +2,500 |
| `approval_scheduling_items` (milestones) | 40 | **12,540** | +12,500 |
| `communication_items` | 0 | **2,500** | +2,500 (new table for this profile) |
| `event_assets` | 0 (populated) | **2,500** | +2,500 (new table for this profile) |
| `communication_playbooks` | 9 (system only) | **109** | +100 (org-scoped) |
| `communication_playbook_steps` | 52 (system only) | **552** | +500 |
| `inbox_threads` | 20 | **320** | +300 |
| `organization_brand_kit_items` | 0 | **400** | +400 (new table for this profile) |
| `calendar_imports` | 0 | **100** | +100 |
| `organization_ai_credit_ledger` / `_balances` | 4 / 4 | 4 / 4 | unchanged |
| `vendor_categories` | 7 | 7 | unchanged |
| `ai_usage_log` | 0 | 0 | unchanged |

Every new-row count matches the `100-school-architecture` seed's target volume **exactly** (100 orgs × 8 users, 25 events/org × 5 milestones/event, 3 inbox threads/org, 4 brand-kit items/org, 1 calendar import/org, 1 playbook × 5 steps/org, 1 communication item + 1 AI-asset-metadata row/event).

> **Note on a minor stale-statistics discrepancy:** the SQL Editor's "largest tables" query (`pg_stat_user_tables.n_live_tup`) reported slightly higher row estimates for a handful of tables at capture time — e.g. `organizations` 121 vs. the exact 120, `organization_roles` 948 vs. the exact 940, `communication_playbooks` 110 vs. 109, `calendar_imports` 101 vs. 100. `n_live_tup` is a planner statistic refreshed by autovacuum/ANALYZE and can lag briefly after a large bulk-insert burst; it is **not** a live `count(*)`. The exact `count(*)` figures above (independently cross-checked by the validation script) are authoritative.

## Largest tables (by total size, table + indexes)

Table/index sizes below are exact (`pg_table_size` / `pg_indexes_size`, from the SQL Editor query); row counts are the exact `count(*)` figures (see note above), not the query's raw `n_live_tup` estimate.

| Table | Rows (exact) | Table size | Index size | Total | Pre-seed total | Growth |
|---|---:|---:|---:|---:|---:|---:|
| `approval_scheduling_items` | 12,540 | 3,504 kB | 928 kB | **4,432 kB** | 104 kB | **+4,162%** (new dominant table — expected, this *is* the 5x-events-x-100-schools milestone volume) |
| `events` | 2,540 | 696 kB | 360 kB | **1,056 kB** | 168 kB | +529% |
| `communication_items` | 2,500 | 360 kB | 584 kB | **944 kB** | n/a (0 rows pre-seed) | new |
| `organization_users` | 960 | 272 kB | 576 kB | **848 kB** | 256 kB | +231% (rows grew 6.0x, size grew only 3.3x — healthy sub-linear overhead amortization) |
| `event_assets` | 2,500 | 368 kB | 224 kB | **592 kB** | n/a (0 rows pre-seed) | new |
| `organization_roles` | 940 | 176 kB | 280 kB | **456 kB** | 136 kB | +235% |
| `inbox_threads` | 320 | 112 kB | 184 kB | **296 kB** | 120 kB | +147% |
| `communication_playbook_steps` | 552 | 104 kB | 88 kB | **192 kB** | n/a | +new org-scoped steps |
| `organization_brand_kit_items` | 400 | 96 kB | 56 kB | **152 kB** | n/a (0 rows pre-seed) | new |
| `communication_playbooks` | 109 | 64 kB | 64 kB | **128 kB** | 72 kB | +78% |
| `school_years` | 120 | 48 kB | 48 kB | **96 kB** | 64 kB | +50% |
| `calendar_imports` | 100 | 64 kB | 32 kB | **96 kB** | n/a (0 rows pre-seed) | new |
| `organizations` | 120 | 64 kB | 24 kB | **88 kB** | ~24 kB (empty-floor est.) | +267% |
| `organization_ai_credit_ledger` | 4 | 16 kB | 64 kB | **80 kB** | 80 kB | unchanged |
| `ai_usage_log` | 0 | 8 kB | 56 kB | **64 kB** | 64 kB | unchanged |

## Largest indexes (any schema)

| Schema | Table | Index | Size |
|---|---|---|---:|
| `public` | `approval_scheduling_items` | `approval_scheduling_items_pkey` | **584 kB** (largest app-schema index — was ≤56 kB pre-seed) |
| `public` | `approval_scheduling_items` | `approval_scheduling_items_event_id_idx` | 240 kB |
| `auth` | `users` | `users_email_partial_key` | 224 kB (was ≤40 kB-class pre-seed) |
| `auth` | `users` | `users_instance_id_email_idx` | 192 kB |
| `public` | `communication_items` | `communication_items_event_channel_hub_idx` | 168 kB |
| `public` | `communication_items` | `communication_items_step_lookup_idx` | 168 kB |
| `auth` | `users` | `idx_users_email` | 160 kB |
| `public` | `organization_users` | `organization_users_email_lower_idx` | 152 kB |
| `auth` | `identities` | `identities_email_idx` | 152 kB |
| `public` | `organization_users` | `organization_users_organization_id_email_key` | 136 kB |

Pre-seed, the top 10 index list was dominated by `auth` schema indexes at 40–56 kB each, with the largest **application**-schema index at 40 kB. Post-seed, application-schema indexes (`approval_scheduling_items`, `communication_items`, `organization_users`) now dominate the top of the list, which is the expected and desired outcome — the app's own tenant-scoped indexes are absorbing the new query load, not `auth`.

## Auth schema growth

| Metric | Pre-seed | Post-seed |
|---|---|---|
| `auth.users` row count | 160 (from 20-school seed only) | **960** (160 + 800 architecture users) |
| `auth` schema total size | not captured as a single figure pre-seed (largest individual `auth` index was ≤56 kB) | **3.78 MB** (3,874,816 bytes) total across all `auth` tables/indexes |

Auth users grew **6.0x** (160 → 960); the `auth` schema's per-user footprint (~3.9 kB/user amortized across all its tables and indexes) is small and not a scaling concern at this volume.

## Bucket sizes

Unchanged from pre-seed — all 8 storage buckets remain **completely empty** (0 objects, 0 bytes). The architecture seed intentionally used **AI-asset metadata only** (`event_assets` rows with `ai_generated=true`, `storage_path=null`) and placeholder `storage_path` strings for brand-kit/calendar-import metadata — no real files were uploaded, per the seed's safety constraints.

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

| Metric | Pre-seed | Post-seed | Δ |
|---|---:|---:|---:|
| Compute tier | Nano | **Nano** (unchanged — not upgraded) | — |
| CPU utilization | 44% | **44%** | 0pp |
| Memory utilization | 55% | **62%** | +7pp |
| Disk IO utilization | 1% | **1%** | 0pp |
| Overall compute utilization | 55% | **62%** | +7pp |

CPU and disk IO are unchanged (idle capture, no traffic running against either snapshot). Memory ticked up modestly (+7pp) — plausible given 5x more organizations/rows resident in shared buffers/catalog caches, but still well within Nano's headroom with no immediate pressure.

## Growth analysis — is it linear?

- **Per-school average database growth:** +8.06 MB public-schema growth ÷ 100 new schools ≈ **80.6 KB/school** (public schema); +9.82 MB logical growth ÷ 100 new schools ≈ **98.2 KB/school** (whole database). At this rate, a further 5x scale-up (500 schools) would add roughly another ~40 MB logical size — trivial for the current 2 GB disk allocation.
- **Row growth vs. size growth is sub-linear (healthy):** `organization_users` rows grew **6.0x** (160→960) while its total size grew only **3.3x** (256 kB→848 kB); `organization_roles` grew **6.7x** in rows (140→940) vs. **3.35x** in size (136 kB→456 kB). This is the expected/desired pattern — per-row storage and index overhead amortizes better as tables grow, not the reverse (no evidence of index bloat or pathological growth).
- **The new dominant table (`approval_scheduling_items`) grew in exact proportion to the seed's design ratio:** 12,540 rows ÷ 2,540 events ≈ 4.94 milestones/event overall (the 100-school seed itself is exactly 5.0/event — 12,500 ÷ 2,500; the slight overall dilution to 4.94 comes from the 40 legacy rows in the original 20-school fixture, which used 1 milestone/event).
- **Auth-schema growth tracked user growth roughly proportionally** (6.0x users → auth schema now 3.78 MB total, still a small fraction of overall DB size).
- **Largest-index growth is driven by the new tenant-scoped tables** (`approval_scheduling_items`, `communication_items`), not by `auth` — a good sign that indexing is scaling with actual application data rather than session/token churn.

**Conclusion: growth from 20→120 organizations (100-school seed) is linear-to-sub-linear across every table and index measured.** No table, index, or schema showed disproportionate (super-linear) growth relative to its row-count increase.

## Takeaway

The database absorbed a 5x increase in organizations (20→120) and a 5x+ increase in most tenant-scoped row counts while still using only **12 MB of logical `public`-schema size** and **14% of provisioned disk**. CPU and disk IO are unchanged at idle; memory ticked up modestly but with clear headroom remaining on **Nano** compute. All growth patterns are linear-to-sub-linear with no signs of index bloat or non-linear scaling. This is a clean, healthy **100-school / Nano / post-seed idle baseline** — the architecture validation is complete and the database has not yet been performance-tested at this scale (that is a deliberately separate, later step).
