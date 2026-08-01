# Hey Ralli — Full feature list

Product brand: **Hey Ralli**.  
**Status:** Living  
**Owner:** Product / Engineering  
Status hints: **shipped**, **partial**, **stub**, **deferred**, **removed**.  
**Last updated:** July 31, 2026 — Approval emails: app HTML via sendEmail (Resend 2k template-var limit)

---

## Marketing & public
- Landing / home — **shipped** (cinematic Hey Ralli WOW homepage: full-bleed hero, product tour, pricing teaser, invite band, cookie consent; mockup reference `public/marketing-home-wow-mockup.html`)
- Floating marketing nav — **shipped** (bottom pill switcher on home + auth/legal: Home · Log in · Sign up · Forgot · Invite · Privacy · Terms; active forest pill; stays visible when signed in)
- Interactive product demo mockup — **in progress** (cinematic 5-chapter Ease demo: Event Planning · Calendar DnD · Create with AI · AI Inbox · Approvals; camera zoom/pan + simulated cursor; fictional Riverside Elementary PTA; HTML at [`public/product-demo-ease-mockup.html`](../../public/product-demo-ease-mockup.html); optional “Watch product demo” link on marketing mockup only — do not ship into live `/` until GO)
- Calendar product demo — **in progress** (recorded Month / Week / **Best times** DnD → **Bring in calendar** / View imported items → Google → Subscribe → Upload; video [`public/demos/calendar-demo.webm`](../../public/demos/calendar-demo.webm); cinematic Ease mockup [`public/calendar-demo-ease-mockup.html`](../../public/calendar-demo-ease-mockup.html); IA cleanup mockup [`public/calendar-ease-cleanup-mockup.html`](../../public/calendar-ease-cleanup-mockup.html); re-record via `node scripts/capture-calendar-demo.mjs`)
- Features (`/features`) — **shipped** (“See Hey Ralli in Action”: Create with AI modules band — Home Page · Social Media · Newsletter — plus live Motion demos for Social campaigns, Calendar / Plan Your Year, Approvals, Volunteer Master, Communications Hub / Meta inbox, Ask Ralli; private harness at `/dev/motion-engine`)
- Pricing page ($49 / $79 / $129 · Starter / Professional / Premium + AI Reserve) — **shipped** (catalog features; Stripe Checkout / sign-in → billing CTAs)
- About — **shipped**
- Email deep links (`/go/...`) — **shipped**
- Public Privacy (`/privacy`) / Terms (`/terms`) + footer legal links — **shipped** (mockup chrome; living notes: [privacy-and-data.md](../security/privacy-and-data.md))
- Invite landing (`/invite`) — **shipped** (tokenless guidance; real accept stays at `/invite/[token]`)

## Auth & onboarding
- Access model (founding code → org, invites, multi-org switcher, roles, gates) — **shipped** (living: [access-and-onboarding.md](../security/access-and-onboarding.md))
- Sign in (`/login`) / sign up (`/signup`) / forgot password (`/forgot-password` → recovery → `/account/update-password`) — **shipped** (WOW auth chrome; real Supabase password, Google, founding magic-link, invite accept)
- New-org signup flow — **shipped**: `/signup` plan chooser (Starter / Professional / Premium from catalog) → checkout (`/signup?plan=…`) enters founding access code + email → org welcome magic-link (CTA **Let's get started** → `/auth/callback` → `/onboarding`); founding code waives billing at org bootstrap (mockup: [`marketing-home-wow-mockup.html?view=signup`](../../public/marketing-home-wow-mockup.html); eng: [auth-welcome-email.md](../engineering/auth-welcome-email.md))
- Secure invite accept (`/invite/[token]`, set password for new accounts; existing accounts sign in with their own credentials — never password-reset) — **shipped** (security: [audit-remediation.md](../security/audit-remediation.md#critical))
- Developer agreements gate (NDA + IP, in-app e-sign: full name + email + optional company + drawn signature; scroll-to-enable; signed receipt on panels; Hey Ralli-themed UI; audit log; executed-copy email CTA via app download API with token) — **shipped** (`/account/agreements`; owner manage at `/account/agreements/manage`; eng: [developer-agreements.md](../engineering/developer-agreements.md); QA: [developer-agreements.md](../qa/developer-agreements.md))
- Owner dashboard (`/ops`) — platform metrics + **Developers signed** counter-sign queue — **shipped** (gated by `HEY_RALLI_OWNER_EMAILS` **and** Owner/`campaign_role=admin` seat); metric tiles use Events summary card colors (`bg-cos-bg-alt`)
- Owner **AI & APIs** (`/ops/ai-apis`) — monitor AI usage, connected API usage, operating costs, customer consumption (tabs: AI APIs · Connected APIs); Owner sidebar group under Ops — **partial** (Phases 0–5 eng + optional one-time OpenAI Usage history import via `OPENAI_ADMIN_KEY`; Edmondson/School B pinned for org view; **shipped** after Owner QA § F; living: [ai-and-apis.md](./ai-and-apis.md); QA: [owner-ai-apis.md](../qa/owner-ai-apis.md))
- Get started (one boarding flow) — **shipped** (Ease 4 beats complete):
  - **Ease page 1 shipped:** Create your first event at `/events/create?onboarding=1` — Fraunces/cream shell, quiet “Setting up {org}” line, single “1 of 3” progress meter (exact from [`onboarding-setup-ease-mockup.html?view=event`](../../public/onboarding-setup-ease-mockup.html)); no legacy Event→Calendar→Brand→Team→Meta bar on this screen
  - **Ease page 2 shipped:** Calendar + Brand combined optional screen at `/onboarding/essentials` — “2 of 3” meter, per-section Skip + footer Skip for now / Continue (exact from [`onboarding-setup-ease-mockup.html?view=essentials`](../../public/onboarding-setup-ease-mockup.html)); reuses real calendar import / Google OAuth + brand kit save; after Continue/Skip → `/onboarding/connect`
  - **Ease page 3 shipped:** Team + Meta combined optional screen at `/onboarding/connect` — “3 of 3” meter, per-section Skip invite / Skip Meta + footer Skip for now / Go to {event} (exact from [`onboarding-setup-ease-mockup.html?view=connect`](../../public/onboarding-setup-ease-mockup.html)); reuses real team invite + Meta OAuth; after Continue/Skip → created event with page-4 finale
  - **Ease page 4 shipped:** Land on created event with dismissible “You’re set — here’s your event” toast (exact from [`onboarding-setup-ease-mockup.html?view=done`](../../public/onboarding-setup-ease-mockup.html)); `?welcome=1` handoff from page 3; sets `promptsFinishedAt` on `organizations.onboarding_state`; no second step plan / no home checklist finale
  - Org bootstrap glue only when no membership (`/onboarding` quiet name → continue); restart / replay → `/events/create?onboarding=1` (not a separate Welcome step UI)
  - After first-event save: routes to `/onboarding/essentials` (not the old calendar-only overlay); legacy `?onboarding=calendar|brand|invite|meta` on the event redirects to essentials/connect
  - Legacy `/onboarding/invite` and `/onboarding/meta` redirect to `/onboarding/connect`
  - Helpful next steps on **home/dashboard** until done: **Set up now** + **Later**; Settings → Get started shows the same simple cards (no wizard); checklist invite/meta “Set up now” → `/onboarding/connect`
  - Progress on `organizations.onboarding_state` (incl. meta completed/skipped/checklist-dismissed)
  - Creating an onboarding event clears stale flags so Calendar → Brand → Team → Meta can replay
  - Organization settings: **no** boarding steppers; Brand CTA → `/onboarding/brand?standalone=1` (no Event/Calendar/Team/Meta chrome); Edit profile stays on org settings (never `?view=wizard`); founding with no membership → `/onboarding` (no SchoolSetupWizard)
- Brand kit (canonical): `/onboarding/brand` — PTO + school logos, additional brand-kit logos, colors, mascot, live preview; boarding Continue → invite; Organization → Edit branding uses `?standalone=1` — **shipped**
- Legacy 6-step SchoolSetupWizard — **retired for members** (legacy query redirects: `?view=wizard`/`?step=school` → org settings; `?step=meta` → integrations; `?step=calendar` → `/calendar/import`; `?step=brand` → brand standalone)
- Change password (voluntary on Settings → Account; forced gate at `/account/change-password`; requires current password re-auth; OAuth-only Google accounts see an honest “sign in with Google” note — no broken form) — **shipped** (security: [audit-remediation.md](../security/audit-remediation.md#low--info-cleanup-not-launch-blocking))
- Deactivated-account handling — **shipped**

## Multi-org & tenancy
- Active organization (membership-scoped workspace) — **shipped** (living: [access-and-onboarding.md](../security/access-and-onboarding.md))
- Organization switcher (when >1 active memberships) — **shipped** (MVP)
- **Multi-org admin note** on Settings → Team & Access — how to invite someone who already belongs to another org (same email, per-org permissions, header switcher) — **shipped**
- Files library respects active org (no cross-org file list/download for multi-membership) — **shipped**
- Stripe Checkout/Portal + plan/capacity gates — **shipped** (live in Production; product: [billing-and-access.md](../ops/billing-and-access.md) · eng: [stripe-integration.md](../engineering/stripe-integration.md))
- Canceled-subscription lockout — **shipped** (an org that HAD an active/trialing Stripe subscription which was then canceled is fully gated to `/billing/canceled` for every member — resubscribe/portal/sign-out only — until resubscribed; orgs that never subscribed (app trial, expired-trial Starter fallback) or are founding/billing-exempt are unaffected; see [billing-and-access.md](../ops/billing-and-access.md#4-member-billing-journeys) · eng: [stripe-integration.md](../engineering/stripe-integration.md))

## Access control & team
- Access templates (permission toggles) — **shipped**
- Built-in role presets (Owner, President, VP, Chair, Volunteer, Viewer) — **shipped**
- See vs work (view all / work assigned, or strict assigned-only) — **shipped**
- Invite / resend / cancel invite; deactivate / remove members — **shipped**
- Event assignments — **shipped**
- Permission gates (artwork, approve, publish, people, integrations, etc.) — **shipped**
- Multi-tenant / IDOR app-layer gates on event-scoped mutations (CB2 upload/generate/session, event details, approvals scheduling, AI credit billing, org scope resolution) — **shipped** (security: [audit-remediation.md](../security/audit-remediation.md#multi-tenant--idor-hardening-august-2026))
- Dashboard layout membership fan-out collapsed (one cached `organization_users` load for switcher + active seat; org-by-id / users / playbooks / people workload request-cached) — **shipped** (perf)
- Role simulator (dev/test, gated) — **shipped**

## Dashboard (Today)
- **Ease redesign mockup** — calm first viewport (greeting + Create with AI / Calendar CTAs + weather chip), quieter View / Edit layout mode, Ease-styled widget cards with soft drag reorder; HTML mockup at `public/dashboard-ease-mockup.html` — **in progress** (do not ship product UI until GO)
- **Your overview** board: greeting · Add/Edit controls (no section title) · 2-col main (**Up Next**, **Attention**, **Waiting on me** (open steps for events that have not happened yet), **Good news**) + right rail (**Weather**, **Calendar**, **This week**) · cream widget cards · per-user `organization_users.dashboard_layout` jsonb — **shipped**
- Customer-facing Dashboard copy uses org/team language (weather city, event titles — not school-only, workspace, or “Open campaign” jargon); Attention / Tasks-this-week deep links use Tasks Ease `?scope=mine&pulse=week` — **shipped** (Jul 28)
- **Add** / **Edit**: checkbox catalog + remove; Done/Apply saves optimistically — **shipped**
- **Card colors** in Edit (palette + custom): per-user colors on Attention, Waiting on me, Good news, This week, Approvals, Tasks, Volunteers, Insights; text/surfaces auto-contrast; Weather / Up Next / Calendar excluded — **shipped**
- **Drag-and-drop** tile rearrange anytime via card grip (saves on drop; Weather pinned; Edit still removes) — **shipped**
- Optional richer widgets (off by default): **Approvals** (assigned to me), **Tasks this week**, **Volunteers** (underfilled events with fill-rate bar + % to the right), **Insights** (7d KPI pulse via lean `getInsightsPulseData`, not full Insights page query); library widgets use lean Approvals/Tasks list helpers (not full hub DTOs) — **shipped**
- Optional library widgets (off by default, Add catalog phase 3): **Posts this week** (Mine/Everyone — scheduled, drafts, and needs-approval posts for the week; DB-only via unified scheduling rows), **Waiting on others** (Mine/Everyone — approvals you submitted that are blocked on teammates + org bottleneck counts), **Event coverage** (upcoming events missing an event lead or co-lead; deep links to event detail / Team & Access) — **shipped**
- **Weather** pinned top-right with the greeting; left column stacks greeting → Add/Edit → **Up Next** (independent of weather height so no blank gap); rail stacks Weather → **Calendar**; weather tile includes next 4 hours + fun tip — **shipped**
- **Attention** metric rows: to review → Approvals · need volunteers → Volunteers · tasks this week → Tasks (`?scope=mine&pulse=week`) — **shipped**
- Live weather from org Weather ZIP preferred, then city/state + `WEATHER_API_KEY`; hourly via Open-Meteo when coords available (else OWM 3h / seasonal mock); creative tip ties forecast to school events today/tomorrow (hot → water/sunscreen, cold → bundle up, rain → Plan B) — **shipped**
- Mini calendar school events for the month; This Week school **events** only — **shipped**
- Approvals/published pulse cards + waiting-on companion lists on home (pre-overview) — **removed**

## Events
- Customer-facing calendar/events copy uses organization/team/year language (not school-only or sync/ICS jargon); review categories display as Team/Organization event — **shipped**
- Events list, create, edit — **shipped** (list thumbnails fall back to promoted approved-square artwork when the row is outside the upcoming/first-page prefetch window)
- Events Home ease filters (soft pills: **Upcoming** default · **Next month** · **All**; Upcoming shows next-60-days focus/queue; counts scoped to school-year filter + search; status badges on cards only — not filter tabs) — **shipped**
- Events list filtered PDF export (All Events header download; current list filters only — not upcoming carousel) — **shipped**
- Event detail workspace (tabs: Approvals, Tasks, Create with AI [handoff], Volunteers, Insights, Responsibilities, Notes, Files, Vendors, Activity; default Approvals) — **shipped**
- Event detail tab chrome uses local state + `history.replaceState` (no full RSC refetch on tab click); bare `/events/[id]` streams Approvals in a Suspense child so shell/hero paint first (lean org workspace projection; other deep-linked tabs still SSR-preload); Team Manage Assignments lazy-loads the org roster — **shipped** (perf)
- Event detail Insights tab — see **Insights** below (living: [event-insights.md](./event-insights.md))
- Event Tasks start empty (user-created); auto-seeded default planning checklist on event open — **removed**
- Event detail hero stats (Milestones from Create with AI session when present else classic steps; Pending Approvals + Scheduled Posts from Approvals scheduling; Tasks from communication plan tables; Filled from latest confirmed volunteer snapshot) — clickable to Create with AI / Approvals / Tasks / Volunteers — **shipped**
- Event detail brand accents (sunburst palette tokens: navy / mustard / sage / terracotta on hero, stats, tabs, status badges) — **shipped**
- Event Volunteers tab — see **Volunteers** below (living: [signupgenius.md](../integrations/signupgenius.md) · org overview: [volunteer-master.md](./volunteer-master.md))
- Legacy planning hub — **partial** / legacy (fallback only; Phase 3 is default)

## Volunteers
- **Volunteer Master page** (`/volunteers`, sidebar **Volunteers**) — **shipped** (living: [volunteer-master.md](./volunteer-master.md) · import: [signupgenius.md](../integrations/signupgenius.md))
  - Org-wide staffing scan: which events need people and how filled SignUpGenius / planning signup roles are
  - Auto-feed: non-archived school-year events with an active SignUpGenius source (`pending_review` / `connected` / `error`) **or** a non-empty planning `volunteer_signup` URL; scoped by viewer’s event access
  - Ease UI: soft pills (**Needs people** default · Upcoming · Covered · All), focus card for soonest shortfall, quiet event queue; quiet health text (fill % · open roles); search by event title or role
  - Fill Rate with shared color bands (Critical → Fully Staffed); **Open signup** / **Event volunteers** deep links; no volunteer names or contact details
  - Footer: SignUpGenius last update note; connect/refresh stay on each event’s Volunteers tab
- **Event Volunteers tab** (`/events/[id]?tab=volunteers`) — **shipped** (writes sources/snapshots; Master only reads)
  - Ease empty/overview + full Tab for pending review: SignUpGenius public URL connect → **verify dates before import** → confirm → sticky allowlist on refresh
  - Connected layout: Needs at a glance / Quick Totals / Overall Filled + suggested outreach; Filter + Date + Sort on roles
  - Same fill-rate color bands as Volunteer Master; customer copy uses refresh/connect language (not sync/PII jargon)
  - SignUpGenius **URL connect is the long-term path** (no Settings OAuth tease). OAuth deferred until most orgs have SignUpGenius Pro; then may add as a second pull option alongside URL

## Create with AI (Campaign Builder)
- Nav `/create-with-ai` — **Start here** two-up peers: Social Media · Flyer (equal cards); quieter **Also available**: Homepage · Volunteer page · Newsletter · Sponsorship (soon); customer-facing copy uses calm org/team language ([QA](../qa/newsletter-composer.md)); empty/access hub when no events or no permission — **shipped**
- **Website pages landing** (`/create-with-ai/website-pages`) — cream/forest page cards with preview art, serif titles, Live/Coming soon status, and short plain descriptions (no template pills or composer CTA jargon); Homepage → `/homepage-composer`; Volunteer → `/volunteer-composer`; Sponsorship disabled/coming soon — **Partial** (Homepage + Volunteer live)
- **Volunteer Composer** (`/volunteer-composer`) — Volunteer With Us page (Header · Footer · Opportunities · Preview · Export); composer back link → `/create-with-ai`; step rail only for step nav (no redundant “Back to …” chrome); event picker with month/year + clear; Homepage-style opportunity sorter (drag reorder + Sort dropdown); compact card editor with upload + AI artwork icons (AI opens Create with AI preview for linked event, or creates a volunteer-drive event when missing); preview/export uses a denser 3-column grid with ~180px artwork (emoji fallback); centered how-it-works step cards (badge + title + detail); Always on / on/off dates (builder-only; preview/export hide schedule chrome); signup link URLs; Preview on / Full month preview slider; roles outside the on/off window roll off; durable local draft; full-page HTML export for your website — **shipped** (hosted share page and PDF are later enhancements)
- **Flyer (Create with AI)** — **in progress** — Product route [`/create-with-ai/flyer`](../../src/app/(dashboard)/create-with-ai/flyer/page.tsx) (dashboard Sidebar + header; embeds [`public/create-with-ai-flyer.html`](../../public/create-with-ai-flyer.html) with `embed=1`; same-origin framing headers allow the iframe; bare HTML redirects into this shell): **Start** — **Choose your flyer size** (UX Pilot): three equal cards — **Update last year's flyer** (Fastest + upload) · **Start fresh — Letter** · **Start fresh — Half-page**; horizontal step pills (Start · Inspiration · Preview); optional **Link to an Event** chip; quiet **Browse pre-made templates**; forest **Continue** / Cancel — concepts from [`flyer-event-files-ease-mockup.html`](../../public/flyer-event-files-ease-mockup.html) → **Inspiration** — **What’s the vibe?** (UX Pilot): three peer cards (Inspiration Photo · Template File · Brand Kit) · vibe textarea · Key Facts (date · time · location · price/URL) · quiet QR “Add link” · Continue to Preview / Save Draft / Back (Browse Gallery deferred) → **Preview** — UX Pilot stage (radial cream well · letter flyer for the selected Versions entry · **Edit with AI** · Print + Download menu · compact step overlay) + right aside (**Tied to** · Versions list — Compare OFF shows the selected version on stage; Compare ON picks two versions side-by-side (first tap Previous, second Current) · **Save to Files** → `POST /api/flyer-composer/save` writes a flyer PNG into the event’s Files tab · **Create next flyer** · To: reviewer · forest **Send for approval**) → **Edit** slide-over drawer (**Edit Flyer**) with **Artwork | Details** tabs (selected version thumb left; refine notes + style chips or event facts right; forest **Update Flyer** regenerates from the selected version and appends a Versions entry); Send for approval → `POST /api/flyer-composer/send-for-approval`; Approvals Edit → `/create-with-ai/flyer?view=result`. **Event deep link:** `/create-with-ai/flyer?eventId={id}&fresh=1` from the event Create with AI panel (Flyer tile) binds that campaign and starts a clean draft (per-event local drafts). **QR:** first-party `qrcode` — Inspiration preview + letter mockups generate in-browser (`/vendor/qrcode.min.js`); after AI artwork, server detects the blank white QR box and stamps a real scannable code that fills it (prompt asks for a compact slot and forbids fake QR patterns / comic side-rays on type; no `api.qrserver.com`). Wired from Create with AI landing + event workspace.
- Inspiration / creative setup, logos, posts — **shipped**
- Artwork guidance from Creative Setup: Overall inspiration comment + per-image comments (not legacy Notes to AI); logo / brand colors / voice toggles are explicit opt-in only (org brand kit is not auto-surfaced or auto-applied) — see [create-with-ai-artwork-inputs.md](../qa/create-with-ai-artwork-inputs.md) — **shipped** (QA matrix + Playwright wiring)
- Generate artwork + captions per post — **shipped**
- Social **Creative Setup** (UX Pilot–aligned): three numbered cards — **1 Campaign & Plan** (event · date · communication plan + milestone list · Use Last Year's Plan soon) · **2 Look & Feel** (brand logos · inspiration images) · **3 Voice & Colors** · sticky **Live Vibe Preview** phone · **Create with AI** / Save Draft / Report a Problem (+ top **Save → Preview**) — **shipped**
- Social **Preview** studio (UX Pilot–aligned): horizontal step pills · **N of M posts ready** progress bar · **Save → Review** · Campaign posts cards with thumbs + Ready/Needs work/Draft · drag reorder · icon-only **+** to add · inline rename · phone Feed/Story with pencil Edit (opens Edit Post for AI notes — no second Generate CTA under the phone) · caption + character count · **How this post goes out** (Instagram/Facebook pills · Publish now / Schedule for later cards · Action required highlight · Advanced post options for feed/story/manual kit); Save → Review focuses first incomplete; app sidebar collapses to icons on Preview — **shipped**
- Social **Edit Post** (Preview / change-request): UX Pilot–aligned sheet opened from phone pencil (single edit entry — no competing under-phone Generate link); phone Feed/Story preview left; sage tip + **Artwork | Captions** tabs; What should change + quick chips; **Copy notes to Captions** / from Artwork; footer style slider (creative ↔ similar) + **Generate with AI** (first time) / **Regenerate with AI** (when art or caption exists); **Apply & close** in header; generate only sides with instructions — **shipped**
- Social artwork waiting motion: **Warm breath** (subtle scale + cream/amber/teal wash) while feed/story generate or regenerate in Create with AI Preview / Edit / Social composer and Approvals Revision; honors `prefers-reduced-motion` — **shipped** (mockup: [`public/approvals-celebration-motions-mockup.html`](../../public/approvals-celebration-motions-mockup.html))
- Reject generated artwork: subtle thumbs-down icon on Preview (and Edit regenerated preview) discards that feed/story slot so you can regenerate — **shipped**
- Artwork Apply hydrate: regenerated artwork sticks after Apply (local backup + hydrate merge so remount / Preview hydrate does not orphan richer in-memory art) — **shipped**
- 3-step Social flow (Setup → Preview → Review); Posts step removed — plan maps posts in Setup; reorder/add/rename/schedule live on Preview (`#milestones` redirects to Preview) — **shipped**
- Social composer chrome: shared top step pills (Setup · Preview · Review) + primary CTA on every step; left STEPS rail removed so Setup/Review flow into Preview’s gold-star surface — **shipped**
- Social **Review** studio (Preview sibling): post cards with thumb + **date/timing line** + Ready/Needs work/Draft · phone Feed/Story peek · Campaign summary (ready count · blocker → fix in Preview · read-only reviewer from Team Access — no routing UI) · primary CTA matches Team Access: **Send for approval** / **Send for re-approval** when a distinct reviewer exists, else **Approve all & schedule**; disabled until posts are handoff-ready — **shipped**
- Review tabs (All / Needs review / Approved / Changes requested) with Pending Review · Approved · Changes requested pills — **shipped** (legacy ReviewStep path)
- Review Approval workflow sidebar shows org default approver from Team Access (same resolution as send-for-approval); unassigned when none — **shipped**
- Review footer / Social Review chrome shows one primary CTA: **Send for approval** when Team Access has a distinct reviewer; **Approve all & schedule** when the approver is missing, unassigned, or yourself — **shipped**
- Review **Send for approval** / **Approve all & schedule** stays disabled until posts are ready; blocker callout + Missing … on cards; fix in Preview — **shipped**
- Handoff confirmation (not a stepper step; Review pill stays active): UX Pilot–exact card — forest check + italic **Sent for Approval** · lede · Reviewer / Email status / Posts count · What happens next · stacked **Open Approvals →** / **Back to Review** · Campaign ID footer; chrome CTAs match mock — **shipped**
- Full Meta slot sync after approval — **stub** / incomplete

## Homepage Composer
- Route `/homepage-composer` via Create with AI → Homepage (composer back link → `/create-with-ai`; no separate sidebar item); step rail only for step nav (no redundant “Back to …” chrome); full-page HTML export for your site; SettingsBox layout; searchable full emoji picker (`emoji-picker-react`); editable **cards section title** (Header tab — heading above event cards in preview/export); announcements with free-form rows (emoji · shorter text · on/off dates · Always on one line) plus **From calendar** event picker (month filter, title + date default text; calendar adds default off date); preview/export hide announcement lines outside their window like cards; month/year event filter; hosted 1:1 artwork with upload + Create-with-AI deep link icons; card on/off dates; full-month + date-slider preview (**Preview on** / **Full month preview**; Chrome-safe iframe refresh) with **Open page** + **Save as PDF** on share snapshot (`/share/homepage/[token]`, browser print for PDF); share snapshots stored server-side with `share_status` stub for future approvals — **shipped** (approvals integration **Partial** / later); durable draft autosave (localStorage + IndexedDB, flush on navigate/hide; IDB stale-write guard + artwork merge on load); subtle AI **Generate text** on card description (≤2 sentences, credits via `homepage_composer_blurb`) — **shipped** (soft launch; further blurb/copy polish deferred) — living docs: [QA](../qa/homepage-composer.md) · [Engineering](../engineering/homepage-composer.md)
- Evergreen custom cards + optional link URL · editable link name (`linkLabel`) · card face date (`date`, distinct from on/off visibility) · on date · off date · always-on · artwork upload — **shipped** (soft launch)
- **Save by month** (work ahead on next month’s homepage) — **shipped**: persistent **Working on** strip on every step · **Save this month** · **Copy from…** prior saved month; hero/footer colors, section title, and resources stay shared; **cards + event picks + announcement bar lines** scoped per YYYY-MM in the org draft (`monthDrafts` / `monthSaved`); event list month filter stays independent. Ease mock kept: [`public/homepage-composer-month-ease-mockup.html`](../../public/homepage-composer-month-ease-mockup.html)

## Newsletter Composer
- Route `/newsletter-composer` via Create with AI → Newsletter (no separate sidebar item); community email layout (header, message, stories, calendar chips, sponsors, socials); desktop + phone preview; HTML export + **Copy for Membership Toolkit** (rich-text clipboard without images, placeholders for artwork); durable draft autosave (shared newest-wins localStorage + IndexedDB store, flush on navigate/hide) — **shipped** (soft launch; further polish deferred) — living docs: [QA](../qa/newsletter-composer.md) · [Engineering](../engineering/newsletter-composer.md)

## Artwork & creative
- AI artwork generation (feed + story), approve/deny/adjust — **shipped**
- Logo in artwork — **shipped**
- Canva import — **shipped** (config-dependent; Creative Setup Inspiration: **Import from Canva** → design picker → PNG stored as inspiration image; org Connect in Settings → Canva)
- Legacy Creative Studio — **stub** / redirected away

## Captions, Meta & publishing
- Caption generation/editing — **shipped** (Create with AI: regenerate auto-saves; hydrate no longer strips legitimate captions that mention volunteers)
- Caption Apply hydrate: saved captions stick after Edit caption / regenerate / refresh (exact known seed demos only are cleared) — **shipped**
- Meta connect (Facebook Page + Instagram) — **shipped**
- Create with AI Delivery method: **Publish Now** (default) posts to Meta on approve; Schedule / Email manual / Draft remain — **shipped** (legacy “Publish automatically” / `auto-publish` normalizes to Publish Now). **Schedule** posts go out within ~20 minutes of the chosen time via background cron (IG/stories; native FB feed uses Graph schedule on approve)
- Schedule / publish now / publish ready bundles (Review & Publish + Meta bundles) — **shipped**
- Meta-native Facebook Page feed schedule on Approve (`published=false` + `scheduled_publish_time`; Graph ids on `meta_publication_slots`) — **shipped** (Instagram / FB stories stay on CampignOS publish-when-due; Publish Now skips native Graph schedule and publishes immediately; QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md))
- Meta publish bundle loads on page GET are read-only (no slot sync/write-on-read); mutations use `syncAndGetMetaPublishBundles` — **shipped** (perf)
- Meta planner / Calendar show Publish Now + custom-date slots even when `relative_day` is outside the communication plan (sync no longer deletes committed orphans; bundles merge orphan days) — **shipped**
- Calendar DnD reschedule syncs Meta Graph schedule time without re-approval — **shipped** (DB always updates; Graph failure → warning toast, no rollback; QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md))
- Calendar DnD drag feel optimized (DOM drop highlights; optimistic chip move; Meta Graph sync after response; no pending dim / router wait before UI updates) — **shipped**
- Posting schedule preferences — **shipped**
- Weekly posting summary emails — **removed** (orphaned placeholder; not a product feature)

## Approvals & scheduling
- Unified Approvals hub (pending, changes, scheduled, published) — **shipped**
- Approvals page post-response Meta approval backfill runs in `after()` with a render-time cookie snapshot (Server Components cannot call `cookies()` inside `after()`) — **shipped**
- **Revision workspace (change request)** — **partial** — `/approvals/revision` creator shell (UX Pilot): **Update this post** · Changes requested chip · left **Preview** (feed 1:1 + story 9:16) + editable caption/schedule · right **What they asked for** (note + checklist) + **Instruct AI** + regenerate feed/story/both/caption · forest **Send for re-approval**. Approver mode remains note+tags pop-out from hub. Flyer: single print preview + Open Flyer composer. Mockups: [`public/approvals-change-request-mockup.html`](../../public/approvals-change-request-mockup.html), [`public/approvals-revision-ai-regenerate-mockup.html`](../../public/approvals-revision-ai-regenerate-mockup.html). Approval emails send app-built HTML (`sendEmail`) with artwork thumbnails — not Resend template variables (2,000-char limit + HTML escaping). Flyer vs social copy uses Print flyer · Open Flyer composer labels. Later: deeper multi-round history, adapters (newsletter · homepage · website pages)
- Approvals Ease outcomes: **Posted** / **Failed** (with **Retry**) as first-class filters + pills; **Draft** chip on draft-only rows (no dedicated Drafts filter tab for soft launch); Retry wires Meta republish — **shipped**
- Event Activity mirrors unified campaign approvals: sent, approved, change requested, and re-submitted; Meta publishing continues to log posted outcomes — **shipped**
- Status summary cards as clickable workflow filters (Assigned to Me / Changes Requested / In Queue / Scheduled / Published; click again to clear to All; Posted row status remains in the table under Scheduled coverage); **Edit** mode for per-user drag-and-drop order + portaled color picker via `organization_users.approvals_layout`; approve / request changes, assigned-to-me view scope, search, badges — **shipped**
- Approvals hub: unused Filters button removed; broad search (events, people, dates, captions, status labels) replaces campaign dropdown filter — **shipped**
- Approvals customer copy: hub + event Approvals tab + open review + approve/request/retry errors + change-request email use org/Page/team language — **shipped**
- Approvals **open review** (dimmed pop-out over grayed backdrop): forest-green identity (top strip + sage header wash + **Open review** chip) so it reads as review at a glance; campaign title + post title, Social feed · 1:1 + story · 9:16 (or Flyer print preview), review history, caption/schedule/channels/visibility sidebar; forest **Approve for {date}** / **Request changes** in header — **shipped** (mockup: [`public/approvals-open-view-mockup.html`](../../public/approvals-open-view-mockup.html))
- Approvals **Request changes** (approver pop-out): quiet warm hero only (soft gold/amber strip + wash + outline **Change request** chip) so it differs from forest open review without alarm-red; body/tags/Send stay calm cream + forest; **← Back to review** reopens open view — **shipped**
- Final approve celebration: **Ready to Ralli** headline + brand confetti after successful **Approve & schedule** (Approvals hub + event Approvals tab); **Done** / backdrop dismiss + ~5.5s auto-dismiss with gentle fade; approve persists DB status first then returns (Meta schedule + Resend + Create with AI session sync run in `after()` so celebration is not blocked); follow-up warnings that still arrive with the response wait until after celebration and show as amber; reduced motion shows static headline + check, still dismissable — **shipped** (mockup: [`public/approvals-celebration-motions-mockup.html`](../../public/approvals-celebration-motions-mockup.html))
- Approvals Ease focus cards: primary forest **Open full view** opens the dimmed open-review pop-out (approve / request changes live there) — **shipped**
- Approvals Ease hub (UX Pilot): forest **Needs you** pulse + Assigned to me / search · **Waiting on your review** focus card (Open full view) · **Also waiting** table (thumb · campaign · post · status · assignee · eye View; fixed column widths) · italic **How approvals work** guide; `?review=` deep-link reopens open view — **shipped**
- Approvals **Post name** matches Create with AI / communication-plan milestone titles (Day Before, Announcement, …); renames in Social sync to pending approval rows and overlay on hub load — never show channel labels (Facebook) as the post name — **shipped**
- Event detail Approvals tab: Ease pulse filters (Needs you / Scheduled / Posted / Failed / Changes) + open review Retry — **shipped**
- Approvals table / Ease queue Actions show **View** only (approve / request changes stay in the open review) — **shipped**
- Change-requested items show the approver comment + **Edit Artwork** / **Change Date** CTAs (Approvals drawer + email; Edit Artwork → Create with AI Preview + edit-artwork modal for that milestone; Change Date → Preview Campaign for that milestone); Preview/Review banners keep caption / Change Date / artwork paths plus **Send for re-approval**; resubmit emails the Team Access approver again (`Resubmitted for approval: …`, with fallback to the prior assignee if the current role has no email; UI confirms the recipient address) — **shipped**
- Legacy Publishing Center → redirects to Approvals

## Calendar
- Calendar IA: primary views are Month · Week · Best times · Agenda only; one quiet **Bring in calendar** entry owns import → review → **View imported items** (no peer Import list / Import / Review tabs or duplicate header buttons) — **shipped** (design ref: [`public/calendar-ease-cleanup-mockup.html`](../../public/calendar-ease-cleanup-mockup.html))
- Calendar Ease shell: compact framed header + soft view pills aligned to cleanup mockup; month view no longer shows **Coming up · Next 7 days** — **shipped**
- Calendar chrome (shell, import, review, Google/subscribe feed) customer copy — org/team/year + refresh language; Settings **School year** feature name retained — **shipped**
- School-year calendar (month / week / agenda) — **shipped**
- Layer toggles, detail panel — **shipped**
- Show-layer color pickers (Events / Scheduled posts / Published): click the color swatch on each Show chip (not the label — label toggles visibility); calendar cards for that layer update to match; per-user via `organization_users.calendar_layout` — **shipped**
- Drag-and-drop Meta posts: schedule-only (approval preserved); Graph reschedule when a native schedule id exists — **shipped** (QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md); not school-event import)
- Posting heatmap (Calendar week view + planning suggestions; prefs + published Meta history; gated on org Meta connection) — **shipped**
- Insights-weighted engagement heatmap — **deferred** (current scores use preferred windows + local publish times, not Meta Insights metrics)
- Google Calendar Sign-in (OAuth → auto-sync → review → `/calendar` + dashboard) — **shipped** (live; see [google-calendar.md](../integrations/google-calendar.md))
- Google Calendar daily sync cron (auto-import new events) — **shipped**
- Google Calendar connect from **Bring in calendar** + Settings Integrations — **shipped**
- ICS / webcal subscribe feed — **shipped**
- Calendar file upload + import review (incl. AI fix) — **shipped** (canonical UX: **Bring in calendar** → `/calendar?tab=import` → `/calendar?tab=review` — Google + ICS + file on one screen; onboarding checklist + Get started wizard calendar step use that same path; Settings → Google Calendar is connect/subscribe with deep-links to Import)
- Calendar import review plan type from org communication plans (Settings → Communication Plans; stores `playbookId` on import) — **shipped**
- Calendar import review search (name/category/date/year), type/date filters, and Archive past events (bulk remove prior dates from the import queue) — **shipped**
- Calendar Import list search (name/category/date/year) with Select all / Delete selected on visible filtered rows — **shipped** (`/calendar` → **Bring in calendar** → View imported items; hard-deletes events for the org’s school years — same membership as Events, not the rolling calendar date window)
- Calendar import dedupe (ICS UID / Google id / AI fingerprint; same external id updates existing event on title or date change; uniqueness on `(school_year_id, import_source, import_external_id)`; missing-UID normalized title+date fallback; legacy near-dup pairs cleaned by keeping the most recent import) — **shipped** (canonical: `/calendar?tab=import` → `/calendar?tab=review`; `/calendar/import` + `/calendar/review` redirect; QA: [calendar-import-dedupe.md](../qa/calendar-import-dedupe.md); Playwright: `tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts`)
- Communications planning calendar — **shipped** (secondary)
- Gmail inbox OAuth — **deferred** (see [google-calendar.md](../integrations/google-calendar.md))

## Communications Hub (inbox)
- **Communications Connect Meta Ease** — **shipped** (exact empty from [`communications-hub-ease-mockup.html?view=connect`](../../public/communications-hub-ease-mockup.html): page head + four why cards — Why we connect / What AI does / What we don’t do / Privacy — Connect with Facebook + Meta settings OAuth/`returnTo=/communications`, “Why we ask for Page messaging permissions”; live on `/communications` when Meta is not connected; shared empty also used by Inbox hub chrome; `/inbox` redirects to `/communications`; customer copy uses organization / Page / team language — not school-only PTA)
- **Communications Hub Ease mockup** — **in progress (Meta review)** (soft cream/Fraunces shell; view pills **Inbox · Compose focus · Connect Meta**; thread list + conversation + AI draft assist + DM stickers/GIF affordances; honest organic Page Inbox / Instagram DM purpose, approve-then-send, no spam/broadcast theater; fictional Riverside Elementary PTA only; HTML at [`public/communications-hub-ease-mockup.html`](../../public/communications-hub-ease-mockup.html) — Connect Meta empty shipped above; full hub chrome still mockup-only until GO)
- Unified Meta inbox (DMs, comments, mentions) — **shipped**
- Inbox SSR soft caps (50 threads, 40 messages/thread, head-count channel tallies, unread badge ≤500 threads) — **shipped** (perf; see [performance-budget.md](../qa/performance-budget.md))
- Thread workspace, reply, mark read — **shipped**
- Inbox AI drafts + approve-then-send — **shipped**
- Comment/tag detail panel shows original parent post (caption + artwork); clutter placeholders (similar questions, take-action list, related campaign) removed — **shipped**
- Messenger timeline always shows a profile picture (or initials/fallback) next to every bubble — **shipped**
- Reply composer toolbar: full emoji picker (`emoji-picker-react`, search/categories) + org custom image stickers (upload PNG/WebP/GIF/JPEG to `organization_stickers` / `organization-stickers` bucket; picker shows images; DM send via Meta image attachment) + GIPHY GIF picker (search + trending via server proxy `/api/giphy/*`; rating `r`; page size 48 with Load more/`offset`; DM-only on `facebook_message` / `instagram_dm`; size-safe CDN URL sent as Meta image attachment like stickers; requires `GIPHY_API_KEY`) + quick emoji pack + 👍/❤️ quick-insert — **shipped**; comment/tag threads stay text-only for stickers/GIFs (clear notice); attachment icon still shows Meta text-only notice for generic files — **shipped**
- Double-tap / double-click message bubble → quick 👍 / ❤️ reaction bar synced to Meta when supported — **shipped** (Facebook/Instagram comments: Graph LIKE only — ❤️ maps to Like with honest UI copy; Messenger/IG DMs: `sender_action` react/unreact with the emoji; tagged threads stay Hey Ralli–local; metadata written only after Meta success; clear error if Graph rejects; IG comment likes need `instagram_manage_engagement` + reconnect)
- Jumbo emoji: emoji-only message bodies (1 = largest, 2–3 = large) render oversized in timeline bubbles; same sizing while composing in the reply textarea — **shipped**
- Thread actions: Follow up (star), Done, Delete (with confirm); Assign to team member (active org login users); action buttons use Events KPI card colors (idle `bg-cos-bg-alt` / active `bg-cos-dark`); optimistic local patch so toggles feel instant; queue filters Unread / Follow up / Done / Deleted — **shipped**
- Assign is ownership metadata only (banner + queue “Assigned to …”); does not change unread / Done / Follow up / Delete — assignee still uses those actions — **shipped**
- Queue model: Unread is the default home (not Done, not Deleted; Follow up stays in Unread); Follow up = starred and not deleted; Done = marked done; Deleted via Manage — **shipped**
- Queue UI: Meta-style horizontal filter chips (Unread, Follow up, Done); Manage menu has Deleted only (AI workflow folders removed); list rows with platform badge, follow-up star, accent selected edge — **shipped** (search stays in top bar only)
- Top bar: search + Meta connection badge only — All Campaigns / All Channels dropdowns and AI Queue button removed (queues are Unread / Follow up / Done / Deleted) — **shipped**
- Platform badges by channel: Messenger bolt for `facebook_message`, IG paper-plane for `instagram_dm`, Facebook “f” / Instagram logo for comments & tags — **shipped** (queue avatar corner + thread header)
- Non-interactive Open status chip removed from thread header — **shipped**
- Campaign filter — **deferred**
- Gmail inbox — **deferred**

## Tasks — Ease redesign **shipped**
- Customer-facing Tasks copy uses organization/team/event language (not school-only, migration, or wiring jargon); calm empties on List/boards/event tab — **shipped**
- `TasksEaseShell` replaces the dense Main Table / My Tasks / Board chrome at `/tasks` — soft cream shell, Fraunces heading, quiet pills throughout (`src/components/tasks-v2/TasksEaseShell.tsx`) — **shipped**
- **Pilot Tasks chrome (Aug 2026):** Fraunces title + team subtitle; Team/Mine; **List** + **Status** tabs (Focus/Custom removed); KPI pulse; moss event chips; Pilot list table + Status kanban; column **+** / header Add task open the two-pane Add task modal — **shipped**
- **Team | Mine** scope toggle (`?scope=`) — Team = all org-accessible event tasks; Mine = assigned to the signed-in user (`assignee_user_id`) — **shipped**
- **List | Status | Focus | Custom** views (`?view=`) with short labels; List is the default — **shipped**
- Pulse row as quiet text links with live counts — Needs you / This week / Overdue / Done (`?pulse=`, toggles off on repeat click) — **shipped**
- Events chip row for soft filtering (`?event=`), each chip with a `DashboardWidgetColorPicker` dot for a personal, localStorage-persisted event color (org + user scoped; cleared on sign-out) — **shipped**
- List view: Pilot flat table (Priority dropdown, Event, Status, Due date picker, Assignee; overdue Escalate; Needs Review / Review; bottom padding so last-row date picker isn’t clipped) — **shipped**
- Status board: Pilot kanban To Do · In Progress · Needs Review · Done; drag-and-drop; event color stripe + avatar cards; column **+** opens Add task with Board prefilled — **shipped**
- Focus / Custom view tabs on org Tasks hub — **removed**
- Ask AI for tasks (`TasksEaseAskAi` modal): Pilot paper/ink/gold card (Event + optional Category, “What are you working on?”, Generate); AI Recommendations in Essential / Recommended / Extra Touch columns with level-cards (checkbox, description, category tag, priority dropdown, due date — picker not clipped via overflow-visible + bottom padding); Add Selected Tasks writes due dates via create API and priority via localStorage overrides; on success closes modal, lands on List (`view` default/list), clears pulse, filters to the chosen event, optimistic insert, and assigns to the viewer in Mine scope so new rows stay visible — **shipped**
- Add task (Pilot two-pane modal) in the header — **shipped**
- Org Tasks hub SSR soft-capped at 1000 tasks (event Tasks tab uncapped; notice when truncated) — **shipped** (perf)
- Task status/reorder + caption save/generate keep optimistic UI without full `router.refresh` — **shipped** (perf)
- Access aligned with event access (`canAccessEvent` / EffectiveAccess) — **shipped**
- No auto-seeded demo/default task rows on event open — **shipped** (empty until user creates)
- Due date picker wired to task update — **shipped**
- Ease task detail (`TasksEaseTaskDrawer`): same two-pane Pilot modal as Add task (ivory aside + form); editable title, Board/status, due, assignee, derived priority badge, Description/notes (+ dictate), autosave, event deep link, Done — **shipped**
- Add task: event options from events + groups, optimistic row, Mine auto-assigns to you, clears pulse so new tasks stay visible — **shipped**
- Chrome feel: Team/Mine, views, pulse, event chips use local state + `history.replaceState` (no `router.replace` refetch); drawer/list saves stay optimistic without full page refresh — **shipped** (perf)
- Org + Event Tasks lists omit note bodies at the SQL select (`hasNotes` via presence id query; drawer loads notes on open); Add Task / Ask AI form state is isolated so keystrokes don’t re-render all rows; list/board are `React.memo` — **shipped** (perf)
- Flyer local drafts never persist `data:image` blobs; old `hr-flyer-composer-draft:*` keys are GC’d; QR data-URL cache is LRU-capped — **shipped** (perf)
- Calendar / Timeline / Workload tabs — **deferred** (hidden from Tasks UI)
- Files tab on Tasks — **removed** (use sidebar Files → `/files`)
- Monday.com sync — **partial** (optional org integration; not required for Tasks)
- Legacy `TasksV2Shell` (Main Table / My Tasks / Board tabs) kept in the repo for reference but no longer routed — **removed** (superseded by Ease)
- Smoke: `tests/hey-ralli/smoke/10-tasks.spec.ts` — **shipped**; unit contracts: `src/lib/tasks-v2/__tests__/tasks-ease-ui.test.ts`, `tasks-ease-pulse.test.ts` — **shipped**

## Files
- Global + event-scoped library (upload, search, categorize, metadata) — **shipped**
- Active-org isolation on `/files` + file download — **shipped** (switched org only; multi-membership no longer lists other orgs’ files)
- Org Files SSR soft-capped at 400 newest files (event detail 200; notice when truncated) — **shipped** (perf)
- Event detail Files tab uses the same `FilesDocumentsShell` as `/files` (DnD upload, search, sort, lean toolbar; event locked / no event carousel) — **shipped**
- Files & Documents toolbar: type/category/status/date filters + upload + search on one row; search by file or event name (global); event/platform/uploader dropdowns removed — **shipped**
- Drag-and-drop upload on Files & Documents (page drop opens upload dialog with file preselected) — **shipped**
- Sortable list columns (name, event, type, category, platform, uploaded, size); default newest uploaded — **shipped**
- Upload control is a primary button (no faux dropdown chevron) — **shipped**
- “Files organized by event” carousel cards use Events home summary colors (idle `bg-cos-bg-alt` / selected `bg-cos-dark`); **Edit** mode for per-user drag-and-drop order + portaled color picker via `organization_users.files_layout` — **shipped** (legacy `FilesDocumentsShell`; still used by the event detail Files tab embeds)
- **Ease redesign — `/files` uses `FilesEaseShell`, not the dense carousel/table chrome:** soft cream shell, Fraunces heading, quiet pill search (file or campaign name), quiet text sort (Newest/Name/Size/Type via `?sort=`), campaign filter dropdown (Coming up = next 5 by date, then More), multi-file drop opens upload dialog for campaign + category (no header Upload CTA), each campaign in its own striped box with per-campaign folder bar, inline rename (Enter/blur saves) and Rename/Move/Open/Download row actions, deep link to the event Files tab via `eventFilesHref`; chrome uses local state + `history.replaceState` (`?q=`, `?event=`, `?sort=`) so filter/sort/search clicks stay instant — mockup at `/files-ease-mockup.html` — **shipped**
- **Campaign folders (event-scoped):** `event_file_folders` + nullable `event_playbook_files.folder_id`; folder pills (All files / Unfiled / custom) on event Files tab and inside each campaign group on `/files`; create/rename/delete/reorder folders; Move file to folder on each row; RLS via `private.can_access_event` — **shipped**
- **Smart filing MVP (Jul 28):** event is the container; auto type groups (All / Graphics / Photos / Documents / Other) on org `/files` and event Files tab; upload infers category from filename/MIME (no category picker on drop); read-only **Generated for posts** section on event Files tab queries `event_assets` directly (no `source_event_asset_id` column); org library uses type pills + event chips (not folder tree hero); optional folders collapsed on event tab; quiet **Add file** on Volunteers + Tasks tabs — mockup at `/files-smart-filing-mockup.html` — **shipped**
- Unit contracts: `src/lib/campaign-files/__tests__/files-ease-ui.test.ts`, `type-groups.test.ts` — **shipped**

## Vendors
- Directory (card grid), add/archive/delete, profile, link to events — **shipped**
- Soft-launch nav: org **Vendors** removed from left rail; remains on event `?tab=vendors` and `/vendors` via direct URL / Browse directory — **shipped**
- Customer copy (Jul 28): org/team language on directory, profile, event tab, add wizard, and action errors; calm empty states (no School Setup / migration strings) — **shipped**
- **Ease redesign — contact-first Vendors (mockup at `/vendors-ease-mockup.html`):** soft cream/Fraunces shell like Tasks/Files; directory cards keep the loved forest/mustard/teal header bands plus a small squircle logo mark (uploaded image `object-cover` fill, or initials) on the band — not a circle — with icon-only X to clear when a logo exists; profile hero uses the same fillable squircle + clear control; one-tap Call / Email / Website (`tel` / `mailto` / website) plus **View profile**; quiet All / Favorites / Past / Blocked tabs + search (`history.replaceState`); event `?tab=vendors` rows show the same contact actions + **Profile**, plus in-tab **Add existing** / **Add new** (preselects event) / **Unlink** (confirm); Browse directory opens the full `/vendors` list (not linked-only); profile is a contact-first Ease hero (big Call / Email / Website) with quieter secondary tabs (Overview, Events, Notes, Documents, Activity). Directory KPI summary strip removed from the Ease shell so the page matches the mockup — **shipped**
- Unit contracts: `src/lib/vendors/__tests__/vendors-ease-ui.test.ts` — **shipped**
- Add vendor wizard: Basics → Connect event → Review; directory loads events and supports multi-select link; Event tab pre-selects the current event; assignments default Confirmed — **shipped**
- Favorite star on card upper-right; directory tabs: All / Favorites / Past / Blocked (Pending removed) — **shipped**
- Card / row CTAs open `/vendors/{id}`; edit vendor from profile only — **shipped**
- Profile tabs: Overview, Events, Notes, Documents, Activity — **shipped**
- Documents = Files from linked events (contracts live there); legacy vendor uploads still listed — **shipped**
- Notes: event-style compose (type + voice) via `addVendorNoteAction` — **shipped**
- Block vendor (required reason saved as note) + Unblock — **shipped**
- Performance: profile detail is single-fetch + batched event files; directory tabs/search stay client-local (no soft-nav flash); favorites/notes update optimistically — **shipped**
- Payments / Settings / Contracts / Communications profile tab / Pending directory tab — **removed** from product UI
- Legacy directory KPI layout editor (`vendors_directory_layout`) remains in codebase but is unused by the Ease directory shell — **retired from UI**

## Insights — soft launch **complete**
- **Ease redesign — Org + Event Insights (mockup at [`/insights-ease-mockup.html`](../../public/insights-ease-mockup.html)):** soft cream/Fraunces shell like Tasks/Files/Vendors; top view pills **Org Insights | Connect Meta | Event Insights** (`?view=org|connect|event` via local state + `history.replaceState`); curated KPI strip (Views · Reach · Interactions · Likes · Comments) with sparklines and forest selected state; quiet Content overview chart + period/best-day side stats; Top content horizontal carousel of all filtered posts (views-desc, soft arrow + scroll-snap; not a static top-3 grid / dense KPI-wall); honest Meta source note; platform pills All/Facebook/Instagram (`history.replaceState` for `?platform=`); date-range soft pills (7/14/28/30 → URL `from`/`to`); Refresh + Export CSV; rule-based “From your metrics” + Details drawer (no LLM narrative); Connect Meta empty matches mockup purpose/organic-only/Connect CTA (always available via `?view=connect`, even when Meta is already connected); Event `?tab=insights` and hub `?view=event` use the same Ease event shell (KPI strip, posts list, sync footer; no comparison banner) — **shipped**
- Unit contracts: `src/lib/insights/__tests__/insights-ease-ui.test.ts` — **shipped**
- Legacy dense hub (`InsightsHub`, drag-and-drop KPI layout editor, `EventInsightsTab` charts/breakdowns) remains in codebase but is unused by the Ease shells — **retired from UI**
- **Org Insights page** (`/insights`, sidebar **Insights**) — **shipped** (smoke: `tests/hey-ralli/smoke/11-insights.spec.ts`; `social_analytics` entitlement on **all plans** so Connect Meta empty + Ease UI stay reachable for soft launch / Meta App Review — living: [billing-and-access.md](../ops/billing-and-access.md))
  - View switch: Org Insights (default when Meta connected) · Connect Meta (default when not connected; always openable) · Event Insights (quiet event picker + Ease panel; defaults to soonest upcoming / most recent past; `?event=` + link to full event `?tab=insights`)
  - Overview KPI cards with sparklines (Views, Reach, Interactions, Likes, Comments) — reads `page_media_view` / post views from Meta; Comments/Likes fall back to post aggregates when Page-level series are empty
  - Content overview line chart (selected KPI drives series + period totals sidebar)
  - Platform filter (All / Facebook / Instagram) on KPIs, chart, and top content
  - Top content by views — horizontal carousel of posts in the active platform + date range (thumbnail, caption snippet, published time, views / reactions / comments / shares); Refresh syncs recent Facebook Page posts + Instagram media in range (not only posts published through Hey Ralli); Facebook post views use `post_media_view` batch; falls back to post engagement when insights are sparse
  - Date range presets (7 / 14 / 28 / 30 days) + URL `from` / `to`
  - Refresh from Meta + CSV export
  - Rule-based recommendations (“From your metrics” + details drawer); soft sync notes inline
  - Connect Meta empty state with `returnTo=/insights`
- **Event Insights tab** (`/events/[id]?tab=insights`) — **shipped** (living: [event-insights.md](./event-insights.md))
  - Event-scoped Meta performance for that event’s published `meta_publication_slots` + matching `social_post_insights` (org hub unchanged; same Meta connection)
  - KPI strip: Views · Reach · Interactions · Link clicks · Likes
  - Posts for this event list (artwork/caption, platform, views, likes; outbound link when URL exists)
  - No comparison / “vs typical” banner
  - Sync footer: last sync · Refresh (org-wide Meta sync) · link to Org Insights; opening the tab reads DB only (no automatic Graph pull)
  - Empty states: connect Meta · no published posts yet (copy only, no Approvals/Create CTAs) · need sync (Sync now + Org Insights; scope warning when missing)
  - Not on this tab: Age & gender, Top countries, Follows, Saves, organic-vs-ads / follower split, dense Views Total/By-post charts
- Organic vs ads breakdown, page visits, follows, conversations — **deferred** (org hub)
- Audience demographics overview (Age & gender, Top countries) — **deferred** (org + event; not requested in OAuth; classic Page age/gender insight metrics deprecated by Meta — App Review answer: [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md#5-demographics-age--gender--definitive-answer))
- LLM-generated narrative — **deferred**
- Year-end / board operational analytics — **deferred** (see [blueprints/11_ANALYTICS.md](./blueprints/11_ANALYTICS.md))

## Communication Plans
- Communication Plan library, assign by event type, post timelines — **shipped**
- System template save forks an org-editable copy (RLS blocks editing globals) — **shipped**
- Standalone Event Communication Plans nav → redirects to Events

## AI Brain & assistant
- Org voice / style / audience prefs — **shipped**
- Inbox AI sources — **shipped**
- Help Center — **shipped** (`/help` curated how-tos for getting started, team invite, Meta connect, Create with AI, Approvals, billing; support email `hello@heyralli.com`; opened via **Browse Help Center** in the Ask Ralli dialog)
- Hey Ralli Assistant (Ask Ralli) — **shipped** (Phases 1–5 ops coach complete: Phase 1 event ops + Phase 2 org/role briefings + Phase 3 volunteers/communications depth + Phase 4 content draft helper + Phase 5 insights/health/risk recommendations via campaign-director health/risks/next-action and Meta Insights when metrics exist — otherwise honest “no performance data yet” + highest-impact ops fallback; PTO communication plan tips (`source: pto`) for recruitment/timeline/checklist/getting-started/parent-perspective advice; “what should I work on today?” / “what would you do?” / “catch me up” map to live org briefing or numbered priority lists; experienced-PTO-president voice across coaches; deep links to Insights / event / Approvals / Create with AI; ops/org still win for “what’s next” / “today’s summary” / “what do I have this week” / milestone progress (“are all my milestones done for this week”); product-help FAQ retained for how-to (bare “milestones” no longer steals status asks); when an event isn’t named, ops/content offer upcoming campaign chips instead of only Campaigns links; ambiguous event matches return dated chips that re-ask with a forced eventId; answer body strips markdown links when chips are shown; **demoted from sidebar pin** — top-rail **?** opens Ask Ralli; how-to answers (faq/ai/pto) always include a **Help Center** chip (`/help` or `/help#{article}`) plus the destination route; dialog header Browse Help Center; dialog chunk lazy-loads on open — **shipped** perf). Living eng/QA doc: [ask-ralli-assistant.md](../engineering/ask-ralli-assistant.md); Playwright: `tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts`
- AI credits engine — **shipped** (Phases 1–6: metering, widget, Owner monitor/grants, billing catalog, Stripe Checkout/Portal/webhooks, 14-day trial + 600 credits, feature/capacity gates, hard-block AI when period + Reserve cannot cover the action — living: [billing-and-access.md](../ops/billing-and-access.md) · [stripe-integration.md](../engineering/stripe-integration.md) · [ai-and-apis.md](./ai-and-apis.md))
- AI credits widget — **shipped** (sidebar balance + soft warn + exhausted hard-stop CTA to Billing)
- Owner AI credits monitoring — **shipped** (Phase 3: Credits tab on `/ops/ai-apis` — per-org plan/used/reserve/OpenAI $/health + ledger)
- Owner AI credits grants — **shipped** (Phase 4: Reserve SKU / custom bonus / signed Reserve adjustment on selected org)
- Stripe billing + trial + plan gates — **shipped** (Phase 5: Checkout/Portal/webhooks live in Production + app trial + Stripe `trial_period_days` / `trialing` sync + 13 feature/capacity gates + canceled-subscription full lockout; Org Insights / `social_analytics` available on Starter–Premium; see [billing-and-access.md](../ops/billing-and-access.md#11-gates-enforced-today) · eng: [stripe-integration.md](../engineering/stripe-integration.md))

## Settings
- **Ease redesign** — soft cream/Fraunces Settings hub with quiet left nav grouped **Workspace** (Overview · Organization · Branding · Team & Access) · **Connections** (Integrations · Billing & Plan) · **You** (Account); HTML mockup at [`/settings-ease-mockup.html`](../../public/settings-ease-mockup.html) — **complete** (Phases 1–7 + Branding hub shipped; Jul 28 copy sweep + simplicity rated **High** on hub navigation)
  - Phase 2: Organization — **shipped**
  - Phase 3: School year — **shipped** (now nested under Branding; `/settings/school-year` still works)
  - Phase 4: Team & Access — **shipped**
  - Phase 5: Integrations (+ Meta / Calendar detail) — **shipped**
  - Phase 6: Billing & Plan — **shipped**
  - Phase 7: Account (profile · notifications · sign-out · erase account) — **shipped**
- **Branding settings hub** — soft left nav School year → Branding; hub + section pills for AI Brain · AI Inbox · Communication Plan · Colors & Logos · School Year (nested); wired to `/settings/ai-brain`, `/settings/inbox-ai`, `/settings/playbooks-milestones`, `/onboarding/brand?standalone=1`, and nested Ease school-year panels; route `/settings/branding` (`?section=`); mockup [`/settings-ease-mockup.html?view=branding`](../../public/settings-ease-mockup.html) (alias [`/settings-branding-ease-mockup.html`](../../public/settings-branding-ease-mockup.html)) — **shipped**
- Header settings gear → `/settings` (Ease hub; section list is Settings left nav, not a header dropdown) — **shipped**
- Overview (Ease hub summary cards + Connected + Branding snapshot) — **shipped** (Phase 1; Branding card replaces School year card)
- Organization (profile with full mailing address · weather location · preferences · posting — Ease cream/Fraunces panels; Branding home → `/settings/branding`; Save changes + Edit schedule wired) — **shipped** (Phase 2)
- School year (active year · subscribe URL save/sync · close & begin next — Ease cream/Fraunces panels; nested under Branding + standalone `/settings/school-year`) — **shipped** (Phase 3)
- Board roster / committees / responsibility matrix — **partial** (Import roster on Team & Access Ease with Excel template download at `/templates/board-roster-import.xlsx`; `.xlsx` + paste parsing restored; visual Board & committees + responsibility matrix UI not mounted on Ease after shell cutover)
- Team & Access (seats · people · invites · Import roster · Invite — Ease cream/Fraunces panels; edit/invite modals + roster import wired with Excel template + file/paste preview; person profiles still at `/settings/team-access/people/[id]`) — **shipped** (Phase 4)
  - **Permissions + person access drawer** (roles & permissions soft pills / chips from real access templates; cream/Fraunces person drawer with Overview · Events · Access — event link toggles, access role, permission switches, Give/Resend access; `?person=` / `?tab=` via local state + `history.replaceState`; Edit roles reuses Access templates editor) — **shipped** (mockup: [`/settings-team-access-ease-mockup.html`](../../public/settings-team-access-ease-mockup.html); full-page person profiles remain as deep links)
  - **Last logged in** on People rows + person drawer (Supabase Auth `last_sign_in_at` via org-scoped admin `getUserById`; shows `Never` when null) — **shipped**
  - Customer-facing copy on Ease Team Access (list, invite, drawer, roles, permission chips) — **shipped** (org/team language; Jul 27 sweep)
- Integrations hub (Ease cream/Fraunces list: Facebook & Instagram · Google Calendar · Canva · Monday · deferred Gmail/Dropbox; Connect/Manage wired) — **shipped** (Phase 5)
- Meta detail (honest App Review copy · Page/IG chips · Reconnect/Disconnect) — **shipped** (Phase 5; `/settings/meta`)
- Google Calendar detail (Sign-in · Sync · Open Import · Disconnect · subscribe URL Save feed) — **shipped** (Phase 5; `/settings/integrations/calendar`)
- Integrations: Google Calendar (Sign-in + ICS + upload — live), Meta, Canva, Monday — **shipped**; Gmail / Dropbox / Constant Contact — **deferred**; SignUpGenius — **shipped** as public URL connect + review-before-import on event Volunteers (OAuth deferred until Pro is common)
- Meta / Canva / Monday / Google Calendar: one Connect CTA → provider consent → done (`src/lib/integrations/oauth.ts`); shared health framework — **partial** (see [meta.md](../integrations/meta.md), [google-calendar.md](../integrations/google-calendar.md))
- OAuth provider tokens (Meta/Canva/Monday/Google Calendar) encrypted at rest (AES-256-GCM, backward-compatible with pre-existing plaintext rows) — **shipped** (security: [audit-remediation.md](../security/audit-remediation.md#low--info-cleanup-not-launch-blocking); ops: [env-and-secrets.md](../ops/env-and-secrets.md#oauth-token-encryption-at-rest))
- Billing & Plan UI — **shipped** (Phase 6 Ease on `/settings/billing-plan`; soft pills Usage · Plans · Payment via `?view=`; real Stripe portal / Checkout / Reserve; canceled orgs still land on `/billing/canceled`; eng: [stripe-integration.md](../engineering/stripe-integration.md))
- **Billing usage / overage / upgrade** — **shipped** (Ease pass matching [`settings-billing-ease-mockup.html`](../../public/settings-billing-ease-mockup.html): period meters for AI credits · Reserve · seats · Meta posts, **Buy more Reserve** on Period snapshot, category breakdown when data exists, honest soft-warn → Reserve → hard-block copy with no surprise overage charges, Starter / Professional / Premium catalog + Stripe upgrade, Payment card / renewals / invoices / portal; founding/`billing_exempt` keeps unlimited credits + waived copy but does **not** hide plan catalog or manage CTAs; eng: [stripe-integration.md](../engineering/stripe-integration.md))
- Account (Ease cream/Fraunces: display name save · Change password (email/password) or Google sign-in note · quiet notification toggles persisted on membership · session honesty copy — 30-day sliding, no idle auto-logout (Option A) + SignOutForm clear-on-signout · Delete/erase account with password or type-DELETE confirm, last-admin guard, Auth user + membership purge; approval email dispatch respects “Approval needs attention”) — **shipped** (Phase 7; `/settings/account`)
- Advanced: export, 2FA — **stub** / **deferred**; Security session copy matches Option A (honesty-only, not configurable); workspace danger-zone delete — **stub** (account erase lives on Account)

## Support & shell
- Report a problem (Sentry) — **shipped**
- Nav badges, collapsible sidebar — **shipped**
- Settings soft left nav (Ease) + header gear deep-link to `/settings` — **shipped** (Phase 1)

---

## Primary nav
Dashboard · Calendar · Events · Volunteers · Create with AI · Approvals · Tasks · Communications Hub · Files

**Top rail utilities:** Home · Ask Ralli (**?**) · Settings — Help Center at `/help` via dialog “Browse Help Center”; not sidebar-pinned

**Soft-launch nav trim:** org **Vendors** (`/vendors`) and **Insights** (`/insights`) are **removed from the left rail** so the product reads as a calmer communications toolkit. Both remain on each event’s workspace tabs (`?tab=vendors` · `?tab=insights`) and via direct URL. Meta App Review / public Meta connect for other orgs stays a hard launch gate (founder temp account can still post).

Settings: Overview · Organization · Branding · Team & Access · Integrations · Billing & Plan · Account (Ease left nav at `/settings`; Advanced · Get started · legacy routes deep-link via redirects)

---

## Not yet full product (appendix)
Stripe billing · Gmail / Dropbox / Constant Contact · Tasks Calendar/Timeline/Workload · 2FA · Inbox assign/campaign filter · Full Create-with-AI → Meta published sync · Vendor payments/contracts depth · Shared one-click Meta OAuth framework polish (see [meta.md](../integrations/meta.md)) · Longer vision (SMS, native mobile, multi-vertical, succession, year clone, etc.)

---

**Canonical docs:** [Documentation home](../README.md) · [Architecture](../engineering/architecture.md) · [QA overview](../qa/architecture-overview.md)
