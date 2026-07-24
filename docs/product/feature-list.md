# Hey Ralli — Full feature list

Product brand: **Hey Ralli**.  
**Status:** Living  
**Owner:** Product / Engineering  
Status hints: **shipped**, **partial**, **stub**, **deferred**, **removed**.  
**Last updated:** July 23, 2026 — Owner AI & APIs Phase 5 accuracy tooling

---

## Marketing & public
- Landing / home — **shipped**
- Features (`/features`) — **shipped** (“See Hey Ralli in Action”: live Motion demos for Create with AI, Calendar / Plan Your Year, Approvals, Volunteer Master, Communications Hub / Meta inbox, Ask Ralli; private harness at `/dev/motion-engine`)
- Pricing page ($29 / $59 / $99 marketing) — **shipped**; checkout **deferred**
- About — **shipped**
- Email deep links (`/go/...`) — **shipped**

## Auth & onboarding
- Access model (founding code → org, invites, multi-org switcher, roles, gates) — **shipped** (living: [access-and-onboarding.md](../security/access-and-onboarding.md))
- Sign in / sign up — **shipped**
- Founding access code + org welcome magic-link email (CTA **Let's get started** → `/auth/callback` → `/onboarding`) — **shipped** (eng: [auth-welcome-email.md](../engineering/auth-welcome-email.md))
- Secure invite accept (`/invite/[token]`, set password) — **shipped**
- Developer agreements gate (NDA + IP, in-app e-sign: full name + email + optional company + drawn signature; scroll-to-enable; signed receipt on panels; Hey Ralli-themed UI; audit log; executed-copy email CTA via app download API with token) — **shipped** (`/account/agreements`; owner manage at `/account/agreements/manage`; eng: [developer-agreements.md](../engineering/developer-agreements.md); QA: [developer-agreements.md](../qa/developer-agreements.md))
- Owner dashboard (`/ops`) — platform metrics + **Developers signed** counter-sign queue — **shipped** (gated by `HEY_RALLI_OWNER_EMAILS` **and** Owner/`campaign_role=admin` seat)
- Owner **AI & APIs** (`/ops/ai-apis`) — monitor AI usage, connected API usage, operating costs, customer consumption (tabs: AI APIs · Connected APIs); Owner sidebar group under Ops — **partial** (Phases 0–5 eng + optional one-time OpenAI Usage history import via `OPENAI_ADMIN_KEY`; Edmondson/School B pinned for org view; **shipped** after Owner QA § F; living: [ai-and-apis.md](./ai-and-apis.md); QA: [owner-ai-apis.md](../qa/owner-ai-apis.md))
- Get started (one boarding flow) — **shipped**:
  - Routes: `/onboarding` (Welcome) → create first event (`/events/create?onboarding=1`) → **stay on event** with overlay **Calendar → Brand → Team → Meta** (all skippable); also `/onboarding/brand`, `/onboarding/invite`, `/onboarding/meta`
  - Overlay CTAs: primary action · **Do this later** (advances stepper **in place**, stays on event) · **Stay on event** (dismisses overlay only)
  - Calendar primary → canonical `/calendar/import`; Brand → `/onboarding/brand`; Invite → `/onboarding/invite`; Meta → `/settings/meta` with `returnTo` back to the event when possible
  - Helpful next steps on **home/dashboard** until done: **Set up now** + **Later**; Settings → Get started shows the same simple cards (no wizard); overlay skip still surfaces cards until Later or real completion
  - Progress on `organizations.onboarding_state` (incl. meta completed/skipped/checklist-dismissed)
  - Restart / replay Welcome (`RestartOnboardingButton` → `/onboarding?welcome=1`); creating an onboarding event clears stale flags so Calendar → Brand → Team → Meta can replay
  - Organization settings: **no** boarding steppers; Brand CTA → `/onboarding/brand?standalone=1` (no Event/Calendar/Team/Meta chrome); Edit profile stays on org settings (never `?view=wizard`); founding with no membership → `/onboarding` (no SchoolSetupWizard)
- Brand kit (canonical): `/onboarding/brand` — PTO + school logos, additional brand-kit logos, colors, mascot, live preview; boarding Continue → invite; Organization → Edit branding uses `?standalone=1` — **shipped**
- Legacy 6-step SchoolSetupWizard — **retired for members** (legacy query redirects: `?view=wizard`/`?step=school` → org settings; `?step=meta` → integrations; `?step=calendar` → `/calendar/import`; `?step=brand` → brand standalone)
- Change password — **shipped**
- Deactivated-account handling — **shipped**

## Multi-org & tenancy
- Active organization (membership-scoped workspace) — **shipped** (living: [access-and-onboarding.md](../security/access-and-onboarding.md))
- Organization switcher (when >1 active memberships) — **shipped** (MVP)
- Stripe / paid plan gates — **deferred** (Phase E)

## Access control & team
- Access templates (permission toggles) — **shipped**
- Built-in role presets (Owner, President, VP, Chair, Volunteer, Viewer) — **shipped**
- See vs work (view all / work assigned, or strict assigned-only) — **shipped**
- Invite / resend / cancel invite; deactivate / remove members — **shipped**
- Event assignments — **shipped**
- Permission gates (artwork, approve, publish, people, integrations, etc.) — **shipped**
- Role simulator (dev/test, gated) — **shipped**

## Dashboard (Today)
- Lean Today home (Mock A): calm greeting (no “TODAY” eyebrow / attention tally), full-bleed **Up Next** hero with artwork + sage badge, weather + mini calendar + This Week (school **events** only, `Day · title` rows) — **shipped**
- Attention links under Up Next (counts only, hide when zero): to review → Approvals · need volunteers (underfilled **events**) → Volunteers · tasks this week → Tasks My View — **shipped**
- Approvals/published pulse cards + waiting-on companion lists on home — **removed** (use Approvals / Tasks / Volunteers)
- Live weather from org Weather ZIP preferred, then city/state + `WEATHER_API_KEY`; mini calendar school events for the month with hover titles — **shipped**

## Events
- Events list, create, edit — **shipped** (list thumbnails fall back to promoted approved-square artwork when the row is outside the upcoming/first-page prefetch window)
- Events Home action summary cards (clickable filters: Next 60 Days · Needs Setup · Ready to Run · Needs Follow-up · Done; default Next 60 Days; counts scoped to school-year filter; overlap allowed) — **shipped**
- Events list filtered PDF export (All Events header download; current list filters only — not upcoming carousel) — **shipped**
- Event detail workspace (tabs: Approvals, Tasks, Create with AI [handoff], Volunteers, Insights, Responsibilities, Notes, Files, Vendors, Activity; default Approvals) — **shipped**
- Event detail Insights tab — see **Insights** below (living: [event-insights.md](./event-insights.md))
- Event Tasks start empty (user-created); auto-seeded default planning checklist on event open — **removed**
- Event detail hero stats (Milestones from Create with AI session when present else classic steps; Pending Approvals + Scheduled Posts from Approvals scheduling; Tasks from playbook tables; Filled from latest confirmed volunteer snapshot) — clickable to Create with AI / Approvals / Tasks / Volunteers — **shipped**
- Event detail brand accents (sunburst palette tokens: navy / mustard / sage / terracotta on hero, stats, tabs, status badges) — **shipped**
- Event Volunteers tab — see **Volunteers** below (living: [signupgenius.md](../integrations/signupgenius.md) · org overview: [volunteer-master.md](./volunteer-master.md))
- Legacy planning hub — **partial** / legacy (fallback only; Phase 3 is default)

## Volunteers
- **Volunteer Master page** (`/volunteers`, sidebar **Volunteers**) — **shipped** (living: [volunteer-master.md](./volunteer-master.md) · import: [signupgenius.md](../integrations/signupgenius.md))
  - Org-wide staffing scan: which events need people and how filled SignUpGenius / planning signup roles are
  - Auto-feed: non-archived school-year events with an active SignUpGenius source (`pending_review` / `connected` / `error`) **or** a non-empty planning `volunteer_signup` URL; scoped by viewer’s event access
  - KPI cards (clickable filters): Total Volunteers · Overall Fill Rate · Underfilled Roles · Upcoming Events (next 60 days); default chip filter **Upcoming**
  - Search (event title or role) + chips: Upcoming · Needs people · Covered · All (Covered = confirmed snapshot, fill ≥ 100%, zero underfilled roles)
  - Events table: circular artwork (approved square when filled; else initials), Fill Rate with shared color bands (Critical → Fully Staffed), Top Roles (up to 3), expand row with Open Volunteers tab / Open signup / underfilled copy
  - **This week** rail: underfilled roles for events dated this calendar week (Sun start; cap 8); View all underfilled roles → underfilled filter
  - Sync footer: SignUpGenius sync note + latest successful sync; connect/refresh stay on event Volunteers tab
  - Privacy: aggregate quantities and role names only — **no volunteer PII**
- **Event Volunteers tab** (`/events/[id]?tab=volunteers`) — **shipped** (writes sources/snapshots; Master only reads)
  - SignUpGenius public URL connect → review multi-select dates + sticky allowlist reapplied on refresh
  - Assignments-first layout: Needs Snapshot / Quick Totals / Overall Filled strip + AI Assistant right rail
  - Assignment table Filter + Date + Sort; summaries match filtered assignments
  - Same fill-rate color bands as Volunteer Master on Overall Filled and per-assignment progress

## Create with AI (Campaign Builder)
- Nav / `/create-with-ai` lands on Creative Setup (inspiration) for a default event (soonest upcoming, else most recent past); empty/access hub when no events or no permission — **shipped**
- Inspiration / creative setup, logos, milestones — **shipped**
- Artwork guidance from Creative Setup: Overall inspiration comment + per-image comments (not legacy Notes to AI); logo / brand colors / voice toggles are explicit opt-in only (org brand kit is not auto-surfaced or auto-applied) — see [create-with-ai-artwork-inputs.md](../qa/create-with-ai-artwork-inputs.md) — **shipped** (QA matrix + Playwright wiring)
- Generate artwork + captions per milestone — **shipped**
- Artwork Apply hydrate: regenerated artwork sticks after Apply (local backup + hydrate merge so remount / Preview hydrate does not orphan richer in-memory art) — **shipped**
- 4-step flow (Creative Setup → Milestones → Preview → Review & Approve) — **shipped**
- Review tabs (All / Needs review / Approved / Changes requested) with Pending Review · Approved · Changes requested pills — **shipped**
- Review Approval workflow sidebar shows org default approver from Team Access (same resolution as send-for-approval); unassigned when none — **shipped**
- Review footer shows one primary CTA: **Send for approval** when Team Access has a distinct reviewer; **Approve all & schedule** when the approver is missing, unassigned, or yourself — **shipped**
- Review **Send for approval** stays disabled until artwork + captions are complete; shows inline **Missing: …** (not schedule) when blocked — **shipped**
- Sent for approval confirmation notice (not a stepper step); returns to Review — **shipped**
- Full Meta slot sync after approval — **stub** / incomplete

## Artwork & creative
- AI artwork generation (feed + story), approve/deny/adjust — **shipped**
- Logo in artwork — **shipped**
- Canva import — **shipped** (config-dependent; Creative Setup Inspiration: **Import from Canva** → design picker → PNG stored as inspiration image; org Connect in Settings → Canva)
- Legacy Creative Studio — **stub** / redirected away

## Captions, Meta & publishing
- Caption generation/editing — **shipped** (Create with AI: regenerate auto-saves; hydrate no longer strips legitimate captions that mention volunteers)
- Caption Apply hydrate: saved captions stick after Edit caption / regenerate / refresh (exact known seed demos only are cleared) — **shipped**
- Meta connect (Facebook Page + Instagram) — **shipped**
- Create with AI Delivery method: **Publish Now** (default) posts to Meta on approve; Schedule / Email manual / Draft remain — **shipped** (legacy “Publish automatically” / `auto-publish` normalizes to Publish Now)
- Schedule / publish now / publish ready bundles (Review & Publish + Meta bundles) — **shipped**
- Meta-native Facebook Page feed schedule on Approve (`published=false` + `scheduled_publish_time`; Graph ids on `meta_publication_slots`) — **shipped** (Instagram / FB stories stay on CampignOS publish-when-due; Publish Now skips native Graph schedule and publishes immediately; QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md))
- Meta planner / Calendar show Publish Now + custom-date slots even when `relative_day` is outside the playbook (sync no longer deletes committed orphans; bundles merge orphan days) — **shipped**
- Calendar DnD reschedule syncs Meta Graph schedule time without re-approval — **shipped** (DB always updates; Graph failure → warning toast, no rollback; QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md))
- Posting schedule preferences — **shipped**
- Weekly posting summary emails — **removed** (orphaned placeholder; not a product feature)

## Approvals & scheduling
- Unified Approvals hub (pending, changes, scheduled, published) — **shipped**
- Status summary cards as clickable workflow filters (Assigned to Me / Changes Requested / In Queue / Scheduled / Published; click again to clear to All; Posted row status remains in the table under Scheduled coverage); approve / request changes, campaign & view-scope filters, search, badges — **shipped**
- Event detail Approvals tab: same table without status filter tabs/search chrome; sortable column headers (default schedule ascending) — **shipped**
- Approvals table Actions column shows **View** only (approve / request changes stay in the review drawer) — **shipped**
- Change-requested items show the approver comment + **Edit Artwork** / **Change Date** CTAs (Approvals drawer + email; Edit Artwork → Create with AI Preview + edit-artwork modal for that milestone; Change Date → Preview Campaign for that milestone); Preview/Review banners keep caption / Change Date / artwork paths plus **Send for re-approval**; resubmit emails the Team Access approver again (`Resubmitted for approval: …`, with fallback to the prior assignee if the current role has no email; UI confirms the recipient address) — **shipped**
- Legacy Publishing Center → redirects to Approvals

## Calendar
- School-year calendar (month / week / agenda) — **shipped**
- Layer toggles, detail panel — **shipped**
- Drag-and-drop Meta posts: schedule-only (approval preserved); Graph reschedule when a native schedule id exists — **shipped** (QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md); not school-event import)
- Posting heatmap (Calendar week view + planning suggestions; prefs + published Meta history; gated on org Meta connection) — **shipped**
- Insights-weighted engagement heatmap — **deferred** (current scores use preferred windows + local publish times, not Meta Insights metrics)
- Google Calendar Sign-in (OAuth → auto-sync → review → `/calendar` + dashboard) — **shipped** (live; see [google-calendar.md](../integrations/google-calendar.md))
- Google Calendar daily sync cron (auto-import new events) — **shipped**
- Google Calendar on Import page + Calendar header CTAs — **shipped**
- ICS / webcal subscribe feed — **shipped**
- Calendar file upload + import review (incl. AI fix) — **shipped** (canonical UX: `/calendar/import` → `/calendar/review` — Google + ICS + file on one screen; onboarding checklist + Get started wizard calendar step use that same path; Settings → Google Calendar is connect/subscribe with deep-links to Import)
- Calendar import review plan type from org playbooks (Settings → Playbooks; stores `playbookId` on import) — **shipped**
- Calendar import review search (name/category/date/year), type/date filters, and Archive past events (bulk remove prior dates from the import queue) — **shipped**
- Calendar Import list search (name/category/date/year) with Select all / Delete selected on visible filtered rows — **shipped** (`/calendar` → Import list; hard-deletes events for the org’s school years — same membership as Events, not the rolling calendar date window)
- Calendar import dedupe (ICS UID / Google id / AI fingerprint; Update on date change; review New/Duplicate/Update/Conflict) — **shipped** (canonical: `/calendar/import` + `/calendar/review`; QA: [calendar-import-dedupe.md](../qa/calendar-import-dedupe.md); Playwright: `tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts`)
- Communications planning calendar — **shipped** (secondary)
- Gmail inbox OAuth — **deferred** (see [google-calendar.md](../integrations/google-calendar.md))

## Communications Hub (inbox)
- Unified Meta inbox (DMs, comments, mentions) — **shipped**
- Thread workspace, reply, mark read — **shipped**
- Inbox AI drafts + approve-then-send — **shipped**
- Comment/tag detail panel shows original parent post (caption + artwork); clutter placeholders (similar questions, take-action list, related campaign) removed — **shipped**
- Messenger timeline always shows a profile picture (or initials/fallback) next to every bubble — **shipped**
- Reply composer toolbar: full emoji picker (`emoji-picker-react`, search/categories) + org custom image stickers (upload PNG/WebP/GIF/JPEG to `organization_stickers` / `organization-stickers` bucket; picker shows images; DM send via Meta image attachment) + GIPHY GIF picker (search + trending via server proxy `/api/giphy/*`; rating `r`; page size 48 with Load more/`offset`; DM-only on `facebook_message` / `instagram_dm`; size-safe CDN URL sent as Meta image attachment like stickers; requires `GIPHY_API_KEY`) + quick emoji pack + 👍/❤️ quick-insert — **shipped**; comment/tag threads stay text-only for stickers/GIFs (clear notice); attachment icon still shows Meta text-only notice for generic files — **shipped**
- Double-tap / double-click message bubble → quick 👍 / ❤️ reaction bar synced to Meta when supported — **shipped** (Facebook/Instagram comments: Graph LIKE only — ❤️ maps to Like with honest UI copy; Messenger/IG DMs: `sender_action` react/unreact with the emoji; tagged threads stay Hey Ralli–local; metadata written only after Meta success; clear error if Graph rejects; IG comment likes need `instagram_manage_engagement` + reconnect)
- Jumbo emoji: emoji-only message bodies (1 = largest, 2–3 = large) render oversized in timeline bubbles; same sizing while composing in the reply textarea — **shipped**
- Thread actions: Follow up (star), Done, Delete (with confirm); queue filters Unread / Follow up / Done / Deleted — **shipped**
- Queue model: Unread is the default home (not Done, not Deleted; Follow up stays in Unread); Follow up = starred and not deleted; Done = marked done; Deleted via Manage — **shipped**
- Queue UI: Meta-style horizontal filter chips (Unread, Follow up, Done); Manage menu has Deleted only (AI workflow folders removed); list rows with platform badge, follow-up star, accent selected edge — **shipped** (search stays in top bar only)
- Top bar: search + Meta connection badge only — All Campaigns / All Channels dropdowns and AI Queue button removed (queues are Unread / Follow up / Done / Deleted) — **shipped**
- Platform badges by channel: Messenger bolt for `facebook_message`, IG paper-plane for `instagram_dm`, Facebook “f” / Instagram logo for comments & tags — **shipped** (queue avatar corner + thread header)
- Campaign filter / assign owner — **deferred**
- Gmail inbox — **deferred**

## Tasks — soft launch **complete**
- Main Table (create/edit/status/assignee, AI suggestions) — **shipped**
- Main Table access aligned with event access (`canAccessEvent` / EffectiveAccess) — **shipped**
- No auto-seeded demo/default task rows on event open — **shipped** (empty until user creates)
- Summary cards (Tasks due / Overdue / Completed) as clickable Main Table filters (`?summary=`; click again clears to all; selected = dark brown + white) — **shipped**
- My Tasks (assignee = signed-in user via `assignee_user_id`) — **shipped**
- My Views filters (Assigned / This Week / Overdue / Completed) — **shipped**
- Kanban board (by status) — **shipped**
- Focus board (To-do / This week / In progress / Done) — **shipped**
- Due date picker wired to task update — **shipped**
- Task detail drawer with notes (add/edit, autosave) — **shipped**
- Calendar / Timeline / Workload tabs — **deferred** (hidden from Tasks UI)
- Files tab on Tasks — **removed** (use sidebar Files → `/files`)
- Monday.com sync — **partial** (optional org integration; not required for Tasks)
- Smoke: `tests/hey-ralli/smoke/10-tasks.spec.ts` — **shipped**

## Files
- Global + event-scoped library (upload, search, categorize, metadata) — **shipped**
- Files & Documents toolbar: type/status/date filters + search; uploader “More filters” removed — **shipped**
- Drag-and-drop upload on Files & Documents (page drop opens upload dialog with file preselected) — **shipped**

## Vendors
- Directory, add/edit/archive, profile, link to events — **shipped**
- Payments / contracts / communications tabs — **partial** (shell)

## Insights — soft launch **complete**
- **Org Insights page** (`/insights`, sidebar **Insights**) — **shipped** (smoke: `tests/hey-ralli/smoke/11-insights.spec.ts`)
  - Overview KPI cards with sparklines (Views, Reach, Interactions, Likes, Comments) — reads `page_media_view` / post views from Meta; Comments/Likes fall back to post aggregates when Page-level series are empty
  - Content overview line chart (selected KPI drives series + hover tooltip + totals sidebar)
  - Platform filter (All / Facebook / Instagram) on KPIs, chart, and top content
  - Top content by views carousel (thumbnail, caption snippet, published time, views / reactions / comments / shares); Refresh syncs recent Facebook Page posts + Instagram media in range (not only posts published through Hey Ralli); Facebook post views use `post_media_view` batch; falls back to post engagement when insights are sparse
  - Bottom Platforms / Recent activity / Content breakdown cards removed (KPIs, chart, top content remain)
  - Date range presets (7 / 14 / 28 / 30 days) + URL `from` / `to`
  - Refresh from Meta + CSV export
  - Rule-based recommendations (“From your metrics” + details drawer); soft sync notes inline under recommendations
  - Connect Meta empty state with `returnTo=/insights`
- **Event Insights tab** (`/events/[id]?tab=insights`) — **shipped** (living: [event-insights.md](./event-insights.md))
  - Event-scoped Meta performance for that event’s published `meta_publication_slots` + matching `social_post_insights` (org hub unchanged; same Meta connection)
  - KPI strip: Views · Reach · Interactions · Link clicks · Likes (info tooltips)
  - Comparison banner when ≥2 posts have views (event total vs typical); Views Total / By post; Interactions breakdown (Likes / Comments / Shares)
  - Posts for this event list (artwork/caption, platform, views, likes; outbound link when URL exists)
  - Sync footer: last sync · Refresh (org-wide Meta sync) · link to Org Insights; opening the tab reads DB only (no automatic Graph pull)
  - Empty states: connect Meta · no published posts yet (copy only, no Approvals/Create CTAs) · need sync (Sync now + Org Insights; scope warning when missing)
  - Not on this tab: Age & gender, Top countries, Follows, Saves, organic-vs-ads / follower split
- Organic vs ads breakdown, page visits, follows, conversations — **deferred** (org hub; honest empty copy where shown)
- Audience demographics overview (Age & gender, Top countries) — **deferred** (org + event)
- LLM-generated narrative — **deferred**
- Year-end / board operational analytics — **deferred** (see [blueprints/11_ANALYTICS.md](./blueprints/11_ANALYTICS.md))

## Playbooks
- Playbook library, assign by event type, milestone timelines — **shipped**
- System template save forks an org-editable copy (RLS blocks editing globals) — **shipped**
- Standalone Event Playbooks nav → redirects to Events

## AI Brain & assistant
- Org voice / style / audience prefs — **shipped**
- Inbox AI sources — **shipped**
- Hey Ralli Assistant (Ask Ralli) — **shipped** (Phases 1–5 ops coach complete: Phase 1 event ops + Phase 2 org/role briefings + Phase 3 volunteers/communications depth + Phase 4 content draft helper + Phase 5 insights/health/risk recommendations via campaign-director health/risks/next-action and Meta Insights when metrics exist — otherwise honest “no performance data yet” + highest-impact ops fallback; deep links to Insights / event / Approvals / Create with AI; ops/org still win for “what’s next” / “today’s summary” / “what do I have this week”; product-help FAQ retained for how-to; ambiguous event matches return dated chips that re-ask with a forced eventId; answer body strips markdown links when chips are shown; pinned in the sidebar directly under Insights so it stays on screen). Living eng/QA doc: [ask-ralli-assistant.md](../engineering/ask-ralli-assistant.md); Playwright: `tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts`
- AI credits widget — **stub** (placeholder UI)

## Settings
- Header gear dropdown (Overview · Organization · Team & Access · Integrations · AI Brain · Inbox AI · Playbooks · Get started · Billing · Advanced) — **shipped**
- Overview, Organization (branding, timezone, logos, etc.) — **shipped**
- Board roster / committees / responsibility matrix — **shipped**
- Team & Access (people, templates, invites, person profiles, roster import) — **shipped**
- Integrations: Google Calendar (Sign-in + ICS + upload — live), Meta, Canva, Monday — **shipped**; Gmail / Dropbox / Constant Contact / SignUpGenius — **deferred**
- Meta / Canva / Monday / Google Calendar: one Connect CTA → provider consent → done (`src/lib/integrations/oauth.ts`); shared health framework — **partial** (see [meta.md](../integrations/meta.md), [google-calendar.md](../integrations/google-calendar.md))
- Billing & Plan UI — **partial**; Stripe checkout / real upgrades — **deferred**
- Advanced: export, 2FA — **stub** / **deferred**; danger-zone delete — **partial**

## Support & shell
- Report a problem (Sentry) — **shipped**
- Nav badges, collapsible sidebar — **shipped**
- Settings sections via header gear menu (no settings left sidebar) — **shipped**

---

## Primary nav
Dashboard · Calendar · Events · Volunteers · Create with AI · Approvals · Tasks · Communications Hub · Files · Vendors · Insights · Hey Ralli Assistant (pinned under Insights)

Settings: Overview · Organization · Team & Access · Integrations · AI Brain · Inbox AI · Playbooks · Get started · Billing · Advanced

---

## Not yet full product (appendix)
Stripe billing · Gmail / Dropbox / Constant Contact · Tasks Calendar/Timeline/Workload · 2FA · Inbox assign/campaign filter · Full Create-with-AI → Meta published sync · Vendor payments/contracts depth · Shared one-click Meta OAuth framework polish (see [meta.md](../integrations/meta.md)) · Longer vision (SMS, native mobile, multi-vertical, succession, year clone, etc.)

---

**Canonical docs:** [Documentation home](../README.md) · [Architecture](../engineering/architecture.md) · [QA overview](../qa/architecture-overview.md)
