# Hey Ralli — Full feature list

Product brand: **Hey Ralli**.  
**Status:** Living  
**Owner:** Product / Engineering  
Status hints: **shipped**, **partial**, **stub**, **deferred**, **removed**.  
**Last updated:** July 22, 2026 — Unified Get started: Welcome → event → overlay Calendar → Brand → Team → Meta; Helpful next steps on home; settings have no boarding steppers; artwork Apply hydrate stick; welcome email CTA; event detail sunburst accents; Volunteers SignUpGenius sticky date allowlist; Events Home artwork fallback; hero Filled volunteers; Meta Graph schedule on Approve + Calendar DnD

---

## Marketing & public
- Landing / home — **shipped**
- Features explorer / product demos — **shipped**
- Pricing page ($29 / $59 / $99 marketing) — **shipped**; checkout **deferred**
- About — **shipped**
- Email deep links (`/go/...`) — **shipped**

## Auth & onboarding
- Sign in / sign up — **shipped**
- Founding access code + org welcome magic-link email (CTA **Let's get started** → `/auth/callback` → `/onboarding`) — **shipped** (eng: [auth-welcome-email.md](../engineering/auth-welcome-email.md))
- Secure invite accept (`/invite/[token]`, set password) — **shipped**
- Developer agreements gate (NDA + IP, in-app e-sign: typed legal name + drawn signature; scroll-to-enable; audit log) — **shipped** (`/account/agreements`; owner manage at `/account/agreements/manage`; eng: [developer-agreements.md](../engineering/developer-agreements.md))
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
- Active organization (membership-scoped workspace) — **shipped**
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
- Personalized Today hero, What’s Next, approvals/published pulse — **shipped**
- Waiting on you / waiting on others — **shipped**
- Week ahead / upcoming events + weather context — **shipped**

## Events
- Events list, create, edit — **shipped** (list thumbnails fall back to promoted approved-square artwork when the row is outside the upcoming/first-page prefetch window)
- Event detail workspace (tabs: Approvals, Tasks, Create with AI [handoff], Volunteers, Responsibilities, Notes, Files, Vendors, Activity; default Approvals) — **shipped**
- Event Tasks start empty (user-created); auto-seeded default planning checklist on event open — **removed**
- Event detail hero stats (Milestones from Create with AI session when present else classic steps; Pending Approvals + Scheduled Posts from Approvals scheduling; Tasks from playbook tables; Filled from latest confirmed volunteer snapshot) — clickable to Create with AI / Approvals / Tasks / Volunteers — **shipped**
- Event detail brand accents (sunburst palette tokens: navy / mustard / sage / terracotta on hero, stats, tabs, status badges) — **shipped**
- Volunteers (SignUpGenius URL; review multi-select dates + sticky allowlist reapplied on refresh; assignment table Filter + Date + Sort; summary cards match filtered assignments) — **shipped** (living doc: [signupgenius.md](../integrations/signupgenius.md))
- Legacy planning hub — **partial** / legacy (fallback only; Phase 3 is default)

## Create with AI (Campaign Builder)
- Hub to pick/create an event — **shipped**
- Inspiration / creative setup, logos, milestones — **shipped**
- Artwork guidance from Creative Setup: Overall inspiration comment + per-image comments (not legacy Notes to AI); organization brand kit from Build your brand kit (`/onboarding/brand`) auto-applies to Create with AI (primary/accent colors, mascot, logo image refs in prompts) — Creative Setup logo/color/tone toggles stay optional — see [create-with-ai-artwork-inputs.md](../qa/create-with-ai-artwork-inputs.md) — **shipped** (QA matrix + Playwright wiring)
- Generate artwork + captions per milestone — **shipped**
- Artwork Apply hydrate: regenerated artwork sticks after Apply (local backup + hydrate merge so remount / Preview hydrate does not orphan richer in-memory art) — **shipped**
- 4-step flow (Creative Setup → Milestones → Preview → Review & Approve) — **shipped**
- Review tabs (All / Needs review / Approved / Changes requested) with Pending Review · Approved · Changes requested pills — **shipped**
- Review Approval workflow sidebar shows org default approver from Team Access (same resolution as send-for-approval); unassigned when none — **shipped**
- Sent for approval confirmation notice (not a stepper step); returns to Review — **shipped**
- Full Meta slot sync after approval — **stub** / incomplete

## Artwork & creative
- AI artwork generation (feed + story), approve/deny/adjust — **shipped**
- Logo in artwork — **shipped**
- Canva import — **shipped** (config-dependent)
- Legacy Creative Studio — **stub** / redirected away

## Captions, Meta & publishing
- Caption generation/editing — **shipped**
- Meta connect (Facebook Page + Instagram) — **shipped**
- Schedule / publish now / publish ready bundles — **shipped**
- Meta-native Facebook Page feed schedule on Approve (`published=false` + `scheduled_publish_time`; Graph ids on `meta_publication_slots`) — **shipped** (Instagram / FB stories stay on CampignOS publish-when-due; QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md))
- Calendar DnD reschedule syncs Meta Graph schedule time without re-approval — **shipped** (DB always updates; Graph failure → warning toast, no rollback; QA: [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md))
- Posting schedule preferences — **shipped**
- Weekly posting summary emails — **removed** (orphaned placeholder; not a product feature)

## Approvals & scheduling
- Unified Approvals hub (pending, changes, scheduled, published) — **shipped**
- Status summary cards as clickable workflow filters (click again to clear to All); approve / request changes, campaign & view-scope filters, search, badges — **shipped**
- Event detail Approvals tab: same table without status filter tabs/search chrome; sortable column headers (default schedule ascending) — **shipped**
- Change-requested items show the approver comment + Edit & resend / Edit artwork CTAs (Approvals drawer + email); Preview/Review show the comment with caption, schedule, and artwork edit paths; **Send for re-approval** submits that milestone’s current content (existing artwork OK — no regenerate-all) and emails the Team Access approver again (`Resubmitted for approval: …`, with fallback to the prior assignee if the current role has no email; UI confirms the recipient address) — **shipped**
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
- Campaign filter / assign owner — **deferred**
- Gmail inbox — **deferred**

## Tasks — soft launch **complete**
- Main Table (create/edit/status/assignee, AI suggestions) — **shipped**
- Main Table access aligned with event access (`canAccessEvent` / EffectiveAccess) — **shipped**
- No auto-seeded demo/default task rows on event open — **shipped** (empty until user creates)
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

## Vendors
- Directory, add/edit/archive, profile, link to events — **shipped**
- Payments / contracts / communications tabs — **partial** (shell)

## Insights — soft launch **complete**
- Meta Insights hub (`/insights`) — **shipped**
- KPIs (reach, engagement, likes, comments, shares) — **shipped**
- Performance chart + platform filter (All / Facebook / Instagram) — **shipped**
- Content breakdown, platforms, recent activity, top posts — **shipped**
- Date range presets (7 / 14 / 30 days) + URL `from` / `to` — **shipped**
- Refresh from Meta + CSV export — **shipped**
- Rule-based recommendations (“From your metrics” + details drawer) — **shipped**
- Soft sync notes inline under recommendations (not full-page banner) — **shipped**
- Connect Meta empty state with `returnTo=/insights` — **shipped**
- Audience demographics overview — **deferred**
- LLM-generated narrative — **deferred**
- Year-end / board operational analytics — **deferred** (see [blueprints/11_ANALYTICS.md](./blueprints/11_ANALYTICS.md))
- Smoke: `tests/hey-ralli/smoke/11-insights.spec.ts` — **shipped**

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
Dashboard · Calendar · Events · Create with AI · Approvals · Tasks · Communications Hub · Files · Vendors · Insights · Hey Ralli Assistant (pinned under Insights)

Settings: Overview · Organization · Team & Access · Integrations · AI Brain · Inbox AI · Playbooks · Get started · Billing · Advanced

---

## Not yet full product (appendix)
Stripe billing · Gmail / Dropbox / Constant Contact · Tasks Calendar/Timeline/Workload · 2FA · Inbox assign/campaign filter · Full Create-with-AI → Meta published sync · Vendor payments/contracts depth · Shared one-click Meta OAuth framework polish (see [meta.md](../integrations/meta.md)) · Longer vision (SMS, native mobile, multi-vertical, succession, year clone, etc.)

---

**Canonical docs:** [Documentation home](../README.md) · [Architecture](../engineering/architecture.md) · [QA overview](../qa/architecture-overview.md)
