# CampaignOS — Database Blueprint

**Version:** 1.0 Draft  
**Database:** Supabase (PostgreSQL)  
**Scope:** PTO-only, Version 1  
**Last updated:** June 2026

---

## Overview

CampaignOS uses Supabase as its primary data store. The schema is designed around a calendar-first workflow where **events** are the central entity, each with an associated **campaign**, **assets**, **reminders**, and **approval records**.

All tables use UUID primary keys and `timestamptz` for timestamps unless noted.

---

## Entity Relationship Summary

```
organizations
    │
    ├── events
    │       │
    │       ├── campaigns
    │       │       └── campaign_assets
    │       │
    │       ├── reminders
    │       │
    │       └── approval_records
    │
    └── activity_log

calendar_imports (Phase 5)
    └── calendar_import_items
```

---

## Tables

### `organizations`

PTO profile and communication preferences. One organization per school PTO in V1.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | Organization ID |
| `name` | text | NOT NULL | PTO name (e.g., "Lincoln Elementary PTO") |
| `school_name` | text | NOT NULL | School name |
| `mission` | text | | Mission statement |
| `tone` | text | NOT NULL, default `'friendly'` | Brand tone: friendly, professional, enthusiastic |
| `default_hashtags` | text | | Comma or space-separated hashtags |
| `post_frequency` | text | default `'weekly'` | Default reminder frequency preference |
| `created_at` | timestamptz | NOT NULL, default `now()` | |
| `updated_at` | timestamptz | NOT NULL, default `now()` | |

**Notes:**
- V1 may use a single default organization row until auth ships.
- `tone` and `default_hashtags` are injected into AI generation prompts.

---

### `events` ✅ Implemented

School events — the core entity. One row per PTO event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | Event ID |
| `organization_id` | uuid | FK → organizations, nullable in early V1 | Owning PTO |
| `title` | text | NOT NULL | Event title |
| `description` | text | NOT NULL | Event description and context |
| `date` | date | NOT NULL | Event date |
| `time` | time | | Event start time |
| `location` | text | | Event location |
| `audience` | text | | Target audience (families, teachers, etc.) |
| `theme` | text | | Event theme or tone |
| `status` | text | NOT NULL, default `'draft'` | draft, scheduled, published, archived |
| `created_at` | timestamptz | NOT NULL, default `now()` | |
| `updated_at` | timestamptz | | Last edit timestamp |

**Indexes:**
- `events_date_idx` on `(date ASC)` — upcoming events queries
- `events_created_at_idx` on `(created_at DESC)` — recent activity
- `events_organization_id_idx` on `(organization_id)` — org scoping

**Status lifecycle:**
```
draft → scheduled → published → archived
```

**Current migration:** `supabase/migrations/001_create_events_table.sql`

---

### `campaigns`

A campaign generation run for an event. An event may have multiple campaigns (e.g., regenerated), but typically one active campaign at a time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Campaign ID |
| `event_id` | uuid | FK → events, NOT NULL | Parent event |
| `status` | text | NOT NULL, default `'draft'` | draft, pending_approval, approved, rejected |
| `generated_at` | timestamptz | | When AI generation completed |
| `submitted_at` | timestamptz | | When submitted for board approval |
| `approved_at` | timestamptz | | When fully approved |
| `created_at` | timestamptz | NOT NULL, default `now()` | |
| `updated_at` | timestamptz | NOT NULL, default `now()` | |

**Indexes:**
- `campaigns_event_id_idx` on `(event_id)`
- `campaigns_status_idx` on `(status)` — Dashboard "Campaigns Needing Approval"

---

### `campaign_assets`

Individual pieces of generated content within a campaign.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Asset ID |
| `campaign_id` | uuid | FK → campaigns, NOT NULL | Parent campaign |
| `type` | text | NOT NULL | Asset type (see enum below) |
| `platform` | text | | Sub-target: facebook, instagram, etc. |
| `content` | text | NOT NULL | Generated or edited content |
| `status` | text | NOT NULL, default `'draft'` | draft, approved, published |
| `published_at` | timestamptz | | When marked as published |
| `created_at` | timestamptz | NOT NULL, default `now()` | |
| `updated_at` | timestamptz | NOT NULL, default `now()` | |

**Asset types (`type` enum):**
| Value | Description |
|-------|-------------|
| `social_caption` | Social media post copy |
| `newsletter_blurb` | Short newsletter paragraph |
| `website_copy` | Website / homepage text |
| `artwork_prompt` | Creative brief for visual assets |
| `reminder_message` | Standalone reminder copy |
| `approval_checklist_item` | Board review checklist entry |

**Indexes:**
- `campaign_assets_campaign_id_idx` on `(campaign_id)`
- `campaign_assets_type_idx` on `(type)`

---

### `reminders`

Scheduled communication reminders tied to an event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Reminder ID |
| `event_id` | uuid | FK → events, NOT NULL | Parent event |
| `campaign_asset_id` | uuid | FK → campaign_assets, nullable | Linked copy (if generated) |
| `label` | text | NOT NULL | e.g., "Save the date", "Day before" |
| `due_date` | date | NOT NULL | When reminder should be sent |
| `content` | text | | Reminder message (editable) |
| `status` | text | NOT NULL, default `'pending'` | pending, published, skipped |
| `published_at` | timestamptz | | When marked as sent |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

**Indexes:**
- `reminders_event_id_idx` on `(event_id)`
- `reminders_due_date_idx` on `(due_date)` — Today's Priorities query

**Default reminder schedule (generated relative to event date):**
| Label | Offset |
|-------|--------|
| Save the date | Event date − 28 days |
| Two weeks out | Event date − 14 days |
| One week out | Event date − 7 days |
| Day before | Event date − 1 day |
| Day of | Event date |

---

### `approval_records`

Tracks approval decisions and checklist completion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Record ID |
| `campaign_id` | uuid | FK → campaigns, NOT NULL | Campaign under review |
| `reviewer_id` | uuid | FK → auth.users, nullable in early V1 | Board reviewer |
| `decision` | text | NOT NULL | approved, changes_requested, rejected |
| `notes` | text | | Reviewer feedback |
| `checklist_completed` | boolean | default `false` | All checklist items checked |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

**Indexes:**
- `approval_records_campaign_id_idx` on `(campaign_id)`

---

### `activity_log`

Audit trail for Dashboard "Recent Activity" and workspace history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Log entry ID |
| `organization_id` | uuid | FK → organizations | Owning org |
| `event_id` | uuid | FK → events, nullable | Related event |
| `campaign_id` | uuid | FK → campaigns, nullable | Related campaign |
| `actor_id` | uuid | FK → auth.users, nullable | Who performed the action |
| `action` | text | NOT NULL | Action type (see enum below) |
| `details` | jsonb | | Additional context |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

**Action types:**
| Value | Example |
|-------|---------|
| `event_created` | "Spring Carnival created" |
| `event_updated` | "Spring Carnival date changed" |
| `campaign_generated` | "Campaign generated for Spring Carnival" |
| `campaign_submitted` | "Campaign submitted for approval" |
| `campaign_approved` | "Campaign approved by Dana" |
| `asset_published` | "Facebook caption marked as published" |
| `reminder_completed` | "Day-before reminder marked as sent" |

**Indexes:**
- `activity_log_organization_id_idx` on `(organization_id)`
- `activity_log_created_at_idx` on `(created_at DESC)`

---

### `calendar_imports` (Phase 5)

Tracks calendar upload / paste intake sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Import ID |
| `organization_id` | uuid | FK → organizations | Owning org |
| `source_type` | text | NOT NULL | paste, csv, pdf, image |
| `source_filename` | text | | Original file name |
| `status` | text | NOT NULL, default `'processing'` | processing, ready, confirmed, failed |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

---

### `calendar_import_items` (Phase 5)

Draft events extracted from a calendar import, pending user confirmation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Item ID |
| `import_id` | uuid | FK → calendar_imports | Parent import |
| `title` | text | NOT NULL | Extracted event title |
| `date` | date | | Extracted date (nullable if uncertain) |
| `confidence` | numeric | | AI extraction confidence 0–1 |
| `confirmed` | boolean | default `false` | User confirmed this item |
| `event_id` | uuid | FK → events, nullable | Created event after confirmation |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

---

## Row-Level Security (RLS)

### Current State (Phase 0)

The `events` table uses open policies for anon/authenticated roles to support development without auth:

```sql
-- MVP: open access until auth is added
create policy "Allow public read access on events" ...
create policy "Allow public insert access on events" ...
```

### Target State (Phase 6 — Auth)

All tables scoped by `organization_id`. Users can only access rows belonging to their organization.

```sql
-- Example pattern (post-auth)
create policy "Org members can read events"
  on events for select
  to authenticated
  using (organization_id = auth.organization_id());
```

Role-based write restrictions:
| Role | Permissions |
|------|-------------|
| Communications Chair | CRUD events, generate campaigns, submit for approval, publish |
| Board Reviewer | Read all, approve/reject campaigns, complete checklist |
| Admin | Manage org settings, invite users |

---

## Key Queries

### Upcoming Events (Dashboard)
```sql
select * from events
where date >= current_date
  and status != 'archived'
order by date asc
limit 5;
```

### Campaigns Needing Approval (Dashboard)
```sql
select e.*, c.id as campaign_id
from campaigns c
join events e on e.id = c.event_id
where c.status = 'pending_approval'
order by c.submitted_at asc;
```

### Today's Priorities (Dashboard)
```sql
select r.*, e.title as event_title
from reminders r
join events e on e.id = r.event_id
where r.due_date = current_date
  and r.status = 'pending'
order by r.due_date asc;
```

### Recent Activity (Dashboard)
```sql
select * from activity_log
where organization_id = $1
order by created_at desc
limit 10;
```

---

## Migration Plan

| Migration | Phase | Description |
|-----------|-------|-------------|
| `001_create_events_table.sql` | 0 | Events table + RLS ✅ |
| `002_create_organizations_table.sql` | 0–1 | PTO profile settings |
| `003_add_organization_id_to_events.sql` | 1 | Scope events to org |
| `004_create_campaigns_table.sql` | 1 | Campaign records |
| `005_create_campaign_assets_table.sql` | 1–2 | Generated content |
| `006_create_reminders_table.sql` | 2–4 | Reminder timeline |
| `007_create_approval_records_table.sql` | 3 | Approval workflow |
| `008_create_activity_log_table.sql` | 3–4 | Audit trail |
| `009_create_calendar_imports_tables.sql` | 5 | Calendar intake |
| `010_auth_rls_policies.sql` | 6 | Replace open policies with org-scoped auth |

---

## TypeScript Type Mapping

App types in `src/types/` map to database rows with snake_case → camelCase conversion in `src/lib/events/mappers.ts`.

| DB Column | TypeScript Property |
|-----------|---------------------|
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `organization_id` | `organizationId` |
| `event_id` | `eventId` |
| `campaign_id` | `campaignId` |

---

## Open Schema Questions

1. Should `campaigns` allow multiple active campaigns per event, or enforce one active at a time?
2. Should checklist items be rows in `campaign_assets` or a separate `checklist_items` table?
3. Do we store AI prompt/version metadata on `campaigns` for reproducibility?
4. Should archived events cascade-archive their campaigns and reminders?
5. When does `organization_id` become required on `events` (before or after auth ships)?

---

## Appendix: Current vs. Planned

| Table | Status |
|-------|--------|
| `events` | ✅ Implemented |
| `organizations` | Planned (Phase 0–1) |
| `campaigns` | Planned (Phase 1) |
| `campaign_assets` | Planned (Phase 1–2) |
| `reminders` | Planned (Phase 2–4) |
| `approval_records` | Planned (Phase 3) |
| `activity_log` | Planned (Phase 3–4) |
| `calendar_imports` | Planned (Phase 5) |
| `calendar_import_items` | Planned (Phase 5) |
