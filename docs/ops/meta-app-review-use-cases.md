# Meta App Review — Hey Ralli use cases

**Status:** Living  
**Owner:** Product / Engineering  
**Last updated:** July 29, 2026 — Instagram DM tester / Accounts Center note for inbox walkthrough  
**Related:** [Meta connection](../integrations/meta.md) · [Feature list](../product/feature-list.md) · [Event Insights](../product/event-insights.md) · [Privacy & data](../security/privacy-and-data.md) · [Env & secrets](./env-and-secrets.md) · Insights mockup [`/insights-ease-mockup.html`](../../public/insights-ease-mockup.html) · Communications Hub mockup [`/communications-hub-ease-mockup.html`](../../public/communications-hub-ease-mockup.html)

Living brief for **Meta App Review** (Facebook + Instagram) and internal prep. Honest to shipped product only — deferred items are marked **deferred**, not described as live.

Production: [heyralli.com](https://heyralli.com)

---

## 1. App overview

**Hey Ralli** is a school / PTA (PTO) communications workspace. Volunteer boards plan events, create social artwork and captions, approve posts, publish to the school’s **Facebook Page** and linked **Instagram Professional** account, reply to organic Page / Instagram messages and comments, and review organic performance metrics.

Meta is an **opt-in org integration** (Settings → Facebook & Instagram). One Connect flow powers publishing, inbox, and insights for that organization. Hey Ralli is **not** an ads manager, scraper, or data broker.

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
| **Connect Facebook Page + Instagram** | `/settings/meta`, `/settings/integrations`, `/insights?view=connect`, `/communications` (and `/inbox` → redirect) Connect CTAs, `/onboarding/connect` | One OAuth: volunteer with `manage_integrations` connects the school Page and linked IG Professional account. Login for Business may show **Business / Page / Instagram asset pickers** — reviewers should select the **test Page + linked IG** (and any Business that owns them) | `pages_show_list`, `business_management`, `instagram_basic` (+ all scopes below in one consent) | Single org connection for publish, inbox, insights |
| **Publish & schedule to Facebook + Instagram** | `/approvals`, `/events/[id]` (Approvals / Review & Publish), `/create-with-ai/social`, `/publishing` (redirects to Approvals), Calendar Meta chips | Approved artwork + captions → Facebook Page feed (native Graph schedule when in window) and/or Instagram; stories often publish-when-due or manual kit email | `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`, `instagram_basic` | School posts go out on time without leaving Hey Ralli |
| **Approvals → Meta** | `/approvals`, event Approvals tab | Approve / request changes; **Publish Now** or schedule posts Meta on approval | Same publish scopes | Volunteer governance before anything hits Meta |
| **Communications Hub / Inbox** | `/communications` (nav: Communications Hub; `/inbox` redirects here); Connect Meta Ease empty when not connected; settings affordances on Meta connection | Sync & reply to Facebook Page Messenger, Instagram DMs, Page/IG comments & tags; AI draft assist with **approve-then-send** | `pages_messaging`, `pages_manage_metadata`, `pages_read_user_content`, `pages_manage_engagement`, `instagram_manage_messages`, `instagram_manage_comments`, `instagram_manage_engagement` | One place for organic parent questions (no broadcast spam) |
| **Inbox reactions & engagement** | `/communications` (bubble 👍 / ❤️) | Comment likes via Graph; DM react/unreact via Messenger/IG APIs when supported | `pages_manage_engagement`, `instagram_manage_engagement`, `pages_messaging`, `instagram_manage_messages` | Quick acknowledgment of parent comments/messages |
| **Org stickers + GIFs in DMs** | `/communications` reply toolbar | Upload org image stickers (`organization_stickers`); send as Meta image attachments on Messenger / IG DMs only; GIPHY via server proxy (not a Meta permission) | Same messaging scopes; stickers use Meta DM image attachment path | Friendly PTA replies with school branding |
| **Organic Insights (org)** | `/insights` (Org Insights view) | Sync Page / IG account + post metrics; KPIs (Views, Reach, Interactions, Likes, Comments), content overview, top content carousel, CSV export, rule-based tips | `read_insights`, `instagram_manage_insights` (+ `pages_read_engagement`) | Boards see what organic posts performed — **no ads data** |
| **Event Insights** | `/events/[id]?tab=insights`, `/insights?view=event` | Same connection; KPIs + posts linked to that event’s published slots | Same insights scopes | Event chairs see performance for one fundraiser/spirit week |
| **Webhooks (near-real-time inbox)** | Callback `POST/GET /api/meta/webhook`; subscribe via inbox/Meta connection tooling | Page fields: messages, messaging_postbacks, deliveries, reads, standby, feed; IG: comments, messages | `pages_manage_metadata` (+ messaging scopes for content) | Faster inbox updates without constant polling |
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

1. **Sign in** — Open `/login` → sign in as the test user. (Optional: Continue with Facebook for account auth only.)
2. **Connect Meta** — Go to `/settings/meta` or `/communications` (Connect Meta empty) → **Connect with Facebook** → on the access request, approve the permissions in the consent table above and select the **test Page + linked Instagram** (and Business if prompted) → confirm Page and IG chips show connected.
3. **Publish** — Create or open a campaign with approved artwork (`/create-with-ai/social` or existing event) → `/approvals` → Approve with Publish Now or schedule → confirm post appears on the test Page / IG (or as scheduled unpublished feed post).
4. **Inbox** — Open `/communications` (or `/inbox`, redirects here) → Sync if needed → open a Messenger or IG DM (**from an Instagram account linked to a Meta app Admin/Developer/Tester via Accounts Center** — personal IGs without a role will not webhook under Development/Standard Access) → reply with text; optionally send an org sticker or GIF on a DM thread; reply to a comment; try 👍 on a comment bubble.
5. **Insights** — Open `/insights` → Refresh → confirm organic KPIs / top content (may be empty on a brand-new Page — empty states are honest). Open an event with published slots → `?tab=insights`.
6. **Webhooks (optional)** — Confirm Meta app subscriptions point at `/api/meta/webhook`; send a test DM and see the thread update without full manual sync.
7. **Disconnect / reconnect** — On `/settings/meta`, Reconnect (rerequest) if demonstrating missing-scope recovery; Disconnect only if the review script requires it (re-connect before finishing).

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

**Back:** [Ops index](./README.md) · [Documentation home](../README.md)
