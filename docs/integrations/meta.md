# Meta connection — one-click for every surface

**Status:** Thin shared OAuth CTA helpers shipped; provider token exchange still per-stack. Goal remains one click → approve use cases → done.  
**Last updated:** August 15, 2026  
**Related:** [Feature list](../product/feature-list.md) · [Event Insights](../product/event-insights.md) · [Meta Calendar DnD](../qa/meta-calendar-dnd.md) · [Meta App Review use cases](../ops/meta-app-review-use-cases.md) (includes **consent screen ↔ scope** map)

---

## Inbox webhooks (Messenger + Instagram DMs + Page comments)

Live Hub delivery uses `POST /api/meta/webhook`. Meta only delivers fields subscribed at **both**:

1. **App** `/{app-id}/subscriptions` — Page object (`messages`, `standby`, `feed`, …) **and** Instagram object (`messages`, `comments`)
2. **Page** `/{page-id}/subscribed_apps` — same Page messaging/feed fields

`subscribeMetaInboxWebhooks()` ensures both on Connect. Do **not** call `/{instagram-business-account-id}/subscribed_apps` (edge does not exist).

Page **comments** arrive on the Page `feed` field (`item=comment`). Photo/status comment payloads often omit `post_id` / `from` and only send `parent_id` + `sender_id` — the webhook handler accepts `parent_id` as the post id and Graph-enriches body, author, profile picture, and parent post caption/image the same way DM webhooks persist contact avatars.

Instagram Messaging also requires the IG account toggle **Settings → Messages and story replies → Message controls → Connected tools → Allow access to messages**. Without it, `/{page-id}/conversations?platform=instagram` stays empty and live IG webhooks do not arrive. In Development mode, only app-role users whose Facebook↔Instagram are linked in Accounts Center can trigger IG webhooks until `instagram_manage_messages` Advanced Access is approved and the app is Live.

### Photo / media Tags (not @ Mentions)

Meta does not deliver a reliable webhook for people tagging the Page / IG business account (“Tag people”). Hey Ralli polls:

- Facebook: `GET /{page-id}/tagged`
- Instagram: `GET /{ig-user-id}/tags`

via **`/api/cron/meta-tags-sync` every ~30 minutes**, plus the daily full `/api/cron/inbox-sync`. Caption/comment **@ Mentions** are deferred and must not be labeled as Tags in the Hub.

---

## Native scheduling (Facebook feed)

On **Approve**, CampignOS creates Meta-native unpublished Page feed posts (`published=false` + `scheduled_publish_time`) when the org Meta connection is healthy and the time is inside Graph’s window (~10 minutes–75 days). Graph ids live on `meta_publication_slots.graph_schedule_id`.

**Calendar DnD** updates CampignOS `scheduled_for` without clearing approval, then calls Graph to move `scheduled_publish_time` when a schedule id exists. Graph failures warn the user but do **not** roll back the calendar.

**Instagram** and **Facebook stories** do not get native Graph schedules (API limits); publish-when-due remains the delivery path. Hey Ralli’s `meta-publish` cron runs every **~20 minutes** and publishes only **due** approved slots (Instagram / stories; native Facebook feed slots are marked published in DB when due). **Publish Now** still publishes immediately on approve — no cron wait.

**Schedule** (not Publish Now): posts go out within about **20 minutes** of the chosen time, not in a single daily batch. See [cron-jobs.md § Meta: Publish Now vs Schedule](../ops/cron-jobs.md#meta-publish-now-vs-schedule-ops).

**QA / engineer reference (behavior, migration, unit tests, manual checklist):** [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md).

> School-year **event** import (ICS / Google / PDF dedupe) is a different feature — [calendar-import-dedupe.md](../qa/calendar-import-dedupe.md).

---

## Product intent

Connecting Meta should feel like **one click, one authorization, one org connection** — not separate logins for Insights, Inbox, Publishing, comments, or scheduling.

A volunteer clicks Connect, approves the use cases Facebook shows, and that connection powers:

| Surface | What the same connection enables |
|---------|----------------------------------|
| Publishing / scheduling | Approved posts → Facebook Page + Instagram |
| Insights | Views / reach / interactions KPIs + sparklines, content overview chart, top content carousel (views/reactions/comments/shares), sync, export |
| Unified Inbox | DMs, comments, photo/media tags (Tag ≠ Mention), reply, comment likes + DM reactions |
| Approvals → publish | Same Page/IG targets |
| Repost / comment moderation | Same engagement scopes |

Same mental model for Canva and Monday: one Connect CTA per provider, `returnTo` lands them back where they started.

---

## Today

- Combined Meta scopes: `META_COMBINED_OAUTH_SCOPE_LIST` in `src/lib/meta-publishing/oauth-scopes.ts` — **15 scopes**; live Facebook access-request wording mapped in [meta-app-review-use-cases.md § Consent screen](../ops/meta-app-review-use-cases.md#consent-screen--scopes-what-facebook-shows-at-connect).
- **Temporary:** Connect authorize URL uses `META_COMBINED_OAUTH_SCOPES_FOR_AUTHORIZE`, which omits `pages_messaging` until Hey Ralli Connect’s Meta app shows that permission **Found in N use cases** (Messenger use case). Publishing / IG / comments can connect; Page Messenger DMs need a reconnect after Meta attaches it.
- Shared helpers: `src/lib/integrations/oauth.ts` (`safeOAuthReturnTo`, `buildOAuthStartPath`, `buildIntegrationSettingsPath`).
- Settings → Meta is the manage home; Insights / Communications Connect CTAs hit the **same** `/api/meta/oauth/start` (no `flow=` fork).
- Canva / Monday panels and Artwork Canva connect use the same start-path helper.
- Connection rows: `organization_meta_connections`, `organization_canva_connections`, `organization_monday_connections`.
- Google Calendar Sign-in is **live and wired** through review → calendar / dashboard, plus daily cron (see [google-calendar.md](./google-calendar.md)); ICS + upload remain alternate streams. Gmail still deferred.

### Insights metrics (current)

Synced via Graph Page / IG account + published-post insights (`read_insights`, `instagram_manage_insights`):

- **Views** from `page_media_view` / `post_media_view` (unique reach kept separately)
- **Interactions** from `page_post_engagements` / derived post reactions
- **Top content by views** carousel from recent Facebook Page posts + Instagram media (and Hey Ralli `meta_publication_slots` when available) with synced post insights (`post_media_view` / `post_total_media_view_unique`, reactions, clicks; comments/shares from the post object); Refresh discovers Page/IG feed media so posts published outside Hey Ralli still appear. Avoid requesting invalid insights names like `post_comments` / `post_shares` — Graph rejects the whole batch (#100).
- **Event-scoped Insights** on event detail (`/events/[id]?tab=insights`) — product UI, empty states, load-vs-sync, and gaps: [event-insights.md](../product/event-insights.md). Reuses synced `social_post_insights` via published `meta_publication_slots` for that `event_id` (`getEventInsightsPageData`). Org `/insights` hub is unchanged. Existing connections must **Reconnect** (`auth_type=rerequest`) to pick up `read_insights` / `instagram_manage_insights` if those were not granted on first Connect. Demographics (Age & gender, Top countries), Follows, and Saves remain deferred — App Review answer: [meta-app-review-use-cases.md § Demographics](../ops/meta-app-review-use-cases.md#5-demographics-age--gender--definitive-answer).

### Inbox reactions (current)

Bubble 👍 / ❤️ in Communications Hub syncs to Meta on reply channels:

| Channel | Meta call | Notes |
|---------|-----------|--------|
| Facebook comments | `POST/DELETE /{comment-id}/likes` | **Like only** — ❤️ maps to Like (`pages_manage_engagement`) |
| Instagram comments | `POST/DELETE /{ig-user-id}/likes?comment_id=` | **Like only** — needs `instagram_manage_engagement` (+ reconnect) |
| Messenger / IG DMs | `POST /{page-id}/messages` with `sender_action` `react` / `unreact` | Emoji payload; Meta may reject `react` on some Messenger app/token setups — surface Graph error |
| Tagged threads | None | Hub-only metadata |

Local `inbox_messages.metadata.localReaction` is written only after Meta succeeds (or for hub-only tagged threads).

### Inbox GIFs (GIPHY)

Communications Hub reply toolbar includes a **GIF** control for Messenger / Instagram DMs only (`facebook_message`, `instagram_dm`). Comments and tags stay text-only (button dimmed with clear copy).

- Server proxy: `GET /api/giphy/search?q=&offset=` and `GET /api/giphy/trending?offset=` — reads `GIPHY_API_KEY` from server env (never exposed to the client). Default page size 48; rating `r` (full catalog up to R). Picker supports Load more via Giphy `offset`.
- Missing key → friendly empty state (“Add GIPHY_API_KEY to enable GIF search”); app does not crash.
- Content rating: `r` (full Giphy catalog up to R, matching giphy.com breadth).
- On select, send uses the same Meta DM image-attachment path as org stickers, with a size-safe Giphy CDN URL (`downsized` / `fixed_height` preference, ≤8MB).
- Env note: see [env-and-secrets.md](../ops/env-and-secrets.md) and `.env.local.example`.

Not synced yet (shown as honest unavailable copy): organic vs ads split, page visits, follows/unfollows, messaging conversations. Instagram account series are thinner than Facebook (reach + accounts engaged); likes/comments often come from post aggregates.

Still later: shared connection-health contract, production permission lifecycle polish, env-vs-org tenancy cleanup, Gmail Connect. App Review use-case narrative + reviewer walkthrough: [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md).

---

## Remaining framework work

1. Shared health (`connected` / `needs_reconnect` / `missing_scopes`) consumed by banners.
2. Keep Login for Business `config_id` as source of truth for Meta use cases.
3. Monday post-OAuth board mapping as a short finish-setup step (not a second OAuth).
4. Google Gmail Connect (separate CTA; same GCP project) — see [google-calendar.md](./google-calendar.md).
