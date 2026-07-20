# Artwork Foundation Repair Plan

**Status:** Plan only — no code, no database changes yet  
**Date:** June 2026  
**Trigger:** Next Up / Event Workspace artwork cannot render on live DB  
**Verified event:** `79659782-ce78-4f74-bd1b-1906177f879e` (Back to School Faair)

---

## Diagnosis

### What the live database has

| Object | Status | Source |
|--------|--------|--------|
| `communication_items` | ✅ Present | Likely `006_create_communication_draft_tables.sql` |
| `communication_versions` | ✅ Present | Likely `006` |
| `communication_items.event_communication_step_id` | ✅ Present | `006` / Engine 4 shape |
| Partial unique indexes on `communication_items` | ✅ Present | `006` (replaced 003’s `(event_id, channel)` constraint) |
| `event_assets` | ❌ Missing (`42P01`) | Should be from `003` |
| `approval_requests` | ❌ Missing (`42P01`) | Should be from `003` |
| `publication_schedule` | ⚠️ Unverified — assume missing | Should be from `003` |
| `activity_log` | ⚠️ Unverified — assume missing | Should be from `003` |
| `storage.buckets` for event artwork | ❌ Missing | `008` only adds `school-assets`, `calendar-uploads`, `training-library` |

### What migration 003 defines

`supabase/migrations/003_create_event_workspace_tables.sql` is a **single monolithic migration** that:

1. Alters `events` (category, event_owner, budget, volunteer_needs, updated_at)
2. Creates **six** workspace tables: `event_assets`, `communication_items`, `communication_versions`, `approval_requests`, `publication_schedule`, `activity_log`
3. Creates indexes and open RLS policies on all six

### Why the gap exists

The live project followed the **006 repair path** documented in `docs/RELEASE_0_5.md`:

- Migration **003** was only **partially** applied (or skipped after comm tables were created elsewhere).
- Migration **006** was written specifically to create `communication_items` + `communication_versions` when **003 was never fully applied**.
- **006 does not create** `event_assets`, `approval_requests`, `publication_schedule`, or `activity_log`.

Result: Engine 4 / planning calendar work, but **artwork and approval foundations were never provisioned**.

### Application impact (today)

| Layer | Behavior |
|-------|----------|
| `getEventWorkspaceData()` | Returns **`null`** when `event_assets` query returns `42P01` (even if comm tables exist) |
| `getEventArtwork()` | Always **`null`** → Next Up artwork column hidden |
| `initializeEventWorkspace()` | Skips asset seeding when comm items already exist; asset insert would fail anyway |
| `updateEventAssetPlaceholder()` | Updates filename only — **no storage upload**, no public URL in `storage_path` |
| `resolveAssetImageUrl()` | Only accepts `http(s)://` in `storage_path` — bucket paths not resolved |

### Data on Back to School Faair (post-diagnostic)

- 5 `communication_items`, 8 `communication_versions` — **text drafts only**, no image URLs
- 0 `event_assets` rows (table absent)
- 0 approvable artwork paths

**Schema repair alone will not show images until assets are seeded and URLs exist.**

---

## Should we re-run migration 003?

### Verdict: **No — do not re-run 003**

| Risk | Reason |
|------|--------|
| **RLS policy conflicts** | 003 uses `create policy` without `drop policy if exists` on `communication_items` / `communication_versions`. Policies already exist from 006 → **migration will fail**. |
| **Schema drift** | Live `communication_items` follows **006/Engine 4** shape (step-linked rows, partial unique indexes). 003’s original `unique (event_id, channel)` was **removed** by 006. Re-running 003 does not reconcile this. |
| **Migration history** | If 003 is already recorded in `supabase_migrations.schema_migrations`, a re-run may be blocked or cause ops confusion. |
| **Incomplete fix** | 003 has no storage bucket for event artwork; does not backfill asset rows for existing events. |

003’s `create table if not exists` would safely skip existing comm tables, but **policy creation and operational clarity** make a full re-run the wrong tool.

---

## Recommended path: new repair migration **011**

Follow the established pattern of **006** (comm draft repair) and **008** (storage bucket repair):

### **`supabase/migrations/011_repair_event_workspace_artwork_tables.sql`**

**Scope:** Create only the **missing 003 objects**, idempotently, without touching existing comm tables.

**Include:**

1. `event_assets` (table, index, RLS, policies)
2. `approval_requests` (table, index, RLS, policies)
3. `publication_schedule` (table, index, RLS, policies) — optional but recommended for parity with 003
4. `activity_log` (table, index, RLS, policies) — optional but recommended; `initializeEventWorkspace` timeline depends on it
5. `events` column alters (`add column if not exists`) — harmless if already present
6. **`event-assets` storage bucket** + read/upload policies (public read for MVP artwork display)
7. **Optional backfill** section (commented or separate one-time script): seed `event_assets` placeholder rows for campaign events that have comm items but no assets

**Exclude:**

- Any `create table` for `communication_items` / `communication_versions`
- Any change to 006 partial unique indexes
- Migration 005 (already superseded by 006)

### Follow-up (separate sprint — not in 011 SQL)

| Item | Why |
|------|-----|
| App: resolve `storage_path` via `getPublicUrl('event-assets', path)` | Bucket paths currently ignored |
| App: real file upload in `updateEventAssetPlaceholder` | Today only stores filename |
| App: `getEventWorkspaceData()` degrade gracefully | Should not return `null` when only assets table was missing (code change) |
| Backfill job for existing events | `initializeEventWorkspace` skips when comm items exist |

---

## Tables and columns required

### `event_assets` (critical for artwork)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Row identity |
| `event_id` | uuid FK → `events` | Event scope |
| `asset_type` | text enum | `hero_image`, `square_graphic`, `instagram_story`, `flyer`, `logo`, `document` |
| `filename` | text nullable | Display name from placeholder upload |
| `storage_path` | text nullable | **Public URL or bucket object path** |
| `status` | text enum | `pending`, `uploaded`, `placeholder` |
| `ai_generated` | boolean | Future AI flag |
| `created_at`, `updated_at` | timestamptz | Sorting / “most recent artwork” |

### `approval_requests` (critical for “approved artwork” priority)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `event_id` | uuid FK → `events` | |
| `communication_item_id` | uuid FK nullable → `communication_items` | Links approval to channel draft |
| `status` | text enum | `pending`, `approved`, `rejected` |
| `requested_at`, `resolved_at` | timestamptz | |
| `notes` | text nullable | |
| `created_at` | timestamptz | |

### Storage (critical for display)

| Object | Setting | Purpose |
|--------|---------|---------|
| Bucket `event-assets` | `public = true` (MVP) | `getPublicUrl()` for Next Up / hero |
| Policy | anon/authenticated read | Render images in UI |
| Policy | anon/authenticated insert/update | Placeholder upload flow (future hardening: auth) |

### Not required for first pixel on screen

- New columns on `events` for cover image (app can use `event_assets` only)
- Image URLs inside `communication_versions.content` (nice-to-have, not current data)

---

## Risk assessment

| Action | Risk | Notes |
|--------|------|-------|
| **011 repair migration (recommended)** | **Low** | Idempotent `if not exists`; no changes to live comm schema |
| Re-run full **003** | **High** | Policy duplicates; history confusion |
| **011 + backfill** asset rows | **Low–Medium** | Idempotent insert per `(event_id, asset_type)`; test on staging first |
| **Public `event-assets` bucket** | **Low** (MVP) | Matches `school-assets` pattern; tighten when auth lands |
| **App code changes** (later) | **Medium** | Upload + URL resolution; test artwork selector end-to-end |

---

## Pre-flight checklist (before running 011)

Run in Supabase SQL editor (read-only):

```sql
-- Confirm missing objects
select to_regclass('public.event_assets') as event_assets;
select to_regclass('public.approval_requests') as approval_requests;
select to_regclass('public.publication_schedule') as publication_schedule;
select to_regclass('public.activity_log') as activity_log;

-- Confirm comm tables exist (do not recreate)
select to_regclass('public.communication_items') as communication_items;
select to_regclass('public.communication_versions') as communication_versions;

-- Check migration history
select * from supabase_migrations.schema_migrations
where version in ('003', '006', '008', '010', '011')
order by version;
```

---

## Exact SQL file to run later

**Filename:** `supabase/migrations/011_repair_event_workspace_artwork_tables.sql`

**Do not run until approved.** Draft below mirrors 003 definitions + 008 bucket pattern + idempotent policy drops.

```sql
-- CampaignOS repair migration: event workspace artwork & approval foundation
--
-- Use when migration 003 was partially applied and 006 created communication
-- draft tables only. Safe to run idempotently.
--
-- Creates: event_assets, approval_requests, publication_schedule, activity_log
-- Does NOT modify: communication_items, communication_versions (006 shape)
--
-- Requires: public.events (001), communication_items (006)

-- ---------------------------------------------------------------------------
-- events columns (from 003 — harmless if present)
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists category text,
  add column if not exists event_owner text,
  add column if not exists budget text,
  add column if not exists volunteer_needs text,
  add column if not exists updated_at timestamptz default now();

-- ---------------------------------------------------------------------------
-- event_assets
-- ---------------------------------------------------------------------------

create table if not exists public.event_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  asset_type text not null
    check (asset_type in (
      'hero_image',
      'square_graphic',
      'instagram_story',
      'flyer',
      'logo',
      'document'
    )),
  filename text,
  storage_path text,
  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'placeholder')),
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_assets_event_id_idx
  on public.event_assets (event_id);

alter table public.event_assets enable row level security;

drop policy if exists "Allow public read access on event_assets"
  on public.event_assets;
drop policy if exists "Allow public insert access on event_assets"
  on public.event_assets;
drop policy if exists "Allow public update access on event_assets"
  on public.event_assets;
drop policy if exists "Allow public delete access on event_assets"
  on public.event_assets;

create policy "Allow public read access on event_assets"
  on public.event_assets for select to anon, authenticated using (true);
create policy "Allow public insert access on event_assets"
  on public.event_assets for insert to anon, authenticated with check (true);
create policy "Allow public update access on event_assets"
  on public.event_assets for update to anon, authenticated using (true) with check (true);
create policy "Allow public delete access on event_assets"
  on public.event_assets for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- approval_requests
-- ---------------------------------------------------------------------------

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  communication_item_id uuid references public.communication_items (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists approval_requests_event_id_idx
  on public.approval_requests (event_id);

alter table public.approval_requests enable row level security;

drop policy if exists "Allow public read access on approval_requests"
  on public.approval_requests;
drop policy if exists "Allow public insert access on approval_requests"
  on public.approval_requests;
drop policy if exists "Allow public update access on approval_requests"
  on public.approval_requests;

create policy "Allow public read access on approval_requests"
  on public.approval_requests for select to anon, authenticated using (true);
create policy "Allow public insert access on approval_requests"
  on public.approval_requests for insert to anon, authenticated with check (true);
create policy "Allow public update access on approval_requests"
  on public.approval_requests for update to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- publication_schedule (003 parity)
-- ---------------------------------------------------------------------------

create table if not exists public.publication_schedule (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  communication_item_id uuid references public.communication_items (id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_schedule_event_id_idx
  on public.publication_schedule (event_id);

alter table public.publication_schedule enable row level security;

drop policy if exists "Allow public read access on publication_schedule"
  on public.publication_schedule;
drop policy if exists "Allow public insert access on publication_schedule"
  on public.publication_schedule;
drop policy if exists "Allow public update access on publication_schedule"
  on public.publication_schedule;

create policy "Allow public read access on publication_schedule"
  on public.publication_schedule for select to anon, authenticated using (true);
create policy "Allow public insert access on publication_schedule"
  on public.publication_schedule for insert to anon, authenticated with check (true);
create policy "Allow public update access on publication_schedule"
  on public.publication_schedule for update to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- activity_log (003 parity)
-- ---------------------------------------------------------------------------

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  activity_type text not null
    check (activity_type in (
      'calendar_imported',
      'workspace_created',
      'communications_generated',
      'board_approval',
      'published',
      'event_completed'
    )),
  title text not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_log_event_id_idx
  on public.activity_log (event_id);

alter table public.activity_log enable row level security;

drop policy if exists "Allow public read access on activity_log"
  on public.activity_log;
drop policy if exists "Allow public insert access on activity_log"
  on public.activity_log;

create policy "Allow public read access on activity_log"
  on public.activity_log for select to anon, authenticated using (true);
create policy "Allow public insert access on activity_log"
  on public.activity_log for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- storage: event-assets bucket (public read for MVP artwork URLs)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do nothing;

drop policy if exists "Allow public read access on event-assets"
  on storage.objects;
drop policy if exists "Allow public upload to event-assets"
  on storage.objects;
drop policy if exists "Allow public update on event-assets"
  on storage.objects;

create policy "Allow public read access on event-assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-assets');

create policy "Allow public upload to event-assets"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'event-assets');

create policy "Allow public update on event-assets"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'event-assets')
  with check (bucket_id = 'event-assets');

-- ---------------------------------------------------------------------------
-- OPTIONAL backfill (run manually after migration, or uncomment after review)
-- Seeds placeholder asset rows for campaign events missing assets.
-- ---------------------------------------------------------------------------

-- insert into public.event_assets (event_id, asset_type, status, ai_generated)
-- select e.id, t.asset_type, 'placeholder', false
-- from public.events e
-- cross join (
--   values
--     ('hero_image'),
--     ('square_graphic'),
--     ('instagram_story'),
--     ('flyer'),
--     ('logo'),
--     ('document')
-- ) as t(asset_type)
-- where e.communication_strategy = 'full_campaign'
--   and not exists (
--     select 1 from public.event_assets ea
--     where ea.event_id = e.id and ea.asset_type = t.asset_type
--   );
```

---

## After 011: verification steps

1. `to_regclass('public.event_assets')` is not null  
2. `getEventWorkspaceData(eventId)` returns non-null for Back to School Faair  
3. Run backfill (optional) → 6 placeholder rows per campaign event  
4. Upload test image to `event-assets/{eventId}/hero.jpg` and set `storage_path` to public URL  
5. Confirm Next Up shows artwork (requires app URL resolution if path is not full URL)  
6. `npm run lint` + manual Today page check  

---

## Summary

| Question | Answer |
|----------|--------|
| Why no artwork? | `event_assets` / `approval_requests` missing; app aborts workspace load; no image URLs in data |
| Re-run 003? | **No** — use **011 repair** |
| Safest path | Idempotent **011** for missing 003 tables + **event-assets** bucket |
| Will images appear immediately? | **No** — need backfill + upload/URL + likely app changes for bucket paths |
| Risk | **Low** for 011 schema/bucket repair |
