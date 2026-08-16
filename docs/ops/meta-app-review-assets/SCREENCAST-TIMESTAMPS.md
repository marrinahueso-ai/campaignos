# Meta App Review — demo & capture list (fresh start)

**Last updated:** August 15, 2026  
**Status:** List only — nothing re-captured yet under this plan  
**Do not submit App Review until this pack is finished and product demo looks correct on Production.**

---

## Packet (what this list covers)

| In this Review | Out of this Review |
|----------------|--------------------|
| Connect (Page + linked IG) | Mentions (@ in captions/comments) |
| Publish Now / schedule to Page + IG | Tag-people as a Review chapter (product Tags exist; don’t demo for Review) |
| Facebook Messenger inbox + reply | Ads, boosting, demographics, Reels-only |
| Facebook Page comments + reply / 👍 | |
| **Instagram DMs (messages) + reply** | |
| **Instagram comments + reply / 👍** | |
| Org Insights + Event Insights | |
| Webhooks (callback proof) | |

**Product:** https://heyralli.com  
**Meta app:** Hey Ralli Connect (App Admin = husband; Marrina stays off Developers)  
**Demo Page:** Hey Ralli (`1252891557897483`) · **IG:** `@heyralli_`  
**Demo org:** Edmondson Elementary (or current Production test org with Meta connected)

**Archive:** Jul 29 PNGs under `meta-app-review-assets/` are **stale**. Treat every shot below as **not done** until re-captured against current UI + Hey Ralli Connect.

---

## A. Prerequisites (before any screenshot)

| # | Item | Who | Status |
|---|------|-----|--------|
| P1 | Production deploy includes Hub/webhook/insights fixes you care about for Review footage | Eng | Not done |
| P2 | Meta dashboard: privacy, terms, deletion **instructions** URL, OAuth redirect, webhook URL + verify token match Vercel | Husband | Not done |
| P3 | App Testers: husband + second personal Facebook with IG linked in Accounts Center (not Marrina as Admin) | Husband | Not done |
| P4 | Hey Ralli Connect connected on demo org → `/settings/meta` shows Page + Linked Instagram | You | Not done |
| P5 | IG **Allow access to messages** ON for `@heyralli_` + Insights scopes granted (Reconnect if `/insights` asks) | You | Not done |

---

## B. Seed data (before screenshots / screencast)

| # | Seed | How | Status |
|---|------|-----|--------|
| S1 | Live Page post | Approvals → **Publish Now** → confirm on facebook.com → Page Hey Ralli | Not done |
| S2 | Live IG post | Same approve → confirm on Instagram `@heyralli_` | Not done |
| S3 | Facebook Messenger thread | Second tester DMs the Page | Not done |
| S4 | Facebook Page comment | Same tester comments on the live Page post | Not done |
| S5 | Instagram DM thread | Tester IG (Accounts Center–linked) DMs `@heyralli_` | Not done |
| S6 | Instagram comment | Tester comments on the live IG post | Not done |
| S7 | Hub FB Messenger reply | `/communications` → Facebook Message → send short reply | Not done |
| S8 | Hub FB comment reply / 👍 | Hub → Facebook comment → reply and/or 👍 | Not done |
| S9 | Hub IG DM reply | Hub → Instagram Message → send reply | Not done |
| S10 | Hub IG comment reply / 👍 | Hub → Instagram comment → reply and/or 👍 | Not done |
| S11 | Org + Event Insights | `/insights` → **Refresh**; Events → [event] → Insights (optional) | Not done |

**Do not seed for this packet:** Mentions, Tag-people Review demos.

---

## C. Screenshot checklist (re-capture all)

Save into `docs/ops/meta-app-review-assets/` with these filenames.

| # | Filename | What to show | Who | Status |
|---|----------|--------------|-----|--------|
| 01 | `01-login.png` | Signed in on heyralli.com (email/password seat) | You | Not done |
| 02 | `02-settings-integrations.png` | Settings → Integrations → Facebook & Instagram row | You | Not done |
| 03 | `03-meta-consent.png` | Connect/Reconnect consent — **all** permission lines visible | You (husband’s FB) | Not done |
| 04 | `04-meta-connected.png` | `/settings/meta` — Page **Hey Ralli** + Linked Instagram chips | You | Not done |
| 05 | `05-approvals-publish.png` | Approvals with Publish Now / approved Meta row | You | Not done |
| 06 | `06-page-post-live.png` | Published post on facebook.com Page Hey Ralli | You | Not done |
| 07 | `07-ig-post-live.png` | Same content live on Instagram `@heyralli_` | You | Not done |
| 08 | `08-communications-hub.png` | Hub queue with FB + IG threads | You | Not done |
| 09 | `09-messenger-reply.png` | Facebook Messenger thread with **sent** reply | You | Not done |
| 10 | `10-fb-comment-engagement.png` | Facebook comment reply and/or 👍 | You | Not done |
| 11 | `11-ig-dm-reply.png` | Instagram Message thread with **sent** reply | You | Not done |
| 12 | `12-ig-comment-engagement.png` | Instagram comment reply and/or 👍 | You | Not done |
| 13 | `13-insights-org.png` | `/insights` KPIs / top content | You | Not done |
| 14 | `14-insights-event.png` | Event → Insights tab | You | Not done |
| 15 | `15-webhook-config.png` | Developers → Webhooks → `https://heyralli.com/api/meta/webhook` | Husband | Not done |
| 16 | `16-privacy-deletion.png` | https://heyralli.com/privacy#user-data-deletion | You | Not done |

Optional bonus: `00-login-page.png` (logged-out login screen).

---

## D. Screencast checklist (one continuous video)

Target **~8–10 minutes**, 1080p MP4. Organic only.

| Beat | Scene | Proves | Status |
|------|-------|--------|--------|
| 1 | `/login` → email/password (not Facebook for the product seat) | Reviewer entry | Not done |
| 2 | Settings → Integrations → Connect/Reconnect → consent → Page + IG | Connect scopes | Not done |
| 3 | `/settings/meta` chips | Page + linked IG | Not done |
| 4 | Approvals → **Publish Now** → live Page + IG | Publish scopes | Not done |
| 5 | Communications Hub → Facebook Messenger reply | `pages_messaging` | Not done |
| 6 | Hub → Facebook comment reply + 👍 | `pages_read_user_content`, `pages_manage_engagement` | Not done |
| 7 | Hub → Instagram Message reply | `instagram_manage_messages` | Not done |
| 8 | Hub → Instagram comment reply + 👍 | `instagram_manage_comments`, `instagram_manage_engagement` | Not done |
| 9 | `/insights` → Refresh → say “organic only, no ads, no demographics” | `read_insights` | Not done |
| 10 | Event → Insights (optional) | `instagram_manage_insights` | Not done |
| 11 | Optional: inbound FB or IG message without Sync | Webhooks | Not done |
| 12 | End on `/privacy` — say Mentions are **not** in this review | Compliance | Not done |

---

## E. Scopes to Request (match the demo)

**Request (full inbox + publish + insights):**

- `pages_show_list`
- `business_management`
- `instagram_basic`
- `pages_manage_posts`
- `pages_read_engagement`
- `instagram_content_publish`
- `pages_messaging`
- `pages_manage_metadata`
- `pages_read_user_content`
- `pages_manage_engagement`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `instagram_manage_engagement`
- `read_insights`
- `instagram_manage_insights`

**Hold this pass:** Mentions product demo / Tag-people Review chapter (not separate Mentions scopes).

---

## F. After the pack

| # | Item | Status |
|---|------|--------|
| F1 | Fill screencast URL + chapter timestamps in `meta-app-review-use-cases.md` §10 | Not done |
| F2 | Paste reviewer test login + Page/IG/Business names in submission notes (not in git) | Not done |
| F3 | Husband: Request permission for demonstrated scopes only (includes IG messaging + comments) | Not done |

---

## Automation note

`node scripts/capture-meta-app-review.mjs --base-url https://heyralli.com` can refresh **in-app** shots after seeding. It will **not** replace consent, facebook.com, Instagram, or Developers webhook shots. Update script filenames when you next run automation so they match §C.
