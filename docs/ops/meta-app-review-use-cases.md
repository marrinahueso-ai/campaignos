# Meta App Review — Hey Ralli use cases

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** July 29, 2026 — App Review screenshot pack captured (8/12); checklist matrix + UI paths verified  
**Related:** [Meta connection](../integrations/meta.md) · [Feature list](../product/feature-list.md) · [Event Insights](../product/event-insights.md) · [Privacy & data](../security/privacy-and-data.md) · [Env & secrets](./env-and-secrets.md) · Insights mockup [`/insights-ease-mockup.html`](../../public/insights-ease-mockup.html) · Communications Hub mockup [`/communications-hub-ease-mockup.html`](../../public/communications-hub-ease-mockup.html)

Living brief for **Meta App Review** (Facebook + Instagram) and internal prep. Honest to shipped product only — deferred items are marked **deferred**, not described as live.

Production: [heyralli.com](https://heyralli.com)

---

## 1. App overview

**Hey Ralli** is a school / PTA (PTO) communications workspace. Volunteer boards plan events, create social artwork and captions, approve posts, publish to the school’s **Facebook Page** and linked **Instagram Professional** account, reply to organic Page / Instagram messages and comments, and review organic performance metrics.

Meta is an **opt-in org integration** (Header ⚙ **Settings** → **Integrations** → **Facebook & Instagram**, or `/settings/meta`). One Connect flow powers publishing, inbox, and insights for that organization. Hey Ralli is **not** an ads manager, scraper, or data broker.

**Soft-launch nav:** **Insights** and **Vendors** are **not** in the primary sidebar. Org Insights lives at `/insights` (direct URL or in-app links). Event Insights lives on the event **Insights** tab (`/events/[id]?tab=insights`). Everything else below uses sidebar routes that are live today.

**Primary audiences:** PTA/PTO officers, school communications volunteers, principals coordinating community outreach.

---

## 2. Platforms

| Platform | How Hey Ralli uses it |
|---------|------------------------|
| **Facebook** | Page publishing (feed; stories via kit / publish-when-due), Page Messenger inbox, Page comments/tags, Page Insights |
| **Instagram** | Content publish to linked IG Professional account, Instagram DMs + comments, Instagram insights |

Connection model: Facebook Login for Business / Page OAuth → org stores encrypted Page token + linked IG account id (`organization_meta_connections`). See [integrations/meta.md](../integrations/meta.md).

**Separate from Page connect:** account sign-in may offer **Continue with Facebook** via Supabase (`/login`, `/signup`) for identity only — not Page management. Page / IG management always goes through Settings → Meta Connect.

---

## 3. Use cases table

Scopes below are what Hey Ralli requests today (`META_COMBINED_OAUTH_SCOPE_LIST` in `src/lib/meta-publishing/oauth-scopes.ts`). When `META_OAUTH_CONFIG_ID` is set, Login for Business config is the Meta-side source of truth; the app still sends the combined scope list.

| Use case name | Where in product (URL) | How used | Permissions / scopes | User value |
|---------------|------------------------|----------|----------------------|------------|
| **Connect Facebook Page + Instagram** | Header ⚙ Settings → Integrations → Facebook & Instagram (`/settings/integrations` → `/settings/meta`); also Connect CTAs at Sidebar → **Communications Hub** (`/communications`; `/inbox` redirects), `/insights?view=connect`, `/onboarding/connect` | One OAuth: volunteer with `manage_integrations` connects the school Page and linked IG Professional account. Login for Business may show **Business / Page / Instagram asset pickers** — reviewers should select the **test Page + linked IG** (and any Business that owns them) | `pages_show_list`, `business_management`, `instagram_basic` (+ all scopes below in one consent) | Single org connection for publish, inbox, insights |
| **Publish & schedule to Facebook + Instagram** | Sidebar → **Approvals** (`/approvals`); Sidebar → **Events** → [event] → **Approvals** tab (`/events/[id]?tab=approvals`); Sidebar → **Create with AI** (`/create-with-ai/social`); Sidebar → **Calendar** (`/calendar`); `/publishing` redirects to Approvals | Approved artwork + captions → Facebook Page feed (native Graph schedule when in window) and/or Instagram; stories often publish-when-due or manual kit email | `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`, `instagram_basic` | School posts go out on time without leaving Hey Ralli |
| **Approvals → Meta** | Sidebar → **Approvals** (`/approvals`); Events → [event] → **Approvals** tab | Approve / request changes; **Publish Now** or schedule posts Meta on approval | Same publish scopes | Volunteer governance before anything hits Meta |
| **Communications Hub / Inbox** | Sidebar → **Communications Hub** (`/communications`; `/inbox` redirects); Connect Meta empty when not connected; gear → Settings → Integrations → Facebook & Instagram for manage/reconnect | Sync & reply to Facebook Page Messenger, Instagram DMs, Page/IG comments & tags; AI draft assist with **approve-then-send** | `pages_messaging`, `pages_manage_metadata`, `pages_read_user_content`, `pages_manage_engagement`, `instagram_manage_messages`, `instagram_manage_comments`, `instagram_manage_engagement` | One place for organic parent questions (no broadcast spam) |
| **Inbox reactions & engagement** | Sidebar → **Communications Hub** → thread → bubble **👍** / **❤️** | Comment likes via Graph; DM react/unreact via Messenger/IG APIs when supported | `pages_manage_engagement`, `instagram_manage_engagement`, `pages_messaging`, `instagram_manage_messages` | Quick acknowledgment of parent comments/messages |
| **Org stickers + GIFs in DMs** | Sidebar → **Communications Hub** → DM thread → reply toolbar (Sticker / GIF) | Upload org image stickers (`organization_stickers`); send as Meta image attachments on Messenger / IG DMs only; GIPHY via server proxy (not a Meta permission) | Same messaging scopes; stickers use Meta DM image attachment path | Friendly PTA replies with school branding |
| **Organic Insights (org)** | Direct URL `/insights` (Org view — **not** in sidebar during soft launch); view pill **Org**; Connect Meta pill at `/insights?view=connect` | Sync Page / IG account + post metrics; KPIs (Views, Reach, Interactions, Likes, Comments), content overview, top content carousel, CSV export, rule-based tips | `read_insights`, `instagram_manage_insights` (+ `pages_read_engagement`) | Boards see what organic posts performed — **no ads data** |
| **Event Insights** | Sidebar → **Events** → [event] → **Insights** tab (`/events/[id]?tab=insights`); or `/insights?view=event&event=[id]` | Same connection; KPIs + posts linked to that event’s published slots | Same insights scopes | Event chairs see performance for one fundraiser/spirit week |
| **Webhooks (near-real-time inbox)** | Callback `POST/GET /api/meta/webhook`; subscribe via inbox/Meta connection tooling | **App-level** `/{app-id}/subscriptions` **and** Page `subscribed_apps` must both include the same fields (Meta delivers only the intersection). Page: messages, messaging_postbacks, deliveries, reads, standby, feed; IG: comments, messages. Connect/sync calls `ensureMetaAppWebhookSubscriptions` so app fields are not left empty after a new Meta app cutover. | `pages_manage_metadata` (+ messaging scopes for content) | Faster inbox updates without constant polling |
| **Login with Facebook (account)** | `/login`, `/signup` — “Continue with Facebook” | Supabase Auth social sign-in for Hey Ralli account identity | Standard Facebook Login for identity (via Supabase) — **not** Page scopes | Optional alternate sign-in; **does not** connect the school Page |

### Scopes requested today (complete list)

```
pages_show_list
pages_read_engagement
pages_manage_posts
business_management
instagram_basic
instagram_content_publish
pages_messaging
pages_manage_metadata
pages_read_user_content
pages_manage_engagement
instagram_manage_messages
instagram_manage_comments
instagram_manage_engagement
read_insights
instagram_manage_insights
```

**Not requested:** `pages_user_gender`, `user_gender`, `user_age_range`, ads/Marketing API permissions, `pages_manage_ads`, scraping-related permissions.

### Consent screen ↔ scopes (what Facebook shows at Connect)

Verified against a live Login for Business access request for the Hey Ralli Meta app (`campaignstudiopush2` / production connect). Wording is Meta’s; scope names are ours. Lines like “1 Page selected” / “1 Instagram account selected” / “N Businesses selected” are **granular asset selection**, not extra permissions.

| Facebook consent wording | Scope | Product use |
|--------------------------|-------|-------------|
| Show a list of the Pages you manage | `pages_show_list` | Discover Pages to connect |
| Manage your business | `business_management` | Pages in Meta Business Suite |
| Create and manage content on your Page | `pages_manage_posts` | Publish / schedule Page posts |
| Read content posted on the Page | `pages_read_engagement` | Read Page posts & engagement for publish + insights context |
| Manage comments on your Page | `pages_manage_engagement` | Reply / react to Page comments |
| Manage and access Page conversations in Messenger | `pages_messaging` | Page Messenger inbox |
| Manage accounts, settings, and webhooks, and access content enforcement data for a Page | `pages_manage_metadata` | Webhooks + Page conversation metadata |
| Read user content on your Page | `pages_read_user_content` | Read Page comments (author + body) for inbox |
| Access your Page and App insights | `read_insights` | Organic Page Insights (no ads / no demographics) |
| Access profile and posts from the selected Instagram account | `instagram_basic` | Linked IG Professional identity |
| Upload media and create posts for the Instagram account | `instagram_content_publish` | Publish to Instagram |
| Manage comments for the selected Instagram account | `instagram_manage_comments` | Moderate IG comments |
| Manage and access messages for the Instagram account | `instagram_manage_messages` | Instagram DMs |
| Manage engagement on behalf of the selected Instagram account | `instagram_manage_engagement` | Like / engage IG comments |
| Access insights for the Instagram account | `instagram_manage_insights` | Organic IG Insights |

**Match check (July 27, 2026):** All 15 consent lines map 1:1 to the 15 scopes above. No unexpected ads or demographic permissions appeared on the access request.

---

## 4. Step-by-step reviewer walkthrough

Use a **test organization** and a **Facebook Page + linked Instagram Professional account** owned by a Meta app admin/tester (Development mode limits non-tester data). Do not put production secrets in review notes — use Meta’s tester roles and app dashboard verify token.

### Prerequisites (internal)

1. App env configured: `META_APP_ID`, `META_APP_SECRET`, redirect URI matching `/api/meta/oauth/callback`, optional `META_OAUTH_CONFIG_ID`, webhook verify token + `META_APP_SECRET` for signature checks ([env-and-secrets.md](./env-and-secrets.md)).
2. Meta app use cases / permissions set to **Ready for testing** (or Live after Advanced Access).
3. Webhook callback URL: `{production-origin}/api/meta/webhook` with verify token from env.
4. Reviewer test account: Hey Ralli login (email/password or Continue with Facebook) with `manage_integrations` on the demo org.

### Walkthrough

1. **Sign in** — Open `/login` → sign in as the test user. (Optional: Continue with Facebook for account auth only — identity only, not Page connect.)
2. **Connect Meta** — Header ⚙ **Settings** → **Integrations** → **Facebook & Instagram** → **Connect with Facebook** (or Sidebar → **Communications Hub** → **Connect with Facebook** on the empty state) → on the access request, approve the permissions in the consent table above and select the **test Page + linked Instagram** (and Business if prompted) → confirm Page and IG chips show connected on `/settings/meta`.
3. **Publish** — Sidebar → **Create with AI** (`/create-with-ai/social`) or open an existing event → Sidebar → **Approvals** (`/approvals`) → Approve with **Publish Now** or schedule → confirm post appears on the test Page / IG (or as scheduled unpublished feed post).
4. **Inbox** — Sidebar → **Communications Hub** (`/communications`; `/inbox` redirects here) → Sync if needed → open a Messenger or IG DM (from a tester) → reply with text; optionally send an org sticker or GIF on a DM thread; reply to a comment; try 👍 on a comment bubble.
5. **Insights** — Navigate directly to `/insights` (**Insights is not in the sidebar during soft launch**) → **Refresh** → confirm organic KPIs / top content (may be empty on a brand-new Page — empty states are honest). Then Sidebar → **Events** → [event] → **Insights** tab.
6. **Webhooks (optional)** — Confirm Meta app subscriptions point at `/api/meta/webhook`; send a test DM and see the thread update without full manual sync.
7. **Disconnect / reconnect** — Header ⚙ Settings → Integrations → Facebook & Instagram → **Reconnect with Facebook** (rerequest) if demonstrating missing-scope recovery; Disconnect only if the review script requires it (re-connect before finishing).

### Screencast tips

- Show **organic** publishing and inbox — no Ads Manager, no boosting UI.
- Insights copy states **no ads data** and **no audience demographics** on the page.
- Inbox: approve-then-send for AI drafts; stickers/GIFs only on DMs.

---

## 5. Demographics (Age & Gender) — definitive answer

| Question | Answer |
|----------|--------|
| Do we **request** age/gender permissions? | **No.** We do not request `pages_user_gender`, `user_gender`, or `user_age_range`. Combined OAuth does not include demographic user fields. |
| Do we **implement** Age & gender UI or Graph sync? | **No.** Org and Event Insights set `audienceAvailable: false`. No Age & gender / Top countries cards. Product status: **deferred** ([feature-list](../product/feature-list.md), [event-insights](../product/event-insights.md)). |
| Is it “requested but not granted”? | **No** — never requested. |
| Is it “available via Graph but we forgot”? | **Not for our product path.** We sync organic view/engagement metrics only (`page_media_view`, reach, reactions, etc. in `src/lib/meta/insights-metrics.ts`). We do **not** call classic demographic insight metrics. |
| Does Meta still allow classic Page age/gender insights? | **Largely no for the old metrics.** Meta has **deprecated** Page Insights breakdowns such as `page_fans_gender_age`, `page_impressions_by_age_gender_unique`, `page_views_by_age_gender_logged_in_unique`, and related city/country breakdowns (invalid metric errors on Graph). See [Deprecated Page Insights metrics](https://developers.facebook.com/docs/platforminsights/page/deprecated-metrics/). |
| What would be needed later? | Product decision + any **currently supported** demographic APIs (if Meta reintroduces or documents an allowed path for Pages/IG), App Review justification, UI that is honest about coverage, and privacy review. **Not planned for this App Review.** |

**One-line for reviewers:** Hey Ralli uses `read_insights` / `instagram_manage_insights` for **organic performance** (views, reach, interactions). We do **not** collect or display audience age or gender demographics.

---

## 6. What we do NOT do

- Meta **Ads** / boosting / Marketing API campaigns
- Scrape public Facebook/Instagram data unrelated to the connected Page
- Sell or broker Meta user or Page data
- Spam or mass-broadcast DMs (inbox is organic conversations people start with the Page / IG)
- Provide fake “demographic theater” UI
- Use Meta Login solely to harvest friends lists
- Post to personal profiles (Page + linked IG Professional only)

---

## 7. Privacy / data handling pointers

| Topic | Where |
|-------|--------|
| Public Privacy Policy | `/privacy` |
| Meta User Data Deletion instructions | `/privacy#user-data-deletion` (Instructions URL for App Dashboard; no deletion callback in Phase 1) |
| Terms | `/terms` |
| Internal privacy notes | [privacy-and-data.md](../security/privacy-and-data.md) |
| OAuth tokens at rest | Encrypted (AES-256-GCM); see [env-and-secrets.md](./env-and-secrets.md) |
| Multi-tenant isolation | [multi-tenant-isolation.md](../security/multi-tenant-isolation.md) |
| Meta data used | Page/IG ids, tokens, published post ids, inbox thread/message content for the connected Page, organic insight aggregates stored per org |

Inbox and publishing data stay in the **organization** that connected Meta. Disconnect removes the active connection path for Graph calls (token row management in Settings → Meta).

---

## 8. Deferred Meta-adjacent items (explicit)

Do not demo these as shipped:

| Item | Status |
|------|--------|
| Audience demographics (Age & gender, Top countries) | **Deferred** |
| Organic vs ads / follower split, page visits, follows, messaging conversation analytics in Insights | **Deferred** |
| LLM Insights narrative / year-end board report | **Deferred** |
| Insights-weighted calendar heatmap | **Deferred** |
| Gmail inbox in Communications Hub | **Deferred** |
| Communications Hub full Ease chrome | **In progress** — Connect Meta empty (why cards) **shipped** at `/communications`; full inbox Ease redesign still mockup / GO-gated |

---

## 9. Code & docs map (internal)

| Area | Path |
|------|------|
| OAuth scopes | `src/lib/meta-publishing/oauth-scopes.ts` |
| OAuth start/callback | `src/app/api/meta/oauth/start`, `.../callback` |
| Webhook | `src/app/api/meta/webhook` |
| Insights sync / metrics | `src/lib/meta/insights-sync.ts`, `insights-metrics.ts` |
| Inbox sync / stickers | `src/lib/inbox/` |
| Integration living doc | [integrations/meta.md](../integrations/meta.md) |

---

## 10. App Review submission checklist

Living matrix for Meta App Review packet fields. **15 scopes** from `META_COMBINED_OAUTH_SCOPE_LIST` (`src/lib/meta-publishing/oauth-scopes.ts`) — all requested in **one** Connect OAuth (`/api/meta/oauth/start`).

**Legend:** ✅ = filled from code/docs · 🔲 = **NEEDS YOU** (founder-only)

### 10.1 Shared reviewer assets (one block for the whole submission)

| Field | Value | Status |
|-------|-------|--------|
| **Hey Ralli reviewer login (email)** | `local.developer@heyralli.dev` | ✅ |
| **Hey Ralli reviewer login (password)** | `.env.local` → `HEY_RALLI_TEST_PASSWORD` (not committed) | ✅ |
| **Org / role** | Test org with `manage_integrations` on the connecting user | ✅ |
| **Meta app mode** | Development — reviewer must be Meta app **Tester** or **Admin** on the Hey Ralli Meta app | ✅ |
| **Test Facebook Page name** | `[FOUNDER: Page name shown in asset picker]` | 🔲 |
| **Test Facebook Page ID** | `[FOUNDER: numeric Page ID]` | 🔲 |
| **Linked Instagram Professional account** | `[FOUNDER: @handle linked to test Page]` | 🔲 |
| **Test Business (if prompted)** | `[FOUNDER: Business name owning the test Page]` | 🔲 |
| **Production app URL** | https://heyralli.com | ✅ |
| **OAuth redirect** | `{origin}/api/meta/oauth/callback` | ✅ |
| **Webhook callback** | `{origin}/api/meta/webhook` | ✅ |
| **Privacy policy** | https://heyralli.com/privacy | ✅ |
| **Screenshot pack** | [`meta-app-review-assets/`](./meta-app-review-assets/) — [capture log + shot list](./meta-app-review-assets/SCREENCAST-TIMESTAMPS.md) (8/12 PNGs, Jul 29 2026) | ✅ partial |
| **Screencast file** | `[FOUNDER: upload URL or filename]` | 🔲 |
| **Screencast total length** | `[FOUNDER: mm:ss — see SCREENCAST-TIMESTAMPS.md ~6–8 min script]` | 🔲 |

### 10.2 Completion summary

| Category | Rows | Code/docs complete | Founder still needed |
|----------|------|--------------------|----------------------|
| Connect & Page identity (6 scopes) | 6 | Why, feature, UI path, denial, expected result | Video timestamps; partial screenshots (`04`, `05`; 🔲 consent + live Page) |
| Inbox & engagement (7 scopes) | 7 | Same | Video timestamps; partial (`07` hub only; 🔲 threads, webhook) |
| Insights (2 scopes) | 2 | Same | Video timestamps; screenshots `10`, `11` captured |
| **Total permissions** | **15** | **15 / 15** narrative fields | **8 / 12** checklist PNGs; **15 / 15** video timestamps; test Page credentials |

### 10.3 Permission matrix

**Connect entry points (all scopes):** Header ⚙ **Settings** → **Integrations** → **Facebook & Instagram** → **Connect with Facebook** (`/settings/integrations` → `/settings/meta`); or Sidebar → **Communications Hub** → **Connect with Facebook** (`/communications`); or `/insights?view=connect`; or first-time `/onboarding/connect`. Requires `manage_integrations`.

#### A — Connect, publishing & Page identity

| Permission | Why Hey Ralli needs it | Exact feature | Exact UI path | If permission not granted | Video timestamp | Screenshots | Expected result | Status |
|------------|------------------------|---------------|---------------|---------------------------|-----------------|-------------|-----------------|--------|
| `pages_show_list` | Discover Facebook Pages the volunteer admins so they can pick the school Page during Connect | Page list in Login for Business / OAuth asset picker | Settings → Integrations → Facebook & Instagram → **Connect with Facebook** | OAuth fails or `no_pages` error — “couldn’t find a Page to connect” on return to `/settings/meta` | `[FOUNDER: e.g. 0:45–1:10 consent + Page picker]` | [`04-meta-connected.png`](./meta-app-review-assets/04-meta-connected.png) (Page chip) · 🔲 [`03-meta-consent`](./meta-app-review-assets/03-meta-consent.SKIPPED.txt) | Reviewer selects test Page; `/settings/meta` shows connected Page name chip | ✅ · partial media |
| `business_management` | Pages tied to Meta Business Suite require Business asset access during Connect | Business asset picker in Login for Business (when Meta prompts) | Same Connect flow as above | Connect may fail for Business-managed Pages without this scope | `[FOUNDER: Business picker if shown]` | 🔲 [`03-meta-consent`](./meta-app-review-assets/03-meta-consent.SKIPPED.txt) (Business line on consent) | Reviewer selects owning Business when prompted; connect completes | ✅ · 🔲 |
| `instagram_basic` | Read linked Instagram Professional account identity for publish + inbox + insights | IG account chip on Settings; IG channel labels in Communications Hub and Insights | Settings → Integrations → Facebook & Instagram (connected state); Sidebar → Communications Hub | Instagram publishing, DMs, and IG insights surfaces show unavailable / IG chip missing | `[FOUNDER: linked IG on settings + inbox]` | [`04-meta-connected.png`](./meta-app-review-assets/04-meta-connected.png) | Connected state shows **Linked Instagram** chip | ✅ · partial media |
| `pages_manage_posts` | Create and schedule organic Page feed posts on volunteer approval | **Publish Now** / **Schedule** from Approvals; native Graph schedule on Calendar DnD | Sidebar → **Approvals** (`/approvals`); Events → [event] → **Approvals** tab; Sidebar → **Calendar** | Posts stay in Hey Ralli queue only — warning: “Meta is not connected — posts stay on the CampignOS schedule queue”; no live Page post | `[FOUNDER: Approve → Publish Now → Page post]` | [`05-approvals-publish.png`](./meta-app-review-assets/05-approvals-publish.png) · 🔲 [`06-page-post-live`](./meta-app-review-assets/06-page-post-live.SKIPPED.txt) | Approved item publishes to test Page feed (or scheduled unpublished post in Page admin) | ✅ · partial media |
| `pages_read_engagement` | Read Page post content and engagement context for publish validation and Insights post carousel | Insights top-content discovery; publish/schedule context | Direct URL `/insights` → **Refresh**; Sidebar → **Approvals** | Partial Insights/post discovery; publish may lack engagement context | `[FOUNDER: Insights top content or post list]` | [`10-insights-org.png`](./meta-app-review-assets/10-insights-org.png) | Org Insights shows Page posts in top content / sync (or honest empty on new Page) | ✅ · partial media |
| `instagram_content_publish` | Publish organic content to linked Instagram Professional account | Instagram leg of **Publish Now** / **Schedule** / publish-when-due cron | Sidebar → **Approvals**; Events → [event] → **Approvals** tab | Instagram slot stays queued in Hey Ralli; no IG media published | `[FOUNDER: IG publish on approve]` | 🔲 IG post on test account ([`06-page-post-live`](./meta-app-review-assets/06-page-post-live.SKIPPED.txt) pattern) | Approved Instagram slot appears on linked IG account | ✅ · 🔲 |

#### B — Communications Hub / Inbox

| Permission | Why Hey Ralli needs it | Exact feature | Exact UI path | If permission not granted | Video timestamp | Screenshots | Expected result | Status |
|------------|------------------------|---------------|---------------|---------------------------|-----------------|-------------|-----------------|--------|
| `pages_messaging` | Read and reply to organic Facebook Page Messenger conversations | Messenger threads in unified inbox | Sidebar → **Communications Hub** (`/communications`) → Messenger thread → reply composer | Messenger channel missing from sync; reply sends fail with reconnect guidance | `[FOUNDER: open Messenger thread + reply]` | [`07-communications-hub.png`](./meta-app-review-assets/07-communications-hub.png) · 🔲 [`08-inbox-reply`](./meta-app-review-assets/08-inbox-reply.SKIPPED.txt) | Tester DM to Page appears in hub; reply delivers in Messenger | ✅ · partial media |
| `pages_manage_metadata` | Subscribe Page webhooks and read conversation metadata for near-real-time inbox | Webhook-driven inbox updates; conversation metadata | Sidebar → Communications Hub; (backend) `POST /api/meta/webhook` | Slower inbox updates (polling/manual Sync only); webhook subscription incomplete | `[FOUNDER: optional — DM arrives without manual sync]` | 🔲 [`12-webhook-config`](./meta-app-review-assets/12-webhook-config.SKIPPED.txt) | New Messenger message updates thread without full manual sync | ✅ · 🔲 |
| `pages_read_user_content` | Read Facebook post comments (author + body) for inbox sync | Page comment threads in Communications Hub | Sidebar → Communications Hub → **Comments** filter / comment thread | FB comment sync skipped — error: “Missing token scopes… Some inbox channels may be unavailable until scopes are granted on reconnect.” | `[FOUNDER: Page comment in hub]` | 🔲 [`09-comment-engagement`](./meta-app-review-assets/09-comment-engagement.SKIPPED.txt) | Comment on test Page post appears in hub with author + text | ✅ · 🔲 |
| `pages_manage_engagement` | Reply to and like Facebook Page comments | Comment reply composer; 👍/❤️ on comment bubbles | Sidebar → Communications Hub → comment thread | Comment replies blocked; Settings shows reconnect hint: “Comment replies need one more Facebook approval…” | `[FOUNDER: comment reply + like]` | 🔲 [`09-comment-engagement`](./meta-app-review-assets/09-comment-engagement.SKIPPED.txt) | Reply visible on Page comment; like toggles on Graph | ✅ · 🔲 |
| `instagram_manage_messages` | Read and reply to Instagram DMs for the linked Professional account | Instagram DM threads in Communications Hub | Sidebar → Communications Hub → IG DM thread | IG DM channel unavailable — missing-scope sync error for Instagram DMs | `[FOUNDER: IG DM thread + reply]` | 🔲 [`08-inbox-reply`](./meta-app-review-assets/08-inbox-reply.SKIPPED.txt) | Tester IG DM appears; reply delivers in Instagram | ✅ · 🔲 |
| `instagram_manage_comments` | Sync and moderate Instagram comments | IG comment threads in Communications Hub | Sidebar → Communications Hub → IG comment thread | Instagram comment sync skipped with missing-scope error | `[FOUNDER: IG comment reply]` | 🔲 [`09-comment-engagement`](./meta-app-review-assets/09-comment-engagement.SKIPPED.txt) | Comment on test IG media appears; reply succeeds | ✅ · 🔲 |
| `instagram_manage_engagement` | Like Instagram comments (👍/❤️ maps to Like API) | Reaction bubbles on IG comment threads | Sidebar → Communications Hub → IG comment → 👍 | Like action fails / button unavailable until reconnect with scope | `[FOUNDER: like IG comment]` | 🔲 [`09-comment-engagement`](./meta-app-review-assets/09-comment-engagement.SKIPPED.txt) | Like registered on Instagram comment | ✅ · 🔲 |

#### C — Organic Insights (no ads / no demographics)

| Permission | Why Hey Ralli needs it | Exact feature | Exact UI path | If permission not granted | Video timestamp | Screenshots | Expected result | Status |
|------------|------------------------|---------------|---------------|---------------------------|-----------------|-------------|-----------------|--------|
| `read_insights` | Sync organic Facebook Page Insights (views, reach, interactions) | Org Insights KPI cards, content overview, CSV export | Direct URL `/insights` (Org view — **not in sidebar** during soft launch) → **Refresh** | Warning: “Reconnect Facebook to finish Page Insights setup.”; KPIs empty / sync blocked | `[FOUNDER: /insights KPI refresh]` | [`10-insights-org.png`](./meta-app-review-assets/10-insights-org.png) | Page KPIs populate after Refresh (or honest empty state on new Page) | ✅ · partial media |
| `instagram_manage_insights` | Sync organic Instagram account + media insights | IG series on Org Insights; Event Insights IG KPIs | `/insights`; Events → [event] → **Insights** tab (`/events/[id]?tab=insights`) | Warning: “Reconnect Facebook to finish Instagram Insights setup.”; IG metrics missing | `[FOUNDER: event Insights tab]` | [`11-insights-event.png`](./meta-app-review-assets/11-insights-event.png) | IG metrics appear alongside Page metrics for linked account | ✅ · partial media |

### 10.4 Use-case → scope crosswalk

| Use case (§3) | Scopes involved |
|---------------|-----------------|
| Connect Facebook Page + Instagram | All 15 (single consent) |
| Publish & schedule | `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`, `instagram_basic` |
| Approvals → Meta | Same publish scopes |
| Communications Hub / Inbox | All inbox scopes in §10.3 B + `pages_manage_metadata` |
| Inbox reactions | `pages_manage_engagement`, `instagram_manage_engagement`, `pages_messaging`, `instagram_manage_messages` |
| Stickers + GIFs in DMs | Messaging scopes only (stickers/GIFs = DM image attachments; GIPHY is non-Meta) |
| Organic Insights (org) | `read_insights`, `instagram_manage_insights`, `pages_read_engagement` |
| Event Insights | Same insights scopes |
| Webhooks | `pages_manage_metadata` (+ messaging scopes for payload content) |
| Login with Facebook (account) | **None of the 15 Page scopes** — Supabase identity at `/login`, `/signup` only |

### 10.5 Screencast shot list (single video covering all permissions)

Record **one continuous organic demo** (no Ads Manager). Suggested chapter markers — replace timestamps after editing:

| # | Scene | Proves scopes | Suggested marker |
|---|-------|---------------|------------------|
| 1 | `/login` → sign in as reviewer test user | — | `[FOUNDER: 0:00]` |
| 2 | Settings → Integrations → Facebook & Instagram → **Connect with Facebook** → full consent screen → select test Page + Business + IG | All 15 at consent | `[FOUNDER: ]` |
| 3 | Connected state on `/settings/meta` (Page + Linked Instagram chips) | `pages_show_list`, `business_management`, `instagram_basic` | `[FOUNDER: ]` |
| 4 | Sidebar → Approvals → approve → **Publish Now** → show live Page post | `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish` | `[FOUNDER: ]` |
| 5 | Sidebar → Communications Hub → Messenger reply | `pages_messaging`, `pages_manage_metadata` | `[FOUNDER: ]` |
| 6 | Comment reply + 👍 on Page comment; IG DM reply + sticker/GIF | `pages_read_user_content`, `pages_manage_engagement`, `instagram_manage_messages`, `instagram_manage_comments`, `instagram_manage_engagement` | `[FOUNDER: ]` |
| 7 | Navigate to `/insights` → Refresh → KPIs / top content (state “no ads / no demographics”) | `read_insights`, `instagram_manage_insights` | `[FOUNDER: ]` |
| 8 | Events → [event] → Insights tab | Event-scoped insights | `[FOUNDER: ]` |
| 9 | (Optional) inbound DM updates thread without manual sync | Webhooks / `pages_manage_metadata` | `[FOUNDER: ]` |

### 10.6 Screenshot checklist

Minimum set for Meta portal uploads (capture after Connect with test Page). **Pack:** [`meta-app-review-assets/`](./meta-app-review-assets/) — automated via `node scripts/capture-meta-app-review.mjs` (Jul 29, 2026: 8/12 captured; see [SCREENCAST-TIMESTAMPS.md](./meta-app-review-assets/SCREENCAST-TIMESTAMPS.md)).

| # | Filename suggestion | Capture | Status |
|---|---------------------|---------|--------|
| 0 | `00-login-page.png` | Login page (bonus) | ✅ |
| 1 | `01-login.png` | `/login` signed-in dashboard | ✅ |
| 2 | `02-settings-integrations.png` | Settings → Integrations with Facebook & Instagram row | ✅ |
| 3 | `03-meta-consent.png` | Facebook Login for Business consent (all permission lines visible) | 🔲 [skipped](./meta-app-review-assets/03-meta-consent.SKIPPED.txt) — org already connected |
| 4 | `04-meta-connected.png` | `/settings/meta` connected chips (Page + Linked Instagram) | ✅ |
| 5 | `05-approvals-publish.png` | Approvals queue with Publish Now / scheduled item | ✅ |
| 6 | `06-page-post-live.png` | Published post on test Facebook Page (browser) | 🔲 [skipped](./meta-app-review-assets/06-page-post-live.SKIPPED.txt) |
| 7 | `07-communications-hub.png` | Communications Hub thread list | ✅ |
| 8 | `08-inbox-reply.png` | Reply sent in Messenger or IG DM thread | 🔲 [skipped](./meta-app-review-assets/08-inbox-reply.SKIPPED.txt) |
| 9 | `09-comment-engagement.png` | Page or IG comment with reply / like | 🔲 [skipped](./meta-app-review-assets/09-comment-engagement.SKIPPED.txt) |
| 10 | `10-insights-org.png` | `/insights` Org KPI view (note: not in sidebar — use direct URL) | ✅ |
| 11 | `11-insights-event.png` | Event → Insights tab | ✅ |
| 12 | `12-webhook-config.png` | Meta Developer App → Webhooks → `/api/meta/webhook` (optional) | 🔲 [skipped](./meta-app-review-assets/12-webhook-config.SKIPPED.txt) |

### 10.7 Denial / partial-grant behavior (global)

| Situation | User-visible behavior |
|-----------|----------------------|
| Meta not connected at all | Communications Hub shows **Connect Meta** empty; Settings shows **Not connected**; publish queue warns posts stay internal |
| Connected but token invalid | **Reconnect needed** pill on `/settings/meta`; inbox banner points to Settings → Meta |
| Missing inbox scope(s) | Affected channels skip sync — “Missing token scopes… Some inbox channels may be unavailable until scopes are granted on reconnect.” |
| Missing `pages_manage_engagement` only | Publishing + DMs still work; comment reply hint suggests reconnect |
| Missing insights scope(s) | Insights shows reconnect banner — “Reconnect Facebook to finish Page/Instagram Insights setup.” |
| User lacks `manage_integrations` | Connect buttons hidden / OAuth start returns forbidden |

---

**Back:** [Ops index](./README.md) · [Documentation home](../README.md)
