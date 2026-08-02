# 100-School Seed — Architecture Design Review

**Status:** Retrospective design review of the `100-school-architecture` seed profile, written against the actual schema in `supabase/migrations/`. This documents the architecture as implemented in `load-tests/k6/scripts/seed-architecture-dataset.mjs` and `lib/architecture-profile.mjs`.

> **Note:** This seed has already been executed once against `heyralli-staging` (`TEST_RUN_ID=arch100`) and passed all 18 integrity checks (see [post-seed baseline](./100-school-post-seed-nano-baseline.md)). This document was requested as a design review after the fact; no additional data is inserted by this document. Everything below reflects what actually ran, verified line-by-line against migrations just now (not re-derived from memory).
>
> **Acceptance update:** The `arch100` dataset is **accepted as the official 100-school staging fixture** — see §11–§14 for the tooling-hardening changes made afterward (cross-machine seed/cleanup lock, per-step playbook idempotency fix, preflight + post-seed duplicate detection, read-only environment preflight command, and fixture-traceability confirmation). No database migration was required for this hardening or for the current test phase; §11 explains why.

---

## 1. Every table that receives seed data

| Table | Purpose | Est. rows | Foreign keys | Dependencies | Deterministic? | Pre-existing rows? | Idempotent? |
|---|---|---:|---|---|---|---|---|
| `organizations` | Tenant root per synthetic school | 100 | `active_school_year_id → school_years(id)` SET NULL (backfilled after step 2) | none (root) | Yes — name `Load Test School 001..100 (TEST_RUN_ID)` | No | **App-level only** — no DB unique constraint on `name` (see §4/§7) |
| `school_years` | Active year context; **required for events' RLS visibility** | 100 | `organization_id → organizations` CASCADE | organizations | Yes — fixed label `2025-2026` | No | **DB-enforced** — unique `(organization_id, label)` |
| `organization_roles` | 8 named roles per org (role_id target for memberships/assignments) | 800 | `organization_id → organizations` CASCADE | organizations | Yes — fixed 8-role blueprint | No | **DB-enforced** — unique `(organization_id, name)` |
| `auth.users` (Supabase Auth) | Login identity per member | 800 | none (referenced by `organization_users.user_id`) | none — provisioned independently, up front | Yes — deterministic email `loadtest+s{NNN}-{roleKey}-{TEST_RUN_ID}@domain` | No (unless a prior interrupted run partially created some) | **Provider-enforced** — `createUser` on conflict falls back to lookup-by-email |
| `organization_users` | Membership: links auth user ↔ org ↔ role | 800 | `organization_id → organizations` CASCADE; `user_id → auth.users` SET NULL; `organization_role_id → organization_roles` SET NULL | organizations, organization_roles, auth.users | Yes | No | **DB-enforced** — unique `(organization_id, email)` |
| `events` | Campaign/event workspace root | 2,500 | `school_year_id → school_years` SET NULL (no `organization_id` column — see §4 note) | school_years | Yes — title `[prefix] School {NNN} Event {NN}` | No | **App-level only** — no DB unique constraint on `title` (see §7) |
| `approval_scheduling_items` ("milestones") | Unified approvals+scheduling queue item — this schema's only "milestone" concept | 12,500 | `event_id → events` CASCADE; `approval_request_id`/`communication_item_id`/`assigned_user_id`/`requested_by_user_id`/`assigned_organization_role_id` all nullable, unused here | events | Yes — 5 fixed milestone-name templates, cycled `workflow_status` | No | **App-level only** — no DB unique constraint on `(event_id, milestone_name)` (see §7) |
| `communication_items` | Representative per-event communication | 2,500 | `event_id → events` CASCADE; `event_communication_step_id` nullable, unused | events | Yes — channel/status cycle by event index | No | **DB-enforced** — partial unique `(event_id, channel)` where step is null |
| `event_assets` | AI-asset **metadata only** (no real files) | 2,500 | `event_id → events` CASCADE | events | Yes — always `hero_image` / `placeholder` | No | **App-level only** — no DB unique constraint (see §7) |
| `communication_playbooks` | 1 org-scoped playbook per org (distinct from the 8 pre-existing **system** playbooks) | 100 | `organization_id → organizations` CASCADE | organizations | Yes — fixed slug `architecture-general` | No (8 system playbooks with `organization_id=null` pre-exist, untouched) | **DB-enforced** — unique index `(organization_id, slug)` where `organization_id is not null` |
| `communication_playbook_steps` | 5 steps per org-scoped playbook | 500 | `playbook_id → communication_playbooks` CASCADE | communication_playbooks | Yes — fixed 5-step content | No (52 system-playbook steps pre-exist, untouched) | **App-level, all-or-nothing** — count check on `playbook_id`, no per-row unique constraint (see §7 risk) |
| `inbox_threads` | Representative synthetic inbox thread | 300 | `organization_id → organizations` CASCADE; `assigned_user_id → auth.users` SET NULL, unused | organizations | Yes — deterministic `external_thread_id` | No | **DB-enforced** — unique `(organization_id, channel_type, external_thread_id)` |
| `organization_brand_kit_items` | Representative brand/settings records | 400 | `organization_id → organizations` CASCADE | organizations | Yes — 4 fixed categories/labels | No | **App-level only** — no DB unique constraint on `label` (see §7) |
| `calendar_imports` | Representative "bulk import" record (metadata only, no real `.ics` file) | 100 | `organization_id → organizations` CASCADE; `school_year_id → school_years` SET NULL | organizations, school_years | Yes — fixed filename pattern | No | **App-level only** — no DB unique constraint on `(organization_id, filename)` (see §7) |

**Totals: 13 `public` tables + `auth.users`.**

---

## 2. Dependency order (actual schema — not the linear example)

The real schema is a **DAG with parallel branches**, not a single chain. Two corrections vs. the example in the prompt: `organization_roles` must exist **before** `organization_users` (role FK), not after; and `events` depends on `school_years`, not directly on `organization_roles`.

```
organizations
     │
     ├──────────────┬──────────────────────────┐
     ↓              ↓                          ↓
school_years   organization_roles      (org-scoped branches,
     │              │                   parallel to events branch)
     └──────┬───────┘                          │
            ↓                                  ├─→ communication_playbooks
   organization_users ←── auth.users           │        ↓
   (Phase 1, provisioned                       │   communication_playbook_steps
    independently up front)                    │
                                                ├─→ inbox_threads
school_years                                   │
     ↓                                         └─→ organization_brand_kit_items
   events ←──────────────────────────────────────── (+ school_years) → calendar_imports
     │
     ├──────────────┬──────────────┐
     ↓              ↓              ↓
approval_scheduling_items   communication_items   event_assets
   ("milestones")
```

`auth.users` has **no FK dependency** on any `public` table — it's provisioned as an independent up-front phase (see §9), then joined to `organization_users` by email.

---

## 3. Every enum / CHECK constraint / required value actually used (sourced from migrations, not guessed)

| Table.column | Constraint values (migration source) | Value(s) used by this seed |
|---|---|---|
| `organizations.plan_tier` | `starter\|professional\|premium\|trial\|founding` | `trial` |
| `organizations.subscription_status` | `none\|trialing\|active\|past_due\|canceled\|incomplete` | `trialing` |
| `school_years.status` | `planning\|active\|closed` (023) | `active` |
| `organization_roles.role_kind` | `null\|president\|vp\|other` (024) | `president`, `vp`, `other` (per role) |
| `organization_roles.campaign_role` / `organization_users.campaign_role` | `admin\|president\|vp_communications\|committee_chair\|contributor\|view_only\|developer\|tester` (059) | `admin`, `president`, `vp_communications`, `contributor`, `committee_chair`, `view_only` |
| `organization_users.status` | `active\|invited\|deactivated` (027) | `active` |
| `events.status` | `draft\|scheduled\|published\|archived` (001) | `scheduled` |
| `events.event_type` | `book_fair\|teacher_appreciation\|pto_meeting\|spirit_night\|fundraiser\|family_event\|volunteer_drive\|general_event\|early_release\|holiday` (004, expanded 023) | cycles the original 8 (not `early_release`/`holiday`) |
| `events.communication_strategy` | `full_campaign\|reminder_only\|calendar_only\|custom` | `full_campaign` |
| `events.approved_square_image_status` | `open\|filled` | left at default `open` (not set) |
| `events.import_source` | `null\|ics\|google\|subscribe\|ai_parse\|manual` | `null` (not used) |
| `approval_scheduling_items.source` | `classic\|campaign_builder` (048) | `campaign_builder` |
| `approval_scheduling_items.workflow_status` | `in_queue\|assigned_to_me\|changes_requested\|scheduled\|posted\|published\|failed` (048 + `20260727193323`) | cycles `in_queue`, `assigned_to_me`, `scheduled`, `posted`, `published` (not `changes_requested`/`failed`) |
| `communication_items.channel` | `website_announcement\|newsletter\|facebook\|instagram\|email\|flyer\|principal_notes\|morning_announcements\|volunteer_signup` (003) | cycles `newsletter`, `facebook`, `email`, `instagram`, `morning_announcements`, `website_announcement` |
| `communication_items.status` | `draft\|generated\|pending_approval\|approved\|changes_requested\|published` (012) | cycles `draft`, `generated`, `pending_approval`, `approved`, `published` (not `changes_requested`) |
| `communication_playbooks.event_type` | same list as `events.event_type` | `general_event` |
| `communication_playbook_steps.channel` | same as `communication_items.channel` | `newsletter`, `facebook`, `email`, `morning_announcements` |
| `communication_playbook_steps.default_status` | `upcoming\|pending\|in_progress\|completed\|skipped` | left at default `upcoming` |
| `inbox_threads.channel_type` (enum) | `instagram_dm\|facebook_message\|instagram_comment\|facebook_comment\|instagram_tag\|facebook_tag` (042 + 043) | cycles first 3 |
| `inbox_threads.status` | `pending\|approved\|sent\|archived` (042) | cycles `pending`, `approved`, `archived` (not `sent`) |
| `organization_brand_kit_items.category` | `school_logo\|pto_logo\|color\|font\|canva_template\|brand_voice\|icon\|background\|other` (013) | `school_logo`, `color` (×2), `brand_voice` |
| `event_assets.asset_type` | `hero_image\|square_graphic\|instagram_story\|flyer\|logo\|document` (003/011) | `hero_image` only |
| `event_assets.status` | `pending\|uploaded\|placeholder` | `placeholder` |
| `calendar_imports.upload_status` | `pending\|uploaded\|failed` (002) | `uploaded` |
| `calendar_imports.parse_status` | `pending\|parsing\|parsed\|failed\|imported` (022) | `imported` |
| `calendar_imports.file_type` | free text, no CHECK | `ics` |

**Required-NOT-NULL fields verified and populated:** `organizations.name`; `events.title`/`description`/`date`; `approval_scheduling_items.milestone_name`; `communication_playbook_steps.relative_day`/`title`/`channel`; `calendar_imports.filename`/`file_type`/`storage_path`; `organization_brand_kit_items.category`/`label`.

---

## 4. Tables that should NOT be seeded (and why)

| Table(s) | Why excluded |
|---|---|
| `event_volunteer_sources`, `event_volunteer_assignments`, `event_volunteer_participants`, `event_volunteer_snapshots` | The volunteer chain requires a `status = 'connected'` source row tied to a real **SignupGenius** URL (`provider` CHECK only allows `'signupgenius'`) — fabricating a "connected" external-provider record conflicts with the "no real external-provider objects" constraint. Not explicitly requested in Step 3. |
| `organization_committees`, `organization_committee_assignments`, `responsibility_matrix` | Not explicitly requested in Step 3 (only "organization roles" was, covered by `organization_roles`). Adding committees would be populating an adjacent feature purely to inflate row counts. |
| The 8 **system** `communication_playbooks` (and their 52 `communication_playbook_steps`) | Already exist from migration `004`'s own seed data (`is_system = true`, `organization_id IS NULL`). Never touched — org-scoped playbooks use a distinct row per org instead. |
| `approval_requests`, `publication_schedule`, `communication_versions`, `activity_log` | Legacy/adjacent workspace tables not referenced by the unified `approval_scheduling_items` queue path this seed uses; populating them would be "inventing" usage not requested. |
| `organization_members`, `organization_user_event_assignments` | Newer/parallel membership and per-event-assignment tables not part of the requested 8-role/org structure. |
| Storage objects (`storage.objects` / any bucket file) | Explicit instruction: "AI asset metadata only, not real generated images" — buckets remain 0 objects by design. |
| `events.organization_id` | **Does not exist as a column.** Events scope to a tenant only via `school_year_id → school_years.organization_id` — flagged so no future migration attempt tries to seed a non-existent column. |

---

## 5. Estimated final row counts after seed completes

(Matches what was actually verified post-seed — see [post-seed baseline](./100-school-post-seed-nano-baseline.md) for the full before/after table.)

| Table | Rows added by this profile | Total after seed (both fixtures) |
|---|---:|---:|
| `organizations` | 100 | 120 |
| `school_years` | 100 | 120 |
| `organization_roles` | 800 | 940 |
| `auth.users` | 800 | 960 |
| `organization_users` | 800 | 960 |
| `events` | 2,500 | 2,540 |
| `approval_scheduling_items` | 12,500 | 12,540 |
| `communication_items` | 2,500 | 2,500 |
| `event_assets` | 2,500 | 2,500 |
| `communication_playbooks` | 100 | 109 |
| `communication_playbook_steps` | 500 | 552 |
| `inbox_threads` | 300 | 320 |
| `organization_brand_kit_items` | 400 | 400 |
| `calendar_imports` | 100 | 100 |

---

## 6. Tables expected to grow exponentially vs. linearly

**None grow exponentially.** Every table's row count is a **fixed linear multiple** of `schoolCount` (100), by construction:

| Growth factor per org | Tables |
|---|---|
| ×1 | `organizations`, `school_years`, `communication_playbooks`, `calendar_imports` |
| ×4 | `organization_brand_kit_items` |
| ×8 | `organization_roles`, `organization_users`, `auth.users` |
| ×3 | `inbox_threads` |
| ×5 | `communication_playbook_steps` |
| ×25 | `events`, `communication_items`, `event_assets` |
| ×125 (25 events × 5 milestones) | `approval_scheduling_items` |

`approval_scheduling_items` has the steepest multiplier (125×/org) simply because it's a two-level product (events × milestones-per-event), **not** because of any unbounded/recursive relationship — doubling `schoolCount` doubles it exactly, doubling `eventsPerSchool` or `milestonesPerEvent` scales it linearly in that factor too. Confirmed empirically: it grew exactly proportionally (12,500 new rows for 100 new orgs × 25 events × 5 milestones = 12,500, no drift).

---

## 7. Can every INSERT be safely rerun without creating duplicates?

| Table | Rerun-safe? | Mechanism |
|---|---|---|
| `organizations` | ⚠️ **App-level only** | Selects by exact `name` before insert. **No DB unique constraint exists on `organizations.name`.** Safe for sequential single-process reruns; NOT safe if two seed processes ran concurrently against the same `TEST_RUN_ID` (race condition could create duplicate orgs with the same name). |
| `school_years` | ✅ DB-enforced | Unique `(organization_id, label)` |
| `organization_roles` | ✅ DB-enforced | Unique `(organization_id, name)` |
| `auth.users` | ✅ Provider-enforced | `createUser` → on "already exists" error, looks up by email instead |
| `organization_users` | ✅ DB-enforced | Unique `(organization_id, email)` |
| `events` | ⚠️ **App-level only** | Selects all existing titles for the `school_year_id` before insert, filters missing. **No DB unique constraint on `title`.** Same concurrency caveat as `organizations`. |
| `approval_scheduling_items` | ⚠️ **App-level only** | Selects existing `(event_id, milestone_name)` pairs before insert. **No DB unique constraint.** |
| `communication_items` | ✅ DB-enforced (+ app pre-check) | Partial unique `(event_id, channel)` |
| `event_assets` | ⚠️ **App-level only** | Selects existing `event_id` for `asset_type='hero_image'` before insert. **No DB unique constraint.** |
| `communication_playbooks` | ✅ DB-enforced | Unique index `(organization_id, slug)` |
| `communication_playbook_steps` | ⚠️ **App-level, all-or-nothing** | A `count(*)` check on `playbook_id` — if a rerun is interrupted mid-batch of the 5-row insert, a subsequent rerun sees a non-zero-but-incomplete count and **skips**, leaving a permanently short playbook (see §10 risk #2). |
| `inbox_threads` | ✅ DB-enforced | Unique `(organization_id, channel_type, external_thread_id)` |
| `organization_brand_kit_items` | ⚠️ **App-level only** | Selects existing `label`s before insert. **No DB unique constraint.** |
| `calendar_imports` | ⚠️ **App-level only** | Selects by `(organization_id, filename)` before insert. **No DB unique constraint.** |

**Verified empirically:** re-running the dry-run and the safety-gate tests against the already-seeded staging project did not error or duplicate anything (no writes occurred in those cases). A full second write-mode rerun was not performed as part of this review (would be a live write) but the fetch-existing-then-insert-missing pattern is uniform across all 13 tables.

---

## 8. Cleanup strategy

`npm run test:load:cleanup:100-schools` (wraps `cleanup-test-data.mjs` with `SEED_PROFILE=100-school-architecture`):

1. Reads `data/accounts.100-school-architecture.local.json` for the exact org/event/user IDs created by this run (falls back to `organizations` rows matching `name ILIKE '%TEST_RUN_ID%'` if the fixture file is missing).
2. Deletes `events` for the discovered `school_year_id`s → **cascades** (`ON DELETE CASCADE`) to `approval_scheduling_items`, `communication_items`, `event_assets` automatically; explicit deletes for these three also run first as defense-in-depth.
3. Deletes `communication_playbook_steps` + `communication_playbooks`, `organization_brand_kit_items`, `calendar_imports`, `inbox_threads` explicitly (also covered by cascade once `organizations` is deleted, but done explicitly for clear logging).
4. Un-sets `organizations.active_school_year_id`, deletes `school_years`.
5. Deletes `organization_roles`, `organization_users`, then `organizations` (cascades sweep anything not already explicitly removed).
6. Optionally deletes the 800 `auth.users` (`K6_CLEANUP_DELETE_USERS=true` — off by default, since Auth Admin API deletes are not easily reversible and other fixtures may still reference them).
7. Removes the local `accounts.100-school-architecture.local.json` fixture.

### Is every row tagged with `test_run_id` / `seed_profile` / `created_by_seed`?

**No literal columns exist for this** — the schema has no `test_run_id`, `seed_profile`, or `created_by_seed` columns on any of these 13 tables, and per the "do not invent tables or columns" constraint, none were added. Traceability is instead **approximated in existing text/JSON fields**, and coverage is **uneven**:

| Traceability mechanism | Tables covered |
|---|---|
| `TEST_RUN_ID` embedded in a text field (name/title/filename/slug) | `organizations` (name suffix), `events` (title prefix), `approval_scheduling_items` (milestone_name prefix), `inbox_threads` (external_thread_id), `calendar_imports` (filename), `communication_playbooks` (name, not slug) |
| `TEST_RUN_ID` embedded in `auth.users.user_metadata` JSON (`load_test_run_id`, `seed_profile`) | `auth.users` only |
| **No own text/JSON marker — traceable only via parent FK chain** | `organization_users` (email contains it, so effectively covered), `organization_roles`, `communication_items`, `event_assets`, `communication_playbook_steps`, `organization_brand_kit_items` |

This is **sufficient for the cleanup script** (which always resolves via the FK chain from `organizations`/`events`, not by scanning every table's own text fields) but is a real gap if someone ever needs to `SELECT * WHERE seed_profile = '...'` directly against `event_assets` or `organization_brand_kit_items` — flagged as risk #5 below.

---

## 9. Execution order (as actually implemented)

**Phase 0 — Safety gates** (before any query runs):
print target Supabase project ref → hard-block if it matches the known production ref (no override) → require `SEED_PROFILE=100-school-architecture` → require `SEED_CONFIRM=100-school-architecture` (skipped only for `--dry-run`/`SEED_DRY_RUN=true`).

**Phase 1 — Auth user provisioning (all 100 orgs' users, up front, independent of org creation):**
Build all 800 `(email, displayName)` specs → resolve via bounded-concurrency (6) `ensureAuthUser` with retry + exponential backoff on rate limits → progress logged every 25 users → produces an `email → authUser` map used by every org in Phase 2.

**Phase 2 — Per-organization loop (sequential, 100 iterations), each iteration:**
1. `organizations` (ensure)
2. `school_years` (ensure) → backfill `organizations.active_school_year_id`
3. `organization_roles` (ensure, 8 rows)
4. `organization_users` (ensure, 8 rows, using Phase 1's auth-user map + step 3's role IDs)
5. `events` (ensure, 25 rows, using step 2's `school_year_id`)
6. `approval_scheduling_items` "milestones" (ensure, 125 rows, using step 5's event IDs)
7. `communication_items` (ensure, 25 rows, using step 5's event IDs)
8. `event_assets` (ensure, 25 rows, using step 5's event IDs)
9. `communication_playbooks` + `communication_playbook_steps` (ensure, 1 + 5 rows)
10. `inbox_threads` (ensure, 3 rows)
11. `organization_brand_kit_items` (ensure, 4 rows)
12. `calendar_imports` (ensure, 1 row, using step 2's `school_year_id`)

**Phase 3 — Fixture output:**
Write `data/accounts.100-school-architecture.local.json` with every org/event/user ID for use by the validation script and (future, not-yet-run) cleanup/load-test tooling.

---

## 10. Top 5 risks

1. **Three high-volume tables have no DB-level uniqueness** (`organizations.name`, `events.title`, `approval_scheduling_items.milestone_name`) — idempotency for these relies entirely on the script's own "select-then-insert" logic, not a database constraint. Safe for the single-sequential-process execution this script uses; **not** safe if two instances of the seed ran concurrently against the same `TEST_RUN_ID`.
2. **`communication_playbook_steps` idempotency is all-or-nothing per playbook**, not per-row — an interruption mid-insert of the 5-step batch would leave a permanently incomplete playbook on rerun (the count-check would see it as "already seeded" and skip). Same shape of risk, lower impact, for `organization_brand_kit_items`/`calendar_imports` (checked per-row, but no DB constraint backs it).
3. **Auth Admin API rate limits at 800-user scale are not officially documented** — bounded concurrency (6) + retry/backoff was sized empirically (worked cleanly in the actual run: 800/800 in 34s, zero retries), but a stricter rate limit under different conditions (e.g., concurrent other staging activity) could slow or fail provisioning; the resumable lookup-by-email path handles partial completion correctly either way.
4. **`events` has no `organization_id` column** — RLS and cleanup both depend on the `school_year_id → school_years.organization_id` chain. Any future edit to this seed that gets `school_year_id` wrong for even one event would silently misfile it under the wrong tenant (or make it invisible to RLS) rather than raising an FK error, since `school_year_id` is nullable and any valid UUID satisfies the FK regardless of which org it belongs to.
5. **Traceability is not uniform across all 13 tables** — `organization_users`, `organization_roles`, `communication_items`, `event_assets`, `communication_playbook_steps`, and `organization_brand_kit_items` carry no `TEST_RUN_ID`/profile marker in their own text fields (only via their parent FK chain). This is fine for the cleanup script (which always walks the FK chain from `organizations`) but would block a direct "find all seed rows in table X" query without joining back through `organizations`/`events`.

---

## Verified outcome (for context, not part of the design itself)

This design was executed once (`TEST_RUN_ID=arch100`) and passed all 18 integrity checks with zero errors/retries — see [post-seed baseline](./100-school-post-seed-nano-baseline.md). None of the 5 risks above manifested in that run; they are latent/structural risks worth knowing about for future reruns or profile extensions, not observed failures.

---

## 11. Acceptance + tooling hardening (post-review update)

**The `arch100` dataset is accepted as the official 100-school staging fixture.** No integrity failure was ever observed against it (25/25 checks pass as of this update, see §12); the 5 risks in §10 are **future rerun/maintenance risks**, not defects in the data currently sitting in `heyralli-staging`. This update hardens the tooling that would run *again in the future* — it does not touch, re-seed, or validate-and-mutate the existing rows. **No database migration was required or made** for this hardening; every change is application-level tooling under `load-tests/k6/scripts/`.

Risk-by-risk resolution:

| §10 risk | Status | Fix |
|---|---|---|
| #1 No DB-level uniqueness on `organizations.name`/`events.title`/`approval_scheduling_items.milestone_name`, unsafe under concurrent runs | **Mitigated** (not schema-fixed — see below) | `lib/seed-lock.mjs` — a cross-machine lock (keyed by project ref + profile) now makes concurrent seed/cleanup execution fail fast instead of racing. `lib/duplicate-scan.mjs`'s preflight scan additionally catches any pre-existing collision (from a past race, or manual data entry) before a write-mode run proceeds. |
| #2 `communication_playbook_steps` all-or-nothing idempotency | **Fixed** | `ensurePlaybook()` in `seed-architecture-dataset.mjs` now checks each step by its natural key `(playbook_id, sort_order)` individually, inserts only missing steps, warns (never overwrites) on content drift, and asserts the final count is exactly 5 before returning. An interrupted mid-batch insert is now safely resumable per-step, not just per-playbook. |
| #3 Undocumented Auth Admin rate limits at scale | **Unchanged (accepted)** | Still bounded-concurrency + retry/backoff, empirically sized. No change requested for this phase. |
| #4 `events` has no `organization_id` column; relies on `school_year_id` chain | **Unchanged (accepted)** | Structural fact of the existing schema; out of scope ("no application architecture changes" per this task). |
| #5 Uneven traceability across tables | **Unchanged (accepted, documented)** | See §13 below — the accounts fixture (not per-row DB columns) remains the traceability source of truth, and is confirmed sufficient for validation/cleanup/session-minting/future load-test assignment. |

### Why a Postgres advisory lock specifically was not used

Every seed/validate/cleanup/snapshot script talks to Supabase exclusively through PostgREST (the service-role `supabase-js` client). PostgREST executes each request on a short-lived pooled connection — it does not give REST callers a persistent session across separate calls. A session-scoped `pg_advisory_lock()` acquired inside one PostgREST call would already be released before the next of the seed's ~2,900 sequential requests ran, so it cannot guard a multi-minute run; `pg_advisory_xact_lock` has the same problem at the transaction level. This is a connection-model limitation, not something a new SQL function/migration would fix. Instead, `lib/seed-lock.mjs` uses **"an equivalent database-backed lock"**: a lock object in Supabase Storage (bucket `training-library`, path `_ops/seed-locks/<projectRef>/<profile>.lock.json`). Storage objects are themselves rows in Postgres (`storage.objects`) with a real unique constraint on `(bucket_id, name)`, so `upload(..., { upsert: false })` is atomic at the database level — genuinely cross-machine (both callers hit the same Supabase project over the network), not a local filesystem lock. This was verified end-to-end against `heyralli-staging` using an isolated `_selftest-do-not-use` profile (never touching the `100-school-architecture` lock namespace or any seed row): a second concurrent acquire failed fast with a clear diagnostic, and the lock object was fully cleaned up.

### §7/§10 idempotency table — updated

Everything in §7's "App-level only" rows is now backstopped by two additional layers, run in this order for every future write-mode seed:

1. **Cross-machine lock** (`acquireSeedLock`) — refuses to start if another seed/cleanup process already holds the lock for this project+profile.
2. **Preflight duplicate scan** (`runPreflightDuplicateScan`) — resolves any pre-existing orgs by intended name, then scans every child table (`events`, `approval_scheduling_items`, `event_assets`, `organization_brand_kit_items`, `calendar_imports`, `communication_playbook_steps`) for ambiguous natural-key collisions. Any collision found refuses to proceed in write mode (reported, never silently resolved); dry-run mode reports the same scan without blocking.
3. **Existing select-then-insert-missing logic** (unchanged) — still the actual write path per §7.

`communication_playbook_steps` moves from "all-or-nothing" to **DB-verified per-row idempotent** (§10 risk #2, fixed — see table above).

---

## 12. Post-hardening validation run (read-only, same `arch100` data)

Re-running the extended validation suite against the existing `arch100` dataset (no reseed, no cleanup) after adding the 7 new duplicate checks:

```
$ TEST_RUN_ID=arch100 npm run test:load:validate:100-schools
...
[validate] 25/25 checks passed.
[validate] RESULT: PASS — all integrity checks green.
```

The original 18 checks plus 7 new ones (no duplicate organization names; no duplicate event titles per school_year; no duplicate milestone names per event; no duplicate event assets per event; no duplicate brand-kit labels per organization; no duplicate calendar-import filenames per organization; no duplicate/incomplete playbook steps) all pass — confirming the dataset that already exists in `heyralli-staging` has no duplicate rows of any kind, and the idempotent insert pattern used throughout the seed produced clean data the first time.

`npm run test:load:preflight:100-schools` (new, read-only, added by this update — see §13) was also run against the live environment and returned 10/12 checks passing; the only 2 failures were "session fixture is fresh enough" and "pinned session assignment can provide ≥ 20 exclusive sessions", both expected at this stage since no sessions have been minted yet for this profile (minting sessions and running load are explicitly out of scope for this task).

---

## 13. Fixture traceability — safe-to-commit vs. must-stay-local

`data/accounts.100-school-architecture.local.json` (505 KB) is the source-of-truth fixture for the `arch100` run. It is confirmed to contain everything needed for:

| Use case | Fields relied on | Present? |
|---|---|---|
| Validation (`validate-architecture-seed.mjs`) | `schools[].organizationId`, `schoolYearId`, `eventIds`, `users[].email` | ✅ |
| Cleanup (`cleanup-test-data.mjs`) | `schools[].organizationId`, `eventIds`, `users[].userId` | ✅ |
| Session minting (`mint-sessions.mjs`, now profile-aware via `SEED_PROFILE`) | `schools[].organizationId`, `users[].email` | ✅ |
| Future load-test user/session assignment | `users[].campaignRole`, `orgRoleName`, `label`, `key` (role identity for pinning a VU to a specific role/org) | ✅ |

**What it does NOT contain** (confirmed by inspection): no passwords, no Supabase session tokens/JWTs, no cookies. The shared test password lives only in the `K6_TEST_PASSWORD` env var (never written to any fixture file), consistent with the existing 20-school fixture's design.

**Commit policy (unchanged, and deliberately conservative):** `load-tests/k6/.gitignore` blanket-excludes `data/accounts.*.local.json` and `data/sessions.*.local.json` regardless of content — even though the accounts file itself contains no secrets, keeping the *entire* local-fixture class gitignored (rather than allow-listing "safe" fields) avoids any risk of a future field addition (e.g. a token, a real email) being committed by accident. Nothing under `data/*.local.json` is ever safe to commit; `data/accounts.example.json` (a hand-written, non-generated template with fake IDs) remains the only committed example. `docs/qa/*.md` snapshot/report files (which quote row counts and ID *counts*, never raw IDs or emails) are the durable, committed record of what the fixture represented at the time of each run.

---

## 14. New tooling files/commands added by this update

| File | Purpose |
|---|---|
| `load-tests/k6/scripts/lib/seed-lock.mjs` | Cross-machine acquire/release/status for the seed/cleanup lock (Storage-backed, see §11) |
| `load-tests/k6/scripts/seed-unlock.mjs` | Manual force-clear for a stuck lock (`SEED_FORCE_UNLOCK=true` required) |
| `load-tests/k6/scripts/lib/duplicate-scan.mjs` | Shared natural-key duplicate scan, used by both the seed's preflight and the validation script |
| `load-tests/k6/scripts/preflight-100-schools.mjs` | Read-only environment preflight (11 checks) — see `npm run test:load:preflight:100-schools` |
| `npm run test:load:seed:100-schools:unlock` | Wraps `seed-unlock.mjs` |
| `npm run test:load:mint-sessions:100-schools` | Wraps `mint-sessions.mjs` with `SEED_PROFILE=100-school-architecture` (not yet run) |
| `npm run test:load:preflight:100-schools` | Wraps `preflight-100-schools.mjs` |

`seed-architecture-dataset.mjs`, `validate-architecture-seed.mjs`, and `cleanup-test-data.mjs` were edited in place (lock integration, preflight duplicate scan, per-step playbook idempotency, and the 7 new duplicate-validation checks) — no new script replaces them.
