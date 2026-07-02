# Engine 4 — Communications Brain Foundation

**Status:** Complete

## Overview

Engine 4 adds the first AI-ready content generation workflow without OpenAI integration. Volunteers generate realistic PTO-style placeholder drafts from event, playbook, and timeline step context.

## Features

- **Generate Draft** on each communication timeline step
- **Generate All Drafts** in the Event Workspace hero
- **Draft Preview Panel** with channel, timeline step, copy, Draft status, Edit, and Approve placeholder
- Placeholder content stored in `communication_versions` linked via `communication_items.event_communication_step_id`

## Database

Migration: `supabase/migrations/006_create_communication_draft_tables.sql` (applied)

- Creates `communication_items` and `communication_versions` when migration 003 was skipped
- Adds `event_communication_step_id` to `communication_items`
- Partial unique indexes for hub items vs. step-linked drafts

Earlier migration `005_link_communication_items_to_playbook_steps.sql` covers the same column/index changes when 003 is already applied; do not run 005 after 006.

## Live verification (June 2026)

Verified on event **`79659782-ce78-4f74-bd1b-1906177f879e`** (Back to School Faair):

- Migration 006 applied
- Generate Draft created **1** `communication_item` + **1** `communication_version` (14 Days Out)
- Generate All Drafts completed drafts for all **7** timeline steps (**7** items, **8** versions total)
- Draft Preview Panels load saved drafts from the database
- `npm run lint`, `npm run build`, and `npm run verify` passed
- Server action fix: removed invalid `initialState` export from `src/lib/event-workspace/actions.ts`

## Library

- `src/lib/communications-brain/generator.ts` — context-aware placeholder copy (swap for OpenAI later)
- `src/lib/communications-brain/mutations.ts` — persist drafts to `communication_items` + `communication_versions`
- `src/lib/communications-brain/queries.ts` — load step drafts for workspace
- `src/lib/communications-brain/actions.ts` — server actions

## Not included

- OpenAI / real AI generation
- Artwork generation
- Publishing
- Functional board approval (Approve button is disabled placeholder)

## Developer workflow

After `npm run build`, restart with `npm run dev:clean` to avoid stale `.next` cache issues.
