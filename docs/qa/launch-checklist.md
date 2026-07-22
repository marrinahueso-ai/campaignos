# Launch QA checklist

**Status:** Living  
**Owner:** Product / QA  
**Last updated:** July 22, 2026  
**Related:** [QA hub](./README.md) · [Pre-handoff readiness](./pre-handoff-readiness.md) · [Architecture overview](./architecture-overview.md) · [Testing guide](./testing-guide.md) · [Feature list](../product/feature-list.md) · [Deploy checklist](../ops/deploy-and-rollback.md)

## Purpose

Pass/fail checklist for soft launch and Production spot-checks on [heyralli.com](https://heyralli.com). Use before a release, after a large merge to `main`, or when validating a school org end-to-end.

Mark each row: **Pass** / **Fail** / **Skip** (N/A for this release) / **Needs you**. Note environment (Production / Preview), org, and date in the session log below.

## How to use

0. **Before inviting QA:** Owner/PM runs [pre-handoff-readiness.md](./pre-handoff-readiness.md) (env, accounts, short smoke, handoff packet).
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
| Environment | **Production** — https://heyralli.com |
| Build / SHA | `b4a1b9a` (`events home page updates`) — Vercel Production ● Ready (`dpl_CSwqL7mkNU3XyCTG4fLKLT7TNprx`) |
| Org | Edmondson Elementary (primary); Marrina also admin on School B |
| Tester | Owner (Marrina) + agent assist (URL / deploy / migrations only) |
| Overall | **In progress — Phase B first batch** (§12 Deploy smoke + §1 Auth). Prior **local** onboarding Pass (July 22 localhost / Playwright) does **not** apply to this Production session |

### Phase B notes (July 22, 2026 — Production)

- Slice A ([pre-handoff-readiness.md](./pre-handoff-readiness.md)): **Ready to hand** — Marrina confirmed §4 Pass on Production. Credential packet may still be pending in 1Password (§2.4) before sending agreements handoff to QA.
- Agent auto-verify: public `/` + `/login` → HTTP 200; `/calendar`, `/calendar/import`, `/settings/meta`, `/tasks`, `/insights`, `/settings/billing-plan` → 307 to login when logged out (expected). Vercel Production Ready for `b4a1b9a`. Remote migrations include `organization_onboarding_state` + developer agreement trio.
- **Not claimed Pass:** any logged-in UI on Production for launch-checklist rows unless Marrina clicks them in this session. Old local Get started smoke archived below for history only.

### Archived — local onboarding smoke (July 22, 2026 — localhost only; not Production)

Automated: `npm run test:hey-ralli -- tests/hey-ralli/smoke/15-onboarding-value-first.spec.ts`. Unit: `src/lib/onboarding/__tests__/state.test.ts`. **Do not copy these Pass marks into Production rows.**

| Step | Result (local only) | Notes |
|------|---------------------|-------|
| Welcome → Create my first event | Pass (local) | Lands `/events/create?onboarding=1` |
| Overlay Calendar → Brand → Team → Meta | Pass (local) | Do this later / Set up brand verified in smoke |
| Helpful next steps + Restart | Pass (local) | Not re-verified on heyralli.com this session |

---

## 1. Auth & setup

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1.1 | Sign in / sign out works | **Needs you** | Production: Owner login already Pass in slice A §4.1 — still confirm **sign out** then sign back in on heyralli.com |
| 1.2 | Org switcher works when user has >1 membership | **Needs you** | Marrina has Edmondson + School B — switch both ways |
| 1.3 | `/onboarding` Welcome → Create my first event (`?onboarding=1`) → lands on event page under ~60s | **Needs you** | Spot-check Production if org still shows Get started; Skip if org already fully boarded and you do not want to restart |
| 1.4 | Event overlay Calendar → Brand → Team → Meta: primary CTAs work; **Do this later** advances in place (stays on event); **Stay on event** dismisses only | **Needs you** | Only if running 1.3; local Pass does not count |
| 1.5 | Calendar → `/calendar/import`; Brand → `/onboarding/brand`; Invite → `/onboarding/invite`; Meta → `/settings/meta` (returnTo event when possible) | **Needs you** | Deep-link spot-check; full OAuth/import later in §4 / §7 |
| 1.6 | Skipped / unfinished items appear on **home/dashboard** (+ Settings Get started shell); Restart replays Welcome (`?welcome=1`) | **Needs you** | Skip if no pending checklist cards |
| 1.7 | Organization settings: no boarding steppers; Brand CTA `?standalone=1`; legacy `?view=wizard` / step deep-links redirect (org / integrations / import / brand) — wizard not mounted for members | **Needs you** | Quick open `/settings/organization` + Brand CTA |
| 1.8 | Deactivated / no-membership user sees a clear gate, not a blank app | Skip | Optional / no seat prepared this batch |
| 1.9 | Org welcome email CTA reads **Let's get started** (not Continue setup) | Skip | Optional this batch |

## 2. Organization settings

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 2.1 | `/settings/organization` loads profile, branding summary, preferences | | *Next batch* |
| 2.2 | Edit profile / branding reaches a real editor (not a stub) | | |
| 2.3 | Posting schedule / preferred windows save and survive refresh | | |
| 2.4 | Board roster / people link opens Team & Access | | |
| 2.5 | Hardcoded or placeholder fields (e.g. Type, language) are accurate or clearly labeled | | |

## 3. Team Access & responsibilities

| # | Check | Result | Notes |
|---|--------|--------|-------|
| 3.1 | `/settings/team-access` lists people; invite / add roster works | | *Next batch* |
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
| 5.1 | Open Create with AI from nav or event tab → lands on Creative Setup (not choose-event list); no brand-kit banner | | |
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
| 9.1 | Tasks list loads; create/complete a task | | Soft launch complete — *after §12* |
| 9.2 | Event Tasks tab: empty by default (no auto-seeded checklist) | | |
| 9.3 | Today / dashboard shows next actions without errors | | Slice A §4.2 Today Pass on Production — reconfirm here when you do §9 |

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
| 12.1 | Vercel Production deployment Ready for intended SHA | **Pass** | `dpl_CSwqL7mkNU3XyCTG4fLKLT7TNprx` / `b4a1b9a` on `main` ● Ready; https://heyralli.com → 200 |
| 12.2 | Login | **Needs you** | Owner login already Pass in slice A — reconfirm on this checklist (sign in lands in app) |
| 12.3 | Calendar (Google CTA / import entry) | **Needs you** | Logged out: `/calendar` + `/calendar/import` → login redirect (OK). **You:** open Calendar → see Google CTA and/or path to Import |
| 12.4 | Meta settings | **Needs you** | Logged out: `/settings/meta` → login redirect. **You:** open Settings → Meta — page loads (connect state OK either way) |
| 12.5 | Tasks | **Needs you** | Logged out: `/tasks` → login redirect. **You:** open Tasks — list loads |
| 12.6 | Insights | **Needs you** | Logged out: `/insights` → login redirect. **You:** open Insights — page loads |
| 12.7 | One Create-with-AI path if AI changed | **Skip** | No AI change claimed for this promote (`events home page updates`) — run in §5 if you want depth |
| 12.8 | Migrations applied if schema changed | **Pass** | Remote has `organization_onboarding_state`, `developer_agreements`, `developer_agreement_execution`, `developer_agreement_signer_fields` (project `zyllfqieeihshnwpakiv`) |

---

## First batch — Owner click list (~15–20 min)

Do on **https://heyralli.com** as Owner `marrina@huesoinvestments.com` (Edmondson). Reply Pass/Fail per step.

| Step | Exact clicks | Pass looks like | Maps to |
|------|--------------|-----------------|---------|
| **1** | Open app (already logged in OK) or `/login` → sign in | Land in app shell | 12.2 / 1.1 (sign-in half) |
| **2** | Open **Calendar** (sidebar) | Page loads; Google CTA and/or Import entry visible | 12.3 |
| **3** | Open **Settings → Meta** (or `/settings/meta`) | Meta settings page loads (connected or Connect CTA) | 12.4 |
| **4** | Open **Tasks** | List loads; no hard error | 12.5 |
| **5** | Open **Insights** | Page loads; useful content or empty-state OK | 12.6 |
| **6** | **Sign out** → sign back in | Clean login again | 1.1 |
| **7** | **Org switcher:** Edmondson → School B → back to Edmondson | Both orgs load without blank app | 1.2 |
| **8** *(if time / Get started still showing)* | Home **Get started** or `/onboarding?welcome=1` → Create my first event → overlay **Do this later** once | Event page + overlay advances | 1.3–1.4 light |
| **9** *(quick)* | `/settings/organization` → Brand CTA | No boarding wizard for members; brand editor / `standalone` path | 1.7 |

**After this batch:** reply with Pass/Fail for steps 1–9 (Skip 8 if boarded). Next order: §9 Tasks & Today → §2 Org settings → §3 Team Access.

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
- ~~Legacy wizard re-entry~~ — retired for members; boarding is Welcome → event overlay only

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA / Product | | | |
| Engineering | | | |
