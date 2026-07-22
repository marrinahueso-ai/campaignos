# Launch QA checklist

**Status:** Living  
**Owner:** Product / QA  
**Last updated:** July 22, 2026  
**Related:** [QA hub](./README.md) · [Architecture overview](./architecture-overview.md) · [Testing guide](./testing-guide.md) · [Feature list](../product/feature-list.md) · [Deploy checklist](../ops/deploy-and-rollback.md)

## Purpose

Pass/fail checklist for soft launch and Production spot-checks on [heyralli.com](https://heyralli.com). Use before a release, after a large merge to `main`, or when validating a school org end-to-end.

Mark each row: **Pass** / **Fail** / **Skip** (N/A for this release). Note environment (Production / Preview), org, and date in the session log below.

## How to use

1. Pick environment (prefer Preview for risky changes; Production for launch sign-off).
2. Use a real org (e.g. Edmondson) with Meta + calendar when testing those rows.
3. Failures: capture URL, screenshot, and whether data is wrong vs UI-only.
4. Schema/env changes: confirm migrations + Vercel env before blaming the app ([deploy-and-rollback.md](../ops/deploy-and-rollback.md)).
5. Automated smoke (optional): `npm run test:hey-ralli` — see [testing-guide.md](./testing-guide.md).

---

## Session log

| Field | Value |
|-------|--------|
| Date | July 22, 2026 |
| Environment | **Local** (`localhost:3000`) — not Production |
| Build / SHA | Working tree after onboarding checklist fixes (base `2be8510`) |
| Org | Playwright staging seat (`HEY_RALLI_TEST_*`) |
| Tester | Cursor agent smoke |
| Overall | **Pass** (value-first onboarding + Helpful next steps) |

### Value-first onboarding smoke (July 22, 2026 — local)

Automated: `npm run test:hey-ralli -- tests/hey-ralli/smoke/15-onboarding-value-first.spec.ts` (**Pass**, ~1.2m). Unit: `src/lib/onboarding/__tests__/state.test.ts` (**Pass**).

| Step | Result | Notes |
|------|--------|-------|
| Welcome `/onboarding?welcome=1` → Create my first event | Pass | Lands `/events/create?onboarding=1` |
| Save & continue → event + overlay Calendar | Pass | `?onboarding=calendar`; stepper shows Event → Calendar |
| Overlay **Do this later** | Pass | Advances in place to Brand (`?onboarding=brand`); stays on event |
| Overlay **Set up brand** (primary) | Pass | Navigates `/onboarding/brand` (single brand path) |
| Brand **Skip for now** → Invite **Do this later** | Pass | Reaches Today |
| Helpful next steps — skipped items surface | Pass | Today checklist shows pending cards even when org already has calendar/brand/team signals |
| Checklist **Later** | Pass | Marks card done / removes from pending; stepper state updates |
| Checklist **Set up now** | Pass | Invite card → `/onboarding/invite` |
| Canonical `/calendar/import` + `/onboarding/brand` | Pass | No duplicate brand wizard |
| Restart / Welcome replay | Pass | Get started restart + `?welcome=1`; create-event clears stale skip flags so overlay can replay |

**Not covered this session:** Production heyralli.com, Stay on event click, full calendar import upload, real teammate invite email, org switcher, deactivated-user gate, welcome email CTA copy.

---

## 1. Auth & setup

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1.1 | Sign in / sign out works | Pass | Local Playwright login (`HEY_RALLI_TEST_*`) |
| 1.2 | Org switcher works when user has >1 membership | Skip | Single-org seat |
| 1.3 | `/onboarding` Welcome → Create my first event (`?onboarding=1`) → lands on event page under ~60s | Pass | Local smoke 15 |
| 1.4 | Event overlay stepper Calendar → Brand → Team: primary CTAs work; **Do this later** advances in place (stays on event); **Stay on event** dismisses only | Pass* | *Do this later + Set up brand verified; Stay on event not clicked this run |
| 1.5 | Calendar primary → `/calendar/import` (Google + ICS + file); Brand → `/onboarding/brand` (save stays, then Continue); Invite → `/onboarding/invite` | Pass* | *Brand route + calendar import URL verified; full ICS/Google upload not run |
| 1.6 | Skipped / unfinished items appear on Today + Settings → **Get started** checklist; Restart onboarding replays Welcome (`?welcome=1`) for finished orgs | Pass | Helpful next steps: **Set up now** + **Later** both update checklist; overlay skip still surfaces cards until Later/complete |
| 1.7 | Legacy wizard via Get started / `?view=wizard` if needed; `?step=brand` opens `/onboarding/brand` (not a second brand form); calendar step → `/calendar/import` | Pass* | *Single brand path `/onboarding/brand` confirmed; full wizard walk not re-run |
| 1.8 | Deactivated / no-membership user sees a clear gate, not a blank app | Skip | Not in this smoke |
| 1.9 | Org welcome email CTA reads **Let's get started** (not Continue setup) | Skip | Not in this smoke |

## 2. Organization settings

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 2.1 | `/settings/organization` loads profile, branding summary, preferences | | |
| 2.2 | Edit profile / branding reaches a real editor (not a stub) | | |
| 2.3 | Posting schedule / preferred windows save and survive refresh | | |
| 2.4 | Board roster / people link opens Team & Access | | |
| 2.5 | Hardcoded or placeholder fields (e.g. Type, language) are accurate or clearly labeled | | |

## 3. Team Access & responsibilities

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 3.1 | `/settings/team-access` lists people; invite / add roster works | | |
| 3.2 | Person profile opens (Overview / Events / Access / Activity) | | |
| 3.3 | Access templates can be viewed/edited by an admin | | |
| 3.4 | Responsibility **role defaults** are editable where shipped (Approvals default still resolves) | | *Person-level edit deferred* |
| 3.5 | Send-for-approval emails go to the Team Access approver (not a stale test seat) | | |

## 4. Calendar import & events list

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 4.1 | `/calendar/import` accepts ICS / Google / subscribe path as documented | | [calendar-import-dedupe.md](./calendar-import-dedupe.md) |
| 4.2 | Review: search (name/date/year), filters, Archive past events | | |
| 4.3 | Import All: New creates; Duplicate skips; Update Apply patches title/date only | | Artwork on existing events preserved |
| 4.4 | Calendar → Import list: search + Select all + Delete selected removes events from Events | | |
| 4.5 | Events Home thumbnails show artwork when approved square exists (including outside 60-day prefetch) | | |
| 4.6 | Events hero **Filled** links to Volunteers tab | | |

## 5. Create with AI

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 5.1 | Open Create with AI from hub or event tab | | |
| 5.2 | Creative Setup → Milestones → Preview → Review flow works | | [create-with-ai-artwork-inputs.md](./create-with-ai-artwork-inputs.md) |
| 5.3 | Artwork + captions generate; overall inspiration affects prompts | | |
| 5.4 | Milestone delete stays deleted after save/reload | | |
| 5.5 | Send for approval / re-approval updates Approvals and notifies approver when assigned | | |

## 6. Approvals & publishing

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 6.1 | Approvals hub shows pending / changes requested / scheduled / published | | |
| 6.2 | Approve / request changes / resubmit cycle works | | |
| 6.3 | Change-requested email reaches creator; re-approval email reaches approver | | |
| 6.4 | With Meta connected: Approve schedules FB feed when applicable | | [meta-calendar-dnd.md](./meta-calendar-dnd.md) |
| 6.5 | Calendar DnD reschedule keeps approval; Graph time updates when `graph_schedule_id` exists | | |

## 7. Meta (Inbox / Insights connect)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 7.1 | Settings → Meta Connect completes OAuth | | [meta.md](../integrations/meta.md) |
| 7.2 | Inbox loads threads when connected | | |
| 7.3 | Insights Connect/Sync CTA works; Refresh pulls metrics when available | | |
| 7.4 | Insights still shows useful ops content when Meta has no metrics | | *Update after Ops pulse ships* |

## 8. Volunteers (SignUpGenius)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 8.1 | Connect signup URL → Review detected data | | [signupgenius.md](../integrations/signupgenius.md) |
| 8.2 | Date multi-select on review; Confirm imports only selected dates | | |
| 8.3 | Refresh Stats keeps sticky date allowlist | | |
| 8.4 | Assignment table Filter + Date + Sort; summary cards match filters | | |

## 9. Tasks & Today

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 9.1 | Tasks list loads; create/complete a task | | Soft launch complete |
| 9.2 | Event Tasks tab: empty by default (no auto-seeded checklist) | | |
| 9.3 | Today / dashboard shows next actions without errors | | |

## 10. Ask Ralli

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 10.1 | Sidebar pin under Insights opens assistant | | [ask-ralli-assistant.md](../engineering/ask-ralli-assistant.md) |
| 10.2 | Ops question (“what’s next?”) returns grounded answer | | |
| 10.3 | Ambiguous event names offer dated disambiguation chips | | |

## 11. Billing (pre-Stripe)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 11.1 | `/settings/billing-plan` loads without error | | Checkout **not** required for launch |
| 11.2 | Founding Partner / plan copy is accurate for the org | | |
| 11.3 | No false “payment failed” or broken Stripe CTAs | | |

## 12. Deploy smoke (Production)

Mirror of [deploy-and-rollback.md](../ops/deploy-and-rollback.md) — run after every Production promote:

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 12.1 | Vercel Production deployment Ready for intended SHA | | |
| 12.2 | Login | | |
| 12.3 | Calendar (Google CTA / import entry) | | |
| 12.4 | Meta settings | | |
| 12.5 | Tasks | | |
| 12.6 | Insights | | |
| 12.7 | One Create-with-AI path if AI changed | | |
| 12.8 | Migrations applied if schema changed | | |

---

## Automated coverage (optional)

| Suite / spec | Area |
|--------------|------|
| `npm run test:hey-ralli` | Playwright smoke pack |
| `15-onboarding-value-first` | Value-first onboarding + Helpful next steps (Set up now / Later) |
| `12-ask-ralli-assistant` | Ask Ralli |
| `11-insights` | Insights |
| `13` / `13b` | Create with AI artwork |
| `14-calendar-import-dedupe` | Calendar import dedupe |

Unit packs as needed: `test:event-volunteers`, `test:calendar-import`, `test:approvals-scheduling`, `test:events-phase3`.

---

## Known deferred (do not fail launch for these)

- Stripe Checkout / paid plan gates (Phase E)
- Responsibility **person** picker from matrix UI
- Insights demographics / LLM narrative / year-end board report
- Insights-weighted posting heatmap
- Full Create-with-AI → Meta published slot sync
- Legacy wizard re-entry polish (primary first-run is value-first `/onboarding` + Get started checklist)

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA / Product | | | |
| Engineering | | | |
