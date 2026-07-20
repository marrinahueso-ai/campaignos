# Sprint 5 — Event Workspace + Communications Hub

**Status:** Complete

## Overview

Sprint 5 introduces the Event Workspace at `/events/[id]`, a dedicated project-management hub for each PTO event. This is not an edit form — it is the central place where communications, assets, and timeline activity live for a single event.

## Route

| URL | Description |
|-----|-------------|
| `/events/[id]` | Event Workspace for a single event |

The workspace opens when a user clicks an event from the Events grid or Dashboard upcoming events list.

## Workspace Sections

1. **Hero** — Event name, date, status, category, countdown, quick actions
2. **Event Overview** — Editable description, time, location, audience, theme, owner, budget, volunteer placeholders
3. **Communications Hub** — Nine channel cards with Generate, Preview, Approve, and published badges (placeholder content only)
4. **Creative Assets** — Six asset cards with Upload, Replace, Preview, and future AI badge
5. **Timeline** — Mock lifecycle from calendar import through event completion

## Database

Migration: `supabase/migrations/003_create_event_workspace_tables.sql`

### New tables

| Table | Purpose |
|-------|---------|
| `event_assets` | Creative files per event (hero, flyer, logo, etc.) |
| `communication_items` | One row per communication channel per event |
| `communication_versions` | Versioned placeholder/generated content |
| `approval_requests` | Board approval tracking |
| `publication_schedule` | Scheduled publication placeholders |
| `activity_log` | Event lifecycle timeline entries |

### Extended `events` columns

- `category`
- `event_owner`
- `budget`
- `volunteer_needs`
- `updated_at`

## Data layer

```
src/lib/event-workspace/
├── actions.ts      # Server actions for UI interactions
├── constants.ts    # Channels, asset types, placeholder content
├── mappers.ts      # Row ↔ domain mapping
├── mock-data.ts    # Fallback data when migration not applied
├── mutations.ts    # Writes + workspace initialization
└── queries.ts      # Reads workspace bundle
```

## Components

```
src/components/event-workspace/
├── CommunicationCard.tsx
├── CommunicationPreviewDialog.tsx
├── CommunicationsHubSection.tsx
├── CommunicationStatusBadge.tsx
├── CreativeAssetCard.tsx
├── CreativeAssetsSection.tsx
├── EventOverviewSection.tsx
├── EventWorkspaceHero.tsx
└── TimelineSection.tsx
```

## Explicitly deferred (Sprint 6+)

- OpenAI content generation
- Image generation
- Social scheduling and publishing
- Canva, Facebook, Instagram integrations
- PDF/calendar parsing

## Verification

After applying migration 003 in Supabase:

1. Open `/events` and click **Open Workspace** on any event
2. Confirm all five workspace sections render
3. Save Event Overview changes
4. Generate / Preview / Approve a communication card
5. Upload a placeholder asset filename

Existing routes (`/dashboard`, `/school-setup`, `/calendar/review`, `/events/create`) remain unchanged.
