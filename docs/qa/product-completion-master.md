# Product Completion Master Checklist

**Status:** Living  
**Owner:** Product / Founder  
**Last updated:** July 27, 2026  
**Production:** [heyralli.com](https://heyralli.com)

## Purpose

Single Phase 1 working checklist for product completion. Use this to track **what exists** and **what you’ve verified**.

| Doc | Role |
|-----|------|
| **This file** | Master inventory + completion tracking |
| [feature-list.md](../product/feature-list.md) | Living shipped / partial / deferred truth |
| [launch-checklist.md](./launch-checklist.md) | Soft-launch **Pass / Fail** execution |
| [owner-ai-apis.md](./owner-ai-apis.md) | Owner AI & APIs deep QA |
| [developer-agreements.md](./developer-agreements.md) | NDA/IP gate manual QA |
| [billing-and-access.md](../ops/billing-and-access.md) | Plans, gates, known gaps |
| [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md) | Meta App Review packet |
| [audit-remediation.md](../security/audit-remediation.md) | Security findings status |

## Customer-facing copy (required on every product surface)

**Rule:** Every string a **customer** sees must be written for them — calm, plain, volunteer-org friendly. Not for founders, engineers, or wiring.

**Audience:** Community organizations that plan events and communicate (schools/PTAs today; churches, youth sports, nonprofits, and similar later). Prefer **organization / team / event / parents & members** over school-only words (**PTA, school year, principal**) unless the screen is truly school-specific. Settings may still say “school year” where that product concept exists — don’t force “PTA” into every empty state.

| Fail (rewrite) | Pass |
|----------------|------|
| “Scope missing — reconnect OAuth” | “Reconnect Facebook to finish setup” |
| “Sync org insights metrics” | “Refresh your Page numbers” |
| “Phase 3 hub / Ease shell” | Don’t show that language at all |
| “Founding code / billing_exempt” | “Access code” or plan language only |
| “RLS / tenant / service role” | Never in UI |
| Placeholder “TODO / Marrina / Edmondson debug” | Remove or fictionalize for marketing only |
| “Your PTA board must…” (generic surface) | “Your team must…” / “Your organization…” |

**Where it applies:** Auth, onboarding, dashboard, events/calendar, Create with AI, Ask Ralli, Tasks, Files, Vendors, Insights, Communications, Approvals, Volunteers, Teams, Settings, Billing, notifications, emails, marketing site.

**Where owner/ops language is OK:** Owner Portal (`/ops`), this checklist’s Notes column, eng/QA docs, Sentry internals.

Each customer section below includes a **Customer-facing copy** row — leave unchecked until that surface is swept.

## Status legend

| Status | Meaning |
|--------|---------|
| **Wired** | Real UI + server path exists |
| **Partial** | Exists but gap (stub, honesty-only, ops-dependent, or incomplete) |
| **Missing** | Not built / no route |
| **Deferred** | Intentionally later — not a launch blocker; note the design dependency |
| **Verified** | Wired + confirmed on Production (or N/A by design) |
| **N/A** | Intentionally out of scope for this product phase |

Mark the checkbox when the row is **Verified** (or explicitly accepted as N/A). Update the Status column as you go.

---

## Phase 1 — Product Completion

### Authentication & Accounts

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [x] | Sign Up | Wired | Plan-first `/signup` → founding code + magic link → `/onboarding` |
| [x] | Sign In | Wired | `/login` password + post-auth redirect |
| [x] | Google Login | Wired | Login only; not founding signup (by design) |
| [x] | Password Reset | Wired | `/forgot-password` → `/account/update-password` |
| [x] | Email Verification | Wired | Implicit via magic link / invite (no separate confirm UI) |
| [x] | Organization Creation | Wired | Bootstrap on first-time setup |
| [x] | Invite Team Members | Wired | Settings Team Access + onboarding Connect |
| [x] | Accept Invitation Flow | Wired | `/invite/[token]` new + existing account paths |
| [x] | Organization Switching | Wired | Header switcher when >1 membership; multi-org invite guidance on Team & Access |
| [x] | Deactivated User Experience | Wired | Gate → `/login?error=account_deactivated` |
| [x] | Session Timeout | Wired | **Option A:** 30-day sliding; no short idle logout; honesty copy on Account |
| [x] | Account Deletion | Wired | Settings → Account erase (`DELETE` + last-admin guard) |
| [x] | Change Password | Wired | Settings → Account; OAuth-only users see honest note |

### First-time setup (Ease 4-beat)

Replaces the old multi-step Org Setup Wizard / separate Welcome screen.

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Create first event (required) | Wired | `/events/create?onboarding=1` — “1 of 3” |
| [ ] | Calendar + Brand (optional) | Wired | `/onboarding/essentials` — “2 of 3”; skips |
| [ ] | Team + Meta (optional) | Wired | `/onboarding/connect` — “3 of 3”; skips |
| [ ] | Completion — You’re set on event | Wired | `/events/{id}?welcome=1` toast |
| [ ] | Org name bootstrap (no membership only) | Wired | Minimal glue on `/onboarding` — not a full Welcome step |
| [ ] | Brand colors / logo (inside Essentials) | Wired | Also Settings → Branding |
| [ ] | Calendar import path | Wired | Essentials + `/calendar/import` |
| [ ] | Canva connection | Wired | Settings → Integrations / Creative Setup (not a boarding step); config-dependent |
| [ ] | School year (Settings Branding) | Wired | Nested under Branding hub |
| [ ] | Restart / Get started re-entry | Partial | Restart → create event; confirm Get started cards vs Ease path |

Mockup: [onboarding-setup-ease-mockup.html](https://heyralli.com/onboarding-setup-ease-mockup.html)

### Dashboard — Home

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Personalized Welcome | | |
| [ ] | Next Event | | |
| [ ] | Upcoming Deadlines | | |
| [ ] | Recent Activity | | |
| [ ] | Notifications | | |
| [ ] | Quick Actions | | |
| [ ] | Ask Ralli entry | | |
| [ ] | Calendar Widget | | |
| [ ] | AI Suggestions | | |
| [ ] | Organization Health | | |
| [ ] | Connected Accounts | | |
| [ ] | Weather (optional) | | Org weather location separate from mailing address |
| [ ] | Search | | |
| [ ] | Dashboard Ease redesign | Partial | Mockup / in progress — no full GO yet (feature-list) |

### Calendar & Event Management

*Audited July 27, 2026 — Status = code reality; check Done when Verified on Production.  
Product decisions (same day): no event duplicate; Timeline out of scope; Campaign/Playbook templates later; Recurring deferred until school-year rollover is designed.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Create Event | Wired | `/events/create` + onboarding Ease; `createEvent` / `insertEvent`; capacity gate `eventsPerSchoolYear` |
| [ ] | Edit Event | Wired | Phase 3 hero Edit Details + overview saves (`updateEventDetailsAction`) |
| [ ] | Delete Event | Wired | Manage menu → typed DELETE; archive/restore also wired |
| [x] | Duplicate Event | N/A | **Out of scope** — not needed for launch |
| [ ] | Recurring Events | Deferred | **Later.** Design blocker: when a school year closes, how last year’s series/data lands in the new year (carry-forward vs re-import vs archive). Do not ship rrule until rollover is decided |
| [ ] | Event Status | Wired | draft / scheduled / published / archived; Events Home lenses; Edit Details does not change status |
| [x] | Timeline | N/A | **Not needed** — Phase 3 Activity + playbook planning suffice; no Communication Timeline tab |
| [ ] | Campaign Creation | Wired | Strategies + upgrade/demote; CwAI `/create-with-ai/social` + event campaign builder |
| [ ] | Campaign / Playbook templates | Deferred | **Not ready yet** — playbooks exist as assignable plans; a template gallery / reusable campaign templates waits for a later pass |
| [ ] | Playbooks | Wired | Library + assign by event type; Settings Branding / `/settings/playbooks-milestones` (day-to-day use; template productization deferred above) |
| [ ] | School Year Calendar | Wired | `/calendar` month/week/agenda/best-times/import-list; Settings school year. Sub: Meta chips, best-times heatmap, DnD Meta reschedule ([meta-calendar-dnd.md](./meta-calendar-dnd.md)) — not school-event DnD |
| [ ] | Calendar import (Google / ICS / file) | Wired | `/calendar?tab=import` (+ aliases); Google OAuth, ICS/webcal, file upload; onboarding Essentials |
| [ ] | Calendar review / dedupe | Wired | `/calendar?tab=review`; New/Duplicate/Update/Conflict; [calendar-import-dedupe.md](./calendar-import-dedupe.md); Playwright `14` |
| [ ] | Event detail workspace (tabs hub) | Wired | `/events/[id]` Phase 3: Approvals, Tasks, CwAI, Volunteers, Insights, Team, Notes, Files, Vendors, Activity |

### Create with AI

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Chooser landing | Wired | `/create-with-ai` |
| [ ] | Social Media Generator | Wired | `/create-with-ai/social` |
| [ ] | Homepage Builder | Wired | `/homepage-composer` — full-month **Open page** + **Save as PDF** on `/share/homepage/[token]`; approvals hook (`share_status`) **Partial** — [qa](./homepage-composer.md) |
| [ ] | Newsletter Builder | Wired | `/newsletter-composer` — [qa](./newsletter-composer.md) |
| [ ] | AI Regenerate | Wired | Edit Artwork regenerate + Preview generate this/next |
| [ ] | Reject generated artwork | Wired | Subtle thumbs-down on Preview / Edit regenerated preview — clears that feed/story slot (not Approvals hard Reject) |
| [ ] | AI Edit | | |
| [ ] | AI Copy | | |
| [ ] | AI Save Draft | | Composers: newest-wins draft store |
| [ ] | AI History | | |
| [ ] | AI Usage Tracking | | |
| [ ] | AI Credit Counting | | Credits widget + hard-block |
| [ ] | Prompt Logging | | |
| [ ] | Error Handling | | |
| [ ] | Retry Logic | | |
| [ ] | AI Brain (org voice / style) | | Settings Branding |
| [ ] | AI Inbox sources | | Settings Branding |

### Ask Ralli

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Ops coach (Phases 1–5) | | Pinned under Insights; [eng + QA](../engineering/ask-ralli-assistant.md) |
| [ ] | Regression / Playwright `12` | | |

### Tasks

*Audited July 27, 2026 — org `/tasks` is the full hub; event Tasks tab is intentionally lighter.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Tasks Ease list (Team / Mine) | Wired | `/tasks` Ease shell; `?scope=team\|mine`; done → muted + strikethrough. Gap: some dashboard deep links still use legacy `?tab=my_tasks` query params |
| [ ] | Status / Focus / Custom boards | Wired | List / Status / Focus / Custom. Custom columns persist in localStorage (not server). Calendar/Timeline/Workload views deferred |
| [ ] | Create / complete / edit | Wired | Org hub: Add, checkbox/DnD complete, drawer edit. **Event tab** (`?tab=tasks`): mark-done + focus queue only — no create/edit/Ask AI (by design for “Needs you next”) |
| [ ] | Ask AI on tasks | Wired | `TasksEaseAskAi` on org `/tasks`; AI-gated; not on event Tasks tab |

### Files

*Audited July 27, 2026 — org `/files` is full library grouped by campaign; event Files tab has matching folder UX.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | Partial | Org `/files` header, upload dialog, delete confirm, folder empty states use organization/team + campaign language; legacy `FilesDocumentsShell` event embed unchanged |
| [ ] | Files library | Wired | `/files` Ease: search, sort (Newest/Name/Size/Type), campaign filter, rename, Open/Download |
| [ ] | Event Files tab | Wired | Phase 3 `?tab=files` — campaign folder bar (create/rename/delete/reorder), browse folders, Move on each row, upload/open |
| [ ] | Upload / download | Wired | Org: DnD → upload dialog + `/api/files/[id]/download`. Event: drop/click upload; open via storage URL |
| [ ] | Tenant isolation | Wired | Active-org event gate + Storage RLS on `campaign-files` (`{eventId}/…`). Residual: bucket is **public** — known URLs remain fetchable (documented in [storage-rls.md](../engineering/storage-rls.md)) |
| [ ] | Folders per campaign | Wired | Event-scoped folders (`event_file_folders` + `event_playbook_files.folder_id`): create/rename/delete/reorder on event Files tab **and** inside each campaign box on `/files` (All / Unfiled / custom pills); Move file to folder on each row; RLS via `private.can_access_event` |

### Vendors

*Audited July 27, 2026 — contact-first Ease directory + profiles; event tab lighter.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Vendor directory (contact-first) | Wired | `/vendors` cards (Call/Email/Website + profile); filters Favorites/Past/Blocked; Add wizard; logo upload on card; create can link events |
| [ ] | Vendor profiles | Wired | `/vendors/[id]` hero + Overview/Events/Notes/Documents/Activity; Favorite/Block. Gap: Edit updates vendor-level contact fields only (not primary contact name/title); Events tab read-only (no assign from profile) |
| [ ] | Event Vendors tab | Wired | Phase 3 `?tab=vendors` Ease panel: contact rows + Profile; in-tab **Add existing** (unlinked picker via `assignVendorToEventAction`), **Add new** (`VendorAddModal` preselects event), **Unlink** with confirm (`removeVendorFromEventAction`); Browse directory → `/vendors` (full directory, not linked-only `?event=` filter) |

### Insights (Meta)

Distinct from marketing Analytics below.  
*Audited July 27, 2026 — Ease shells live; demographics deferred by design.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | Wired | Swept Jul 27: Ease shell Org/Connect/Event, event Insights panel, empty/sync/toasts/errors, connection banner, recommendations, sync action messages, pulse widget — org/Page language; no scope/OAuth/sync/school-only jargon; Communications why cards not shared |
| [ ] | Org Insights | Wired | `/insights` → Ease KPIs, Content overview, Top content, platform/date filters; pills `?view=org\|connect\|event`. Smoke `11-insights` |
| [ ] | Connect Meta empty (Insights) | Wired | Insights-local purpose empty when disconnected / `?view=connect`: organic / no ads / no demographics + Connect + “Why we ask for Page Insights”. Four Communications why cards stay on `/communications` only — **do not share** onto Insights Connect |
| [ ] | Event Insights | Wired | `/events/[id]?tab=insights` + hub `?view=event`; KPI strip + posts; empty connect / no_posts / sync. [event-insights.md](../product/event-insights.md) |
| [ ] | Refresh / sync | Wired | Org/Event Refresh → `syncInsightsAction`; also `/api/insights/sync` + cron. Open tab is DB-only until Refresh |
| [ ] | Top content / filters | Wired | Platform All/FB/IG, date 7/14/28/30, carousel + `?contentSort=` |
| [ ] | CSV export | Wired | Org **Export CSV** → `/api/insights/export` (hidden on Connect empty) |
| [ ] | Plan gate (`social_analytics`) | Wired | Entitled on Starter–Premium for App Review reachability |
| [ ] | Demographics (Age & gender) | Deferred | Not requested / not shown — [meta-app-review-use-cases.md §5](../ops/meta-app-review-use-cases.md#5-demographics-age--gender--definitive-answer) |
| [ ] | Insights-weighted calendar heatmap | Deferred | Best times stay on `/calendar`; not driven by Insights metrics |

### Communications Hub (Inbox)

*Inbox / DMs / comments only — not post publishing. Audited July 27, 2026. Publishing outcomes live under Approvals.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | Wired | Swept Jul 27: Connect Meta four why cards, hub/inbox chrome, AI draft reply honesty, connection badge/toasts/errors — org/Page/team language |
| [ ] | Facebook Page inbox | Wired | Messenger + Page comments/tags via Meta connection |
| [ ] | Instagram DMs & comments | Wired | Linked IG Professional messaging + comments |
| [ ] | Communications Hub | Wired | `/communications` (+ `/inbox` redirect); Connect Meta Ease empty (four why cards). Full Ease chrome still Meta-review polish |
| [ ] | AI Replies | Wired | Draft → edit → Approve & Send; **never auto-sent** |

Connect Meta empty (four why cards) stays on `/communications` only — not shared onto Insights Connect.

### Approvals & publishing

*Approval workflow + Meta post outcomes (Draft → Scheduled → Posted / Failed → Retry). Moved from Communications Jul 27, 2026. Audited Jul 27, 2026.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | Wired | Swept Jul 27: Approvals hub + event Approvals tab + Review drawer + approve/request/retry toasts/errors + change-request email — org/Page/team language; no Meta-feed/View-scope/Needs-regeneration jargon |
| [ ] | Submit for Approval | Wired | Create with AI Review **Send for approval** / re-approval via `approval-bridge` → `approval_scheduling_items` + approver email; classic `sendCommunicationForApprovalAction` still wired |
| [ ] | Approve | Wired | Review drawer **Approve & schedule** → `approveUnifiedItemAction` (Meta schedule/publish, post-kit email, content-approved email) |
| [ ] | Reject (posts) | N/A | Hard Reject for Approvals posts not shipped — product path is **Request changes** (classic DB may write `rejected` then `changes_requested`) |
| [ ] | Reject generated artwork | Wired | Create with AI Preview / Edit Artwork: subtle thumbs-down icon after generation discards that feed/story slot (session + backup + hero sync); regenerate via Generate / Edit artwork |
| [ ] | Revision workspace (change request) | Partial | `/approvals/revision` — Round 3: dual feed (1:1) + story (9:16) preview for creator & approver; in-shell AI regenerate per format / both / caption from change comments ([approvals-revision-ai-regenerate-mockup.html](../../public/approvals-revision-ai-regenerate-mockup.html)); inline schedule; resubmit syncs scheduling row + CB2 session + email. **Wired:** Request changes + tags → checklist; Send for re-approval. Still later: multi-round history depth, newsletter/flyer/homepage adapters. Verify on Production |
| [ ] | Request Changes | Wired | Review drawer + comment required → `requestUnifiedChangesAction` + change-request email |
| [ ] | Version History | Partial | Drawer **Approval timeline** from `approvalHistory` (submit / changes); not full creative version history; Approved/Posted/Failed often missing on CB2 rows |
| [ ] | Activity Timeline | Partial | Event Activity tab exists; classic flows log approval activity; CB2 unified approve/send does not consistently mirror into Activity |
| [ ] | Notifications | Wired / N/A | Sidebar Approvals / Changes badges sufficient — no dedicated in-app notification feed needed |
| [ ] | Email Alerts | Wired | Assigned / resubmitted / change requested / content approved / scheduled / post kit; Account **Approval needs attention** mutes assigned/resubmitted/changes only |
| [ ] | Facebook publishing | Wired | Page feed + stories via Meta; native FB feed schedule on Approve |
| [ ] | Instagram publishing | Wired | IG feed/stories via Meta; due-publish cron (not Meta-native schedule like FB feed) |
| [ ] | Scheduled posts | Wired | Approvals + Meta bundles + cron; Scheduled filter excludes saved drafts |
| [ ] | Drafts | Wired | Dedicated **Drafts** filter on Approvals hub + event tab; **Draft** chip; draft-only stays pre-publish (not Posted) |
| [ ] | Posted | Wired | Approvals Ease + event Approvals tab: **Posted** filter/pill; Meta publish success syncs scheduling rows |
| [ ] | Failed | Wired | Dedicated **Failed** filter/queue on Approvals hub + event tab; slot outcomes overlay + persisted `failed` status |
| [ ] | Retry | Wired | Clear **Retry** on Failed rows/drawer; wires `retryFailedUnifiedApprovalAction` → `retryFailedMetaBundleAction` |
| [ ] | Manual publish kit | Partial | Story post kit + email post kit on approve / cron; no clear “I posted it” completion in Approvals |

**Product intent (Jul 27):** Approvals should surface **Posted** or **Failed** (with **Retry**) as first-class outcomes. Drafts stay here (pre-publish), not in the inbox.

### Volunteer Management

*Audited July 27, 2026 — Ease Master + event Volunteers tab; public signup hosted on SignUpGenius (not Hey Ralli). Review/confirm restored on event tab after Ease panel dead-end.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | Wired | Swept Jul 27: `/volunteers` Master shell + Ease list, event Volunteers Ease + full Tab (connect/review/confirm), SignUpGenius URL/errors/empty/refresh — org/team language; no PII/OAuth/scope/sync jargon; “Refresh numbers” / “Connect signup” |
| [ ] | Volunteer Opportunities | Wired | Roles/assignments from confirmed SignUpGenius snapshots (open spots, underfilled roles) — not a separate opportunities CRUD |
| [ ] | Public Pages | N/A | Hey Ralli does **not** host public volunteer pages; parents sign up on SignUpGenius public `/go/…` links |
| [ ] | Signup Links | Wired | Planning `volunteer_signup` URL + SignUpGenius source URL; **Open signup** on Master focus card, event tab, Today widget deep links |
| [ ] | Volunteer Dashboard / Master | Wired | `/volunteers` Ease: Needs people focus + quiet queue, health text, search; [volunteer-master.md](../product/volunteer-master.md) |
| [ ] | Fill Rate | Wired | Shared bands Critical → Fully Staffed on Master + event tab (`getVolunteerFillRateBand`) |
| [ ] | Statistics | Wired | Master health (fill % · open roles · volunteers signed up); event Quick Totals / Overall Filled; Today Volunteers widget |
| [ ] | Event Progress | Wired | Event Volunteers tab: Needs at a glance + per-role progress; event detail hero **Filled** from latest confirmed snapshot |
| [ ] | Search / Filters | Wired | Master: search (title/role) + pills Needs people / Upcoming / Covered / All; event tab: Filter + Date + Sort on roles |
| [ ] | SignUpGenius connect / sync | Wired | **Long-term path = public URL connect** on event Volunteers → **review/verify dates before import** → confirm → refresh. Master is read-only. **OAuth deferred:** SignUpGenius Pro is required for API OAuth and many orgs don’t have it; revisit when most customers are on Pro, then consider a second pull option alongside URL. No Settings OAuth “Coming soon” tease. |

### Teams & Permissions

*Audited July 27, 2026 — Settings Team & Access Ease (`/settings/team-access`) is the customer surface; full person profiles remain at `/settings/team-access/people/[id]`. Access templates = assignable roles (Admin, President, VP Communications, Event Lead / committee, Contributor, View Only, Developer, Tester). Platform Owner Portal (`/ops`) is separate.*

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | Wired | Swept Jul 27: Ease list + empty/claim, invite + Give access modals, person drawer, roles editor, permission chip descriptions, roster import, invite email fallback — org/team language; no PTO/board-only / Access-templates / pop-out / mutate jargon |
| [ ] | Invite Members | Wired | Ease **Invite** → `inviteTeamMemberAction` + email/link; Give access for roster people; onboarding Connect also invites |
| [ ] | Remove / deactivate Members | Wired | Ease **Edit profile** → Sign-in status Active/Inactive (`updateTeamMemberAction`); full Remove + Deactivate also on person profile deep link; self-deactivate blocked |
| [ ] | Change Roles | Wired | Person drawer Access role + permission switches; Edit profile Role; **Edit roles** templates editor (Admin/President can edit) |
| [ ] | Admin Permissions | Wired | Default template: full people/billing/integrations + draft/approve/publish; `manage_people` safety-locked |
| [ ] | VP Permissions | Wired | **VP Communications** template: draft/submit/approve/publish/artwork; no people/billing/integrations by default; display name org-customizable |
| [ ] | Committee Permissions | Wired | **Event Lead** (`committee_chair`): draft/submit/publish/artwork on events; no approve/people/billing by default; rename for org type |
| [ ] | Viewer Permissions | Wired | **View Only** template: see events; no draft/approve/publish/manage |
| [ ] | Developer Permissions | Wired | Developer template + `/account/agreements` NDA/IP gate (`userMustSignDeveloperAgreements`); no people/billing/integrations by default |
| [ ] | Owner Permissions | Wired | Org leadership = **Admin** + **President** templates (same manage powers; President is the leadership seat). Platform Owner Portal (`/ops`) is not a customer Team Access role |
| [ ] | Event linking (person drawer) | Wired | Drawer Events tab toggles → `replaceMemberEventAssignmentsAction` / `setOrganizationUserEventAssignmentsAction`; invite can pre-link |
| [ ] | Board roster / responsibility matrix | Partial | **Import roster** on Ease Team & Access (`/settings/team-access` → Import roster): Excel template at `/templates/board-roster-import.xlsx` (Position · Committee/Team · prior/current chair columns); `.xlsx` upload + paste preview parsing restored. Visual Board & committees / Responsibility Matrix UI still in codebase but **not mounted** on Ease after shell cutover — restore or rehome later |
| [ ] | Last logged in | Wired | People rows + person drawer; org-scoped Auth `last_sign_in_at`; shows Never when null |

### Settings Ease hub

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Overview | Wired | |
| [ ] | Organization (full mailing address) | Wired | Street → country; weather location separate |
| [ ] | Branding hub | Wired | School year, AI Brain, Inbox, Playbooks, Colors & Logos |
| [ ] | Team & Access | Wired | |
| [ ] | Integrations | Wired | Meta, Canva, Google Calendar, etc. |
| [ ] | Billing | Wired | Usage / Plans / Payment |
| [ ] | Account (password, erase, session, notifications, sign-out) | Wired | |

### Multi-org & access gates

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [x] | Customer-facing copy | Verified | Team Access + invite accept use org/team language; multi-org callout on Team & Access |
| [x] | Active org cookie / switcher | Wired | Header switcher when >1 active membership; redirects to `/dashboard` on switch |
| [x] | Multi-org invite guidance | Wired | Settings → Team & Access callout + invite modal note; living doc § “Adding someone to a second organization” |
| [x] | Canceled-subscription lockout | Wired | Active org with canceled paid sub → `/billing/canceled`; see [billing-and-access.md](../ops/billing-and-access.md) |
| [ ] | Developer agreements (NDA/IP) | | [developer-agreements.md](./developer-agreements.md) |
| [x] | Shared-device sign-out cleanup | Wired | Campaign builder local drafts |

### Billing — Stripe

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Free Trial | | |
| [ ] | Checkout | | Needs you in launch-checklist |
| [ ] | Upgrade | | |
| [ ] | Downgrade | | |
| [ ] | Cancel | | |
| [ ] | Resume | | |
| [ ] | Failed Payment | | |
| [ ] | Card Updates | | Portal |
| [ ] | Invoice History | | |
| [ ] | Receipts | | |
| [ ] | Usage Limits | | |
| [ ] | AI Limits | | |
| [ ] | Founding / billing exempt path | | |

### Owner Portal — Business Metrics

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [x] | Customer-facing copy | N/A | Owner Portal is for Marrina/ops — owner language OK |
| [ ] | Organizations | | `/ops` |
| [ ] | Active Users | | |
| [ ] | Active Trials | | |
| [ ] | Paid Customers | | |
| [ ] | MRR | | |
| [ ] | ARR | | |
| [ ] | Churn | | |
| [ ] | Revenue by Plan | | |
| [ ] | New Signups | | |
| [ ] | Daily Active Users | | |
| [ ] | Monthly Active Users | | |

### Owner Portal — AI Monitoring

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [x] | Customer-facing copy | N/A | Owner Portal is for Marrina/ops — owner language OK |
| [ ] | AI Requests | | See [owner-ai-apis.md](./owner-ai-apis.md) |
| [ ] | AI Cost | | |
| [ ] | Tokens | | |
| [ ] | Models Used | | |
| [ ] | Cost Per Organization | | |
| [ ] | Cost Per User | | |
| [ ] | Export Reports | | |

### Owner Portal — API Monitoring

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [x] | Customer-facing copy | N/A | Owner Portal is for Marrina/ops — owner language OK |
| [ ] | Meta | | |
| [ ] | Canva | | |
| [ ] | Google Calendar | | |
| [ ] | Resend | | |
| [ ] | SignUpGenius | | |
| [ ] | API Health | | |
| [ ] | Failed Requests | | |
| [ ] | Rate Limits | | |

### Notifications

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | In-App Notifications | | |
| [ ] | Email Notifications | | |
| [ ] | Approval Notifications | | |
| [ ] | Billing Notifications | | |
| [ ] | Invite Notifications | | |
| [ ] | AI Completion Notifications | | |
| [ ] | Report a Problem (Sentry) | | [report-a-problem.md](./report-a-problem.md) |

### Emails

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Welcome Email | | |
| [ ] | Password Reset | | |
| [ ] | Invitation | | |
| [ ] | Approval | | |
| [ ] | Billing Receipt | | |
| [ ] | Trial Ending | | |
| [ ] | Subscription Confirmation | | |
| [ ] | Cancellation | | |
| [ ] | Contact Form | | |

### Marketing Website — Pages

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Home | Wired | WOW `/` |
| [ ] | Features | | |
| [ ] | Pricing | | |
| [ ] | About | | |
| [ ] | Contact | | |
| [ ] | FAQ | | |
| [ ] | Privacy Policy | Wired | `/privacy` (includes Cookies subsection) |
| [ ] | Terms of Service | Wired | `/terms` |
| [ ] | Cookie Policy (standalone) | Partial | No `/cookies` route — covered by Privacy + consent bar; decide ship vs N/A |
| [ ] | Support | | |

### Marketing — Assets & growth

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Feature Videos | | |
| [ ] | Screenshots | | |
| [ ] | Testimonials | | |
| [ ] | Demo Request | | |
| [ ] | Waitlist | | |
| [ ] | CTA Buttons | | |
| [ ] | SEO | | |
| [ ] | Product / calendar demo on `/` | Partial | Assets exist; live CTA waits for GO |

### Performance

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Lighthouse 90+ | | |
| [ ] | Mobile Friendly | | |
| [ ] | Accessibility | | |
| [ ] | Image Optimization | | |
| [ ] | Lazy Loading | | |
| [ ] | Caching | | |
| [ ] | Database Optimization | | |
| [ ] | CDN Verification | | |
| [ ] | Perf budget (≤2s) | | [performance-budget.md](./performance-budget.md) |

### Security

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | HTTPS | | |
| [ ] | Authentication | Wired | |
| [ ] | Authorization / RLS | | [access-control](../engineering/access-control.md) · [multi-tenant](../security/multi-tenant-isolation.md) |
| [ ] | Input Validation | | |
| [ ] | SQL Injection Protection | | Supabase / parameterized |
| [ ] | XSS Protection | | |
| [ ] | CSRF Protection | | |
| [ ] | Rate Limiting | | Auth + sensitive actions |
| [ ] | Error Logging | | |
| [ ] | Sentry | | |
| [ ] | Secrets Management | | |
| [ ] | Audit remediation open items | | [audit-remediation.md](../security/audit-remediation.md) |

### Analytics (product / marketing)

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Google Analytics | | |
| [ ] | Product Analytics | | |
| [ ] | Error Tracking | | Sentry |
| [ ] | Conversion Tracking | | |
| [ ] | Signup Funnel | | |
| [ ] | AI Usage Analytics | | Owner portal |
| [ ] | Feature Usage | | |
| [ ] | Dashboard Metrics | | |

### QA Testing — Functional

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Every button | | Prefer Playwright where possible |
| [ ] | Every page | | |
| [ ] | Every modal | | |
| [ ] | Every AI feature | | |
| [ ] | Every API | | |
| [ ] | Every email | | |
| [ ] | Every upload | | |
| [ ] | Every download | | |

### QA Testing — Devices & browsers

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Desktop | | |
| [ ] | Laptop | | |
| [ ] | Tablet | | |
| [ ] | Mobile | | |
| [ ] | Chrome | | |
| [ ] | Safari | | Agreements HTML Needs you |
| [ ] | Edge | | |
| [ ] | Firefox | | |

### Beta Testing — Internal

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Personal Testing | | |
| [ ] | Husband Testing (observe without coaching) | | |
| [ ] | Friend QA | | |
| [ ] | Bug Fixes | | |
| [ ] | Regression Testing | | |

### Beta Testing — External

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | 3 Pilot Schools | | |
| [ ] | Feedback Collection | | |
| [ ] | Bug Fixes | | |
| [ ] | Final Review | | |

### Documentation

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Help Center | | |
| [ ] | FAQ | | |
| [ ] | User Guides | | |
| [ ] | Admin Guides | | |
| [ ] | API Documentation | | |
| [ ] | Privacy Policy | Wired | |
| [ ] | Terms | Wired | |
| [ ] | NDA | | Developer agreements |
| [ ] | IP Agreement | | Developer agreements |

### Integrations — Verify every connection

For each: Connect · Disconnect · Reconnect · Permission changes · Expired token recovery · Error handling.

| Done | Integration | Status | Notes |
|------|-------------|--------|-------|
| [ ] | Meta | | [meta.md](../integrations/meta.md) · App Review packet |
| [ ] | Canva | Wired | Config-dependent OAuth |
| [ ] | Google Calendar | | [google-calendar.md](../integrations/google-calendar.md) |
| [ ] | Resend | | Email delivery |
| [ ] | SignUpGenius | Wired | URL connect + review-before-import on event Volunteers; OAuth deferred until Pro is common — [signupgenius.md](../integrations/signupgenius.md) |
| [ ] | Monday.com | Partial | Optional / non-blocking |

### Meta App Review

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Customer-facing copy | | Sweep empty states, buttons, toasts, errors — customer/org language (not school-only); no founder/wiring/owner jargon |
| [ ] | Use-cases doc complete | | [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md) |
| [ ] | Connect Meta why UI live | Wired | `/communications` empty |
| [ ] | Insights reachable for review | Wired | |
| [ ] | Screencast / walkthrough ready | | |

### Business Readiness

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Pricing Finalized | | |
| [ ] | Support Email | | |
| [ ] | Domain Verified | | |
| [ ] | Business Address | | Org mailing address fields shipped |
| [ ] | Stripe Verification | | |
| [ ] | Tax Settings | | |
| [ ] | Refund Policy | | |
| [ ] | Customer Support Process | | |

### Launch Assets

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Product Demo Video | | |
| [ ] | 30-Second Feature Video | | |
| [ ] | Logo Files | | |
| [ ] | Brand Kit | | |
| [ ] | Social Media Graphics | | |
| [ ] | Launch Email | | |
| [ ] | Press Kit | | |
| [ ] | Founder Story | | |
| [ ] | Product Screenshots | | |
| [ ] | Feature Comparison | | |

### Soft Launch

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Invite First Organization | | |
| [ ] | Monitor Logs | | |
| [ ] | Monitor Billing | | |
| [ ] | Monitor AI Costs | | |
| [ ] | Respond to Feedback | | |
| [ ] | Fix Critical Bugs | | |
| [ ] | Validate Infrastructure | | |

### Public Launch

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Open Registration | | Founding code may still gate |
| [ ] | Announce on Social Media | | |
| [ ] | Email Waitlist | | |
| [ ] | Publish Product Demo | | |
| [ ] | Monitor Signups | | |
| [ ] | Monitor Server Health | | |
| [ ] | Respond to Support | | |
| [ ] | Celebrate | | |

### Post-Launch — Daily (first 30 days)

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Review Errors | | |
| [ ] | Review Signups | | |
| [ ] | Review AI Costs | | |
| [ ] | Review Support Tickets | | |
| [ ] | Respond to User Feedback | | |

### Post-Launch — Weekly

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Ship Bug Fixes | | |
| [ ] | Review Analytics | | |
| [ ] | Measure Feature Adoption | | |
| [ ] | Prioritize Customer Requests | | |
| [ ] | Review Financial Metrics | | |

### Post-Launch — Monthly

| Done | Item | Status | Notes |
|------|------|--------|-------|
| [ ] | Roadmap Planning | | |
| [ ] | Customer Interviews | | |
| [ ] | Improve Onboarding | | |
| [ ] | Performance Review | | |
| [ ] | Security Audit | | |

---

## Final Go/No-Go

Before official public launch, every answer should be **Yes**.

| Question | Yes |
|----------|-----|
| Can a brand-new user sign up without assistance? | [ ] |
| Can they complete Ease onboarding (event → essentials → connect → event)? | [ ] |
| Can they connect their accounts (Meta / Calendar / Canva as needed)? | [ ] |
| Can they create an event? | [ ] |
| Can they generate AI content? | [ ] |
| Can they send content for approval? | [ ] |
| Can they publish successfully? | [ ] |
| Can they invite teammates? | [ ] |
| Can they upgrade to a paid plan? | [ ] |
| Can they receive all expected emails? | [ ] |
| Can they change password / erase account? | [ ] |
| Can they open Tasks, Files, Vendors, Insights? | [ ] |
| Is Meta App Review packet ready? | [ ] |
| Are critical bugs resolved? | [ ] |
| Are support resources available? | [ ] |
| Is monitoring in place? | [ ] |

---

## How this relates to launch-checklist

Work rows here for **coverage**. When a soft-launch theme is ready for Pass/Fail, execute the matching section in [launch-checklist.md](./launch-checklist.md) and promote Status → **Verified**.
