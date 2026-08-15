# Event Insights

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 15, 2026  
**Related:** [Feature list](./feature-list.md) · [Meta connection](../integrations/meta.md) · [Meta App Review use cases](../ops/meta-app-review-use-cases.md) · [Ask Ralli Assistant](../engineering/ask-ralli-assistant.md)

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

Pilot **Event Performance** board (creative-first), not the retired dense chart wall:

1. **Header** — Event Performance + short organic-only subtitle
2. **Left: creative carousel** — scroll / arrows / dots through each published post; large artwork card with Live badge; per-creative Views · Shares · Clicks; engagement read (rule-based from metrics, not an LLM)
3. **Right: stats rotate with the selected creative** — Reach · Interactions · Link clicks; velocity chart (event `viewsSeries` when available) or performance-profile bars; engagement-mix donut (likes/comments/shares/clicks); creative snapshot
4. **Footer** — Refresh on the snapshot card + ghost **Open Org Insights**

No fake donations / volunteer-loyalty charts. No comparison / “vs typical” banner.

---

## Empty states

| State | When | UI |
|-------|------|-----|
| `connect` | Meta not connected | Connect with Facebook + Meta settings link (`returnTo` back to this tab) |
| `no_posts` | Connected, zero published `meta_publication_slots` for the event | Text only: “No published posts yet” — **no** Open Approvals / Create with AI CTAs |
| `sync` | Published slots exist but no `social_post_insights` rows yet | If Insights scopes are missing → **Reconnect Facebook** (`auth_type=rerequest`) primary; otherwise auto-pull on open + Refresh + Open Org Insights |

---

## Data model

`getEventInsightsPageData` (`src/lib/insights/event-queries.ts`):

1. Connection health via `getInsightsConnectionHealth`
2. Published slots for the event (`meta_publication_slots`)
3. Matching rows from `social_post_insights` (by slot id and/or external post id)
4. Enrich posts with artwork / caption when available
5. Aggregate KPIs; build views series via `event-comparison.ts` (comparison helpers remain unused by UI)

**No demographics** are loaded or rendered (no Age & gender, Top countries, etc.). Definitive App Review answer (not requested; deferred; Meta deprecated classic age/gender Page metrics): [meta-app-review-use-cases.md § Demographics](../ops/meta-app-review-use-cases.md#5-demographics-age--gender--definitive-answer).

---

## Load vs sync

| Action | Behavior |
|--------|----------|
| Open tab | Reads **DB** first (slots + stored insights). When Meta is connected with Insights scopes and metrics are **empty** or last sync is **stale** (~15 min), runs **one** org-wide `syncInsightsAction` automatically (same as org `/insights`). Does not re-hit Graph on every navigation while fresh. |
| **Refresh** / **Sync now** | Runs `syncInsightsAction` → `syncOrganizationInsights` (**org-wide** Meta sync), then refreshes the tab |

Stuck `analytics_sync_runs` with `status=running` older than ~10 minutes are treated as failed so the UI does not stay on “Refreshing…”.

Visiting the tab alone never triggers a Graph pull when numbers are already fresh.

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
