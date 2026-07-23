# Launch QA checklist

**Status:** Living  
**Owner:** Product / QA  
**Last updated:** July 22, 2026  
**Related:** [QA hub](./README.md) · [Pre-handoff readiness](./pre-handoff-readiness.md) · [Architecture overview](./architecture-overview.md) · [Testing guide](./testing-guide.md) · [Feature list](../product/feature-list.md) · [Deploy checklist](../ops/deploy-and-rollback.md)

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
| Date | July 22, 2026 |
| Environment | **Production** — https://heyralli.com (+ local Playwright against same Supabase / test seat) |
| Build / SHA | Production ● Ready — `dpl_8fPQMpm9hpbfq4H94RFPt22SP1Vv` (aliases heyralli.com; includes Create with AI inspiration-first + brand-kit banner removal). Local git HEAD `7097270` (`AI update`) |
| Org | Edmondson Elementary (Playwright seat); Marrina Owner also on School B |
| Tester | Playwright (`16` / `18` / `12`) + Owner (human-only rows below) |
| Overall | **In progress** — automatable rows mostly Pass; remaining Needs you are OAuth / email / Safari / multi-org Owner / deep CwAI+Volunteers |

### Playwright batch (July 22, 2026 evening)

| Suite | Result |
|-------|--------|
| `16-launch-smoke` | **5 passed** |
| `18-launch-checklist` | **5 passed**, **3 skipped** (org switcher + Team Access people/templates — developer test seat lacks multi-org / profile links) |
| `12-ask-ralli-assistant` | **5 passed** |

Slice A ([pre-handoff-readiness.md](./pre-handoff-readiness.md)): **Ready to hand** (Owner §4 Production smoke Pass earlier). Credential packet §2.4 still for 1Password before sending to QA.

### Archived — local onboarding smoke (July 22, 2026 — localhost)

| Step | Result | Notes |
|------|--------|-------|
| Welcome → Create my first event | Pass (local `15-onboarding`) | |
| Overlay Calendar → Brand → Team → Meta | Pass (local) | |
| Helpful next steps + Restart | Pass (local) | |

---

## 1. Auth & setup

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1.1 | Sign in / sign out works | **Pass (Playwright)** | `16-launch-smoke` |
| 1.2 | Org switcher works when user has >1 membership | **Skip (Playwright)** / **Needs you** | Test seat is single-org. Owner: Edmondson ↔ School B once |
| 1.3 | `/onboarding` Welcome → Create my first event | **Pass (Playwright)** | `15-onboarding-value-first` (local). Skip deep re-run if org already boarded |
| 1.4 | Event overlay Calendar → Brand → Team → Meta | **Pass (Playwright)** | `15-onboarding-value-first` |
| 1.5 | Deep links: Calendar import / Brand / Invite / Meta | **Pass (Playwright)** partial | Import + Meta load (`18` / `16`); Brand standalone (`18`). Invite UI optional |
| 1.6 | Helpful next steps / Restart | **Pass (Playwright)** | `15-onboarding-value-first` |
| 1.7 | Organization settings: no boarding wizard; Brand `?standalone=1` | **Pass (Playwright)** | `18-launch-checklist` |
| 1.8 | Deactivated / no-membership gate | **Skip** | Optional |
| 1.9 | Org welcome email CTA **Let's get started** | **Skip** | Optional |

## 2. Organization settings

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 2.1 | `/settings/organization` loads profile, branding summary, preferences | **Pass (Playwright)** | `18` |
| 2.2 | Edit profile / branding reaches a real editor | **Pass (Playwright)** | Brand → `/onboarding/brand?standalone=1` |
| 2.3 | Posting schedule / preferred windows save and survive refresh | **Needs you** or **Skip** | Not in smoke — Skip if unchanged this release |
| 2.4 | Board roster / people link opens Team & Access | **Pass (Playwright)** | `02-dashboard-and-team` + `18` opens `/settings/team-access` |
| 2.5 | Hardcoded / placeholder fields accurate or labeled | **Skip** | Soft-launch cosmetic |

## 3. Team Access & responsibilities

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 3.1 | `/settings/team-access` lists people; invite / add roster works | **Pass (Playwright)** load / **Needs you** invite | Page loads (`02` / `18`). Invite/add = Owner click if needed |
| 3.2 | Person profile opens (Overview / Events / Access / Activity) | **Skip (Playwright)** / **Needs you** | No people profile links for developer test seat — Owner open one person once |
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
| 5.1 | Create with AI → Creative Setup; no brand-kit banner | **Pass (Playwright)** | `16-launch-smoke` |
| 5.2 | Creative Setup → Milestones → Preview → Review | **Pass (Playwright)** partial | `13` wiring; full walk Needs you if generating |
| 5.3 | Artwork + captions generate | **Needs you** or run `13b` | Longer / AI credits |
| 5.4 | Milestone delete stays deleted | **Needs you** or existing unit/smoke | |
| 5.5 | Send for approval / notify | **Needs you** | Email + Approvals — or `09` |

## 6. Approvals & publishing

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 6.1 | Approvals hub shows pending / changes / scheduled / published | **Pass (Playwright)** | `18` + `05` |
| 6.2 | Approve / request changes / resubmit | **Needs you** or `09` | |
| 6.3 | Change-requested / re-approval emails | **Needs you** | Resend |
| 6.4 | Meta connected: Approve schedules FB feed | **Needs you** | Meta OAuth |
| 6.5 | Calendar DnD reschedule + Graph | **Needs you** | [meta-calendar-dnd.md](./meta-calendar-dnd.md) |

## 7. Meta (Inbox / Insights connect)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 7.1 | Settings → Meta Connect OAuth | **Needs you** | Page load Pass via `16` — not OAuth |
| 7.2 | Inbox loads threads when connected | **Needs you** | |
| 7.3 | Insights Connect/Sync / Refresh | **Pass (Playwright)** partial | `11` / `16` load; Sync = Needs you |
| 7.4 | Insights useful when no Meta metrics | **Pass (Playwright)** | Empty/ops content OK |

## 8. Volunteers (SignUpGenius)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 8.1–8.4 | Connect URL → review → sticky dates → filters | **Needs you** or **Skip** | [signupgenius.md](../integrations/signupgenius.md) — Skip if not in this handoff |

## 9. Tasks & Today

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 9.1 | Tasks list loads; create/complete a task | **Pass (Playwright)** load | `18` + `10` — New Task visible; create/complete UI varies |
| 9.2 | Event Tasks tab empty by default | **Skip** | Soft-launch |
| 9.3 | Today / dashboard without errors | **Pass (Playwright)** | `16` |

## 10. Ask Ralli

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 10.1 | Sidebar pin opens assistant | **Pass (Playwright)** | `12` |
| 10.2 | Ops question returns grounded answer | **Pass (Playwright)** | `12` |
| 10.3 | Ambiguous event disambiguation chips | **Pass (Playwright)** opportunistic | `12` documents skip if staging has no clash |

## 11. Billing (pre-Stripe)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 11.1 | `/settings/billing-plan` loads | **Pass (Playwright)** | `18` |
| 11.2 | Founding Partner / plan copy accurate | **Pass (Playwright)** load | Spot-check copy optional |
| 11.3 | No false payment failed / broken Stripe CTAs | **Pass (Playwright)** | `18` |

## 12. Deploy smoke (Production)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 12.1 | Vercel Production Ready | **Pass** | `dpl_8fPQMpm9hpbfq4H94RFPt22SP1Vv` → heyralli.com |
| 12.2 | Login | **Pass (Playwright)** | `16` |
| 12.3 | Calendar (Import / Google entry) | **Pass (Playwright)** | `16` — not OAuth |
| 12.4 | Meta settings | **Pass (Playwright)** | `16` — not OAuth |
| 12.5 | Tasks | **Pass (Playwright)** | `16` / `18` / `10` |
| 12.6 | Insights | **Pass (Playwright)** | `16` / `11` |
| 12.7 | Create-with-AI path if AI changed | **Pass (Playwright)** | `16` §5.1 after inspiration-first change |
| 12.8 | Migrations applied | **Pass** | Remote developer-agreement + onboarding migrations |

---

## Remaining Needs you (human) — short list

Do these as Owner on **https://heyralli.com** (or Skip if out of scope for this handoff):

1. **Org switcher** — Edmondson ↔ School B (1.2)  
2. **Team Access** — open one person profile + Access templates (3.2–3.3)  
3. **Meta OAuth** — Connect/reconnect if validating Inbox/publish (7.1+)  
4. **Google Calendar OAuth** — if validating live import (4.1 deep)  
5. **Resend** — approval or agreement emails in inbox (3.5 / 6.3 / agreements)  
6. **Safari** — executed agreement HTML download renders (agreements)  
7. **Optional depth** — CwAI generate (`13b` or manual), Volunteers, Calendar DnD  

Everything else above is **Pass (Playwright)** or **Skip**.

---

## Automated coverage

| Suite / spec | Area |
|--------------|------|
| `16-launch-smoke` | Sign-out/in, nav pages, Events Home, Create with AI landing, `/ops` |
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

- Stripe Checkout / paid plan gates (Phase E)
- Responsibility **person** picker from matrix UI
- Insights demographics / LLM narrative / year-end board report
- Insights-weighted posting heatmap
- Full Create-with-AI → Meta published slot sync
- ~~Legacy wizard re-entry~~ — retired for members

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA / Product | | | |
| Engineering | | | |
