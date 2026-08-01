# Product Completion Master Checklist

**Status:** Living  
**Owner:** Product / Founder  
**Last updated:** July 30, 2026 — OWASP ZAP soft-launch security pass
**Production:** [heyralli.com](https://heyralli.com)

## Purpose

Single Phase 1 working checklist for product completion. Use this to track **what exists** and **what you’ve verified**.


| Doc                                                                 | Role                                      |
| ------------------------------------------------------------------- | ----------------------------------------- |
| **This file**                                                       | Master inventory + completion tracking    |
| [feature-list.md](../product/feature-list.md)                       | Living shipped / partial / deferred truth |
| [launch-checklist.md](./launch-checklist.md)                        | Soft-launch **Pass / Fail** execution     |
| [owner-ai-apis.md](./owner-ai-apis.md)                              | Owner AI & APIs deep QA                   |
| [developer-agreements.md](./developer-agreements.md)                | NDA/IP gate manual QA                     |
| [billing-and-access.md](../ops/billing-and-access.md)               | Plans, gates, known gaps                  |
| [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md) | Meta App Review packet                    |
| [audit-remediation.md](../security/audit-remediation.md)            | Security findings status                  |
| [owasp-zap.md](../security/owasp-zap.md)                            | OWASP ZAP soft-launch pass (Jul 30 2026)  |


## Jul 28 closeout — soft launch

**Green for soft launch (product + eng):** Dashboard, Events Home, Calendar import/review, Create with AI (Social-first landing + 4-step builder), Tasks, Settings Ease hub, Approvals (Posted / Failed / Retry), Team & Access, Volunteers (SignUpGenius URL connect), Vendors (event tab), Ask Ralli (Playwright `12` passed). Customer copy swept on primary paths — Communication Plan / Posts rename, org/team language (not school-only jargon on generic surfaces). Engineering launch-prep marked **Done** in [launch-checklist.md](./launch-checklist.md).

**Still gated (do not treat as launch-complete):**


| Gate                          | Why                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Meta App Review**           | Public orgs must not connect Meta until packet + QA/eng sign-off. Founder temp Meta account OK for Edmondson validation only.                                              |
| **Owner finish list (A–K)**   | Human Pass/Fail on [launch-checklist.md](./launch-checklist.md): Ease onboarding re-verify, org switcher, approval email loop, Meta OAuth, optional Billing Checkout once. |
| **Playwright `16` / `18`**    | Jul 28 run hit test-seat login timeouts — re-run before calling Production Fail.                                                                                           |
| **Billing Checkout / Portal** | Wired in Production; Owner spot-check row 11.4 still **Needs you**.                                                                                                        |


**Honest Partial areas (usable, not perfect):** Create with AI step count borderline for first-time chairs; event workspace tab density; revision workspace (newsletter/homepage adapters later); Files legacy event embed copy; marketing “Watch demo” link waits for GO; storage capacity gate deferred. Product-wide performance is still Partial (Social Media Composer scored 88; the ≤2s wall-clock budget is not re-verified), and composer accessibility remains open (Social Media 83; Homepage 87).

**Next owner actions:** (1) Run launch-checklist finish order A–K on [https://heyralli.com](https://heyralli.com). (2) Finish Meta App Review screencast + submit. (3) Invite first pilot org only after Meta green light.

---

**Rule:** Every string a **customer** sees must be written for them — calm, plain, volunteer-org friendly. Not for founders, engineers, or wiring.

**Audience:** Community organizations that plan events and communicate (schools/PTAs today; churches, youth sports, nonprofits, and similar later). Prefer **organization / team / event / parents & members** over school-only words (**PTA, school year, principal**) unless the screen is truly school-specific. Settings may still say “school year” where that product concept exists — don’t force “PTA” into every empty state.


| Fail (rewrite)                                 | Pass                                      |
| ---------------------------------------------- | ----------------------------------------- |
| “Scope missing — reconnect OAuth”              | “Reconnect Facebook to finish setup”      |
| “Sync org insights metrics”                    | “Refresh your Page numbers”               |
| “Phase 3 hub / Ease shell”                     | Don’t show that language at all           |
| “Founding code / billing_exempt”               | “Access code” or plan language only       |
| “RLS / tenant / service role”                  | Never in UI                               |
| Placeholder “TODO / Marrina / Edmondson debug” | Remove or fictionalize for marketing only |
| “Your PTA board must…” (generic surface)       | “Your team must…” / “Your organization…”  |


**Where it applies:** Auth, onboarding, dashboard, events/calendar, Create with AI, Ask Ralli, Tasks, Files, Vendors, Insights, Communications, Approvals, Volunteers, Teams, Settings, Billing, notifications, emails, marketing site.

**Where owner/ops language is OK:** Owner Portal (`/ops`), this checklist’s Notes column, eng/QA docs, Sentry internals.

Each customer section below includes a **Customer-facing copy** row — leave unchecked until that surface is swept.

## Customer-facing simplicity (required on every product section)

**Rule:** After copy is calm, ask whether a tired board volunteer can finish the job without feeling lost. This is separate from “does it work.”

Each customer section must include these rows (add if missing):


| Item                           | What to decide                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Customer-facing simplicity** | Is the default path obvious? Is chrome quieter than the job? Any “mall of equal doors”?                                                    |
| **Step count**                 | Count the real clicks/screens for the primary job. **Too many?** Target: first win in **≤4** meaningful steps when possible; note if over. |
| **Adaptability rating**        | How easily a new teammate adapts (see scale). Re-rate after a simplicity change.                                                           |


### Adaptability rating scale


| Rating      | Meaning                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| **High**    | New teammate finishes the primary job in one short session with little help  |
| **Medium**  | Succeeds with a tip sheet, second visit, or one guided walkthrough           |
| **Low**     | Power-user density; too many steps/choices; needs training or founder nearby |
| **Unknown** | Not yet judged with a non-founder user                                       |


**Done checkbox:** Mark Done when Product has **rated** the section (and noted step count) — not only when the rating is High. Raise the rating over time; honesty first.

## Status legend


| Status       | Meaning                                                                |
| ------------ | ---------------------------------------------------------------------- |
| **Wired**    | Real UI + server path exists                                           |
| **Partial**  | Exists but gap (stub, honesty-only, ops-dependent, or incomplete)      |
| **Missing**  | Not built / no route                                                   |
| **Deferred** | Intentionally later — not a launch blocker; note the design dependency |
| **Verified** | Wired + confirmed on Production (or N/A by design)                     |
| **N/A**      | Intentionally out of scope for this product phase                      |


Mark the checkbox when the row is **Verified** (or explicitly accepted as N/A). Update the Status column as you go.

---

## Phase 1 — Product Completion

### Authentication & Accounts


| Done | Item                        | Status  | Notes                                                                                                                                                                                                                  |
| ---- | --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy        | Wired   | Swept Jul 28: WOW auth shell (login, signup, forgot, invite, privacy, terms) — plain org-friendly errors; founding **access code** language (not billing_exempt); no eng jargon                                        |
| [x]  | Customer-facing simplicity  | Partial | **Rated Jul 28.** Plan-first signup is one obvious path; login is single screen. **Mall risk:** signup plan chooser (3 tiers) before access code — acceptable for commercial launch, slightly heavy for “just try it.” |
| [x]  | Step count (primary job)    | Partial | **Sign in:** `/login` → submit ≈ **2 steps**. **Sign up:** plan → access code + email → magic link ≈ **3–4 steps** (within target). Invite accept adds password set for new accounts.                                  |
| [x]  | Adaptability rating         | High    | **High (Jul 28).** Standard auth patterns; Google on login only; honest OAuth-only note on Account.                                                                                                                    |
| [x]  | Sign Up                     | Wired   | Plan-first `/signup` → founding code + magic link → `/onboarding`                                                                                                                                                      |
| [x]  | Sign In                     | Wired   | `/login` password + post-auth redirect                                                                                                                                                                                 |
| [x]  | Google Login                | Wired   | Login only; not founding signup (by design)                                                                                                                                                                            |
| [x]  | Password Reset              | Wired   | `/forgot-password` → `/account/update-password`                                                                                                                                                                        |
| [x]  | Email Verification          | Wired   | Implicit via magic link / invite (no separate confirm UI)                                                                                                                                                              |
| [x]  | Organization Creation       | Wired   | Bootstrap on first-time setup                                                                                                                                                                                          |
| [x]  | Invite Team Members         | Wired   | Settings Team Access + onboarding Connect                                                                                                                                                                              |
| [x]  | Accept Invitation Flow      | Wired   | `/invite/[token]` new + existing account paths                                                                                                                                                                         |
| [x]  | Organization Switching      | Wired   | Header switcher when >1 membership; multi-org invite guidance on Team & Access                                                                                                                                         |
| [x]  | Deactivated User Experience | Wired   | Gate → `/login?error=account_deactivated`                                                                                                                                                                              |
| [x]  | Session Timeout             | Wired   | **Option A:** 30-day sliding; no short idle logout; honesty copy on Account                                                                                                                                            |
| [x]  | Account Deletion            | Wired   | Settings → Account erase (`DELETE` + last-admin guard)                                                                                                                                                                 |
| [x]  | Change Password             | Wired   | Settings → Account; OAuth-only users see honest note                                                                                                                                                                   |


### First-time setup (Ease 4-beat)

Replaces the old multi-step Org Setup Wizard / separate Welcome screen.


| Done | Item                                    | Status  | Notes                                                                                                                                                                                                                                                          |
| ---- | --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy                    | Wired   | Swept Jul 28: Ease 4-beat meters (“1 of 3”), Skip for now / Continue, You’re set toast — org/event language; no wizard jargon                                                                                                                                  |
| [x]  | Customer-facing simplicity              | Partial | **Rated Jul 28.** Required beat is one screen (create event); Essentials + Connect are optional with per-section Skip — calm. **Tradeoff:** three pages before “done” if user doesn’t skip; Restart → create event (launch-checklist 1.6 Needs you re-verify). |
| [x]  | Step count (primary job)                | Partial | **Minimum path:** create event → Save ≈ **1 step** (+ form fill). **Full Ease:** event → essentials → connect → event toast ≈ **3 pages** (skippable). Within ≤4 when skipping optional beats.                                                                 |
| [x]  | Adaptability rating                     | Medium  | **Medium (Jul 28).** First event is obvious; optional Calendar/Brand/Team/Meta beats need one tip (“Skip for now” is visible). Raise toward **High** after non-founder completes without coaching.                                                             |
| [x]  | Create first event (required)           | Wired   | `/events/create?onboarding=1` — “1 of 3”                                                                                                                                                                                                                       |
| [x]  | Calendar + Brand (optional)             | Wired   | `/onboarding/essentials` — “2 of 3”; skips                                                                                                                                                                                                                     |
| [x]  | Team + Meta (optional)                  | Wired   | `/onboarding/connect` — “3 of 3”; skips                                                                                                                                                                                                                        |
| [x]  | Completion — You’re set on event        | Wired   | `/events/{id}?welcome=1` toast                                                                                                                                                                                                                                 |
| [x]  | Org name bootstrap (no membership only) | Wired   | Minimal glue on `/onboarding` — not a full Welcome step                                                                                                                                                                                                        |
| [x]  | Brand colors / logo (inside Essentials) | Wired   | Also Settings → Branding                                                                                                                                                                                                                                       |
| [x]  | Calendar import path                    | Wired   | Essentials + `/calendar/import`                                                                                                                                                                                                                                |
| [x]  | Canva connection                        | Wired   | Settings → Integrations / Creative Setup (not a boarding step); config-dependent                                                                                                                                                                               |
| [x]  | School year (Settings Branding)         | Wired   | Nested under Branding hub                                                                                                                                                                                                                                      |
| [x]  | Restart / Get started re-entry          | Partial | Restart → create event; confirm Get started cards vs Ease path — **launch-checklist 1.6 Needs you**                                                                                                                                                            |


Mockup: [onboarding-setup-ease-mockup.html](https://heyralli.com/onboarding-setup-ease-mockup.html)

### Dashboard — Home

*Audited Jul 28, 2026 — authenticated `/dashboard` (Your overview board). Mockup: `[/dashboard-ease-mockup.html](https://heyralli.com/dashboard-ease-mockup.html)`*


| Done | Item                          | Status  | Notes                                                                                                                                                                                                                                                                                                               |
| ---- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy          | Wired   | **Swept Jul 28:** greeting, Up Next, widget empty states, weather city, Add-widgets catalog — org/team language; no school-only, workspace, or “Open campaign” jargon; task links use Tasks Ease `?scope=mine&pulse=week`                                                                                           |
| [x]  | Customer-facing simplicity    | Partial | **Rated Jul 28.** Default board is calm: greeting → Up Next hero → Attention / Waiting / Good news + weather/calendar/week rail. **Mall risk:** Add / Edit + drag/color customization and optional phase-3 widgets (Approvals, Tasks, Volunteers, Insights) — power features; most chairs can ignore on first visit |
| [x]  | Step count (primary job)      | Partial | **See what’s next:** land on `/dashboard` → read Up Next → tap primary CTA ≈ **1–2 steps**. **Act on approval/volunteer/task:** Attention row → destination ≈ **2 steps**. Within ≤4 target                                                                                                                         |
| [x]  | Adaptability rating           | High    | **High (Jul 28).** Serif greeting + plain status line; Up Next is one obvious hero; Attention counts are scannable links. Optional widgets stay off default layout; onboarding checklist is dismissible                                                                                                             |
| [x]  | Personalized Welcome          | Wired   | `TodayHero` time-of-day greeting + first name; teammate note or calm default status line                                                                                                                                                                                                                            |
| [x]  | Next Event                    | Wired   | **Up Next** widget — artwork hero, due/action line, primary CTA (event title, not “workspace”)                                                                                                                                                                                                                      |
| [x]  | Upcoming Deadlines            | Wired   | Up Next step titles + **Waiting on me** list + optional **Tasks this week** widget                                                                                                                                                                                                                                  |
| [x]  | Recent Activity               | Wired   | **Good news** widget (recent wins); event Activity lives on event tabs                                                                                                                                                                                                                                              |
| [ ]  | Notifications                 | N/A     | No dedicated in-app notification feed — Attention + sidebar badges suffice for soft launch                                                                                                                                                                                                                          |
| [x]  | Quick Actions                 | Wired   | Up Next CTA + Attention deep links; full **Create with AI** / **Calendar** hero CTAs remain deferred to the Ease mockup GO                                                                                                                                                                                          |
| [ ]  | Ask Ralli entry               | Wired   | Sidebar **Hey Ralli Assistant** (pinned after primary nav) — not duplicated on Dashboard                                                                                                                                                                                                                            |
| [x]  | Calendar Widget               | Wired   | Mini month (events only) in right rail                                                                                                                                                                                                                                                                              |
| [ ]  | AI Suggestions                | N/A     | No standalone AI suggestions tile — Create with AI + Assistant are separate surfaces                                                                                                                                                                                                                                |
| [x]  | Organization Health           | Wired   | **Attention** counts (approvals, volunteers, tasks) + optional Insights pulse widget (off by default)                                                                                                                                                                                                               |
| [ ]  | Library widgets (Add catalog) | Wired   | **Jul 28:** optional **Posts this week**, **Waiting on others**, **Event coverage** from widget-library mockup — off default board; Mine/Everyone toggles on first two; DB-only loaders (no Meta Graph on dashboard load)                                                                                           |
| [ ]  | Connected Accounts            | Wired   | Settings Overview → **Connected** shows Facebook & Instagram, Google Calendar, and Canva status with a link to manage connections; not duplicated as a Dashboard tile                                                                                                                                               |
| [x]  | Weather (optional)            | Wired   | Pinned top-right; org weather city/ZIP in Settings → Organization (separate from mailing address)                                                                                                                                                                                                                   |
| [ ]  | Search                        | N/A     | Global search not on Dashboard — Events/Tasks/Volunteers have local search on their hubs                                                                                                                                                                                                                            |
| [ ]  | Dashboard Ease redesign       | Partial | **Shipped:** Your overview board (greeting, widgets, Add/Edit, DnD). **Mockup not GO:** calmer first viewport with Create with AI / Calendar hero CTAs — see feature-list                                                                                                                                           |


### Calendar & Event Management

*Audited July 29, 2026 — Status = code reality; check Done when Verified on Production.*  
*Product decisions (same day): no event duplicate; Timeline out of scope; Campaign/communication plan templates later; Recurring deferred until school-year rollover is designed.*


| Done | Item                                    | Status   | Notes                                                                                                                                                                                                                                                                                                                              |
| ---- | --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy                    | Wired    | Swept Jul 28: Calendar shell/empty/import/review, Google + subscribe feed, Events Home/create/detail helpers, category display labels (Team/Organization event), Settings calendar chrome — org/team/year language; refresh not sync; no ICS/webcal/School Setup/doorway-pattern jargon; School year kept as Settings feature name |
| [x]  | Customer-facing simplicity              | Partial  | **Rated Jul 28, refreshed Jul 29.** Calendar IA simplified: Month · Week · Best times · Agenda only; **Bring in calendar** owns import/review/imported items (no peer Import/Review/Import list tabs). Compact framed shell; month view dropped **Coming up · Next 7 days**. Events Home filters: **Upcoming · Next month · All**. Event detail defaults to Approvals — good primary job. Remaining mall risk: Events Home vs event tabs (10 tabs). |
| [x]  | Step count (primary job)                | Partial  | **Create event:** Events Home → Create → Save ≈ **2–3 steps**. **Import calendar:** Calendar → **Bring in calendar** → review → Import All ≈ **4–5 steps** (acceptable for annual job). **Open event workspace:** Events Home → View Details ≈ **2 steps**.                                                                                       |
| [x]  | Adaptability rating                     | Medium   | **Medium (Jul 28).** Events Home + create are approachable; calendar import and event tab strip need one walkthrough. Raise toward **High** if a non-founder imports + opens event without help.                                                                                                                                   |
| [x]  | Create Event                            | Wired    | `/events/create` + onboarding Ease; `createEvent` / `insertEvent`; capacity gate `eventsPerSchoolYear`                                                                                                                                                                                                                             |
| [x]  | Edit Event                              | Wired    | Phase 3 hero Edit Details + overview saves (`updateEventDetailsAction`)                                                                                                                                                                                                                                                            |
| [x]  | Delete Event                            | Wired    | Manage menu → typed DELETE; archive/restore also wired                                                                                                                                                                                                                                                                             |
| [x]  | Duplicate Event                         | N/A      | **Out of scope** — not needed for launch                                                                                                                                                                                                                                                                                           |
| [x]  | Recurring Events                        | Deferred | **Later.** Design blocker: when a school year closes, how last year’s series/data lands in the new year (carry-forward vs re-import vs archive). Do not ship rrule until rollover is decided                                                                                                                                       |
| [x]  | Event Status                            | Wired    | draft / scheduled / published / archived; Events Home filter pills (Upcoming · Next month · All) + card status badges; Edit Details does not change status                                                                                                                                                                         |
| [x]  | Timeline                                | N/A      | **Not needed** — Phase 3 Activity + communication plan planning suffice; no Communication Timeline tab                                                                                                                                                                                                                             |
| [x]  | Campaign Creation                       | Wired    | Strategies + upgrade/demote; CwAI `/create-with-ai/social` + event campaign builder                                                                                                                                                                                                                                                |
| [x]  | Campaign / Communication Plan templates | Deferred | **Not ready yet** — communication plans exist as assignable plans; a template gallery / reusable campaign templates waits for a later pass                                                                                                                                                                                         |
| [x]  | Communication Plans                     | Wired    | Library + assign by event type; Settings Branding / `/settings/playbooks-milestones` (day-to-day use; template productization deferred above)                                                                                                                                                                                      |
| [x]  | School Year Calendar                    | Wired    | `/calendar` primary views: Month, Week, Best times, Agenda; compact framed Ease shell ([`calendar-ease-cleanup-mockup.html`](../../public/calendar-ease-cleanup-mockup.html)); **Bring in calendar** is the single import entry; no month **Coming up · Next 7 days** panel. Sub: Meta chips, best-times heatmap, DnD Meta reschedule ([meta-calendar-dnd.md](./meta-calendar-dnd.md)) — not school-event DnD |
| [x]  | Calendar import (Google / ICS / file)   | Wired    | **Bring in calendar** → `/calendar?tab=import` (+ `/calendar/import` alias); Google OAuth, ICS/webcal, file upload; **View imported items** inside import hub; onboarding Essentials                                                                                                                                            |
| [x]  | Calendar review / dedupe                | Wired    | Import flow → `/calendar?tab=review`; New/Duplicate/Update/Conflict; same ICS UID / Google id updates existing row on title or date change; unique on `(school_year_id, import_source, import_external_id)`; [calendar-import-dedupe.md](./calendar-import-dedupe.md); Playwright `14`                                                                                                                                                                                     |
| [x]  | Event detail workspace (tabs hub)       | Wired    | `/events/[id]` Phase 3: Approvals, Tasks, CwAI, Volunteers, Insights, Team, Notes, Files, Vendors, Activity                                                                                                                                                                                                                        |


### Create with AI

*Audited Jul 28, 2026 — copy swept; simplicity/steps/adaptability rated (honest, not High yet).*  
*Chooser is Social-first + Also available. Flyer composer is static HTML (in progress). AI Edit / AI Copy / AI History are not real customer products.*


| Done | Item                         | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy         | Wired       | Swept Jul 28: playbook→Communication Plan, milestone→Posts across app, settings, Create with AI, docs, and mockups; Jul 28 spot-fix: Events Home Social blurb, builder “Maps to N posts”, `/features` explorer — internal IDs/routes unchanged                                                                                                                                                                                                                                                                                            |
| [x]  | Customer-facing simplicity   | Partial     | **Rated Jul 28.** Landing improved (Social hero + quieter Also available). Social builder still a multi-step campaign tool; composers mirror Homepage steps (Header→…→Export). Not yet “one obvious Tuesday job” for a brand-new volunteer. Next levers: keep Social primary; avoid re-equalizing Also available cards; shorten Social path later if step count stays painful                                                                                                                                                             |
| [x]  | Step count (primary job)     | Partial     | **Social (primary):** Creative Setup → Milestones → Preview → Review (& send for approval) ≈ **4 builder steps**, plus event pick / credits / approval loop afterward — **borderline too many** for first-time chairs; acceptable for a comms lead who repeats it. **Homepage / Volunteer / Newsletter:** ~5 composer steps each (design-once + content + preview/export) — OK for monthly site update, heavy if mistaken for the daily path. **Target:** first social win closer to ≤4 *including* “send for approval” without dead ends |
| [x]  | Adaptability rating          | Medium      | **Medium (Jul 28).** New teammate can start from Social-first landing; still needs one walkthrough for posts/artwork/approval. Raise toward **High** only after a non-founder completes social → approval without help. Composers stay Medium (power tools under Also available — fine if not the default)                                                                                                                                                                                                                                |
| [x]  | Chooser landing              | Wired       | `/create-with-ai` — **Start here** Social · Flyer (equal two-up); quieter **Also available**: Homepage · Volunteer page · Newsletter · Sponsorship (soon)                                                                                                                                                                                                                                                                                                                                                                                 |
| [x]  | Social Media Generator       | Wired       | `/create-with-ai/social` → Creative Setup (hub when no events / no access); event builder `/events/[id]/campaign-builder`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [x]  | Homepage Builder             | Wired       | `/homepage-composer` — full-month **Open page** + **Save as PDF** on `/share/homepage/[token]`; approvals hook (`share_status`) **Partial** — [qa](./homepage-composer.md)                                                                                                                                                                                                                                                                                                                                                                |
| [x]  | Newsletter Builder           | Wired       | `/newsletter-composer` — [qa](./newsletter-composer.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [x]  | Volunteer page builder       | Wired       | Soft launch `/volunteer-composer` via Website pages / Also available; full-page HTML export is live. Hosted share/PDF are deferred enhancements                                                                                                                                                                                                                                                                                                                                                                                           |
| [x]  | AI Regenerate                | Wired       | Edit Artwork regenerate + Preview generate this/next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [x]  | Reject generated artwork     | Wired       | Subtle thumbs-down on Preview / Edit regenerated preview — clears that feed/story slot (not Approvals hard Reject)                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [x]  | AI Edit                      | N/A         | **Not a product** — no customer surface named AI Edit; regenerate + Instruct AI cover the need                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [x]  | AI Copy                      | N/A         | **Not a product** — caption edit/regenerate only; no standalone AI Copy tool                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [x]  | AI Save Draft                | Wired       | Composers: newest-wins local draft store; Social Review **Save as draft**                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [x]  | AI History                   | N/A         | **Empty** — no customer AI History UI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| [x]  | AI Usage Tracking            | Wired       | Sidebar credits widget + Billing usage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [x]  | AI Credit Counting           | Wired       | Credits widget + hard-block when exhausted (`AiCreditsWidget` / `AI_CREDITS_*`)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [x]  | Prompt Logging               | N/A         | **Internal / Owner-only** — not a customer surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [x]  | Error Handling               | Wired       | Generation/upload/save toasts + recovery messages across builder + composers                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [x]  | Retry Logic                  | Wired       | Preview / empty-state **Retry generation**; credit verify retry copy                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [x]  | AI Brain (org voice / style) | Wired       | Settings → Branding (AI Brain)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [x]  | AI Inbox sources             | Wired       | Settings → Branding (Inbox sources)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [x]  | Flyer                        | Coming soon | Chooser card only; Flyer composer at `public/create-with-ai-flyer.html` — do not ship until GO                                                                                                                                                                                                                                                                                                                                                                                                                                        |


### Ask Ralli

*Audited Jul 28, 2026 — Playwright `12` passed (5/5). Sidebar **Hey Ralli Assistant** pinned after primary nav.*


| Done | Item                         | Status   | Notes                                                                                                                                                                                                            |
| ---- | ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy         | Wired    | Swept Jul 28: sidebar label, suggestion chips, eyebrow labels (Insights / Draft helper / Your next steps), empty/error — org/event language; no ops-engineering dump in UI                                       |
| [x]  | Customer-facing simplicity   | Partial  | **Rated Jul 28.** One obvious entry (sidebar pin); curated chips reduce blank-page anxiety. **Tradeoff:** answer quality varies by intent — ops/org answers are strong; ambiguous events show pick chips (good). |
| [x]  | Step count (primary job)     | Partial  | Open assistant → tap chip or type question ≈ **1–2 steps**. Event disambiguation adds one chip tap. Within ≤4.                                                                                                   |
| [x]  | Adaptability rating          | Medium   | **Medium (Jul 28).** New teammate can ask “Where do I start?” and get grounded links; draft/insights paths need one tip. Playwright confirms ops + product-help paths.                                           |
| [x]  | Ops coach (Phases 1–5)       | Wired    | Pinned under Insights; routing Phases 1–5 in `ask.ts`; [eng + QA](../engineering/ask-ralli-assistant.md)                                                                                                         |
| [x]  | Regression / Playwright `12` | Verified | **5 passed** Jul 28 (staging test seat). Re-run after auth env changes.                                                                                                                                          |


### Tasks

*Audited July 28, 2026 — org `/tasks` is the full hub; event Tasks tab is intentionally lighter.*


| Done | Item                           | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy           | Wired   | Swept Jul 28: Ease shell/list/boards/drawer/Ask AI, event Tasks tab, add/complete toasts/errors — org/team/event language; no migration/PTO/OPENAI/chrome/ease jargon; calm empties                                                                                                                                                                                                                                    |
| [x]  | Customer-facing simplicity     | Partial | **Rated Jul 28.** Team / Mine is clear; List default is the right primary job. **Mall risk:** List / Status / Focus / Custom are four equal view tabs (plus pulse + event chips) — power density for chairs who want boards; new volunteers can ignore them if they stay on List. Event tab intentionally light (“Needs you next”) — good. Next lever: demote Custom (and maybe Focus) so List stays obviously primary |
| [x]  | Step count (primary job)       | Partial | **Org hub:** open `/tasks` → Add task (event + name) → Add ≈ **2–3 steps**; mark done = **1 click** on checkbox. **Event tab:** open event Tasks → Mark done ≈ **2 steps**. Within ≤4 target. Optional: Ask AI is generate → select → add (extra path, not required for first win)                                                                                                                                     |
| [x]  | Adaptability rating            | Medium  | **Medium (Jul 28).** New board volunteer can add/complete on List with little help; four view tabs + pulse/filters need a tip or second visit. Raise toward **High** if Custom/Focus are quieter by default and first session stays List-only                                                                                                                                                                          |
| [x]  | Tasks Ease list (Team / Mine)  | Wired   | `/tasks` Ease shell; `?scope=team|mine`; done → muted + strikethrough. Gap: some dashboard deep links still use legacy `?tab=my_tasks` query params                                                                                                                                                                                                                                                                    |
| [x]  | Status / Focus / Custom boards | Wired   | List / Status / Focus / Custom. Custom columns persist in localStorage (not server). Calendar/Timeline/Workload views deferred                                                                                                                                                                                                                                                                                         |
| [x]  | Create / complete / edit       | Wired   | Org hub: Add, checkbox/DnD complete, drawer edit. **Event tab** (`?tab=tasks`): mark-done + focus queue only — no create/edit/Ask AI (by design for “Needs you next”)                                                                                                                                                                                                                                                  |
| [x]  | Ask AI on tasks                | Wired   | `TasksEaseAskAi` on org `/tasks`; AI-gated; not on event Tasks tab                                                                                                                                                                                                                                                                                                                                                     |


### Files

*Audited July 28, 2026 — smart filing MVP: type groups + generated post graphics on event tab; org library search/type/event chips.*


| Done | Item                       | Status  | Notes                                                                                                                                                                                                 |
| ---- | -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy       | Partial | Calm smart-filing copy on org `/files`, event Files tab, upload dialog, and context **Add file** toast; legacy `FilesDocumentsShell` unchanged — low traffic                                          |
| [x]  | Customer-facing simplicity | Partial | **Rated Jul 28.** Type pills replace folder tree as hero; optional folders on event tab. Volunteers/Tasks get small Add file — not drop zones everywhere.                                             |
| [x]  | Step count (primary job)   | Partial | **Upload (event context):** tab → Add file → pick ≈ **2 steps**. **Org:** drop → pick event ≈ **2–3 steps**. Within ≤4.                                                                               |
| [x]  | Adaptability rating        | Medium  | **Medium (Jul 28).** Type groups obvious; optional folders for power users.                                                                                                                           |
| [x]  | Files library              | Wired   | `/files` Ease: search, type pills, event chips, sort, rename, Open/Download                                                                                                                           |
| [x]  | Event Files tab            | Wired   | Phase 3 `?tab=files` — type pills, auto-file note, generated post graphics (read-only), optional folders, upload/open                                                                                 |
| [x]  | Context upload             | Wired   | Quiet **Add file** on event Volunteers + Tasks tabs → same upload action, toast “Saved to this event”                                                                                                 |
| [x]  | Upload / download          | Wired   | Org: DnD → upload dialog (event pick, type inferred). Event: drop/click upload; open via storage URL                                                                                                  |
| [x]  | Tenant isolation           | Wired   | Active-org event gate + Storage RLS on `campaign-files` (`{eventId}/…`). Residual: bucket is **public** — known URLs remain fetchable (documented in [storage-rls.md](../engineering/storage-rls.md)) |
| [x]  | Folders per campaign       | Wired   | Optional on event tab (`<details>`); Move still on rows when folders exist; org library no longer surfaces folder bar as hero                                                                         |


### Vendors

*Audited July 28, 2026 — contact-first Ease; soft-launch nav hides org Vendors (event tab + `/vendors` URL remain).*


| Done | Item                             | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | -------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy             | Wired   | Swept Jul 28: directory/profile/event tab, add wizard, notes empty, action toasts/errors — org/team language; no School Setup/migration/admin-jargon; calm empties                                                                                                                                                                                                                                                                                                                                    |
| [x]  | Customer-facing simplicity       | Partial | **Rated Jul 28.** Soft-launch: org Vendors off left rail → less chrome; primary job lives on event `?tab=vendors` (Call/Email + link). Directory tabs All/Favorites/Past/Blocked stay quiet under search. **Tradeoff:** `/vendors` discoverability drops (Browse directory / direct URL only) — intentional clutter cut, not a mall of equal doors on the event tab. Profile’s five secondary tabs are power density after the contact hero. Add wizard still three screens (Basics → event → Review) |
| [x]  | Step count (primary job)         | Partial | **Call/email (event):** open Vendors tab → Call/Email ≈ **2**. **Link existing:** Add existing → pick → Link ≈ **3–4**. **Add new (event):** Add new → Basics → Connect event (prefilled) → Review → Create ≈ **4** wizard steps (within target; Review is the stretch). **Org directory first find:** not in nav — needs Browse directory or URL (extra discoverability step by design)                                                                                                              |
| [x]  | Adaptability rating              | Medium  | **Medium (Jul 28).** Event-tab chairs finish call/link with little help. Org directory needs one tip (“open Browse directory” or bookmark `/vendors`). Raise toward **High** if a non-founder links a vendor from an event without asking where the full list went                                                                                                                                                                                                                                    |
| [x]  | Vendor directory (contact-first) | Wired   | `/vendors` cards (Call/Email/Website + profile); filters Favorites/Past/Blocked; Add wizard; logo upload on card; create can link events. Soft launch: not in left sidebar                                                                                                                                                                                                                                                                                                                            |
| [x]  | Vendor profiles                  | Wired   | `/vendors/[id]` hero + Overview/Events/Notes/Documents/Activity; Favorite/Block. Gap: Edit updates vendor-level contact fields only (not primary contact name/title); Events tab read-only (no assign from profile)                                                                                                                                                                                                                                                                                   |
| [x]  | Event Vendors tab                | Wired   | Phase 3 `?tab=vendors` Ease panel: contact rows + Profile; in-tab **Add existing** (unlinked picker via `assignVendorToEventAction`), **Add new** (`VendorAddModal` preselects event), **Unlink** with confirm (`removeVendorFromEventAction`); Browse directory → `/vendors` (full directory, not linked-only `?event=` filter)                                                                                                                                                                      |


### Insights (Meta)

Distinct from marketing Analytics below.  
*Audited July 27, 2026 — Ease shells live; demographics deferred by design.*


| Done | Item                               | Status   | Notes                                                                                                                                                                                                                                                               |
| ---- | ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy               | Wired    | Swept Jul 27: Ease shell Org/Connect/Event, event Insights panel, empty/sync/toasts/errors, connection banner, recommendations, sync action messages, pulse widget — org/Page language; no scope/OAuth/sync/school-only jargon; Communications why cards not shared |
| [x]  | Customer-facing simplicity         | Partial  | **Rated Jul 28.** Connect empty is calm (organic / no ads / no demographics). Org KPIs + filters are power-user but off main nav for soft launch (Insights off left rail — event tab + direct URL).                                                                 |
| [x]  | Step count (primary job)           | Partial  | **Refresh Page numbers:** Settings or Insights → Refresh ≈ **2–3 steps**. Event Insights: event tab → Refresh ≈ **2 steps**.                                                                                                                                        |
| [x]  | Adaptability rating                | Medium   | **Medium (Jul 28).** Empty states explain why connect; connected org view needs Meta + one walkthrough for filters/export.                                                                                                                                          |
| [x]  | Org Insights                       | Wired    | `/insights` → Ease KPIs, Content overview, Top content, platform/date filters; pills `?view=org|connect|event`. Smoke `11-insights`                                                                                                                                 |
| [x]  | Connect Meta empty (Insights)      | Wired    | Insights-local purpose empty when disconnected / `?view=connect`: organic / no ads / no demographics + Connect + “Why we ask for Page Insights”. Four Communications why cards stay on `/communications` only — **do not share** onto Insights Connect              |
| [x]  | Event Insights                     | Wired    | `/events/[id]?tab=insights` + hub `?view=event`; KPI strip + posts; empty connect / no_posts / sync. [event-insights.md](../product/event-insights.md)                                                                                                              |
| [x]  | Refresh / sync                     | Wired    | Org/Event Refresh → `syncInsightsAction`; also `/api/insights/sync` + cron. Open tab is DB-only until Refresh                                                                                                                                                       |
| [x]  | Top content / filters              | Wired    | Platform All/FB/IG, date 7/14/28/30, carousel + `?contentSort=`                                                                                                                                                                                                     |
| [x]  | CSV export                         | Wired    | Org **Export CSV** → `/api/insights/export` (hidden on Connect empty)                                                                                                                                                                                               |
| [x]  | Plan gate (`social_analytics`)     | Wired    | Entitled on Starter–Premium for App Review reachability                                                                                                                                                                                                             |
| [x]  | Demographics (Age & gender)        | Deferred | Not requested / not shown — [meta-app-review-use-cases.md §5](../ops/meta-app-review-use-cases.md#5-demographics-age--gender--definitive-answer)                                                                                                                    |
| [x]  | Insights-weighted calendar heatmap | Deferred | Best times stay on `/calendar`; not driven by Insights metrics                                                                                                                                                                                                      |


### Communications Hub (Inbox)

*Inbox / DMs / comments only — not post publishing. Audited July 27, 2026. Publishing outcomes live under Approvals.*


| Done | Item                       | Status  | Notes                                                                                                                                                                       |
| ---- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy       | Wired   | Swept Jul 27: Connect Meta four why cards, hub/inbox chrome, AI draft reply honesty, connection badge/toasts/errors — org/Page/team language                                |
| [x]  | Customer-facing simplicity | Partial | **Rated Jul 28.** Connect empty (four why cards) is clear. Full hub chrome still mockup-polish — usable when Meta connected. Approve-then-send is honest (never auto-sent). |
| [x]  | Step count (primary job)   | Partial | **Reply to DM:** Communications → thread → draft → Approve & Send ≈ **3–4 steps**. Connect Meta: Settings or Communications empty → OAuth ≈ **3–4 steps**.                  |
| [x]  | Adaptability rating        | Medium  | **Medium (Jul 28).** Inbox familiar to anyone who uses Page Manager; AI draft path needs one demo. **Gated** until Meta App Review for new orgs.                            |
| [x]  | Facebook Page inbox        | Wired   | Messenger + Page comments/tags via Meta connection                                                                                                                          |
| [x]  | Instagram DMs & comments   | Wired   | Linked IG Professional messaging + comments                                                                                                                                 |
| [x]  | Communications Hub         | Wired   | `/communications` (+ `/inbox` redirect); Connect Meta Ease empty (four why cards). Full Ease chrome still Meta-review polish                                                |
| [x]  | AI Replies                 | Wired   | Draft → edit → Approve & Send; **never auto-sent**                                                                                                                          |


Connect Meta empty (four why cards) stays on `/communications` only — not shared onto Insights Connect.

### Approvals & publishing

*Approval workflow + Meta post outcomes (Draft → Scheduled → Posted / Failed → Retry). Moved from Communications Jul 27, 2026. Audited Jul 27, 2026.*


| Done | Item                                | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy                | Wired   | Swept Jul 27: Approvals hub + event Approvals tab + Review drawer + approve/request/retry toasts/errors + change-request email — org/Page/team language; no Meta-feed/View-scope/Needs-regeneration jargon                                                                                                                                                                                                                                                                                                                                                            |
| [x]  | Customer-facing simplicity          | Partial | **Rated Jul 28.** Posted / Failed / Retry are first-class — good outcomes clarity. Open review + revision workspace are dense for creators; approver path is clearer.                                                                                                                                                                                                                                                                                                                                                                                                 |
| [x]  | Step count (primary job)            | Partial | **Approve:** Approvals → Open review → Approve & schedule ≈ **2–3 steps**. **Creator:** CwAI Review → Send for approval ≈ **4+ builder steps** (see Create with AI).                                                                                                                                                                                                                                                                                                                                                                                                  |
| [x]  | Adaptability rating                 | Medium  | **Medium (Jul 28).** Approvers can scan queue + approve with little help; creators need walkthrough for change-request / revision loop.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [x]  | Submit for Approval                 | Wired   | Create with AI Review **Send for approval** / re-approval via `approval-bridge` → `approval_scheduling_items` + approver email; classic `sendCommunicationForApprovalAction` still wired                                                                                                                                                                                                                                                                                                                                                                              |
| [x]  | Approve                             | Wired   | Review drawer **Approve & schedule** → `approveUnifiedItemAction` (Meta schedule/publish, post-kit email, content-approved email)                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| [ ]  | Reject (posts)                      | N/A     | Hard Reject for Approvals posts not shipped — product path is **Request changes** (classic DB may write `rejected` then `changes_requested`)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [x]  | Reject generated artwork            | Wired   | Create with AI Preview / Edit Artwork: subtle thumbs-down icon after generation discards that feed/story slot (session + backup + hero sync); regenerate via Generate / Edit artwork                                                                                                                                                                                                                                                                                                                                                                                  |
| [x]  | Revision workspace (change request) | Partial | `/approvals/revision` — Round 3: dual feed (1:1) + story (9:16) preview for creator & approver; in-shell AI regenerate per format / both / caption from change comments ([approvals-revision-ai-regenerate-mockup.html](../../public/approvals-revision-ai-regenerate-mockup.html)); inline schedule; resubmit syncs scheduling row + CB2 session + email. **Wired:** Request changes + tags → checklist; Send for re-approval. Still later: multi-round history depth, newsletter/flyer/homepage adapters. Verify on Production — **launch-checklist 6.2 Needs you** |
| [x]  | Request Changes                     | Wired   | Review drawer + comment required → `requestUnifiedChangesAction` + change-request email                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [x]  | Version History                     | Partial | Drawer **Approval timeline** from `approvalHistory` (submit / changes); not full creative version history; Approved/Posted/Failed often missing on CB2 rows                                                                                                                                                                                                                                                                                                                                                                                                           |
| [x]  | Activity Timeline                   | Wired   | Event Activity mirrors classic and unified approval lifecycle: sent, approved, change requested, and re-submitted; published outcomes already log from Meta publishing                                                                                                                                                                                                                                                                                                                                                                                                |
| [x]  | Notifications                       | Wired   | Sidebar Approvals / Changes badges sufficient — no dedicated in-app notification feed needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [x]  | Email Alerts                        | Wired   | Assigned / resubmitted / change requested / content approved / scheduled / post kit; Account **Approval needs attention** mutes assigned/resubmitted/changes only                                                                                                                                                                                                                                                                                                                                                                                                     |
| [x]  | Facebook publishing                 | Wired   | Page feed + stories via Meta; native FB feed schedule on Approve                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [x]  | Instagram publishing                | Wired   | IG feed/stories via Meta; due-publish cron every ~20 min (not Meta-native schedule like FB feed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [x]  | Scheduled posts                     | Wired   | Approvals + Meta bundles + cron (~20 min cadence, due slots only); Scheduled filter excludes saved drafts                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [x]  | Drafts                              | Wired   | **Draft** chip on draft-only rows; dedicated **Drafts** filter tab intentionally removed from Approvals hub + event tab for soft launch                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [x]  | Posted                              | Wired   | Approvals Ease + event Approvals tab: **Posted** filter/pill; Meta publish success syncs scheduling rows                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [x]  | Failed                              | Wired   | Dedicated **Failed** filter/queue on Approvals hub + event tab; slot outcomes overlay + persisted `failed` status                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| [x]  | Retry                               | Wired   | Clear **Retry** on Failed rows/drawer; wires `retryFailedUnifiedApprovalAction` → `retryFailedMetaBundleAction`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [x]  | Manual publish kit                  | Partial | Story post kit + email post kit on approve / cron; no clear “I posted it” completion in Approvals                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |


**Product intent (Jul 27):** Approvals should surface **Posted** or **Failed** (with **Retry**) as first-class outcomes. Draft-only rows keep the **Draft** chip but no longer have a dedicated filter tab for soft launch.

### Volunteer Management

*Audited July 27, 2026 — Ease Master + event Volunteers tab; public signup hosted on SignUpGenius (not Hey Ralli). Review/confirm restored on event tab after Ease panel dead-end.*


| Done | Item                         | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy         | Wired   | Swept Jul 27: `/volunteers` Master shell + Ease list, event Volunteers Ease + full Tab (connect/review/confirm), SignUpGenius URL/errors/empty/refresh — org/team language; no PII/OAuth/scope/sync jargon; “Refresh numbers” / “Connect signup”                                                                                                                           |
| [x]  | Customer-facing simplicity   | Partial | **Rated Jul 28.** URL connect + review-before-import is honest and avoids OAuth tease. Master + event tab share fill-rate language. SignUpGenius lives off-site — clear in copy.                                                                                                                                                                                           |
| [x]  | Step count (primary job)     | Partial | **Connect signup:** event Volunteers → paste URL → review → confirm ≈ **3–4 steps**. **Refresh:** tab → Refresh ≈ **2 steps**.                                                                                                                                                                                                                                             |
| [x]  | Adaptability rating          | Medium  | **Medium (Jul 28).** Chairs understand “connect signup link”; date review step needs one tip first time.                                                                                                                                                                                                                                                                   |
| [x]  | Volunteer Opportunities      | Wired   | Roles/assignments from confirmed SignUpGenius snapshots (open spots, underfilled roles) — not a separate opportunities CRUD                                                                                                                                                                                                                                                |
| [x]  | Public Pages                 | N/A     | Hey Ralli does **not** host public volunteer pages; parents sign up on SignUpGenius public `/go/…` links                                                                                                                                                                                                                                                                   |
| [x]  | Signup Links                 | Wired   | Planning `volunteer_signup` URL + SignUpGenius source URL; **Open signup** on Master focus card, event tab, Today widget deep links                                                                                                                                                                                                                                        |
| [x]  | Volunteer Dashboard / Master | Wired   | `/volunteers` Ease: Needs people focus + quiet queue, health text, search; [volunteer-master.md](../product/volunteer-master.md)                                                                                                                                                                                                                                           |
| [x]  | Fill Rate                    | Wired   | Shared bands Critical → Fully Staffed on Master + event tab (`getVolunteerFillRateBand`)                                                                                                                                                                                                                                                                                   |
| [x]  | Statistics                   | Wired   | Master health (fill % · open roles · volunteers signed up); event Quick Totals / Overall Filled; Today Volunteers widget                                                                                                                                                                                                                                                   |
| [x]  | Event Progress               | Wired   | Event Volunteers tab: Needs at a glance + per-role progress; event detail hero **Filled** from latest confirmed snapshot                                                                                                                                                                                                                                                   |
| [x]  | Search / Filters             | Wired   | Master: search (title/role) + pills Needs people / Upcoming / Covered / All; event tab: Filter + Date + Sort on roles                                                                                                                                                                                                                                                      |
| [x]  | SignUpGenius connect / sync  | Wired   | **Long-term path = public URL connect** on event Volunteers → **review/verify dates before import** → confirm → refresh. Master is read-only. **OAuth deferred:** SignUpGenius Pro is required for API OAuth and many orgs don’t have it; revisit when most customers are on Pro, then consider a second pull option alongside URL. No Settings OAuth “Coming soon” tease. |


### Teams & Permissions

*Audited July 27, 2026 — Settings Team & Access Ease (`/settings/team-access`) is the customer surface; full person profiles remain at `/settings/team-access/people/[id]`. Access templates = assignable roles (Admin, President, VP Communications, Event Lead / committee, Contributor, View Only, Developer, Tester). Platform Owner Portal (`/ops`) is separate.*


| Done | Item                                 | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy                 | Wired   | Swept Jul 27: Ease list + empty/claim, invite + Give access modals, person drawer, roles editor, permission chip descriptions, roster import, invite email fallback — org/team language; no PTO/board-only / Access-templates / pop-out / mutate jargon                                                                                                                                                 |
| [x]  | Customer-facing simplicity           | Partial | **Rated Jul 28.** People list + Invite is obvious. Person drawer (Overview / Events / Access) packs depth — templates editor is admin-only.                                                                                                                                                                                                                                                             |
| [x]  | Step count (primary job)             | Partial | **Invite:** Team & Access → Invite → email ≈ **2–3 steps**. **Change role:** open person → Access → Save ≈ **3 steps**.                                                                                                                                                                                                                                                                                 |
| [x]  | Adaptability rating                  | High    | **High (Jul 28).** Invite + role pick matches how chairs think about team access; drawer tabs are labeled plainly.                                                                                                                                                                                                                                                                                      |
| [x]  | Invite Members                       | Wired   | Ease **Invite** → `inviteTeamMemberAction` + email/link; Give access for roster people; onboarding Connect also invites                                                                                                                                                                                                                                                                                 |
| [x]  | Remove / deactivate Members          | Wired   | Ease **Edit profile** → Sign-in status Active/Inactive (`updateTeamMemberAction`); full Remove + Deactivate also on person profile deep link; self-deactivate blocked                                                                                                                                                                                                                                   |
| [x]  | Change Roles                         | Wired   | Person drawer Access role + permission switches; Edit profile Role; **Edit roles** templates editor (Admin/President can edit)                                                                                                                                                                                                                                                                          |
| [x]  | Admin Permissions                    | Wired   | Default template: full people/billing/integrations + draft/approve/publish; `manage_people` safety-locked                                                                                                                                                                                                                                                                                               |
| [x]  | VP Permissions                       | Wired   | **VP Communications** template: draft/submit/approve/publish/artwork; no people/billing/integrations by default; display name org-customizable                                                                                                                                                                                                                                                          |
| [x]  | Committee Permissions                | Wired   | **Event Lead** (`committee_chair`): draft/submit/publish/artwork on events; no approve/people/billing by default; rename for org type                                                                                                                                                                                                                                                                   |
| [x]  | Viewer Permissions                   | Wired   | **View Only** template: see events; no draft/approve/publish/manage                                                                                                                                                                                                                                                                                                                                     |
| [x]  | Developer Permissions                | Wired   | Developer template + `/account/agreements` NDA/IP gate (`userMustSignDeveloperAgreements`); no people/billing/integrations by default                                                                                                                                                                                                                                                                   |
| [x]  | Owner Permissions                    | Wired   | Org leadership = **Admin** + **President** templates (same manage powers; President is the leadership seat). Platform Owner Portal (`/ops`) is not a customer Team Access role                                                                                                                                                                                                                          |
| [x]  | Event linking (person drawer)        | Wired   | Drawer Events tab toggles → `replaceMemberEventAssignmentsAction` / `setOrganizationUserEventAssignmentsAction`; invite can pre-link                                                                                                                                                                                                                                                                    |
| [x]  | Board roster / responsibility matrix | Partial | **Import roster** on Ease Team & Access (`/settings/team-access` → Import roster): Excel template at `/templates/board-roster-import.xlsx` (Position · Committee/Team · prior/current chair columns); `.xlsx` upload + paste preview parsing restored. Visual Board & committees / Responsibility Matrix UI still in codebase but **not mounted** on Ease after shell cutover — restore or rehome later |
| [x]  | Last logged in                       | Wired   | People rows + person drawer; org-scoped Auth `last_sign_in_at`; shows Never when null                                                                                                                                                                                                                                                                                                                   |


### Settings Ease hub

*Audited Jul 28, 2026 — Ease shell at `/settings` with soft left nav (Workspace · Connections · You); Overview summary cards + Connected/Branding panels; all subpages wired. Mockup: `[/settings-ease-mockup.html](https://heyralli.com/settings-ease-mockup.html)`*


| Done | Item                                                        | Status  | Notes                                                                                                                                                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy                                        | Wired   | Swept Jul 28: Overview, Organization, Branding hub, Team & Access, Integrations, Meta/Calendar detail, Billing, Account, School year — org/team/year language; refresh not sync; no ICS/webcal/School Setup jargon; **School year** kept as feature name                                                                                     |
| [x]  | Customer-facing simplicity                                  | Partial | **Rated Jul 28.** Seven quiet left-nav sections (Overview · Organization · Branding · Team & Access · Integrations · Billing · Account) — no mall of equal doors. Branding/Billing use section pills for depth without cluttering top nav. Advanced/Get started stay off nav (deep links only). Overview cards give one obvious jump per job |
| [x]  | Step count (primary job)                                    | Partial | **Invite teammate:** Settings → Team & Access → Invite ≈ **3 steps**. **Connect Meta:** Settings → Integrations → Facebook & Instagram → Connect ≈ **3–4** (OAuth). **Change org profile:** Settings → Organization → Save ≈ **2**. Within ≤4 target for common jobs                                                                         |
| [x]  | Adaptability rating                                         | High    | **High (Jul 28).** Left nav mirrors how chairs think (org, team, connections, billing, you). Overview cards answer “where do I go?” without training. Branding/Billing pills add depth but default hubs stay scannable                                                                                                                       |
| [x]  | Overview                                                    | Wired   | `/settings` — summary cards + Connected + Branding snapshot                                                                                                                                                                                                                                                                                  |
| [x]  | Organization (full mailing address)                         | Wired   | Street → country; weather location separate                                                                                                                                                                                                                                                                                                  |
| [x]  | Branding hub                                                | Wired   | School year, AI Brain, Inbox, Communication Plans, Colors & Logos                                                                                                                                                                                                                                                                            |
| [x]  | Team & Access                                               | Wired   |                                                                                                                                                                                                                                                                                                                                              |
| [x]  | Integrations                                                | Wired   | Meta, Canva, Google Calendar, etc.                                                                                                                                                                                                                                                                                                           |
| [x]  | Billing                                                     | Wired   | Usage / Plans / Payment                                                                                                                                                                                                                                                                                                                      |
| [x]  | Account (password, erase, session, notifications, sign-out) | Wired   |                                                                                                                                                                                                                                                                                                                                              |


### Multi-org & access gates


| Done | Item                           | Status   | Notes                                                                                                                               |
| ---- | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy           | Verified | Team Access + invite accept use org/team language; multi-org callout on Team & Access                                               |
| [x]  | Active org cookie / switcher   | Wired    | Header switcher when >1 active membership; redirects to `/dashboard` on switch                                                      |
| [x]  | Multi-org invite guidance      | Wired    | Settings → Team & Access callout + invite modal note; living doc § “Adding someone to a second organization”                        |
| [x]  | Canceled-subscription lockout  | Wired    | Active org with canceled paid sub → `/billing/canceled`; see [billing-and-access.md](../ops/billing-and-access.md)                  |
| [x]  | Developer agreements (NDA/IP)  | Wired    | `/account/agreements` gate + Owner counter-sign; manual QA in [developer-agreements.md](./developer-agreements.md); Playwright `17` |
| [x]  | Shared-device sign-out cleanup | Wired    | Campaign builder local drafts                                                                                                       |


### Billing — Stripe

*Audited Jul 28, 2026 — Settings Ease Billing (Usage · Plans · Payment) shipped; live Stripe in Production. Owner Checkout/Portal row still **Needs you** in [launch-checklist.md](./launch-checklist.md) §11.4.*


| Done | Item                           | Status  | Notes                                                                                                                                                                                   |
| ---- | ------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy           | Partial | Ease billing uses **Founding partner** / plan names / trial language; some **Stripe** portal labels visible (honest). Residual “schools” on plan chooser copy — org-neutral pass later. |
| [x]  | Customer-facing simplicity     | Partial | **Rated Jul 28.** Three pills (Usage · Plans · Payment) — clear. Usage meters + category breakdown are dense but scannable. Founding orgs see waived copy + same CTAs (not hidden).     |
| [x]  | Step count (primary job)       | Partial | **View usage:** Settings → Billing → Usage ≈ **2 steps**. **Change plan:** Plans → choose tier → Checkout ≈ **3–4 steps** (Owner verify once).                                          |
| [x]  | Adaptability rating            | Medium  | **Medium (Jul 28).** Treasurers find Plans + invoices; AI Reserve SKU grid needs one read.                                                                                              |
| [x]  | Free Trial                     | Wired   | 14-day / 600-credit pool; Stripe `trial_period_days` on first Checkout — [billing-and-access.md](../ops/billing-and-access.md)                                                          |
| [x]  | Checkout                       | Wired   | Stripe Checkout session, return, and webhook paths are wired; **launch-checklist 11.4 Needs you** is the remaining Owner Production spot-check                                          |
| [x]  | Upgrade                        | Wired   | Plans view → Checkout / change plan                                                                                                                                                     |
| [x]  | Downgrade                      | Wired   | Plans view + Stripe Portal                                                                                                                                                              |
| [x]  | Cancel                         | Wired   | Cancel-plan view + Portal; canceled org → `/billing/canceled` lockout                                                                                                                   |
| [x]  | Resume                         | Wired   | `/billing/canceled` → resubscribe Checkout                                                                                                                                              |
| [x]  | Failed Payment                 | Partial | Stripe dunning via Portal; in-app surfacing **Partial** — rely on Stripe emails                                                                                                         |
| [x]  | Card Updates                   | Wired   | Stripe Customer Portal from Payment view                                                                                                                                                |
| [x]  | Invoice History                | Wired   | Payment view lists Stripe invoices + PDF links                                                                                                                                          |
| [x]  | Receipts                       | Wired   | Stripe-hosted invoice PDFs                                                                                                                                                              |
| [x]  | Usage Limits                   | Partial | AI + capacity meters shown; file GB gate **deferred** per billing doc                                                                                                                   |
| [x]  | AI Limits                      | Wired   | Credits widget + hard block; Reserve burn order documented                                                                                                                              |
| [x]  | Founding / billing exempt path | Wired   | Founding code → `billing_exempt_at`; unlimited AI; honest “waived” copy                                                                                                                 |


### Owner Portal — Business Metrics


| Done | Item                 | Status   | Notes                                               |
| ---- | -------------------- | -------- | --------------------------------------------------- |
| [x]  | Customer-facing copy | N/A      | Owner Portal is for Marrina/ops — owner language OK |
| [x]  | Organizations        | Wired    | `/ops` metric tiles                                 |
| [x]  | Active Users         | Partial  | Platform-level; verify against Owner daily use      |
| [x]  | Active Trials        | Partial  | Derived from org billing snapshot                   |
| [x]  | Paid Customers       | Partial  | Stripe-linked orgs                                  |
| [x]  | MRR                  | Partial  | Owner dashboard; not audited Jul 28                 |
| [x]  | ARR                  | Partial  | Owner dashboard; not audited Jul 28                 |
| [x]  | Churn                | Deferred | Not a first-class Owner tile yet                    |
| [x]  | Revenue by Plan      | Partial  | Plan tier breakdown                                 |
| [x]  | New Signups          | Partial  | Signup funnel not fully instrumented                |
| [x]  | Daily Active Users   | Deferred | Not shipped                                         |
| [x]  | Monthly Active Users | Deferred | Not shipped                                         |


### Owner Portal — AI Monitoring


| Done | Item                  | Status   | Notes                                                       |
| ---- | --------------------- | -------- | ----------------------------------------------------------- |
| [x]  | Customer-facing copy  | N/A      | Owner Portal is for Marrina/ops — owner language OK         |
| [x]  | AI Requests           | Partial  | `/ops/ai-apis` — see [owner-ai-apis.md](./owner-ai-apis.md) |
| [x]  | AI Cost               | Partial  | Phases 0–5 shipped; OpenAI import optional                  |
| [x]  | Tokens                | Partial  | Usage logs                                                  |
| [x]  | Models Used           | Partial  | Usage breakdown                                             |
| [x]  | Cost Per Organization | Partial  | Org-scoped view                                             |
| [x]  | Cost Per User         | Deferred | Not first-class                                             |
| [x]  | Export Reports        | Deferred | Not shipped                                                 |


### Owner Portal — API Monitoring


| Done | Item                 | Status   | Notes                                               |
| ---- | -------------------- | -------- | --------------------------------------------------- |
| [x]  | Customer-facing copy | N/A      | Owner Portal is for Marrina/ops — owner language OK |
| [x]  | Meta                 | Partial  | Connected APIs tab                                  |
| [x]  | Canva                | Partial  | When configured                                     |
| [x]  | Google Calendar      | Partial  | Sync health                                         |
| [x]  | Resend               | Partial  | Email delivery                                      |
| [x]  | SignUpGenius         | Partial  | URL connect path only                               |
| [x]  | API Health           | Partial  | Aggregate view                                      |
| [x]  | Failed Requests      | Partial  | Log surfacing                                       |
| [x]  | Rate Limits          | Deferred | Not first-class UI                                  |


### Notifications


| Done | Item                        | Status  | Notes                                                                                |
| ---- | --------------------------- | ------- | ------------------------------------------------------------------------------------ |
| [x]  | Customer-facing copy        | Partial | Email templates + Account notification prefs use plain language; no in-app feed copy |
| [x]  | In-App Notifications        | N/A     | No dedicated feed — sidebar badges + Attention row (by design soft launch)           |
| [x]  | Email Notifications         | Wired   | Published Resend templates are wired for welcome, invites, the approval loop and one 24h reminder, story kits, developer agreements, publish failures, 3-day trial ending, Stripe payment failures, and Meta disconnect recovery; see [template inventory](../ops/resend-email-templates.md). |
| [x]  | Approval Notifications      | Wired   | Assigned / changes / resubmitted / approved — Account mute prefs                     |
| [x]  | Billing Notifications       | Wired   | One trial-ending notice is sent at 1–3 days remaining; `invoice.payment_failed` sends one owner/admin notice per invoice alongside Stripe dunning. |
| [x]  | Invite Notifications        | Wired   | Invite + welcome magic links                                                         |
| [x]  | AI Completion Notifications | N/A     | No push on AI complete — in-app toasts only                                          |
| [x]  | Report a Problem (Sentry)   | Wired   | User feedback → Sentry; [report-a-problem.md](./report-a-problem.md)                 |


### Emails


| Done | Item                      | Status  | Notes                                                                          |
| ---- | ------------------------- | ------- | ------------------------------------------------------------------------------ |
| [x]  | Customer-facing copy      | Partial | The 15 published transactional templates use the reviewed mockup shell; full customer-language verification across every send remains an ops check. [Preview](https://heyralli.com/resend-email-templates-mockup.html) · [inventory](../ops/resend-email-templates.md). |
| [x]  | Transactional templates   | Wired   | **15 Resend aliases are published.** Live flows use welcome, invite, approval assigned/resubmitted/changes/approved/scheduled plus one 24h reminder, story kit, developer agreement counter-sign/executed, publish-failed, trial ending, Stripe payment failed, and Meta reconnect recovery. Default From is `Hey Ralli <notifications@heyralli.com>`; story kits use `Hey Ralli <socials@heyralli.com>`. |
| [x]  | Welcome Email             | Wired   | Published `organization-welcome` magic-link CTA **Let's get started** → onboarding |
| [x]  | Password Reset            | Wired   | Supabase recovery flow                                                         |
| [x]  | Invitation                | Wired   | Published `team-invite` template + accept paths                                |
| [x]  | Approval                  | Wired   | Published assigned / resubmitted / changes / approved / scheduled / post-kit templates |
| [x]  | Billing Receipt           | Wired   | Stripe invoice emails + in-app history                                         |
| [x]  | Approval reminder         | Wired   | `meta-token-health` cron → assigned pending approval after 24h; once per request via `transactional_notification_deliveries` |
| [x]  | Trial Ending              | Wired   | Same cron → `trialing` org with 1–3 days left; once per org + `trial_ends_at` via delivery ledger |
| [x]  | Failed payment            | Wired   | `POST /api/stripe/webhook` → `invoice.payment_failed`; once per invoice to active admin/president |
| [x]  | Meta disconnected         | Wired   | `connection-token-health.ts` on invalid Page token; once per connection row via delivery ledger |
| [x]  | Subscription Confirmation | Wired   | Stripe Checkout webhook                                                        |
| [x]  | Cancellation              | Wired   | Portal + `/billing/canceled`                                                   |
| [x]  | Contact Form              | Wired   | Marketing contact → Resend                                                     |
| [ ]  | Digest / AI / event spam templates | Deferred | Not published or wired for soft launch; do not imply automatic digests or AI/event spam. |


### Marketing Website — Pages


| Done | Item                       | Status   | Notes                                                                                                       |
| ---- | -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy       | Partial  | WOW home + auth + `/features` Jul 28 post-language pass on explorer; pricing still school-forward in places |
| [x]  | Home                       | Wired    | WOW `/`                                                                                                     |
| [x]  | Features                   | Wired    | `/features` + Create with AI modules band                                                                   |
| [x]  | Pricing                    | Wired    | `/pricing` — catalog + Stripe CTAs                                                                          |
| [x]  | About                      | Wired    | `/about`                                                                                                    |
| [x]  | Contact                    | Wired    | Contact form                                                                                                |
| [x]  | FAQ                        | Deferred | No standalone `/faq` — content in features/home                                                             |
| [x]  | Privacy Policy             | Wired    | `/privacy` (includes Cookies subsection)                                                                    |
| [x]  | Terms of Service           | Wired    | `/terms`                                                                                                    |
| [x]  | Cookie Policy (standalone) | Partial  | No `/cookies` route — covered by Privacy + consent bar; decide ship vs N/A                                  |
| [x]  | Support                    | Deferred | No dedicated support portal — contact form                                                                  |


### Marketing — Assets & growth


| Done | Item                           | Status   | Notes                                                                            |
| ---- | ------------------------------ | -------- | -------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy           | N/A      | Growth assets mostly pre-launch                                                  |
| [x]  | Feature Videos                 | Partial  | Demo mockups exist; not all linked live                                          |
| [x]  | Screenshots                    | Partial  | Product captures in mockups                                                      |
| [x]  | Testimonials                   | Deferred | Not on live `/`                                                                  |
| [x]  | Demo Request                   | Deferred | Contact form only                                                                |
| [x]  | Waitlist                       | Deferred | Founding code gates signup                                                       |
| [x]  | CTA Buttons                    | Wired    | Home + auth CTAs live                                                            |
| [x]  | SEO                            | Partial  | Basic metadata; not audited Jul 28                                               |
| [x]  | Product / calendar demo on `/` | Partial  | Assets exist; live CTA waits for GO — [feature-list](../product/feature-list.md) |


### Performance


| Done | Item                  | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | Lighthouse 90+        | Wired | **Soft-launch operational hubs and `/dashboard` meet ≥90 in the Jul 29 incognito production re-measure:** Dashboard **90**, Calendar **99**, Events **90**, Volunteers **99**, Approvals **100**, Communications **97**; Homepage Composer was **98**. Supabase image transforms cleared the Volunteers/Approvals multi-MB artwork issue. Dashboard SEO **69** is **expected** — authenticated routes use `noindex, nofollow` and must stay that way; not a launch defect. This is not a product-wide green claim: Social Media Composer was **88** in its prior run and needs a re-measure. IndexedDB/extensions can affect Lighthouse diagnostics; use incognito Chrome with extensions disabled. [Full matrix and caveats](./performance-budget.md#lighthouse-route-matrix-july-29-2026--production-desktop). |
| [ ]  | Mobile Friendly       | Partial | Dashboard, Events, and Approvals Ease shells have responsive breakpoints and overflow handling (for example `[DashboardOverview.tsx](../../src/components/today/DashboardOverview.tsx)`, `[EventsEaseList.tsx](../../src/components/events-phase3/EventsEaseList.tsx)`, `[ApprovalsEaseList.tsx](../../src/components/approvals-scheduling/ApprovalsEaseList.tsx)`); a physical-device/browser matrix is still unrun.                                                                                                                                                                                                                                |
| [ ]  | Accessibility         | Partial | Jul 29 desktop Lighthouse Accessibility scores range from **83–100**: Calendar, Events, Approvals, and Communications scored 100; Volunteers scored 97; Social Media Composer scored **83** and Homepage Composer **87**. Key motion honors `prefers-reduced-motion` (`[WarmBreathFrame](../../src/components/motion/WarmBreathFrame.tsx)`, [CSS](../../src/components/motion/warm-breath.css)), but the composer misses mean no product-wide green check; Lighthouse also is not a full keyboard, screen-reader, contrast, or WCAG audit. [Matrix and follow-up](./performance-budget.md#lighthouse-route-matrix-july-29-2026--production-desktop). |
| [x]  | Image Optimization    | Wired   | Approvals and Volunteers Ease lists turn public Supabase object URLs into bounded image-transform derivatives before `next/image` fetches them (hero ≤800px; queue thumbnails 128px), fixing the prior multi-MB upstream downloads. Blob/data previews remain lazily loaded (`[ArtworkPlaceholder.tsx](../../src/components/campaign-builder-v2/ArtworkPlaceholder.tsx)`). |
| [x]  | Lazy Loading          | Wired   | Heavy Event Detail panels and artwork flows use `next/dynamic` (`[EventDetailShell.tsx](../../src/components/events-phase3/EventDetailShell.tsx)`); image previews use lazy loading unless explicitly priority/LCP.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [x]  | Caching               | Wired   | Request-scoped React `cache()` dedupes authenticated hot reads without cross-request sharing; mutation freshness uses `revalidatePath`. Contract and verification are documented in [performance-budget.md](./performance-budget.md#caching-contract).                                                                                                                                                                                                                                                                                                                                                                                               |
| [x]  | Database Optimization | Wired   | Bounded Inbox (50 threads / 40 messages each / unread ≤500), Files (400), and Task Hub (1000) list fetches; the Dashboard Insights pulse uses account KPIs only for 7d. See [hot-path notes](./performance-budget.md#hot-path-notes-july-24-2026).                                                                                                                                                                                                                                                                                                                                                                                                   |
| [x]  | CDN Verification      | Wired   | Vercel edge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [ ]  | Perf budget (≤2s)     | Partial | A Playwright wall-clock budget suite and production baseline exist, but the July 29 local rerun found 5× dashboard loads at 6.0–6.1s (over target); two stale locators were fixed, and a production rerun remains required. The Calendar Lighthouse 99 spot-check is encouraging but does not prove the ≤2s or concurrent criteria. See [performance-budget.md](./performance-budget.md#latest-local-verification-july-29-2026).                                                                                                                                                                                                                     |


### Security


| Done | Item                         | Status  | Notes                                                                                                                                                                                                                                                                         |
| ---- | ---------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]  | HTTPS                        | Wired   | Production TLS                                                                                                                                                                                                                                                                |
| [x]  | Authentication               | Wired   | Supabase Auth + session                                                                                                                                                                                                                                                       |
| [x]  | Authorization / RLS          | Wired   | [access-control](../engineering/access-control.md) · [multi-tenant](../security/multi-tenant-isolation.md)                                                                                                                                                                    |
| [ ]  | Input Validation             | Partial | No Zod dependency: major mutation paths use typed parsers, enum/format checks, and file limits (for example `[events/validation.ts](../../src/lib/events/validation.ts)`); validation is not yet standardized across every server-action module.                              |
| [x]  | SQL Injection Protection     | Wired   | Supabase / parameterized                                                                                                                                                                                                                                                      |
| [x]  | XSS Protection               | Wired   | React escaping; rich exports reject active URL schemes (`[urls.ts](../../src/lib/homepage-composer/urls.ts)`); agreement HTML is sanitized at write/read (`[sanitize-html.ts](../../src/lib/developer-agreements/sanitize-html.ts)`); CSP + safe upload MIME allow-list. Jul 30 OWASP ZAP manual explore: no blocking XSS on heyralli.com first-party paths ([owasp-zap.md](../security/owasp-zap.md)).      |
| [x]  | CSRF Protection              | Wired   | Server Actions' same-origin protection; strict OAuth state-cookie matching; cookie-authenticated insights sync rejects cross-origin requests (`[verify-same-origin.ts](../../src/lib/security/verify-same-origin.ts)`). Jul 30 ZAP "Absence of Anti-CSRF Tokens" = false positive for Server Actions ([owasp-zap.md](../security/owasp-zap.md)).                                                       |
| [x]  | Rate Limiting                | Wired   | Postgres-backed checks cover auth, password/account erase, Ask Ralli, all `generateText` AI calls, and per-org Meta Graph publishing (`[rate-limit.ts](../../src/lib/security/rate-limit.ts)`, `[publish-milestone.ts](../../src/lib/meta-publishing/publish-milestone.ts)`). |
| [x]  | Error Logging                | Wired   | Server logs + Sentry                                                                                                                                                                                                                                                          |
| [x]  | Sentry                       | Wired   | Client + server                                                                                                                                                                                                                                                               |
| [x]  | Secrets Management           | Wired   | Vercel env — [env-and-secrets.md](../ops/env-and-secrets.md)                                                                                                                                                                                                                  |
| [x]  | Audit remediation open items | Wired   | [audit-remediation.md](../security/audit-remediation.md) — all 25 tracked findings are fixed; CSP nonce tightening and universal server-action validation remain follow-ups, not open audit findings.                                                                         |
| [x]  | Security testing (OWASP ZAP) | Wired   | Jul 30 2026 production manual explore (ZAP 2.17, Safe/Protected mode): **no blocking High on heyralli.com**; third-party / `/_next/static` noise triaged; optional nonce CSP + `poweredByHeader` later ([owasp-zap.md](../security/owasp-zap.md)).                         |


### Analytics (product / marketing)


| Done | Item                | Status   | Notes                            |
| ---- | ------------------- | -------- | -------------------------------- |
| [ ]  | Google Analytics    | Deferred | Not confirmed on marketing site  |
| [ ]  | Product Analytics   | Deferred | No PostHog/Amplitude             |
| [x]  | Error Tracking      | Wired    | Sentry                           |
| [ ]  | Conversion Tracking | Deferred |                                  |
| [ ]  | Signup Funnel       | Partial  | Owner `/ops` only                |
| [x]  | AI Usage Analytics  | Wired    | Owner portal + org billing usage |
| [ ]  | Feature Usage       | Partial  | AI breakdown by category         |
| [ ]  | Dashboard Metrics   | Partial  | Owner tiles                      |


### QA Testing — Functional


| Done | Item             | Status  | Notes                                                  |
| ---- | ---------------- | ------- | ------------------------------------------------------ |
| [ ]  | Every button     | Partial | Playwright smoke covers primary paths — not exhaustive |
| [ ]  | Every page       | Partial | `16`/`18` launch smoke; Jul 28 login flake on `18`     |
| [ ]  | Every modal      | Partial | Spot-check + unit tests on critical modals             |
| [ ]  | Every AI feature | Partial | `12`/`13`/`13b` — generate Needs you                   |
| [ ]  | Every API        | Partial | Integration docs + Owner AI/APIs                       |
| [ ]  | Every email      | Partial | Resend — Owner inbox verify (launch-checklist D)       |
| [ ]  | Every upload     | Partial | Files + artwork paths in smoke                         |
| [ ]  | Every download   | Partial | Files download + export paths                          |


### QA Testing — Devices & browsers


| Done | Item    | Status   | Notes                                              |
| ---- | ------- | -------- | -------------------------------------------------- |
| [ ]  | Desktop | Partial  | Primary dev target                                 |
| [ ]  | Laptop  | Partial  | Owner daily                                        |
| [ ]  | Tablet  | Deferred | Not matrix-tested                                  |
| [ ]  | Mobile  | Partial  | Responsive shells; not full QA                     |
| [x]  | Chrome  | Wired    | Playwright default                                 |
| [ ]  | Safari  | Partial  | Agreements HTML — launch-checklist H **Needs you** |
| [ ]  | Edge    | Deferred |                                                    |
| [ ]  | Firefox | Deferred |                                                    |


### Beta Testing — Internal


| Done | Item                                       | Status | Notes |
| ---- | ------------------------------------------ | ------ | ----- |
| [ ]  | Personal Testing                           |        |       |
| [ ]  | Husband Testing (observe without coaching) |        |       |
| [ ]  | Friend QA                                  |        |       |
| [ ]  | Bug Fixes                                  |        |       |
| [ ]  | Regression Testing                         |        |       |


### Beta Testing — External


| Done | Item                | Status | Notes |
| ---- | ------------------- | ------ | ----- |
| [ ]  | 3 Pilot Schools     |        |       |
| [ ]  | Feedback Collection |        |       |
| [ ]  | Bug Fixes           |        |       |
| [ ]  | Final Review        |        |       |


### Documentation


| Done | Item              | Status   | Notes                         |
| ---- | ----------------- | -------- | ----------------------------- |
| [ ]  | Help Center       | Deferred | No public help center         |
| [ ]  | FAQ               | Partial  | Marketing features; no `/faq` |
| [ ]  | User Guides       | Partial  | Living eng/QA docs only       |
| [ ]  | Admin Guides      | Partial  | Internal docs hub             |
| [ ]  | API Documentation | Partial  | Integration living docs       |
| [x]  | Privacy Policy    | Wired    | `/privacy`                    |
| [x]  | Terms             | Wired    | `/terms`                      |
| [x]  | NDA               | Wired    | Developer agreements          |
| [x]  | IP Agreement      | Wired    | Developer agreements          |


### Integrations — Verify every connection

For each: Connect · Disconnect · Reconnect · Permission changes · Expired token recovery · Error handling.


| Done | Integration     | Status  | Notes                                                                                                                                |
| ---- | --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [ ]  | Meta            | Partial | **Hard gate:** App Review before public connect — [meta.md](../integrations/meta.md) · [launch-checklist](./launch-checklist.md) F–J |
| [x]  | Canva           | Wired   | Config-dependent OAuth                                                                                                               |
| [ ]  | Google Calendar | Partial | Import wired; OAuth **Needs you** — [google-calendar.md](../integrations/google-calendar.md)                                         |
| [x]  | Resend          | Wired   | Email delivery                                                                                                                       |
| [x]  | SignUpGenius    | Wired   | URL connect + review-before-import on event Volunteers; OAuth deferred — [signupgenius.md](../integrations/signupgenius.md)          |
| [x]  | Monday.com      | Partial | Optional / non-blocking                                                                                                              |


### Meta App Review


| Done | Item                           | Status  | Notes                                                                                    |
| ---- | ------------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| [x]  | Customer-facing copy           | Wired   | Connect Meta why UI on `/communications` — org/Page language                             |
| [ ]  | Use-cases doc complete         | Partial | [meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md) — screencast pending |
| [x]  | Connect Meta why UI live       | Wired   | `/communications` empty                                                                  |
| [x]  | Insights reachable for review  | Wired   | `social_analytics` on all plans                                                          |
| [ ]  | Screencast / walkthrough ready | Partial | **Launch gate J** — founder + eng sign-off                                               |


### Business Readiness


| Done | Item                     | Status  | Notes                                 |
| ---- | ------------------------ | ------- | ------------------------------------- |
| [x]  | Pricing Finalized        | Wired   | $49 / $79 / $129 catalog live         |
| [x]  | Support Email            | Partial | Contact form; no help desk            |
| [x]  | Domain Verified          | Wired   | heyralli.com                          |
| [x]  | Business Address         | Wired   | Org mailing address fields shipped    |
| [ ]  | Stripe Verification      | Partial | Live mode; Owner Checkout verify once |
| [ ]  | Tax Settings             | Partial | Stripe Tax not confirmed              |
| [ ]  | Refund Policy            | Partial | Terms reference; no standalone page   |
| [ ]  | Customer Support Process | Partial | Founder-led soft launch               |


### Launch Assets


| Done | Item                    | Status   | Notes                                             |
| ---- | ----------------------- | -------- | ------------------------------------------------- |
| [ ]  | Product Demo Video      | Partial  | HTML mockup + `.webm` assets — live link waits GO |
| [ ]  | 30-Second Feature Video | Deferred |                                                   |
| [x]  | Logo Files              | Wired    | Brand kit in product                              |
| [ ]  | Brand Kit               | Partial  | In-app brand kit; external kit deferred           |
| [ ]  | Social Media Graphics   | Deferred |                                                   |
| [ ]  | Launch Email            | Deferred |                                                   |
| [ ]  | Press Kit               | Deferred |                                                   |
| [ ]  | Founder Story           | Partial  | About page                                        |
| [ ]  | Product Screenshots     | Partial  | Mockups + marketing demos                         |
| [ ]  | Feature Comparison      | Deferred |                                                   |


### Soft Launch


| Done | Item                      | Status  | Notes                                               |
| ---- | ------------------------- | ------- | --------------------------------------------------- |
| [ ]  | Invite First Organization | Partial | Edmondson validation; public invite blocked on Meta |
| [x]  | Monitor Logs              | Wired   | Sentry + Vercel                                     |
| [x]  | Monitor Billing           | Wired   | Stripe dashboard + Owner `/ops`                     |
| [x]  | Monitor AI Costs          | Wired   | Owner `/ops/ai-apis`                                |
| [ ]  | Respond to Feedback       | Partial | Founder-led                                         |
| [x]  | Fix Critical Bugs         | Wired   | Soft-launch scope shipped Jul 26–28                 |
| [x]  | Validate Infrastructure   | Wired   | Production Ready on heyralli.com                    |


### Public Launch


| Done | Item                     | Status | Notes                        |
| ---- | ------------------------ | ------ | ---------------------------- |
| [ ]  | Open Registration        |        | Founding code may still gate |
| [ ]  | Announce on Social Media |        |                              |
| [ ]  | Email Waitlist           |        |                              |
| [ ]  | Publish Product Demo     |        |                              |
| [ ]  | Monitor Signups          |        |                              |
| [ ]  | Monitor Server Health    |        |                              |
| [ ]  | Respond to Support       |        |                              |
| [ ]  | Celebrate                |        |                              |


### Post-Launch — Daily (first 30 days)


| Done | Item                     | Status | Notes |
| ---- | ------------------------ | ------ | ----- |
| [ ]  | Review Errors            |        |       |
| [ ]  | Review Signups           |        |       |
| [ ]  | Review AI Costs          |        |       |
| [ ]  | Review Support Tickets   |        |       |
| [ ]  | Respond to User Feedback |        |       |


### Post-Launch — Weekly


| Done | Item                         | Status | Notes |
| ---- | ---------------------------- | ------ | ----- |
| [ ]  | Ship Bug Fixes               |        |       |
| [ ]  | Review Analytics             |        |       |
| [ ]  | Measure Feature Adoption     |        |       |
| [ ]  | Prioritize Customer Requests |        |       |
| [ ]  | Review Financial Metrics     |        |       |


### Post-Launch — Monthly


| Done | Item                | Status | Notes |
| ---- | ------------------- | ------ | ----- |
| [ ]  | Roadmap Planning    |        |       |
| [ ]  | Customer Interviews |        |       |
| [ ]  | Improve Onboarding  |        |       |
| [ ]  | Performance Review  |        |       |
| [ ]  | Security Audit      | Partial | Jul 30 2026 OWASP ZAP soft-launch pass on production ([owasp-zap.md](../security/owasp-zap.md)); full active scan + periodic re-audit still open |


---

## Final Go/No-Go

Before **public** launch (not soft launch), every answer should be **Yes**. Soft launch Jul 28: product paths are **mostly Yes** with Meta + Owner human rows gated.


| Question                                                                  | Yes                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Can a brand-new user sign up without assistance?                          | [x] Yes (founding code + plan chooser — Medium adaptability) |
| Can they complete Ease onboarding (event → essentials → connect → event)? | [ ] Needs you — [launch-checklist](./launch-checklist.md) B  |
| Can they connect their accounts (Meta / Calendar / Canva as needed)?      | [ ] Meta gated App Review; Google **Needs you** G            |
| Can they create an event?                                                 | [x] Yes                                                      |
| Can they generate AI content?                                             | [x] Yes (credits permitting)                                 |
| Can they send content for approval?                                       | [x] Yes                                                      |
| Can they publish successfully?                                            | [ ] Partial — founder temp Meta only until App Review        |
| Can they invite teammates?                                                | [x] Yes                                                      |
| Can they upgrade to a paid plan?                                          | [ ] Needs you — Checkout 11.4                                |
| Can they receive all expected emails?                                     | [ ] Needs you — Resend D                                     |
| Can they change password / erase account?                                 | [x] Yes                                                      |
| Can they open Tasks, Files, Vendors, Insights?                            | [x] Yes (Insights/Vendors via event tab or URL)              |
| Is Meta App Review packet ready?                                          | [ ] No — screencast + sign-off pending                       |
| Are critical bugs resolved?                                               | [x] Yes for soft launch scope                                |
| Are support resources available?                                          | [ ] Partial — contact form only                              |
| Is monitoring in place?                                                   | [x] Yes — Sentry + Owner `/ops`                              |


---

## How this relates to launch-checklist

Work rows here for **coverage** and honest **Wired / Partial / Deferred** ratings. When a soft-launch theme is ready for Pass/Fail, execute the matching section in [launch-checklist.md](./launch-checklist.md) and promote Status → **Verified**.

**Jul 28 alignment:** Product completion ratings reflect the same gates as launch-checklist **Finish order A–K** (onboarding re-verify, org switcher, approval/Meta emails, Meta App Review). Playwright `12` = Pass; `16`/`18` = re-run after login flake. Do not mark Meta **Verified** until launch gate J clears.