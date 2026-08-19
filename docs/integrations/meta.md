# Meta connection — one org Connect for publish, inbox, and Insights

**Status:** Living  
**Owner:** Engineering / Product  
**Last updated:** August 19, 2026  
**Related:** [Feature list](../product/feature-list.md) · [Event Insights](../product/event-insights.md) · [Meta Calendar DnD](../qa/meta-calendar-dnd.md) · [Meta App Review use cases](../ops/meta-app-review-use-cases.md) (consent screen ↔ scope map) · [Cron jobs](../ops/cron-jobs.md) · [Env & secrets](../ops/env-and-secrets.md) · [Privacy & data](../security/privacy-and-data.md)

---

## Specialist briefing (read this first)

Hey Ralli is a school / PTA communications workspace at [heyralli.com](https://heyralli.com). Meta is an **opt-in organization integration**: one volunteer with `manage_integrations` clicks **Connect with Facebook**, approves Login for Business use cases, and that **one org connection** powers publishing, Communications Hub (inbox), and organic Insights.

We are **not** an ads manager, scraper, or data broker. We do **not** post to personal profiles. We do **not** request age/gender demographic permissions.

**Ask the specialist about these live facts:**

1. **Messenger scope is omitted on Connect today.** The product list is **15** scopes; the authorize URL currently sends **14**. `pages_messaging` is left off until Meta shows it **Found in N use cases** on the “Engage with customers on Messenger” use case. Ready for testing alone still returns **Invalid Scopes**. Page Messenger DMs need a reconnect after Meta attaches it.
2. **Login for Business `config_id` and `scope` are both sent** when `META_OAUTH_CONFIG_ID` is set. Confirm the config’s permission set matches the authorize list (especially the Messenger omit).
3. **Two Facebook OAuth products.** Page/IG Connect is Hey Ralli’s `/api/meta/oauth/*`. Account “Continue with Facebook” on `/login` is **Supabase identity** (`/auth/callback`) and does **not** connect the school Page. Confirm whether those should share one Meta app or stay split (Facebook Login vs Facebook Login for Business).
4. **App Review packet vs live Connect.** Review docs list all 15 scopes (including `pages_messaging`). Live Connect does not ask for Messenger until (1) is fixed. Do not tell reviewers they will see Messenger on Connect until authorize is restored.
5. **Graph version is `v21.0`** (`META_GRAPH_API_VERSION` override). Authorize dialog URL is unversioned `https://www.facebook.com/dialog/oauth`.
6. **Insights sync is on-demand**, not a Vercel cron. `/api/cron/insights-sync` exists in code but is **not** in `vercel.json`.

Do **not** put App IDs, secrets, verify tokens, or Page access tokens in notes or this doc.

---

## Connection model

| Item | Current behavior |
|------|------------------|
| Who connects | Org member with `manage_integrations` |
| Where | Settings → Integrations → Facebook & Instagram (`/settings/meta`); also Connect CTAs on `/communications`, `/insights?view=connect`, `/onboarding/connect` |
| OAuth start | `GET /api/meta/oauth/start` — **no `flow=` fork**. Insights / Communications / Settings share the same start |
| Reconnect | Same start with `auth_type=rerequest` when already connected or inbox marks reconnect required |
| Callback | `GET /api/meta/oauth/callback` (or `META_REDIRECT_URI` if set) |
| Stored as | One row per org in `organization_meta_connections` (Page id, linked IG Professional id, **encrypted** Page token) |
| Permission | `manage_integrations` required to start OAuth |

**Product intent:** one click, one authorization, one org connection — not separate logins for Insights, Inbox, Publishing, comments, or scheduling.

| Surface | Same connection enables |
|---------|-------------------------|
| Publishing / scheduling | Approved posts → Facebook Page + Instagram |
| Insights | Organic views / reach / interactions; org hub + event tab |
| Unified Inbox | DMs, comments, photo/media tags (Tag ≠ Mention), reply, reactions |
| Approvals → publish | Same Page/IG targets |

Settings is the manage home. Shared CTA helpers: `src/lib/integrations/oauth.ts` (`safeOAuthReturnTo`, `buildOAuthStartPath`, `buildIntegrationSettingsPath`).

---

## Two Facebook OAuth products (do not mix them up)

| Flow | Purpose | Redirect | Scopes |
|------|---------|----------|--------|
| **Page / Instagram Connect** | Org publishes, inbox, Insights | `{origin}/api/meta/oauth/callback` | Login for Business / Page permissions below |
| **Continue with Facebook** (account) | Hey Ralli user identity via Supabase | `{origin}/auth/callback` | Standard Facebook Login for identity — **does not** connect the school Page |

Connect UI copy: a Meta app that **only** has Facebook Login is incompatible with Page/Instagram publishing use cases. Use **Facebook Login for Business** (plus the Page / Instagram / Messenger use cases) for Connect.

In-app setup steps (Settings Meta panel): Developers Dashboard → **Manage everything on your Page** + **Manage messaging & content on Instagram** → permissions **Ready for testing** → Login for Business configuration (`META_OAUTH_CONFIG_ID`) → Valid OAuth Redirect URIs include `/api/meta/oauth/callback` → App Domains include the site host.

---

## Scopes

Source of truth: `src/lib/meta-publishing/oauth-scopes.ts`.

| List | Count | Used for |
|------|-------|----------|
| `META_COMBINED_OAUTH_SCOPE_LIST` | **15** | Product + App Review packet (intended full set) |
| `META_COMBINED_OAUTH_SCOPES_FOR_AUTHORIZE` | **14** | What `/api/meta/oauth/start` actually puts on the authorize URL |
| `META_OAUTH_TEMPORARILY_OMITTED_SCOPES` | `pages_messaging` | Restore after Meta shows **Found in N use cases** for Messenger |

Facebook access-request wording ↔ scope names: [meta-app-review-use-cases.md § Consent screen](../ops/meta-app-review-use-cases.md#consent-screen--scopes-what-facebook-shows-at-connect).

### Intended full set (15)

**Publish / Page identity**

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `business_management`
- `instagram_basic`
- `instagram_content_publish`

**Inbox**

- `pages_messaging` ← **omitted on live authorize today**
- `pages_manage_metadata`
- `pages_read_user_content`
- `pages_manage_engagement`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `instagram_manage_engagement`

**Insights**

- `read_insights`
- `instagram_manage_insights`

**Not requested:** `pages_user_gender`, `user_gender`, `user_age_range`, ads / Marketing API permissions, `pages_manage_ads`.

Existing connections must **Reconnect** (`auth_type=rerequest`) to pick up Insights scopes if they connected before those were added.

---

## Login for Business `config_id`

Optional env: `META_OAUTH_CONFIG_ID`.

When set, OAuth start adds `config_id` **and still sets `scope`** to `META_COMBINED_OAUTH_SCOPES_FOR_AUTHORIZE` (the 14-scope list). Login configurations define permissions on Meta’s side; a mismatch between the config and the `scope` query param is a common **Invalid Scopes** cause.

Recommended: keep the Login for Business configuration aligned with the **authorize** list until Messenger is attached, then add `pages_messaging` to both the config and `META_OAUTH_TEMPORARILY_OMITTED_SCOPES` (remove the omit).

---

## Tokens, Graph, and tenancy

- Page access tokens are encrypted at rest with `OAUTH_TOKEN_ENCRYPTION_KEY` (AES-256-GCM). Required in Preview/Production.
- Graph calls use `https://graph.facebook.com/v21.0/...` unless `META_GRAPH_API_VERSION` is set.
- Org-scoped lookup prefers `organization_meta_connections`. Legacy env fallback (`META_PAGE_ACCESS_TOKEN` + `META_FACEBOOK_PAGE_ID`) still exists for some call paths — prefer org OAuth; do not rely on shared env tokens for multi-tenant production.
- Daily `/api/cron/meta-token-health` refreshes connection health and can email `meta-disconnected` when a Page token is invalid.

---

## Inbox webhooks (Messenger + Instagram DMs + Page comments)

Live Hub delivery uses `GET`/`POST /api/meta/webhook` (hub challenge + `X-Hub-Signature-256`). Meta only delivers fields subscribed at **both**:

1. **App** `/{app-id}/subscriptions` — Page object (`messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`, `standby`, `feed`) **and** Instagram object (`messages`, `comments`)
2. **Page** `/{page-id}/subscribed_apps` — same Page messaging/feed fields

`subscribeMetaInboxWebhooks()` / `ensureMetaAppWebhookSubscriptions()` run on Connect. Callback URL is `{NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL}/api/meta/webhook`. Do **not** call `/{instagram-business-account-id}/subscribed_apps` (edge does not exist).

Page **comments** arrive on the Page `feed` field (`item=comment`). Photo/status comment payloads often omit `post_id` / `from` and only send `parent_id` + `sender_id` — the handler accepts `parent_id` as the post id and Graph-enriches body, author, profile picture, and parent post media.

Instagram Messaging also requires the IG account toggle **Settings → Messages and story replies → Message controls → Connected tools → Allow access to messages**. Without it, `/{page-id}/conversations?platform=instagram` stays empty and live IG webhooks do not arrive. In Development mode, only app-role users whose Facebook↔Instagram are linked in Accounts Center can trigger IG webhooks until `instagram_manage_messages` Advanced Access is approved and the app is Live.

### Photo / media Tags (not @ Mentions)

Meta does not deliver a reliable webhook for people tagging the Page / IG business account (“Tag people”). Hey Ralli polls:

- Facebook: `GET /{page-id}/tagged`
- Instagram: `GET /{ig-user-id}/tags`

via **`/api/cron/meta-tags-sync` every ~30 minutes**, plus the daily full `/api/cron/inbox-sync`. Caption/comment **@ Mentions** are deferred and must not be labeled as Tags in the Hub.

---

## Native scheduling (Facebook feed)

On **Approve**, Hey Ralli creates Meta-native unpublished Page feed posts (`published=false` + `scheduled_publish_time`) when the org Meta connection is healthy and the time is inside Graph’s window (~10 minutes–75 days). Graph ids live on `meta_publication_slots.graph_schedule_id`.

**Caption last-mile:** native Graph schedules auto-publish on Meta’s servers. The feed caption must be `status === "approved"` at schedule time (not merely non-empty). Same gate on CampignOS publish-when-due. Draft caption text must never be handed to Graph as a live schedule.

**Calendar DnD** updates CampignOS `scheduled_for` without clearing approval, then calls Graph to move `scheduled_publish_time` when a schedule id exists. Graph failures warn the user but do **not** roll back the calendar.

**Instagram** and **Facebook stories** do not get native Graph schedules (API limits); publish-when-due remains the delivery path. Hey Ralli’s `meta-publish` cron runs every **~20 minutes** and publishes only **due** approved slots (Instagram / stories; native Facebook feed slots are marked published in DB when due). **Publish Now** still publishes immediately on approve — no cron wait.

**Schedule** (not Publish Now): posts go out within about **20 minutes** of the chosen time, not in a single daily batch. See [cron-jobs.md § Meta: Publish Now vs Schedule](../ops/cron-jobs.md#meta-publish-now-vs-schedule-ops).

**QA / engineer reference:** [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md).

> School-year **event** import (ICS / Google / PDF dedupe) is a different feature — [calendar-import-dedupe.md](../qa/calendar-import-dedupe.md).

---

## Meta crons (from `vercel.json`)

Schedules are UTC. Auth: `Authorization: Bearer CRON_SECRET`.

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/meta-publish` | every ~20 min | Due IG/stories publish; mark native FB schedules published |
| `/api/cron/meta-tags-sync` | every ~30 min | FB/IG photo tags (not Mentions) |
| `/api/cron/inbox-sync` | daily 09:00 UTC | Full inbox backfill |
| `/api/cron/meta-token-health` | daily 08:00 UTC | Token health + operational emails |

**Not scheduled:** `/api/cron/insights-sync` — Insights pull on page open / Refresh (`shouldAutoSyncInsights`). Add to `vercel.json` only if we want background refresh.

---

## Insights (current)

Synced via Graph Page / IG account + published-post insights (`read_insights`, `instagram_manage_insights`):

- **Views** from `page_media_view` / `post_media_view` (unique reach kept separately)
- **Interactions** from `page_post_engagements` / derived post reactions
- **Top content by views** carousel from recent Facebook Page posts + Instagram media (and Hey Ralli `meta_publication_slots` when available). Refresh discovers Page/IG feed media so posts published outside Hey Ralli still appear. Avoid invalid insight names like `post_comments` / `post_shares` — Graph rejects the whole batch (#100).
- **Org Insights** at `/insights` — **not** in the primary sidebar during soft launch (direct URL / in-app links). Event Insights on `/events/[id]?tab=insights`. Product UI: [event-insights.md](../product/event-insights.md).
- Demographics (Age & gender, Top countries), Follows, and Saves remain **deferred** — [meta-app-review-use-cases.md § Demographics](../ops/meta-app-review-use-cases.md#5-demographics-age--gender--definitive-answer).

Not synced yet (honest unavailable copy): organic vs ads split, page visits, follows/unfollows, messaging conversations. Instagram account series are thinner than Facebook (reach + accounts engaged); likes/comments often come from post aggregates.

---

## Inbox reactions and GIFs

Bubble 👍 / ❤️ in Communications Hub syncs to Meta on reply channels:

| Channel | Meta call | Notes |
|---------|-----------|--------|
| Facebook comments | `POST/DELETE /{comment-id}/likes` | **Like only** — ❤️ maps to Like (`pages_manage_engagement`) |
| Instagram comments | `POST/DELETE /{ig-user-id}/likes?comment_id=` | **Like only** — needs `instagram_manage_engagement` (+ reconnect) |
| Messenger / IG DMs | `POST /{page-id}/messages` with `sender_action` `react` / `unreact` | Emoji payload; Meta may reject `react` on some setups |
| Tagged threads | None | Hub-only metadata |

Local `inbox_messages.metadata.localReaction` is written only after Meta succeeds (or for hub-only tagged threads).

**GIFs:** Communications Hub DM toolbar uses GIPHY via server proxy (`GIPHY_API_KEY`). Selected GIFs send as **Meta DM image attachments** (same path as org stickers), not a Meta permission. Comments/tags stay text-only.

---

## Privacy / App Dashboard URLs

| Meta dashboard field | Value |
|----------------------|--------|
| Privacy policy | `https://heyralli.com/privacy` |
| User Data Deletion (Instructions URL) | `https://heyralli.com/privacy#user-data-deletion` |
| Webhook callback | `https://heyralli.com/api/meta/webhook` — **not** the deletion URL |

Phase 1 uses Meta’s **Instructions URL** option. There is no Data Deletion Callback URL yet. Do not enter the webhook URL as a User Data Deletion URL.

---

## Env vars (names only — never paste values)

| Variable | Role |
|----------|------|
| `META_APP_ID` / `META_APP_SECRET` | App credentials; required for Connect |
| `META_REDIRECT_URI` | Optional override; default `{origin}/api/meta/oauth/callback` |
| `META_OAUTH_CONFIG_ID` | Optional Login for Business configuration id |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhook hub.verify_token |
| `META_GRAPH_API_VERSION` | Optional; default `v21.0` |
| `META_FACEBOOK_PAGE_ID` | Optional OAuth fallback when Page list is empty |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` | Webhook callback origin |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Encrypt Page tokens at rest |
| Legacy `META_PAGE_ACCESS_TOKEN` | Optional shared fallback — prefer org OAuth |

Catalog: [env-and-secrets.md](../ops/env-and-secrets.md) and `.env.local.example`.

---

## Remaining Meta work (not other providers)

1. Restore `pages_messaging` on authorize after Meta attaches the Messenger use case; reconnect orgs that connected during the omit.
2. Keep Login for Business `config_id` aligned with the live authorize list (avoid config vs `scope` drift).
3. Shared connection-health contract (`connected` / `needs_reconnect` / `missing_scopes`) consumed by banners — **partial**.
4. Env-vs-org tenancy cleanup (retire shared `META_PAGE_ACCESS_TOKEN` fallback for production).
5. Decide whether `/api/cron/insights-sync` should be scheduled.
6. Production permission lifecycle (Advanced Access / Live app) — App Review packet: [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md).

Canva / Monday / Gmail Connect are separate integrations; they share CTA helpers only.
