# Access & multi-tenant onboarding

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 23, 2026  
**Related:** [Access control (templates / RLS)](../engineering/access-control.md) · [Developer agreements](../engineering/developer-agreements.md) · [Welcome email](../engineering/auth-welcome-email.md) · [Feature list](../product/feature-list.md) · [Owner AI & APIs](../product/ai-and-apis.md) · [Architecture](../engineering/architecture.md)

How a person gets into **Hey Ralli** (CampaignOS), joins an organization (tenant), switches tenants, and what blocks access.

---

## Tenant model (short)

| Concept | What it is |
|---------|------------|
| **Tenant** | An **organization** row. Almost all product data is org-scoped. |
| **Membership** | A row in `organization_users` (`status`: `invited` → `active`, or `deactivated`). |
| **Active org** | Preference cookie `campaignos-active-organization-id`, applied **only** if the user has an **active** membership in that org. |
| **School year** | Calendar/year context **inside** an org — **not** a separate tenant. No multi-location tenant switcher in product today. |

Isolation contract and RLS detail: [access-control.md](../engineering/access-control.md) (Phases C–D).

---

## Ways to enter the product

There is **no open self-serve “create org without a code”** path when founding codes are required (Production default). There is **no email-domain auto-join**.

| Path | Who | What they do |
|------|-----|----------------|
| **Founding / new org** | First admin for a new workspace | `/login?intent=setup` → founding access code → magic-link email → `/onboarding` → bootstrap org (admin seat) |
| **Team invite** | Seat provisioned by an org admin | Email / link → `/invite/[token]` → set password (or sign in if account exists) → membership becomes `active` |
| **Returning sign-in** | Existing auth user with ≥1 active membership | Password, magic link, or OAuth (Google / Facebook) → post-auth routing → app |

Stripe / paid plan gates: **deferred** (Phase E). Valid founding codes set `billing_exempt_at` on the org when used.

---

## Brand-new user: founding a workspace

1. User opens **new organization** signup (`/login?intent=setup`).
2. Enters email + **founding access code** (env-configured; see below).
3. App stores a validated pending code (httpOnly cookie; magic-link also carries a signed `fac` param for email clients).
4. Resend sends **organization-welcome** with CTA **Let's get started** → `/auth/callback?setup=1` → `/onboarding`  
   (Fallback: Supabase Auth OTP email if Resend / service role missing — see [auth-welcome-email.md](../engineering/auth-welcome-email.md).)
5. On Welcome, `startValueFirstOnboardingAction` calls `bootstrapMinimalOrganization`:
   - Inserts `organizations` (+ optional billing exemption from the code)
   - Creates **active** membership with `campaign_role = admin`
   - Seeds playbooks / workspace / active school year / default brand assets
6. Redirect → create first event (`/events/create?onboarding=1`), then skippable overlay steps (Calendar → Brand → Team → Meta). Progress on `organizations.onboarding_state`.

**If founding code is required and missing/invalid:** stay on setup login (`error=code_required`).  
**If user already has an active membership and tries setup:** `/login?error=existing_org` (cannot found a second org via this path while already a member).  
**Unclear / verify:** product path for one person to *found* a second organization after already belonging to one (switcher supports *joining* multiple orgs via invites).

### Founding access codes (ops)

Configured in env (not in-app UI):

- `CAMPAIGNOS_FOUNDING_ACCESS_CODES` (comma-separated) and/or `CAMPAIGNOS_BETA_ACCESS_CODE`
- `CAMPAIGNOS_REQUIRE_ACCESS_CODE` — default **true**; set `false` for local only

Source: `src/lib/auth/founding-access.ts`.

---

## Joining an existing organization (invite)

1. Org member with `manage_people` invites from Team Access → `inviteOrganizationUser` creates `organization_users` with `status = invited`, token, **7-day** expiry (`TEAM_INVITE_TTL_DAYS`).
2. Invite email includes `/invite/[token]` (password **not** in email). Link can be copied if email send fails.
3. Invitee:
   - **New account:** set password on invite page → Auth user created → invite claimed → `active`
   - **Existing account:** sign in (password / OAuth / magic link) with the **invite email** → claim
4. Email must match the invite. Mismatch → login error / invite blocked (`invite_email`).
5. Founding setup intent **does not** auto-claim invites (`/auth/callback` skips `acceptPendingInvitesForUser` when `setup=1`).

Admins can **resend** / **cancel** invites and **reinvite** deactivated members. Deactivated seats → `/login?error=account_deactivated` (cannot use the app).

**Not supported for join:** domain allowlists, open org directories, self-serve “request access.”

---

## Day-to-day multi-tenant use

1. User may hold **multiple active** `organization_users` rows (typically via invites to different orgs).
2. Header **Organization switcher** appears when membership count **> 1** (`OrganizationSwitcher`).
3. Switch → `setActiveOrganizationAction` asserts active membership, writes cookie, redirects to **`/dashboard`** (never keeps another tenant’s event URL).
4. Invalid / foreign cookie → ignored; fallback = **oldest** active membership.
5. Cookie cleared on sign-out (with role-simulator cookie).

Permissions and event visibility are resolved for the **active** org via EffectiveAccess ([access-control.md](../engineering/access-control.md)).

---

## Roles and what they unlock

Two layers:

1. **`campaign_role`** on the membership (system template id / base role).
2. **Access templates** — org-editable permission toggles (see vs work, people, approvals, publish, artwork, integrations, etc.). Runtime uses EffectiveAccess, not raw role checks alone.

### Built-in `campaign_role` values (code)

| `campaign_role` | Default template label | Notes |
|-----------------|------------------------|--------|
| `admin` | Admin | Full control incl. people / integrations / billing flag. Product/ops often call this **Owner**. |
| `president` | President | Leadership; `manage_people` safety-locked on. |
| `vp_communications` | VP Communications | Approve + publish + artwork. |
| `committee_chair` | Event Lead | Draft / submit / publish / artwork (assigned-event modes apply). |
| `contributor` | Contributor | Draft / submit / publish / artwork. |
| `view_only` | View Only | Read-oriented defaults. |
| `developer` | Developer | Internal seat; **must sign** developer agreements before app use. Defaults omit `manage_people`. |
| `tester` | Tester | Draft/submit; no publish / no upload artwork by default. |

Custom templates can override toggles; missing custom template **fails closed** to `view_only`.

**Naming note:** [feature-list.md](../product/feature-list.md) mentions presets “Owner, President, VP, Chair, Volunteer, Viewer.” Code labels are **Admin / Event Lead / Contributor / View Only** (plus Developer / Tester). Treat feature-list names as product shorthand; **code + Team Access template `displayName` are source of truth.**

Fine-grained keys and see-vs-work modes: [access-control.md](../engineering/access-control.md).

---

## Access gates (what blocks the app)

Ordered roughly as middleware / post-auth apply them:

| Gate | Who | Effect |
|------|-----|--------|
| Unauthenticated | Anyone | Public routes only; else login. |
| Must change password | Invite/provisioned seats with `must_change_password` | Forced `/account/change-password`. |
| **Developer agreements** | Active membership with `campaign_role` in a doc’s `required_for_roles` (default **`developer`**) and unsigned current version | Hard redirect to `/account/agreements`. Details: [developer-agreements.md](../engineering/developer-agreements.md). |
| No active membership | Auth user, not deactivated | Org setup paths allowed; else `/login?intent=setup&error=org_required` (or onboarding if valid pending founding code). |
| Deactivated | Any deactivated memberships, no active | `/login?error=account_deactivated`. |
| Invite email mismatch | Invite flow | Cannot claim; stay on login/invite with error. |
| Missing founding code | New-org signup when required | Cannot complete setup. |

RLS still requires **active** membership for data; app permission keys gate mutations (artwork, people, etc.).

---

## Platform Owner ops (≠ org Admin)

| Capability | Gate |
|------------|------|
| `/ops` Owner dashboard, agreements manage / counter-sign | Email on `HEY_RALLI_OWNER_EMAILS` (or `REPORT_A_PROBLEM_OWNER_EMAILS`) **and** active membership `campaign_role = admin` |
| `/ops/ai-apis` Owner AI & APIs (usage, costs, connected APIs) | Same gate as `/ops` (`canAccessOwnerOps`) — see [ai-and-apis.md](../product/ai-and-apis.md) |

Org **Admin** alone is **not** enough for `/ops` or `/ops/ai-apis`. Allowlist alone without an Admin seat is **not** enough. See `src/lib/ops/access.ts`, `src/lib/developer-agreements/access.ts`.

---

## Post-auth routing (summary)

`resolvePostAuthPathForUser` (`src/lib/auth/post-auth-path.ts`):

- Valid founding setup → `/onboarding` (unless already a member → `existing_org` / deactivated → deactivated login)
- No membership + invite token → login with `invite_email` (do not dump invitees into founding UX)
- No membership → `/onboarding` (founding bootstrap) or org-required login depending on gate/cookie
- Must sign agreements → `/account/agreements`
- Else → `next` (safe) or `/dashboard`

---

## Open questions / verify in code

| Item | Finding |
|------|---------|
| Email-domain join | **Not implemented** (no domain allowlist join path found). |
| Multi-location / multi-school as tenants | **Not a tenant dimension**; school years are within one org. |
| Founding a *second* org while already a member | Blocked by `existing_org` on setup intent — **no alternate UI found**. |
| `claimOrganizationAdminAccess` | Defined in `membership-mutations.ts` (empty-org admin claim) but **no call sites** found — unclear if still used. |
| Feature-list role names vs code labels | Product copy may say Owner / Volunteer / Viewer; runtime uses Admin / Contributor / View Only, etc. |
| OAuth for founding | Google / Facebook supported on login; founding still needs valid access code when required. Provider enablement is a Supabase Auth config concern. |

---

## Engineering appendix — key paths

| Area | Path |
|------|------|
| Login / setup UI | `src/app/login/page.tsx`, `src/components/auth/LoginForm.tsx` |
| Auth actions (password, magic link, invite complete) | `src/lib/auth/actions.ts` |
| Auth callback | `src/app/auth/callback/route.ts` |
| Post-auth path | `src/lib/auth/post-auth-path.ts` |
| Org gate (middleware) | `src/lib/auth/org-gate.ts`, `src/lib/supabase/middleware.ts` |
| Founding codes | `src/lib/auth/founding-access.ts` |
| Bootstrap org | `src/lib/organizations/mutations.ts` (`bootstrapMinimalOrganization`) |
| Onboarding start | `src/lib/onboarding/actions.ts` (`startValueFirstOnboardingAction`) |
| Invites | `src/app/invite/[token]/`, `src/lib/auth/membership-mutations.ts`, `membership-queries.ts` |
| Active org / switcher | `src/lib/auth/active-organization*.ts`, `OrganizationSwitcher.tsx` |
| Campaign roles | `src/lib/auth/campaign-roles.ts` |
| Access templates | `src/lib/access-templates/` |
| Developer agreements gate | `src/lib/developer-agreements/gate.ts` |
| Platform owner | `src/lib/ops/access.ts` |
