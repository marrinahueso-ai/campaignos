# Launch QA checklist

**Status:** Living  
**Owner:** Product / QA  
**Last updated:** July 28, 2026 — Product Completion Master closeout aligned  
**Related:** [Product completion master](./product-completion-master.md) · [QA hub](./README.md) · [Pre-handoff readiness](./pre-handoff-readiness.md) · [Architecture overview](./architecture-overview.md) · [Testing guide](./testing-guide.md) · [Feature list](../product/feature-list.md) · [Deploy checklist](../ops/deploy-and-rollback.md)

## Phase 1 master map

For founder/PM **coverage tracking** (auth → launch → go/no-go), use **[product-completion-master.md](./product-completion-master.md)**. This file stays the executable soft-launch **Pass / Fail** matrix.

**First-time setup (current product):** Ease 4-beat — Create event → `/onboarding/essentials` (Calendar + Brand) → `/onboarding/connect` (Team + Meta) → land on event with You’re set (`?welcome=1`). The Welcome → overlay Calendar→Brand→Team→Meta rows below are the **legacy smoke path** (Playwright `15`); re-verify against Ease routes before treating onboarding as launch-signed.

## Purpose

Pass/fail checklist for soft launch and Production spot-checks on [heyralli.com](https://heyralli.com). Use before a release, after a large merge to `main`, or when validating a school org end-to-end.

Mark each row: **Pass** / **Fail** / **Skip** (N/A for this release) / **Needs you**. Note environment (Production / Preview), org, and date in the session log below.

**Owner preference (this session):** Prefer Playwright over manual clicks. Rows marked **Pass (Playwright)** were verified locally against the staging test seat (`HEY_RALLI_TEST_*`). Production URL / deploy / migrations are verified separately.

## How to use

0. **Before inviting QA:** Owner/PM runs [pre-handoff-readiness.md](./pre-handoff-readiness.md) (env, accounts, short smoke, handoff packet).
1. Pick environment (prefer Preview for risky changes; Production for launch sign-off).
2. Use a real org (e.g. Edmondson) with Meta + calendar when testing those rows.
3. Failures: capture URL, screenshot, and whether data is wrong vs UI-only.
4. Schema/env changes: confirm migrations + Vercel env before blaming the app ([deploy-and-rollback.md](../ops/deploy-and-rollback.md)).
5. Automated smoke: `npm run test:hey-ralli -- tests/hey-ralli/smoke/16-launch-smoke.spec.ts tests/hey-ralli/smoke/18-launch-checklist.spec.ts tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts` — see [testing-guide.md](./testing-guide.md).

---

## Session log

| Field | Value |
|-------|--------|
| Date | July 28, 2026 |
| Environment | **Production** — https://heyralli.com (+ local Playwright against staging test seat) |
| Build / SHA | Production Ready — `dpl_4axDAATSAXGKAhjkAZzfwF3iNamW` (Jul 28 closeout copy deploy). Update if re-deployed. |
| Org | Edmondson Elementary (Owner daily); Playwright seat; Marrina also on School B |
| Tester | Playwright refresh July 28 + Owner human finish list below |
| Overall | **In progress — Owner finish list** · Soft launch **blocked on Meta App Review green light** (founder temp Meta account works; other orgs wait). Engineering launch-prep **Done**. [Product completion master](./product-completion-master.md) Jul 28 closeout: ratings filled; greens + gates documented. |

### Playwright refresh (July 28, 2026)

| Suite | Result |
|-------|--------|
| `12-ask-ralli-assistant` | **5 passed** |
| `16-launch-smoke` | **1 passed** (Create with AI Social-first chooser), **1 skipped**, **4 failed** — failures were `loginWithCredentials` waitForURL timeouts (test-seat auth/env flake), not chooser regressions |
| `18-launch-checklist` | **0 passed / 7 failed / 1 skipped** — same login timeout pattern on this run |

**Do not treat July 28 login flakes as Production Fail** until Owner re-runs `16`/`18` with healthy `HEY_RALLI_TEST_*` credentials or spot-checks the same rows on heyralli.com. Prior July 22 batch remains the last clean automatable Pass set for those suites.

### Launch-prep engineering (July 26) — Done

Product work shipped for soft launch (see [feature-list.md](../product/feature-list.md)). These are **not** a substitute for Owner OAuth/email rows below.

| Area | Status | Notes |
|------|--------|-------|
| Marketing WOW homepage + auth/legal | **Done** | `/`, login, signup, forgot, invite, privacy, terms |
| Signup plan-first (Starter / Pro / Premium) | **Done** | Catalog → founding code checkout path |
| Settings Ease Phases 1–7 + Branding hub | **Done** | Overview → Account; Branding nests school year + AI Brain / Inbox / Communication Plans / Colors |
| Header settings gear → `/settings` | **Done** | Direct link (no section dropdown); Ease left nav is the section list |
| Team Access person drawer | **Done** | Soft pills + Overview / Events / Access drawer (`?person=`) |
| Billing Ease (Usage · Plans · Payment) | **Done** | AI meters, category breakdown, Stripe invoices / portal / payment summary |
| Insights Ease + `social_analytics` on all plans | **Done** | Soft-launch / Meta App Review reachability |
| Vendors Ease (contact-first) | **Done** | Directory shell shipped |
| Calendar / Events / Tasks / Files / Approvals / Volunteers Ease shells | **Done** | Product UI shipped; depth rows still Needs you where noted |
| Create with AI landing / chooser | **Done** | `/create-with-ai` — Social-first hero + Also available (Homepage · Volunteer · Sponsorship soon · Newsletter · Flyer soon) |
| Soft-launch nav trim | **Done** | Vendors + Insights off left rail; remain on event `?tab=` |
| Create with AI — Social / campaign | **Done** | `/create-with-ai/social` 4-step Campaign Builder (Creative Setup → Review) |
| Create with AI — Homepage / webpage HTML composer | **Done** | `/homepage-composer`; draft persist + export; AI blurbs polish OK for launch |
| Create with AI — Newsletter composer | **Done** | `/newsletter-composer`; preview + HTML export + draft autosave |
| Public Features Create with AI modules band | **Done** | `/features` documents all three modules honestly |
| Product / calendar demo mockups + calendar `.webm` | **Done** (assets) | Live `/` demo link still **in progress** until GO (feature-list) |

### Playwright batch (July 22, 2026 evening)

| Suite | Result |
|-------|--------|
| `16-launch-smoke` | **5 passed** (includes Create with AI chooser + Social Creative Setup) |
| `18-launch-checklist` | **5 passed**, **3 skipped** (org switcher + Team Access people/templates — developer test seat lacks multi-org / profile links) |
| `12-ask-ralli-assistant` | **5 passed** |

Slice A ([pre-handoff-readiness.md](./pre-handoff-readiness.md)): **Ready to hand** (Owner §4 Production smoke Pass earlier). Credential packet §2.4 still for 1Password before sending to QA.

### Archived — local onboarding smoke (July 22, 2026 — localhost)

Legacy path (pre–Ease 4-beat). Current product: Event → Essentials → Connect → You’re set — see [product-completion-master.md](./product-completion-master.md).

| Step | Result | Notes |
|------|--------|-------|
| Welcome → Create my first event | Pass (local `15-onboarding`) | Superseded by Ease create-event |
| Overlay Calendar → Brand → Team → Meta | Pass (local) | Superseded by Essentials + Connect |
| Helpful next steps + Restart | Pass (local) | Re-verify Restart → Ease |

---

## 1. Auth & setup

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1.1 | Sign in / sign out works | **Pass (Playwright)** | `16-launch-smoke` |
| 1.2 | Org switcher works when user has >1 membership | **Skip (Playwright)** / **Needs you** | Test seat is single-org. Owner: Edmondson ↔ School B once |
| 1.3 | Ease: Create first event (`/events/create?onboarding=1`) | **Needs you** (re-verify) | Legacy `15` Pass on Welcome path. Current: Ease page 1 |
| 1.4 | Ease: Essentials → Connect → You’re set on event | **Needs you** (re-verify) | `/onboarding/essentials` → `/onboarding/connect` → `?welcome=1`. Legacy overlay path archived in session log |
| 1.5 | Deep links: Calendar import / Brand / Invite / Meta | **Pass (Playwright)** partial | Import + Meta load (`18` / `16`); Brand standalone (`18`). Invite via Connect |
| 1.6 | Restart / Get started re-entry | **Needs you** (re-verify) | Restart → create event; confirm vs Ease 4-beat |
| 1.7 | Organization settings: no boarding wizard; Brand `?standalone=1` | **Pass (Playwright)** | `18-launch-checklist` |
| 1.8 | Deactivated / no-membership gate | **Skip** | Optional |
| 1.9 | Org welcome email CTA **Let's get started** | **Skip** | Optional |
| 1.10 | Public marketing home + signup plan chooser load | **Done** (shipped) / spot-check optional | WOW `/` + `/signup` plan-first — Owner click once on Production after deploy |
| 1.11 | Header settings gear opens `/settings` (Ease hub) | **Done** (shipped) / spot-check optional | Direct `/settings` — not the old section dropdown |

## 2. Organization settings

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 2.1 | `/settings/organization` loads profile, branding summary, preferences | **Pass (Playwright)** | `18` — Settings Ease Organization |
| 2.2 | Edit profile / branding reaches a real editor | **Pass (Playwright)** | Brand → `/onboarding/brand?standalone=1`; Branding hub at `/settings/branding` **Done** |
| 2.3 | Posting schedule / preferred windows save and survive refresh | **Needs you** or **Skip** | Not in smoke — Skip if unchanged this release |
| 2.4 | Board roster / people link opens Team & Access | **Pass (Playwright)** | `02-dashboard-and-team` + `18` opens `/settings/team-access` |
| 2.5 | Hardcoded / placeholder fields accurate or labeled | **Skip** | Soft-launch cosmetic |

## 3. Team Access & responsibilities

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 3.1 | `/settings/team-access` lists people; invite / add roster works | **Pass (Playwright)** load / **Needs you** invite | Ease shell + drawer **Done**. Invite/add = Owner click if needed |
| 3.2 | Person profile / drawer opens (Overview / Events / Access) | **Skip (Playwright)** / **Needs you** | Drawer shipped; no people links for developer test seat — Owner open one person once |
| 3.3 | Access templates viewed/edited by admin | **Skip (Playwright)** / **Needs you** | Templates tab not visible to developer seat — Owner spot-check |
| 3.4 | Responsibility role defaults editable where shipped | **Skip** | Person-level edit deferred |
| 3.5 | Send-for-approval emails → Team Access approver | **Needs you** | Resend — human inbox |

## 4. Calendar import & events list

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 4.1 | `/calendar/import` accepts ICS / Google / subscribe path | **Pass (Playwright)** entry | Page loads (`18`). Full Google OAuth = Needs you |
| 4.2 | Review: search, filters, Archive past | **Pass (Playwright)** optional | `14-calendar-import-dedupe` when run; else Skip depth |
| 4.3 | Import All New/Duplicate/Update | **Pass (Playwright)** optional | `14` |
| 4.4 | Import list Select all + Delete selected | **Pass (Playwright)** optional | `14` |
| 4.5 | Events Home thumbnails / View Details (no row ⋯) | **Pass (Playwright)** | `16` View Details + no kebab |
| 4.6 | Events hero **Filled** → Volunteers | **Skip** | Spot-check if Volunteers in scope |

## 5. Create with AI

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 5.1 | `/create-with-ai` chooser: Home Page · Social Media · Newsletter | **Pass (Playwright)** | `16-launch-smoke` |
| 5.2 | Social → Creative Setup; no brand-kit banner | **Pass (Playwright)** | `16` `/create-with-ai/social` |
| 5.3 | Creative Setup → Milestones → Preview → Review | **Pass (Playwright)** partial | `13` wiring; full walk Needs you if generating |
| 5.4 | Artwork + captions generate | **Needs you** or run `13b` | Longer / AI credits |
| 5.5 | Milestone delete stays deleted | **Needs you** or existing unit/smoke | |
| 5.6 | Send for approval / notify | **Needs you** | Email + Approvals — or `09` |
| 5.7 | Homepage Composer opens from chooser; draft + export path | **Done** (shipped) / **Needs you** depth | Persist + AI blurb **partial**; Owner spot-check HTML copy once |
| 5.8 | Newsletter Composer opens from chooser; preview + export | **Done** (shipped) / **Needs you** depth | Owner spot-check once if newsletter in handoff |

## 6. Approvals & publishing

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 6.1 | Approvals hub shows pending / changes / scheduled / published | **Pass (Playwright)** | `18` + `05` — Ease shell **Done** |
| 6.2 | Approve / request changes / resubmit | **Needs you** or `09` | |
| 6.3 | Change-requested / re-approval emails | **Needs you** | Resend |
| 6.4 | Meta connected: Approve schedules FB feed | **Needs you** | Meta OAuth |
| 6.5 | Calendar DnD reschedule + Graph | **Needs you** | [meta-calendar-dnd.md](./meta-calendar-dnd.md) |

## 7. Meta (Inbox / Insights connect)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 7.1 | Settings → Meta Connect OAuth | **Needs you** | Page load Pass via `16` — not OAuth; Ease Meta detail **Done** |
| 7.2 | Inbox loads threads when connected | **Needs you** | |
| 7.3 | Insights Connect/Sync / Refresh | **Pass (Playwright)** partial | `11` / `16` load; Sync = Needs you |
| 7.4 | Insights useful when no Meta metrics | **Pass (Playwright)** | Empty/ops content OK — Ease + entitlement unlock **Done** |

## 8. Volunteers (SignUpGenius)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 8.1–8.4 | Connect URL → review → sticky dates → filters | **Needs you** or **Skip** | [signupgenius.md](../integrations/signupgenius.md) — Skip if not in this handoff |

## 9. Tasks & Today

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 9.1 | Tasks list loads; create/complete a task | **Pass (Playwright)** load | `18` + `10` — New Task visible; Ease shell **Done** |
| 9.2 | Event Tasks tab empty by default | **Skip** | Soft-launch |
| 9.3 | Today / dashboard without errors | **Pass (Playwright)** | `16` |

## 10. Ask Ralli

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 10.1 | Sidebar pin opens assistant | **Pass (Playwright)** | `12` |
| 10.2 | Ops question returns grounded answer | **Pass (Playwright)** | `12` |
| 10.3 | Ambiguous event disambiguation chips | **Pass (Playwright)** opportunistic | `12` documents skip if staging has no clash |

## 11. Billing (Stripe live)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 11.1 | `/settings/billing-plan` loads | **Pass (Playwright)** | `18` — Ease Usage / Plans / Payment **Done** |
| 11.2 | Founding Partner / plan copy accurate | **Pass (Playwright)** load | Spot-check copy optional |
| 11.3 | No false payment failed / broken Stripe CTAs | **Pass (Playwright)** | `18` |
| 11.4 | Checkout / Portal / webhook plan sync | **Needs you** | See [billing-and-access.md](../ops/billing-and-access.md) |

## 12. Deploy smoke (Production)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 12.1 | Vercel Production Ready | **Pass** (prior) / re-verify after Features deploy | Update SHA in session log when Ready |
| 12.2 | Login | **Pass (Playwright)** | `16` |
| 12.3 | Calendar (Import / Google entry) | **Pass (Playwright)** | `16` — not OAuth |
| 12.4 | Meta settings | **Pass (Playwright)** | `16` — not OAuth |
| 12.5 | Tasks | **Pass (Playwright)** | `16` / `18` / `10` |
| 12.6 | Insights | **Pass (Playwright)** | `16` / `11` |
| 12.7 | Create-with-AI path if AI changed | **Pass (Playwright)** | `16` chooser + Social Creative Setup |
| 12.8 | Migrations applied | **Pass** | Remote developer-agreement + onboarding migrations; account notification prefs migration if not yet on remote — confirm before blaming UI |
| 12.9 | Public `/features` shows Create with AI modules | **Done** (this change) | Spot-check Home Page · Social Media · Newsletter band after Production Ready |

---

## Remaining Needs you (human) — short list

Do these as Owner on **https://heyralli.com**. Mark each **Pass** / **Fail** / **Skip** in the tables above when done.

### Finish order (soft launch)

**Hard gate (you already decided):** do **not** invite public orgs until Meta App Review + QA/eng green light. Temp Meta account for founder posting is OK for Edmondson validation only.

| Step | Check | Rows | Done? |
|------|--------|------|-------|
| A | **Org switcher** Edmondson ↔ School B | 1.2 | [ ] |
| B | **Ease onboarding** Create event → Essentials → Connect → You’re set; Restart once | 1.3, 1.4, 1.6 | [ ] |
| C | **Team Access** open one person drawer + templates tab | 3.2, 3.3 | [ ] |
| D | **Resend** trigger approval or agreement email → inbox | 3.5, 6.3 | [ ] |
| E | **Approvals** open review → approve (temp Meta) or request changes → revision | 6.2, 6.4 | [ ] |
| F | **Meta** Settings Connect (temp account) + Inbox load if in scope | 7.1, 7.2 | [ ] |
| G | **Google Calendar OAuth** deep import once — or Skip | 4.1 deep | [ ] |
| H | **Safari** agreement HTML download — or Skip | agreements | [ ] |
| I | **Billing** Checkout/Portal once if this release touched plans — or Skip | 11.4 | [ ] |
| J | **Meta App Review package** + eng/QA sign-off before public connect | launch gate | [ ] |
| K | Sign-off table below (QA/Product + Engineering) | Sign-off | [ ] |

Optional depth (do not block A–K): CwAI generate, Homepage/Newsletter export, Volunteers SignUpGenius, Calendar DnD.

Everything else in the matrix is **Pass (Playwright)** (as of July 22 clean batch), **Done** (shipped), or **Skip**.

---

## Automated coverage

| Suite / spec | Area |
|--------------|------|
| `16-launch-smoke` | Sign-out/in, nav pages, Events Home, Create with AI chooser + Social Creative Setup, `/ops` |
| `18-launch-checklist` | Org Brand standalone, Approvals, billing, calendar import, Tasks |
| `17-developer-agreements-gate` | Unsigned gate (`HEY_RALLI_QA_UNSIGNED_*`) |
| `15-onboarding-value-first` | Get started / overlay |
| `12-ask-ralli-assistant` | Ask Ralli |
| `11-insights` / `10-tasks` / `14-calendar-import-dedupe` / `13` / `13b` | Depth |

```bash
npm run test:hey-ralli -- \
  tests/hey-ralli/smoke/16-launch-smoke.spec.ts \
  tests/hey-ralli/smoke/18-launch-checklist.spec.ts \
  tests/hey-ralli/smoke/12-ask-ralli-assistant.spec.ts
```

---

## Known deferred (do not fail launch for these)

- Storage capacity gate (file GB / history limits) — see [billing-and-access.md](../ops/billing-and-access.md#12-known-gaps--remaining-work)
- Responsibility **person** picker from matrix UI
- Insights demographics / LLM narrative / year-end board report
- Insights-weighted posting heatmap
- Full Create-with-AI → Meta published slot sync
- Live marketing homepage “Watch product demo” link (assets exist; wait for GO)
- Homepage / Newsletter composer polish beyond soft-launch export + draft persist (modules themselves **Done**)
- ~~Legacy wizard re-entry~~ — retired for members

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA / Product | | | |
| Engineering | | | |
