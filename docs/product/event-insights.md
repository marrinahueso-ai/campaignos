# Event Insights

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 23, 2026  
**Related:** [Feature list](./feature-list.md) · [Meta connection](../integrations/meta.md) · [Ask Ralli Assistant](../engineering/ask-ralli-assistant.md)

Event-scoped Meta performance on the event detail workspace. UI-focused product surface; OAuth and Graph sync details live in [meta.md](../integrations/meta.md).

---

## Where it lives

| Surface | Detail |
|---------|--------|
| Route | `/events/[id]?tab=insights` |
| Host shell | `EventDetailShell` (tab id `insights`, label **Insights**) |
| Tab UI | `src/components/events-phase3/EventInsightsTab.tsx` |

Same Meta org connection as publishing and the org Insights hub (`/insights`).

---

## Layout (populated state)

Matches the event Insights mockup layout:

1. **KPI strip** — Views · Reach · Interactions · Link clicks · Likes (each with short info tooltip)
2. **Comparison banner** — when ≥2 posts have views: event total vs typical (median per-post views × post count); “more” / “fewer” messaging; omitted when totals match or fewer than 2 posts
3. **Views** — Total (cumulative “This event” vs “Typical” series on real publish days only) or **By post** bar breakdown
4. **Interactions** — total plus Likes / Comments / Shares breakdown
5. **Posts for this event** — thumbnail or placeholder, caption snippet, platform icon, views, likes; links out when an external post URL exists
6. **Sync footer** — “Synced from Meta · Last sync: …”, **Refresh**, link to **Org Insights**

---

## Empty states

| State | When | UI |
|-------|------|-----|
| `connect` | Meta not connected | Connect with Facebook + Meta settings link (`returnTo` back to this tab) |
| `no_posts` | Connected, zero published `meta_publication_slots` for the event | Text only: “No published posts yet” — **no** Open Approvals / Create with AI CTAs |
| `sync` | Published slots exist but no `social_post_insights` rows yet | Sync now + Open org Insights; warns if insights scopes are missing |

---

## Data model

`getEventInsightsPageData` (`src/lib/insights/event-queries.ts`):

1. Connection health via `getInsightsConnectionHealth`
2. Published slots for the event (`meta_publication_slots`)
3. Matching rows from `social_post_insights` (by slot id and/or external post id)
4. Enrich posts with artwork / caption when available
5. Aggregate KPIs; build comparison + views series via `event-comparison.ts`

**No demographics** are loaded or rendered (no Age & gender, Top countries, etc.).

---

## Load vs sync

| Action | Behavior |
|--------|----------|
| Open tab | Reads **DB** only (slots + stored insights). Does **not** call Meta Graph automatically. |
| **Refresh** / **Sync now** | Runs `syncInsightsAction` → `syncOrganizationInsights` (**org-wide** Meta sync), then refreshes the tab |

Visiting the tab alone never triggers a full Meta pull.

---

## Honest gaps (not shipped on this tab)

Not shown and not populated here:

- Age & gender
- Top countries
- Follows
- Saves
- Follower split / organic-vs-ads style breakdowns

These remain deferred at the org Insights hub as well where noted in the [feature list](./feature-list.md).

---

## Relationship to org `/insights`

| Event Insights | Org Insights hub |
|----------------|------------------|
| Scoped to one event’s published slots | Page / account + recent content across the org |
| Reuses synced `social_post_insights` | Same sync pipeline; richer charts, date range, export, recommendations |
| Footer link → `/insights` | Unchanged by event tab |
| Connect CTA returns to event tab | Connect CTA returns to `/insights` |

---

## Key files

| Area | Path |
|------|------|
| Tab UI | `src/components/events-phase3/EventInsightsTab.tsx` |
| Page data | `src/lib/insights/event-queries.ts` (`getEventInsightsPageData`) |
| Comparison / series | `src/lib/insights/event-comparison.ts` |
| Sync action | `src/lib/insights/actions.ts` (`syncInsightsAction`) |
| Shell / tab wiring | `src/components/events-phase3/EventDetailShell.tsx` |
| Meta OAuth / scopes | [meta.md](../integrations/meta.md) |
