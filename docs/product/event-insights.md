# Event Insights

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 26, 2026  
**Related:** [Feature list](./feature-list.md) · [Meta connection](../integrations/meta.md) · [Ask Ralli Assistant](../engineering/ask-ralli-assistant.md)

Event-scoped Meta performance on the event detail workspace. UI-focused product surface; OAuth and Graph sync details live in [meta.md](../integrations/meta.md).

---

## Where it lives

| Surface | Detail |
|---------|--------|
| Route | `/events/[id]?tab=insights` |
| Hub route | `/insights?view=event` (optional `?event=`) — same Ease panel; quiet event picker defaults to soonest upcoming / most recent past |
| Host shell | `EventDetailShell` (tab id `insights`, label **Insights**); hub host `InsightsEaseShell` |
| Tab UI | `src/components/events-phase3/EventDetailInsightsEasePanel.tsx` |
| Mockup | [`/insights-ease-mockup.html`](../../public/insights-ease-mockup.html) (Event Insights panel) |

Same Meta org connection as publishing and the org Insights hub (`/insights`).

---

## Layout (populated state)

Matches the Insights Ease mockup (event panel) — not the retired dense chart wall:

1. **Eyebrow** — Event Insights · organic Meta metrics
2. **KPI strip** — Views · Reach · Interactions · Link clicks · Likes
3. **Posts for this event** — thumbnail or initials placeholder, caption, platform · date, views + likes; subtitle “Published slots linked to {event title}”; links out when an external post URL exists
4. **Sync footer** — “Synced from Meta · Last sync: Jul 26, 11:40 AM” style timestamp, **Refresh**, ghost **Open Org Insights**

No comparison / “vs typical” banner on this surface (product override).

---

## Empty states

| State | When | UI |
|-------|------|-----|
| `connect` | Meta not connected | Connect with Facebook + Meta settings link (`returnTo` back to this tab) |
| `no_posts` | Connected, zero published `meta_publication_slots` for the event | Text only: “No published posts yet” — **no** Open Approvals / Create with AI CTAs |
| `sync` | Published slots exist but no `social_post_insights` rows yet | Sync now + Open Org Insights; warns if insights scopes are missing |

---

## Data model

`getEventInsightsPageData` (`src/lib/insights/event-queries.ts`):

1. Connection health via `getInsightsConnectionHealth`
2. Published slots for the event (`meta_publication_slots`)
3. Matching rows from `social_post_insights` (by slot id and/or external post id)
4. Enrich posts with artwork / caption when available
5. Aggregate KPIs; build views series via `event-comparison.ts` (comparison helpers remain unused by UI)

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
- Dense Views Total / By-post charts and Interactions breakdown cards (retired with Ease redesign; `EventInsightsTab.tsx` unused)

---

## Related org hub

Org-wide Insights live at `/insights` via `InsightsEaseShell` (same Meta connection, date range + platform filters, top content across the Page / Instagram account).
