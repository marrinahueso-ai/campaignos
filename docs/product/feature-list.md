# Hey Ralli — Full feature list

Product brand: **Hey Ralli**.  
**Status:** Living  
**Owner:** Product / Engineering  
Status hints: **shipped**, **partial**, **stub**, **deferred**, **removed**.  
**Last updated:** July 19, 2026 — Posting heatmap verified with org Meta connection; Google Calendar wired end-to-end

---

## Marketing & public
- Landing / home — **shipped**
- Features explorer / product demos — **shipped**
- Pricing page ($29 / $59 / $99 marketing) — **shipped**; checkout **deferred**
- About — **shipped**
- Email deep links (`/go/...`) — **shipped**

## Auth & onboarding
- Sign in / sign up — **shipped**
- Founding access code + org welcome magic-link email — **shipped**
- Secure invite accept (`/invite/[token]`, set password) — **shipped**
- School Setup wizard (Welcome → School → Brand → Calendar → Meta → Team → Finish) — **shipped**
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
- Events list, create, edit — **shipped**
- Event detail workspace (tabs: Responsibilities, Create with AI, Approvals, Tasks, Files, Notes, Volunteers, Vendors, Activity) — **shipped**
- Volunteers (SignUpGenius URL) — **shipped**
- Legacy planning hub — **partial** / legacy (fallback only; Phase 3 is default)

## Create with AI (Campaign Builder)
- Hub to pick/create an event — **shipped**
- Inspiration / creative setup, logos, milestones — **shipped**
- Generate artwork + captions per milestone — **shipped**
- Review, edit, regenerate, send to approvals — **shipped**
- Published / full Meta slot sync step — **stub** / incomplete

## Artwork & creative
- AI artwork generation (feed + story), approve/deny/adjust — **shipped**
- Logo in artwork — **shipped**
- Canva import — **shipped** (config-dependent)
- Legacy Creative Studio — **stub** / redirected away

## Captions, Meta & publishing
- Caption generation/editing — **shipped**
- Meta connect (Facebook Page + Instagram) — **shipped**
- Schedule / publish now / publish ready bundles — **shipped**
- Posting schedule preferences — **shipped**
- Weekly posting summary emails — **removed** (orphaned placeholder; not a product feature)

## Approvals & scheduling
- Unified Approvals hub (pending, changes, scheduled, published) — **shipped**
- Approve / request changes, filters, search, badges — **shipped**
- Legacy Publishing Center → redirects to Approvals

## Calendar
- School-year calendar (month / week / agenda) — **shipped**
- Layer toggles, detail panel — **shipped**
- Posting heatmap (Calendar week view + planning suggestions; prefs + published Meta history; gated on org Meta connection) — **shipped**
- Insights-weighted engagement heatmap — **deferred** (current scores use preferred windows + local publish times, not Meta Insights metrics)
- Google Calendar Sign-in (OAuth → auto-sync → review → `/calendar` + dashboard) — **shipped** (live; see [google-calendar.md](../integrations/google-calendar.md))
- Google Calendar daily sync cron (auto-import new events) — **shipped**
- Google Calendar on Import page + Calendar header CTAs — **shipped**
- ICS / webcal subscribe feed — **shipped**
- Calendar file upload + import review (incl. AI fix) — **shipped**
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
- My Tasks (assignee = signed-in user via `assignee_user_id`) — **shipped**
- My Views filters (Assigned / This Week / Overdue / Completed) — **shipped**
- Kanban board (by status) — **shipped**
- Focus board (To-do / This week / In progress / Done) — **shipped**
- Due date picker wired to task update — **shipped**
- Files tab → `/files` (preserves `?event=` when scoped) — **shipped**
- Calendar / Timeline / Workload tabs — **deferred** (hidden from Tasks UI)
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
- Standalone Event Playbooks nav → redirects to Events

## AI Brain & assistant
- Org voice / style / audience prefs — **shipped**
- Inbox AI sources — **shipped**
- Ask Ralli AI widget — **shipped**
- AI credits widget — **stub** (placeholder UI)

## Settings
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

---

## Primary nav
Dashboard · Events · Create with AI · Tasks · Files · Vendors · Calendar · Communications Hub · Approvals · Insights  

Settings: Overview · Organization · Team & Access · Integrations · AI Brain · Inbox AI · Playbooks · School Setup · Billing · Advanced

---

## Not yet full product (appendix)
Stripe billing · Gmail / Dropbox / Constant Contact · Tasks Calendar/Timeline/Workload · 2FA · Inbox assign/campaign filter · Full Create-with-AI → Meta published sync · Vendor payments/contracts depth · Shared one-click Meta OAuth framework polish (see [meta.md](../integrations/meta.md)) · Longer vision (SMS, native mobile, multi-vertical, succession, year clone, etc.)

---

**Canonical docs:** [Documentation home](../README.md) · [Architecture](../engineering/architecture.md) · [QA overview](../qa/architecture-overview.md)
