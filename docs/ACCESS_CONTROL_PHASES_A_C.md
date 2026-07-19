# Access control — Phases A–C

**Status:** Phases A–C + C2 (table RLS) + C3 (storage RLS) complete (Supabase `zyllfqieeihshnwpakiv`)  
**Last updated:** July 18, 2026  
**Deferred:** Phase D (org switcher), Phase E (Stripe / org billing) — document when finished  

This note records what shipped, what we found, and what we fixed for the access-template / tenancy workstream.

**Re-verification (before/after + test results):** see [PLATFORM_STABILITY_VERIFICATION.md](./PLATFORM_STABILITY_VERIFICATION.md) — includes Stability P0/P1 memory slices.

---

## North star

| Layer | Role |
|--------|------|
| **Access templates** | Org-custom “Role” toggles (see vs work, people, approvals, publish, artwork, etc.) |
| **EffectiveAccess** | Server resolves membership → template → permissions (+ assigned events) |
| **App gates** | `hasPermission` / `requirePermission` / `canAccessEvent` on mutations & pages |
| **RLS (Phase C)** | Database isolation by **active org membership** (not fine-grained template keys) |

Verticals (School / Sports / HOA) stay future `organization_type` defaults — **not** a second permission system.

---

## Phase A — Template toggles as runtime permissions

### Done

- `getEffectiveAccess()`, `hasPermission()`, `requirePermission()` (`src/lib/access-templates/effective-access.ts` + `effective-access-core.ts`)
- Resolution: active membership → simulated role (gated) → `access_template_id` / `campaign_role` → org templates → `applySafetyLocks` → assigned event ids when needed
- Rewired gates from hardcoded `CampaignRole` helpers to permission keys, including:
  - `manage_people`, `approve_comms`, `submit_approval`, `publish_social`, `upload_artwork`, `manage_integrations`, `draft_edit`
  - Assigned-only filtering on **event lists** (later refined in Phase B)
- Secure team invites: `/invite/[token]`, expiry, password set by invitee (no password in email)
- Reinvite for **deactivated** members (“Reinvite to Login”)
- Playwright smokes + dedicated `HEY_RALLI_TEST_*` accounts (credentials only in `.env.local`)

### Findings → fixes

| Finding | Severity | Fix |
|---------|----------|-----|
| Create with AI Inspiration upload ignored `upload_artwork` | High | Gate `uploadInspirationImageAction` + hide UI via EffectiveAccess |
| Resend Invite hidden for deactivated tester | Product | Allow reinvite for `invited` **and** `deactivated` |
| Simulated-role cookie elevated any member in prod | P0 | `canUseRoleSimulator()`; ignore cookie unless allowed; clear on logout |
| Assigned-only lists only — `getEventById` IDOR by UUID | P0 | `canAccessEvent` in `getEventById` + `requireEventAccess` |
| Deleted custom template failed open to base `campaign_role` | Medium | Missing `custom_*` → `view_only` |
| People profile leaked unassigned event metadata | Medium | `filterEventsByAccess` for viewer |
| Team mutations lacked same-org target check | Medium | Verify membership belongs to current org |
| Dashboard badge always loaded assignments | Load | Lazy-load assignments only when assigned flags on |
| Self-deactivate → 404 + founding-school kickout | High | Block self-deactivate/remove; deactivated → `/login?error=account_deactivated` |

### Verification

- Unit: `npm run test:team-access` (includes EffectiveAccess, role simulator, Phase C contract)
- Playwright: Hey Ralli smokes including `07-upload-artwork-gate`, `08-assigned-event-access`

---

## Phase B — See vs work (assigned events)

### Modes

| Mode | See (list) | Work (open / mutate) | Toggles |
|------|------------|----------------------|---------|
| **A — View all, work assigned** (default preference) | All event cards | Assigned only | `view_all_events` + `access_assigned_events_only` |
| **B — Strict** | Assigned cards only | Assigned only | `view_assigned_events_only` (implies access restrict) |
| **Unrestricted** | All | All | `view_all_events` only |

### Done

- New permission key: `access_assigned_events_only` (“Can only work on assigned events”)
- `view_assigned_events_only` = **hide** unassigned cards (Mode B)
- `filterEventsByAccess` → list hide only when Mode B
- `canAccessEvent` → work restrict when `access_assigned_events_only`
- Legacy `view_assigned_events_only: true` migrates to Mode B (also sets access restrict)
- Access templates UI copy: see vs work
- Playwright Mode A: no-upload seat sees many cards, opens assigned event, unassigned deep link → **404 / page not found**

### Intentional product note

Unassigned deep links are **denied** (`notFound()`), not a separate read-only event workspace. List cards remain visible in Mode A.

---

## Phase C — Membership-scoped RLS

### Verified on remote (`zyllfqieeihshnwpakiv`)

**Migration (source of truth):** `supabase/migrations/064_membership_scoped_rls.sql`  
Applied remotely (history may show split entries: `membership_scoped_rls` + `membership_scoped_rls_policies*`).

**Helpers present / used by policies:**

- `private.is_active_org_member(org_id)` — `auth.uid()` + `status = 'active'`
- `private.can_access_event(event_id)` — via `school_years.organization_id`
- `private.org_has_any_membership(org_id)` — founding empty-org checks
- `public.lookup_organization_invite_by_token(token)` — SECURITY DEFINER invite preview (anon + authenticated)

**Policies live on (among others):**

| Area | Tables |
|------|--------|
| Team / access | `organization_users`, `organization_user_event_assignments`, `organization_member_event_assignments`, `organization_access_templates` |
| Roster / workspace | `organization_members`, `organization_roles`, `organization_committees`, `organization_committee_assignments`, `responsibility_matrix`, `committee_defaults` |
| Org / events | `organizations`, `school_years`, `events`, `brand_assets`, `developer_tool_audit_log` |

**App wiring:**

- `lookupInviteByToken` → RPC `lookup_organization_invite_by_token` (no open SELECT on invites)
- Founding school setup creates membership **before** seed so RLS allows org seed writes
- Contract tests: `src/lib/auth/__tests__/membership-rls-phase-c.test.ts`

**Service role** still bypasses RLS (provisioning, admin paths, cron).

### Phase C2 — Broader membership RLS

**Migrations:**  
- `supabase/migrations/065_broader_membership_rls.sql` (applied remotely as `broader_membership_rls_0`…`_8`)  
- `supabase/migrations/066_broader_membership_rls_remaining.sql` (applied as `broader_membership_rls_remaining_a` / `_b`)

| Scope | Examples |
|-------|----------|
| Org membership | vendors*, inbox*, org meta/monday/brand/playbook prefs, volunteers*, social insights/activity, calendar imports, creative style memory |
| Event access | communications*, event playbooks*, approvals/scheduling, campaign builder sessions, meta slots/captions, event assets/versions/concepts, activity_log, publication_schedule, creative briefs |
| Special | `communication_playbooks` with `organization_id IS NULL` readable by any authenticated user; mutations only for org-owned rows |

**Verified remotely:** every `public` table has RLS enabled; the only remaining `with_check = true` policy is `organizations_insert_authenticated` (founding).

### Phase C findings / gaps (known)

| Item | Notes |
|------|--------|
| `organizations` INSERT for founding | Intentionally open to authenticated users (advisor WARN acceptable for now) |
| Template keys vs RLS | RLS = **org membership isolation**; `manage_people` / artwork / etc. remain **app-layer** |
| Public storage URLs | See Phase C3 — API hardened; public GET residual until signed-URL migration |

### Phase C3 — Storage membership RLS

**Full write-up:** [STORAGE_RLS.md](./STORAGE_RLS.md)  
**Migration:** `supabase/migrations/067_storage_membership_rls.sql`

| Scope | Behavior |
|-------|----------|
| Path key | First folder = `organization_id` or `event_id` (matches app upload builders) |
| Roles | `authenticated` only; anon Storage API denied |
| Private buckets | Full membership gate (vendor-documents, calendar-uploads, training-library) |
| Public buckets | Same API gate; `public = true` kept so existing `/object/public/` URLs still work |

**Contract tests:** `src/lib/auth/__tests__/storage-rls-phase-c3.test.ts`

### How to re-verify Phase C

1. Active member: Team & Access + Events load for own org  
2. Logged out: `/invite/[token]` still previews via RPC  
3. Deactivated / invited-only: no org roster via client Supabase (own `organization_users` row may still be readable for routing)  
4. `npm run test:team-access`  
5. Optional SQL: `select * from public.lookup_organization_invite_by_token('<token>');`

---

## Testing infrastructure (supports A–C)

| Piece | Purpose |
|-------|---------|
| `HEY_RALLI_TEST_EMAIL` / `PASSWORD` | Admin Playwright seat |
| `HEY_RALLI_TEST_NO_UPLOAD_*` | Mode A + `upload_artwork: false` |
| `HEY_RALLI_TEST_EVENT_ID` | Single assigned event for Mode A |
| `HEY_RALLI_TEST_INVITE_TOKEN` | Optional pending invite UI smoke |
| `scripts/hey-ralli-test.sh` | Loads **only** `HEY_RALLI_*` (+ optional Sentry/site URL) — not service-role secrets |
| `npm run test:hey-ralli` | Full smoke suite |

Do **not** commit `.env.local`.

---

## Stability slices (platform, not D/E)

| Slice | Goal | Status |
|-------|------|--------|
| **P0** | Lean dashboard badge counts (no full scheduling fetch on every nav) | Done |
| **P1** | Dynamic Inspiration + lean planning/calendar/list event selects | Done |

## Phase map (for D / E later)

| Phase | Goal | Status |
|-------|------|--------|
| **A** | Template toggles → real permissions + security hardening | Done |
| **B** | See all / work assigned (Mode A) + strict list hide (Mode B) | Done |
| **C** | Membership-scoped RLS on core org/team/event tables | Done |
| **C2** | Broader RLS — vendors/inbox/comms/playbooks/approvals/assets/social/etc. | Done |
| **C3** | Storage RLS — path-aware membership on all buckets | Done |
| **D** | Org switcher / multi-membership UX | Deferred |
| **E** | Stripe / org billing + `manage_billing` product gates | Deferred |

---

## Key file index

| Area | Paths |
|------|--------|
| EffectiveAccess | `src/lib/access-templates/effective-access.ts`, `effective-access-core.ts`, `defaults.ts`, `types.ts` |
| Role simulator gate | `src/lib/auth/role-simulator-access.ts`, `role-simulator-env.ts` |
| Membership / self-deactivate | `src/lib/auth/membership-access.ts`, `membership-mutations.ts`, `membership-queries.ts` |
| Event access | `src/lib/events/queries.ts`, `campaign-page-queries.ts` |
| Invite | `src/app/invite/[token]/`, `src/lib/auth/invite-*.ts`, RPC in migration 064 |
| Templates UI | `src/components/settings-v2/team-access/TeamAccessAccessTemplatesPanel.tsx` |
| RLS migrations | `064`–`066` (tables), `067_storage_membership_rls.sql` (storage) |
| Storage RLS doc | `docs/STORAGE_RLS.md` |
| Playwright | `tests/hey-ralli/smoke/06–08-*.spec.ts`, `tests/hey-ralli/helpers/auth.ts` |
