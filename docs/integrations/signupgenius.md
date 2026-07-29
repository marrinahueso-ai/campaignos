# SignUpGenius volunteer import

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 27, 2026  
**Related:** [Feature list](../product/feature-list.md) · [Volunteer Master](../product/volunteer-master.md) · [Database](../engineering/database.md) · [Access control](../engineering/access-control.md)

Public SignUpGenius **go** links can be connected on an event’s **Volunteers** tab. Hey Ralli imports aggregate role availability only (no names or contact details).

**Product decision (Jul 27, 2026):** URL connect is the **long-term** path. SignUpGenius **Pro** is required for their API/OAuth, and many orgs do not have Pro — so we do **not** ship Settings OAuth or tease “Coming soon.” When most customers are on Pro, we may add OAuth as a **second** option alongside URL. Until then: one clear flow.

**Always verify before import:** Connect → pending review (date allowlist) → confirm → then numbers land on the event and Master. No silent import past review.

Org-wide **Volunteers** (`/volunteers`) is documented in [volunteer-master.md](../product/volunteer-master.md): Ease focus/queue, fill-rate bands, auto-feed rule, and deep links. Connect / refresh still happens on each event’s Volunteers tab; the master page reads the latest confirmed snapshots only.

---

## Product flow

1. **Connect** a public SignUpGenius URL → pending review snapshot (full link contents).
2. **Review** detected dates with multi-select checkboxes (default: all dates + **No date** when undated rows exist). Summary cards and the assignment table update live for the selected subset.
3. **Confirm** → filters the pending snapshot to the selected dates, stores a sticky allowlist on the source, and creates the Volunteer Overview.
4. **Refresh / auto-refresh** re-reads the public page and **reapplies** the sticky allowlist so shared multi-date links stay event-scoped. Background cron (`/api/cron/volunteer-sync`, every ~30 min) refreshes connected sources stale for ≥30 minutes (capped per run); Dashboard and Volunteer Master stay DB-only on load.
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
| Org Volunteer Master | `src/app/(dashboard)/volunteers/page.tsx`, `src/components/volunteers/VolunteersMasterShell.tsx`, `src/lib/event-volunteers/org-master.ts` |
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
