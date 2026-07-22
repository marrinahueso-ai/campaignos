# SignUpGenius volunteer import

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 21, 2026  
**Related:** [Feature list](../product/feature-list.md) · [Database](../engineering/database.md) · [Access control](../engineering/access-control.md)

Public SignUpGenius **go** links can be connected on an event’s **Volunteers** tab. Hey Ralli imports aggregate assignment availability only (no volunteer PII).

---

## Product flow

1. **Connect** a public SignUpGenius URL → pending review snapshot (full link contents).
2. **Review** detected dates with multi-select checkboxes (default: all dates + **No date** when undated rows exist). Summary cards and the assignment table update live for the selected subset.
3. **Confirm** → filters the pending snapshot to the selected dates, stores a sticky allowlist on the source, and creates the Volunteer Overview.
4. **Refresh / auto-refresh** re-reads the public page and **reapplies** the sticky allowlist so shared multi-date links stay event-scoped.
5. **Replace link** disconnects (or clears) the prior source and starts a new review — the previous allowlist is **not** carried to a new URL.

Confirm is disabled when nothing is selected or the selection matches zero assignments. Overnight slots filter by **start date** only.

---

## Schema

| Table / column | Role |
|----------------|------|
| `event_volunteer_sources.included_assignment_dates` | Nullable `text[]`. Sticky allowlist of ISO start dates (`YYYY-MM-DD`) plus optional `__none__` for undated rows. **`null` = include all dates** (backward compatible with sources connected before this column). |
| `event_volunteer_snapshots` / `event_volunteer_assignments` | Confirmed snapshot holds only the filtered assignments. |

Migration: `071_event_volunteer_included_assignment_dates.sql`.

---

## Code map

| Area | Path |
|------|------|
| Review UI | `src/components/events-phase3/EventVolunteersTab.tsx` |
| Actions | `src/lib/event-volunteers/actions.ts` (`confirmVolunteerOverviewAction`, refresh path) |
| Mutations | `src/lib/event-volunteers/mutations.ts` (`confirmVolunteerSnapshot`, `upsertVolunteerSource`) |
| Allowlist helpers | `src/lib/event-volunteers/assignment-list.ts` |
| Reader / normalize | `src/lib/event-volunteers/signupgenius-reader.ts`, `signupgenius-normalize.ts` |

---

## Verify

1. Connect a multi-date SignUpGenius link on Event A; uncheck other dates; confirm.
2. Overview shows only the selected date(s); Refresh keeps that scope.
3. Connect the same link on Event B with a different date selection — each event stays independent.
4. Replace Link → new review starts with all dates selected again (no silent carry-over).
