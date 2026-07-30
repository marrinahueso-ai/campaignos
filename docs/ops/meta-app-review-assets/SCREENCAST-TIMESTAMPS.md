# Meta App Review — screencast shot list & capture log

**Captured:** July 29, 2026  
**Environment:** https://heyralli.com (production)  
**Test seat:** `local.developer@heyralli.dev` (`HEY_RALLI_TEST_*` in `.env.local`)  
**Automation:** `node scripts/capture-meta-app-review.mjs --base-url https://heyralli.com`

---

## Capture summary

| # | File | Status | Notes |
|---|------|--------|-------|
| 0 | `00-login-page.png` | ✅ Captured | Login page before sign-in (bonus) |
| 1 | `01-login.png` | ✅ Captured | Signed-in dashboard after login |
| 2 | `02-settings-integrations.png` | ✅ Captured | Settings → Integrations, Facebook & Instagram row |
| 3 | `03-meta-consent.png` | ⊘ Skipped | Meta already connected on test org — consent only on fresh Connect. Founder: Disconnect (or use fresh org) → Connect → capture full permission list |
| 4 | `04-meta-connected.png` | ✅ Captured | `/settings/meta` — Page + Linked Instagram chips |
| 5 | `05-approvals-publish.png` | ✅ Captured | Approvals queue at `/approvals` |
| 6 | `06-page-post-live.png` | ⊘ Skipped | Requires Facebook.com as Meta app tester — screenshot published post on test Page |
| 7 | `07-communications-hub.png` | ✅ Captured | Communications Hub thread list / empty state |
| 8 | `08-inbox-reply.png` | ⊘ Skipped | No visible threads — seed tester Messenger or IG DM, open thread, show reply composer (do not need to send) |
| 9 | `09-comment-engagement.png` | ⊘ Skipped | No comment threads — comment on test Page/IG post, open in hub, show reply or 👍 |
| 10 | `10-insights-org.png` | ✅ Captured | Org Insights at `/insights` |
| 11 | `11-insights-event.png` | ✅ Captured | Event → Insights tab |
| 12 | `12-webhook-config.png` | ⊘ Skipped | Meta Developer App → Webhooks → callback `https://heyralli.com/api/meta/webhook` |

**Score:** 8 PNGs captured (+1 bonus login page), 5 founder-only skips.

Re-run capture after seeding inbox data or reconnecting Meta:

```bash
node scripts/capture-meta-app-review.mjs --base-url https://heyralli.com
```

---

## Suggested screencast (~6–8 minutes)

Record **one continuous organic demo** (no Ads Manager). Replace bracketed timestamps after editing.

| Marker | Scene | Duration (est.) | Proves |
|--------|-------|-----------------|--------|
| **0:00** | Open https://heyralli.com/login → sign in as reviewer test user | 0:30 | Account access |
| **0:30** | Land on dashboard — briefly show org context | 0:20 | Signed-in workspace |
| **0:50** | Header ⚙ Settings → Integrations → Facebook & Instagram | 0:25 | Connect entry |
| **1:15** | **Connect with Facebook** → full Meta consent (all 15 permission lines) → select test Business, Page, linked IG | 1:30 | All scopes at consent |
| **2:45** | `/settings/meta` — connected Page name + Linked Instagram chip | 0:35 | `pages_show_list`, `business_management`, `instagram_basic` |
| **3:20** | Sidebar → Approvals → row with **Publish Now** or scheduled slot → approve/publish | 1:00 | `pages_manage_posts`, `instagram_content_publish` |
| **4:20** | Cut to test Facebook Page — show live (or scheduled) post | 0:30 | Published content proof |
| **4:50** | Sidebar → Communications Hub → open Messenger thread → type reply (approve-then-send if AI draft) | 0:55 | `pages_messaging`, `pages_manage_metadata` |
| **5:45** | Same hub — Page comment reply + 👍; optional IG DM + sticker/GIF | 1:00 | Inbox + engagement scopes |
| **6:45** | Navigate to `/insights` → **Refresh** → KPI cards, “no ads / no demographics” copy | 0:45 | `read_insights` |
| **7:30** | Sidebar → Events → [event] → **Insights** tab | 0:35 | `instagram_manage_insights`, event scope |
| **8:05** | (Optional) Inbound DM updates thread without manual Sync | 0:25 | Webhooks |
| **8:30** | End card — Privacy https://heyralli.com/privacy | 0:10 | Compliance |

**Total:** ~8:40 with optional webhook beat; trim consent or publish if targeting 6:00.

---

## Founder-only follow-ups

1. **Consent (`03-meta-consent.png`)** — Use Meta tester Facebook session. If org already connected, use **Reconnect with Facebook** or a disposable test org. Scroll so all 15 permission lines are visible.
2. **Live Page post (`06-page-post-live.png`)** — After Publish Now from Approvals, open facebook.com → test Page → Posts.
3. **Inbox (`08`, `09`)** — From a second Meta tester account: DM the Page, comment on a Page post, comment on IG media. In Hey Ralli: Sync → open threads.
4. **Webhooks (`12-webhook-config.png`)** — developers.facebook.com → Hey Ralli app → Webhooks → Page + Instagram subscriptions pointing at `/api/meta/webhook`.
5. **Screencast upload** — Export 1080p MP4; fill §10.1 screencast URL and chapter timestamps in [meta-app-review-use-cases.md](../meta-app-review-use-cases.md).
6. **Shared credentials block** — Fill test Page name/ID, IG handle, Business name in §10.1 (not in git).

---

## Narration cues (optional)

- “Hey Ralli is a PTA communications workspace — organic Page and Instagram only, no ads.”
- “One Connect OAuth grants publish, inbox, and insights for the school’s Page.”
- “Insights shows organic metrics only — we do not request or display age/gender demographics.”
- “Inbox replies are approve-then-send; stickers and GIFs are DM-only.”
