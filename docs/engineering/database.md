# Database

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 14, 2026  
**Related:** [Engineering](./README.md) · [`supabase/migrations/`](../../supabase/migrations/) · [Access control](./access-control.md) · [Storage RLS](./storage-rls.md) · [Architecture](./architecture.md) · [Image architecture](./image-architecture.md) · [Owner AI & APIs](../product/ai-and-apis.md) · [SignUpGenius volunteers](../integrations/signupgenius.md) · [Documentation home](../README.md)

## Source of truth

**`supabase/migrations/` is the schema source of truth.**

Do **not** treat archived [DATABASE_BLUEPRINT.md](../archive/DATABASE_BLUEPRINT.md) as current. That file is historical aspiration; live tables, RLS, and RPCs are defined by the ordered migration files (70+ files as of July 2026, including `001`…`069` and timestamped access-template migrations).

## Layout

| Path | Role |
|------|------|
| `supabase/migrations/*.sql` | Forward migrations (apply in filename order) |
| App queries / mutations | `src/lib/*/queries.ts`, `mutations.ts` |
| Types | `src/types` and colocated lib types |

Naming patterns:

- Numbered: `069_organization_google_calendar_connections.sql`
- Timestamped: `20260717003216_organization_access_templates.sql`

Both are part of the same ordered history — apply **all** of them.

## How to apply

### Production / shared staging (Supabase project)

1. Prefer **Supabase CLI** linked to the project: `supabase db push` (or your team’s equivalent migration workflow).
2. Or run SQL in the Supabase **SQL Editor** in strict filename order when CLI is not available.
3. Apply migrations **before** (or immediately with) the app deploy that depends on new columns/tables.

### Local / personal project

Same as above against your linked Supabase project. There is no separate “only run `001`” path — a fresh project needs the full chain.

### Checklist after applying

- [ ] No failed statements in the migration run  
- [ ] App boots against the project (`npm run dev` or Preview)  
- [ ] Spot-check a membership-scoped page (events list, settings)  
- [ ] If Storage policies changed: see [storage-rls.md](./storage-rls.md)

## RLS expectations

- Default for tenant data: **organization membership** isolation (see migrations `064`–`066` and [access-control.md](./access-control.md)).
- Storage: membership-scoped policies in `067` — details in [storage-rls.md](./storage-rls.md).
- Cron / privileged paths use `createAdminClient()` (service role) where the product intentionally bypasses user JWT RLS — still scoped in application logic by org/connection ids.

App-layer **EffectiveAccess** (artwork, approve, publish, people, etc.) is **not** a substitute for RLS; both layers matter.

## Recent product migrations (orientation)

Not exhaustive — skim filenames for the full list:

| Area | Examples |
|------|----------|
| Team & Access / invites | `059`–`063`, access-template timestamp migrations |
| Membership RLS | `064`–`066` |
| Storage RLS | `067` |
| Task assignee | `068` |
| Google Calendar connections | `069` |
| Volunteer SignUpGenius sticky dates | `071` (`included_assignment_dates` on `event_volunteer_sources`) |
| Volunteer named participants (names only) | `20260801200000_event_volunteer_participants.sql` (`event_volunteer_participants` — no email) |
| Volunteer Arrived/Received ops (Hey Ralli only) | `20260808140000_event_volunteer_ops.sql` (`event_volunteer_ops`) |
| Value-first onboarding progress | `072` (`organizations.onboarding_state` jsonb — first event + skipped/completed calendar/brand/invite) |
| Owner AI & APIs usage warehouse | `20260723220241_ai_api_usage_logs.sql` — `ai_usage_log`, `api_usage_log` (RLS on, no JWT policies; service_role only) |
| Account notification preferences | `20260726150000_organization_users_notification_preferences.sql` — `organization_users.notification_preferences` jsonb (Settings Ease Account toggles) |
| Owner Background Library | `20260806210000_platform_background_library.sql` — `background_libraries` / `background_sources` / `background_assets` / `background_asset_libraries` + `platform-backgrounds` bucket |
| Background Library vision metadata | `20260807120000_background_asset_metadata.sql` — `description`, `style`, `audience`, `objects`, `filename_label` on `background_assets` |
| Customer Terms / Privacy acceptance | `20260814190000_legal_acceptances.sql` — append-only `legal_acceptances` (user_id, document_type, version, source, accepted_at); RLS select-own; service-role writes only |

## What belongs in a migration PR

- SQL under `supabase/migrations/` with a clear name  
- App code that reads/writes the new shape  
- Doc touch: [feature-list.md](../product/feature-list.md) and/or this file / access-control / storage-rls when behavior changes  
- Note in the PR if Production must run SQL before merge deploy

## Related

- [Architecture § Database](./architecture.md)  
- [Access control](./access-control.md)  
- [Storage RLS](./storage-rls.md)  
- Archive snapshot (historical): [PLATFORM_STABILITY_VERIFICATION.md](../archive/PLATFORM_STABILITY_VERIFICATION.md)
