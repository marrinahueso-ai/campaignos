# Volunteer Master

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 23, 2026  
**Related:** [Feature list](./feature-list.md) · [SignUpGenius import](../integrations/signupgenius.md) · [Access control](../engineering/access-control.md)

Org-wide volunteer staffing overview at `/volunteers`. Aggregate fill rates and open spots only — **no volunteer PII**.

---

## What it is / who it’s for

**Volunteer Master** is the organization-level view of which events need people and how filled SignUpGenius (or planning signup) roles are. It is for chairs, presidents, and ops volunteers who want a single place to scan staffing health without opening every event.

Connect, review, confirm, and refresh still happen on each event’s **Volunteers** tab. This page only **reads** the latest confirmed snapshots and planning signup URLs.

---

## Navigation

| Surface | Detail |
|---------|--------|
| Sidebar | **Volunteers** → `/volunteers` (`Sidebar.tsx`) |
| Page title | “Volunteer Master” |
| Route | `src/app/(dashboard)/volunteers/page.tsx` |

---

## Auto-feed rule

An event appears on Volunteer Master when **either**:

1. It has an **active SignUpGenius source** with status `pending_review`, `connected`, or `error`, **or**
2. Its planning quick links include a non-empty `volunteer_signup` URL.

Other rules:

- Non-archived events in the org’s school years only
- Filtered by the viewer’s effective event access
- Stats come from the source’s **latest confirmed** snapshot assignments (aggregate quantities only)

---

## UI

### KPI cards (clickable filters)

| Card | Meaning | Click filter |
|------|---------|----------------|
| **Total Volunteers** | Sum of filled spots across feed events | `all` |
| **Overall Fill Rate** | Filled ÷ requested across events with complete quantities | toggles `covered` |
| **Underfilled Roles** | Count of underfilled roles (+ event count in description) | toggles `needs_people` |
| **Upcoming Events** | Events in the next **60 days** | toggles `upcoming` |

Default filter on load: **Upcoming**.

### Search and filter chips

- Search: event title or role name
- Chips: **Upcoming** · **Needs people** · **Covered** · **All**
- Covered = has confirmed snapshot, fill rate ≥ 100%, and zero underfilled roles

### Events table

- Circular artwork from approved-square image when status is `filled`; otherwise title initials
- Columns: Event & Date · Fill Rate · Top Roles (by volunteers, up to 3) · expand
- Expand row: **Open Volunteers tab**, optional **Open signup** (SignUpGenius or planning URL), underfilled / covered copy

### This week rail

- Underfilled roles for events whose date falls in the current calendar week (Sunday start)
- Cap: 8 rows, sorted by open spots
- **View all underfilled roles** sets the underfilled filter

### Sync footer

Copy notes that data is synced from SignUpGenius, shows the latest successful sync across feed sources when available, and states that **sync and connect live on each event’s Volunteers tab**.

---

## Fill-rate color guide

Shared with the event Volunteers tab (`getVolunteerFillRateBand` in `org-master-shared.ts`):

| Band | Fill rate | Label |
|------|-----------|--------|
| Critical | 0–19% | Critical |
| Needs Attention | 20–39% | Needs Attention |
| Fair Progress | 40–59% | Fair Progress |
| Healthy | 60–99% | Healthy |
| Fully Staffed | 100% | Fully Staffed (check icon) |

Null / incomplete quantities → no band coloring (em dash).

---

## Deep links

| Action | Destination |
|--------|-------------|
| Event title / Open Volunteers tab / This week row | `/events/[id]?tab=volunteers` (`eventVolunteersHref`) |
| Open signup | External SignUpGenius or planning `volunteer_signup` URL |

---

## Privacy

- **No PII** — names, emails, or individual signups are not shown
- Quantities and role names only from confirmed assignment rows
- Sync / connect / replace-link remain on the event Volunteers tab

---

## Relationship to event Volunteers tab

| Volunteer Master | Event Volunteers tab |
|------------------|----------------------|
| Org-wide scan | Single-event connect, review, confirm, refresh |
| Reads confirmed snapshots | Writes sources + snapshots |
| Same fill-rate color bands | Same bands on Overall Filled and per-assignment progress |
| Deep-links into the tab | Living import detail: [signupgenius.md](../integrations/signupgenius.md) |

---

## Data sources / key files

| Area | Path |
|------|------|
| Page route | `src/app/(dashboard)/volunteers/page.tsx` |
| UI shell | `src/components/volunteers/VolunteersMasterShell.tsx` |
| Server loader | `src/lib/event-volunteers/org-master.ts` (`getVolunteersMasterPageData`) |
| Shared filters / bands / KPIs | `src/lib/event-volunteers/org-master-shared.ts` |
| Nav | `src/components/layout/Sidebar.tsx` |
| Volunteers deep link | `src/lib/events/event-responsibility.ts` (`eventVolunteersHref`) |
| Event tab (connect / sync) | `src/components/events-phase3/EventVolunteersTab.tsx` |
