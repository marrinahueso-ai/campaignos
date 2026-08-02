# Volunteer Master

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 1, 2026  
**Related:** [Feature list](./feature-list.md) · [SignUpGenius import](../integrations/signupgenius.md) · [Access control](../engineering/access-control.md)

Org-wide volunteer staffing overview at `/volunteers`. Aggregate fill rates and open spots only — **no volunteer names or contact details** on this page. Named people (names only, no emails) live on each event’s Volunteers tab when SignUpGenius exposes public participants.

---

## What it is / who it’s for

**Volunteers** (Volunteer Master) is the organization-level view of which events need people and how filled SignUpGenius (or planning signup) roles are. It is for chairs, leads, and ops volunteers who want a single place to scan staffing health without opening every event.

Connect, **review/verify before import**, confirm, and refresh still happen on each event’s **Volunteers** tab. This page only **reads** the latest confirmed snapshots and planning signup URLs.

**SignUpGenius:** Long-term path is **public URL connect** (not Settings OAuth). Many orgs lack SignUpGenius Pro, which their API/OAuth needs. OAuth may return later as a second option when most customers are on Pro — see [signupgenius.md](../integrations/signupgenius.md).

---

## Navigation

| Surface | Detail |
|---------|--------|
| Sidebar | **Volunteers** → `/volunteers` (`Sidebar.tsx`) |
| Page title | “Volunteers” |
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

Ease layout (aligned with Approvals): soft status pills, a focus card for the soonest shortfall, and a quiet event queue. No equal-weight KPI card strip.

### Soft filter pills

| Pill | Meaning |
|------|---------|
| **Needs people** (default) | Events with underfilled roles — focus card + queue |
| **Upcoming** | Events in the next **60 days** |
| **Covered** | Confirmed snapshot, fill rate ≥ 100%, zero underfilled roles |
| **All** | Full feed |

Organization fill % and open-role count sit as quiet health text beside search.

### Search

- Search: event title or role name

### Focus card (Needs people)

- Soonest event that still needs people (cycle with **Next event**)
- Status band, fill %, countdown, top **open** roles (up to 3 by open spots)
- Actions: **Open signup** (when URL exists) · **Event volunteers**

### Quiet queue

- Artwork thumb · title · date · top open need
- Fill rate bar + open spots / role count (or Covered)
- Row links to the event Volunteers tab

### Footer

Copy notes that numbers come from SignUpGenius, shows the latest successful update across feed sources when available, and states that **connect and refresh live on each event’s Volunteers tab**.

`thisWeekUnderfilled` remains on the page payload for assistants / widgets; the ease UI does not surface a separate This week rail.

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
| Focus card / queue row / Event volunteers | `/events/[id]?tab=volunteers` (`eventVolunteersHref`) |
| Open signup | External SignUpGenius or planning `volunteer_signup` URL |

---

## Privacy

- **Volunteer Master:** no names or contact details — individual signups are not shown here
- Quantities and role names only from confirmed assignment rows
- Connect / refresh / replace-link remain on the event Volunteers tab
- **Event Volunteers tab** may show **names only** from public SignUpGenius participants; emails are never imported or displayed

---

## Relationship to event Volunteers tab

| Volunteer Master | Event Volunteers tab |
|------------------|----------------------|
| Org-wide scan | Single-event connect, review, confirm, refresh |
| Reads confirmed snapshots (aggregates) | Writes sources + snapshots + named participants |
| Same fill-rate color bands | List + accordion Grouped named roster + role fill KPIs |
| Deep-links into the tab | Living import detail: [signupgenius.md](../integrations/signupgenius.md) |

Ease overview on the event tab shows the Pilot named roster (List / accordion Grouped), KPIs, and **Refresh**. Grouped uses expandable role lines (not side-by-side cards). Pending review uses the full connect/confirm Tab (date allowlist). Empty state can connect from the Ease panel.

---

## Data sources / key files

| Area | Path |
|------|------|
| Page route | `src/app/(dashboard)/volunteers/page.tsx` |
| UI shell | `src/components/volunteers/VolunteersMasterShell.tsx` |
| Ease list | `src/components/volunteers/VolunteersEaseList.tsx` |
| Server loader | `src/lib/event-volunteers/org-master.ts` (`getVolunteersMasterPageData`) |
| Shared filters / bands / KPIs | `src/lib/event-volunteers/org-master-shared.ts` |
| Nav | `src/components/layout/Sidebar.tsx` |
| Volunteers deep link | `src/lib/events/event-responsibility.ts` (`eventVolunteersHref`) |
| Event tab (Ease roster + connect / refresh) | `src/components/events-phase3/EventDetailVolunteersEasePanel.tsx`, `EventVolunteerRosterEase.tsx` |
| Event tab (review / confirm / full overview) | `src/components/events-phase3/EventVolunteersTab.tsx` |
