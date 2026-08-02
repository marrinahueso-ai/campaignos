# Pre-seed performance snapshot — `heyralli-staging` (20-school baseline)

**Status:** Frozen reference point — do not edit after 100-school seed lands
**Owner:** Engineering / QA
**Captured:** August 2, 2026, via the Supabase dashboard (SQL Editor + Infrastructure page) for project `heyralli-staging` (`hdoujyngcqrsgtvqehyt`), before any 100-school seed data was added. Report only — nothing was changed.
**Related:** [k6 load test findings](./k6-load-test-findings.md) · [Performance budget](./performance-budget.md)

This is a clean 20-school / Nano-compute reference point, captured immediately
before seeding the larger (100-school) dataset, so future snapshots can be
diffed against a known-good baseline.

## Database size

| Metric | Value |
|---|---|
| Logical size (`pg_database_size`, all schemas) | **18 MB** (18,549,907 bytes) |
| `public` schema only (87 app tables) | **3.65 MB** (3,825,664 bytes) |
| Dashboard-reported "Database" disk usage | 32.3 MB |
| Active connections / max | 12 / 60 |

The 18 MB vs. 32.3 MB difference is expected: the dashboard's infra graph is a periodic disk-usage sample (includes free-space-map/visibility-map overhead and sampling lag), while `pg_database_size()` is the live logical figure. Both are trivially small — this is not a concern.

## Storage usage (disk provisioning)

| Metric | Value |
|---|---|
| Disk used / provisioned | 0.26 GB / 2 GB (**13%**) |
| Breakdown | Database 32.3 MB · WAL 64 MB · System 168 MB |
| Storage type | General Purpose SSD (gp3) |
| Auto-expand policy | Expands to 8 GB automatically once triggered; spend cap currently limits max to 8 GB |

## Table row counts

87 tables total in `public`; **12 have data, 75 are empty** (unused feature tables). Total rows across all tables: **516**. Row counts match the expected 20-school seed exactly:

| Table | Rows | Note |
|---|---:|---|
| `organizations` | 20 | 1 per school ✓ |
| `organization_users` | 160 | 8 users × 20 schools ✓ |
| `organization_roles` | 140 | |
| `school_years` | 20 | |
| `events` | 40 | |
| `approval_scheduling_items` | 40 | |
| `communication_playbook_steps` | 52 | |
| `inbox_threads` | 20 | |
| `communication_playbooks` | 9 | |
| `vendor_categories` | 7 | |
| `organization_ai_credit_ledger` / `_balances` | 4 / 4 | |

## Largest tables (by total size, table + indexes)

| Table | Rows | Table size | Index size | Total |
|---|---:|---:|---:|---:|
| `organization_users` | 160 | 64 kB | 192 kB | **256 kB** |
| `events` | 40 | 48 kB | 120 kB | **168 kB** |
| `organization_roles` | 140 | 56 kB | 80 kB | **136 kB** |
| `inbox_threads` | 20 | 16 kB | 104 kB | **120 kB** |
| `approval_scheduling_items` | 40 | 48 kB | 56 kB | **104 kB** |
| `organization_ai_credit_ledger` | 4 | 16 kB | 64 kB | **80 kB** |
| `communication_playbooks` | 9 | 16 kB | 56 kB | **72 kB** |
| `ai_usage_log` | 0 | 8 kB | 56 kB | **64 kB** |
| `vendor_categories` | 7 | 16 kB | 48 kB | **64 kB** |
| `school_years` | 20 | 16 kB | 48 kB | **64 kB** |

Every empty table still carries a fixed ~24–56 kB floor (empty heap page + index page overhead) — normal Postgres baseline, not a sizing concern at this scale.

## Largest indexes

Dominated by Supabase's own `auth` schema (expected, from the load-test session churn), not application tables:

| Schema | Table | Index | Size |
|---|---|---|---:|
| `auth` | `refresh_tokens` | `refresh_tokens_token_unique` | 56 kB |
| `auth` | `sessions` | `user_id_created_at_idx` | 56 kB |
| `auth` | `mfa_amr_claims` | `amr_id_pk` | 56 kB |
| `auth` | `refresh_tokens` | `refresh_tokens_session_id_revoked_idx` | 56 kB |
| `auth` | `mfa_amr_claims` | `mfa_amr_claims_session_id_authentication_method_pkey` | 56 kB |
| `auth` | `sessions` | `sessions_pkey` | 48 kB |
| `auth` | `refresh_tokens` | `refresh_tokens_updated_at_idx` | 48 kB |
| `auth` | `identities` | `identities_provider_id_provider_unique` | 40 kB |
| **`public`** | `organization_users` | `organization_users_organization_id_email_key` | **40 kB** (largest app-schema index) |
| `public` | `organization_users` | `organization_users_email_lower_idx` | 32 kB |

## Bucket sizes

All 8 storage buckets exist and are **completely empty** (0 objects, 0 bytes) — no file/artwork/vendor-document data has been uploaded in staging yet:

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

## Supabase compute metrics

| Metric | Value |
|---|---|
| Compute tier | **Nano** (shared CPU, up to 0.5 GB memory, $0.01344/hr) — Micro upgrade offered free but not yet applied |
| CPU utilization | 44% |
| Memory utilization | 55% |
| Disk IO utilization | 1% |
| Overall compute utilization | 55% |

## Takeaway

The database is essentially idle-sized at 20 schools — 18 MB logical size, 3.65 MB of actual application data, 13% of provisioned disk, empty storage buckets, and a Nano compute tier already showing meaningful CPU/memory headroom before any real traffic. This is a good, clean baseline to diff against after the 100-school seed lands — the biggest useful before/after deltas to watch will be `organization_users`/`organization_roles` row growth (linear ×5), the `auth` schema index sizes (driven by test-session churn, not data volume), and whether Nano compute needs to move to Micro/Small once real concurrent load resumes at 100-school scale.
