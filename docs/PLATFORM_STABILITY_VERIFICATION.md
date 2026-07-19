# Platform stability verification — Phases A–C + memory slices

**Verified:** 2026-07-18 (local + Supabase `zyllfqieeihshnwpakiv`) — includes Phase C2 broader RLS  
**Goal:** Stable single-org platform that functions as designed. Phase D (org switcher) and Phase E (Stripe) deferred.

Companion narrative: [ACCESS_CONTROL_PHASES_A_C.md](./ACCESS_CONTROL_PHASES_A_C.md)

---

## Verification summary (re-run)

| Suite / check | Result |
|---------------|--------|
| `npm run test:team-access` | **pass** (EffectiveAccess, Mode A/B, table + storage RLS contracts, invites, role simulator) |
| Storage C3 API smoke | **pass** (own-event upload OK; foreign org upload denied; vendor signed URL OK) |
| Playwright `01` + `05` + `07` | **7/7 pass** (login, approvals/calendar, upload gate UI) |
| `npm run test:approvals-scheduling` | **24/24 pass** (lean badges + hub list/preview split contracts) |
| `npm run test:communications-calendar` | **9/9 pass** (lean selects, workspace/playbook lean, provider step trim) |
| `npm run test:events-phase3` | **55/55 pass** (tab loaders + Meta skip artwork-based) |
| Playwright `01` + `07` + `08` | **5/5 pass** (app/login, upload gate allow/deny, Mode A assigned access) |
| Remote RLS helpers | `private.is_active_org_member` **present**; invite RPC **present** |
| Remote policies on core tables | Membership helpers on org/users/events + C2 product tables |
| Open `qual`/`with_check=true` policies | **1** only — `organizations_insert_authenticated` (founding) |
| Public tables with RLS disabled | **0** |
| Storage `storage.objects` policies | **24** membership-scoped; **0** anon / “Allow public…” |
| Events with null `school_year_id` | **0** (backfilled in Stability P2) |

---

## Before → after by workstream

### Phase A — Access templates as real permissions

| Area | Before | After |
|------|--------|--------|
| Authorization | Hardcoded `CampaignRole` helpers (`canManageTeam`, etc.) | `getEffectiveAccess` / `hasPermission` / `requirePermission` from org template toggles |
| Create with AI uploads | Inspiration upload always available | Gated by `upload_artwork` (UI + server) |
| Invites | Temp-password era / unclear UX | `/invite/[token]`, expiry, invitee sets password; reinvite for deactivated |
| Simulated role | Cookie could elevate anyone | Gated by `canUseRoleSimulator`; cleared on logout |
| Event IDOR | Lists filtered; `getEventById` open by UUID | `canAccessEvent` on `getEventById` |
| Custom template deleted | Failed open to base role defaults | Fail closed → `view_only` |
| Self-deactivate | 404 + founding-school kickout | Blocked; deactivated → `/login?error=account_deactivated` |

**Evidence today:** unit tests (Mode A/B, upload wiring, safety locks) + Playwright `07` (upload allow/deny).

---

### Phase B — See vs work (assigned events)

| Mode | Before | After |
|------|--------|--------|
| Assigned-only | Single toggle hid list **and** implied access (mutually exclusive with view-all) | Split: **Mode A** see all + work assigned; **Mode B** hide list + work assigned |
| Unassigned deep link | Could open event by UUID | `notFound()` / “page could not be found” |
| Playwright | No Mode A smoke | `08-assigned-event-access.spec.ts` — **pass** (multi cards visible; assigned opens; unassigned 404) |

---

### Phase C — Membership-scoped RLS

| Area | Before | After |
|------|--------|--------|
| Tenancy | Mostly app-layer; many tables publicly readable | RLS: active membership for core org/team/event tables |
| Invite lookup | Open SELECT patterns risk | `lookup_organization_invite_by_token` SECURITY DEFINER RPC |
| Founding seed | Could fail under strict RLS | Membership created before org seed |
| Migration | N/A | `064` + `065`/`066` broader RLS applied remotely |

**Evidence today:** remote helper + RPC exist; C2 locked vendors/inbox/comms/playbooks/approvals/assets/social/etc.; only intentional open policy is founding org INSERT; contract tests in `membership-rls-phase-c.test.ts`.

**Storage (Phase C3):** See [STORAGE_RLS.md](./STORAGE_RLS.md) — `067` applied; Storage API membership-scoped; public bucket HTTP GET residual documented.

---

### Stability P0 — Dashboard badge memory

| Badge path | Before | After |
|------------|--------|--------|
| Scheduling sidebar counts | `select("*")` all `approval_scheduling_items`, filter in JS | `{ count: "exact", head: true }` pending / changes_requested |
| Classic approval sidebar | Full `approval_requests` + joins | Lean pending columns + head-count for change requests |
| Inbox unread | Already lean unread fields | Unchanged |
| Approvals hub page | Full rows when opened | Still full rows (by design — not layout chrome) |

**Evidence today:** `test:approvals-scheduling` 24/24 including lean-path contract tests.

---

### Stability P1 — Builder + planning lean loads

| Area | Before | After |
|------|--------|--------|
| Inspiration step | Static import in Campaign Builder shell | `next/dynamic` (same as other steps) |
| localStorage session | Wrote on every session change / debounce double-write | Skip unchanged JSON; debounce doesn’t double-write |
| Calendar / planning hot paths | Widespread `select("*")` | Shared lean column lists (`planning-selects`, `EVENT_SUMMARY_SELECT`) |
| Event list helpers | Often `select("*")` (planning blobs) | Summary select on upcoming/range/active/all list helpers |
| Event detail | N/A | `getEventById` still full row (editors need planning fields) |

**Evidence today:** `test:communications-calendar` 9/9; artwork-backup 7/7.

---

### Stability P2 — Workspace / Approvals lean + school-year backfill

| Area | Before | After |
|------|--------|--------|
| Event workspace / playbook loaders | `select("*")` (incl. asset generation JSON) | Lean selects (`WORKSPACE_*`, `PLAYBOOK_*`, `EVENT_SUMMARY_SELECT`); generation JSON omitted where UI unused |
| Inspiration asset list | Full `event_assets` rows | `WORKSPACE_ASSET_SELECT` (display fields only) |
| CampaignBuilderProvider | Step UI errors / generation progress could stay hot after leave | Clear inspiration upload error on leave; clear `generationProgress` when idle / off preview |
| Approvals hub queue | Full `approval_scheduling_items` + classic preview enrichment for every row | `SCHEDULING_LIST_SELECT` (no caption bodies); classic `enrichPreviews: false`; captions via `enrichUnifiedApprovalItemPreviewAction` on Review open |
| Orphan events | 2 events with `school_year_id IS NULL` invisible under `can_access_event` | Backfilled to Edmondson active school year **2026 - 2027** (`75d09fdb-…`); **0** nulls remain |
| New event create | Could insert without `school_year_id` if no active year | `insertEvent` requires active school year |

**Backfilled events (Supabase `zyllfqieeihshnwpakiv`):**

| Event id | Title | Date | School year |
|----------|-------|------|-------------|
| `a6978b4b-44da-4ef7-8a22-3303d647bea5` | Boys and girls dance | 2026-08-14 | Edmondson Elementary · 2026 - 2027 (`75d09fdb-c7bb-417f-8c71-d0d8130f06f8`) |
| `7ea69c8b-d5b6-4262-8476-dd83be91dd02` | spring carnival | 2026-07-04 | same |

**Verification:** joins `events → school_years → organizations` succeed; org has **6** members (unchanged); `private.can_access_event` path via `school_years.organization_id` is valid. Events Home school-year filter already keys on `event.schoolYearId`.

**Evidence today:** `test:communications-calendar` 9/9; `test:approvals-scheduling` 24/24; `test:events-phase3` 55/55; `test:team-access` 50/50.

---

## Playwright accounts (local only)

Configured via `HEY_RALLI_*` in `.env.local` (gitignored; script loads only those keys):

| Seat | Purpose |
|------|---------|
| Admin test email | Login / Create with AI allow path |
| No-upload Mode A seat | `upload_artwork: false` + `access_assigned_events_only` + one assigned event |
| `HEY_RALLI_TEST_EVENT_ID` | Assigned event for Mode A |

---

## Known gaps (not regressions)

1. Phase D (org switcher) shipping separately; Phase E (Stripe) still deferred.  
2. CampaignBuilderProvider is still a large client module (safe step-state trim only; full rewrite deferred).  
3. AI/artwork generation paths still use full `event_assets` rows (by design).  
4. Broader table RLS for vendors/inbox/comms covered by Phase C2 (done); residual is template-key vs membership (app-layer by design).  
5. Site-wide school-year filter UI is not on every surface yet (Events Home + org-scoped queries are coherent; no new filter chrome in P2).  
6. Local Next can die on transient Supabase `fetch failed` in middleware — restart `npm run dev` if “connect server” appears.  
7. Public storage HTTP GET residual until signed-URL migration (see STORAGE_RLS.md).

---

## How to re-verify anytime

```bash
# Unit / contract
npm run test:team-access
npm run test:approvals-scheduling
npm run test:communications-calendar
npm run test:events-phase3

# Playwright (requires HEY_RALLI_* in .env.local)
npm run test:hey-ralli
# or focused:
npx playwright test --config=playwright.config.ts \
  tests/hey-ralli/smoke/07-upload-artwork-gate.spec.ts \
  tests/hey-ralli/smoke/08-assigned-event-access.spec.ts
```

Remote RLS smoke (SQL editor / MCP):

```sql
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where proname in ('is_active_org_member', 'lookup_organization_invite_by_token');
```

---

## Recommended next work (stability, not D/E)

1. Extend school-year filter chrome to remaining list surfaces that still show “all org years” without an active-year default.  
2. Further CampaignBuilderProvider memory wins only if profiling shows hot step data still dominating.  
3. Broader RLS for vendors / inbox / comms (not D/E).
