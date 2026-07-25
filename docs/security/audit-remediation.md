# Security audit remediation log

**Status:** Living
**Owner:** Engineering
**Last updated:** July 25, 2026
**Related:** [Security](./README.md) · [Access & onboarding](./access-and-onboarding.md) · [Multi-tenant isolation](./multi-tenant-isolation.md) · [Access control](../engineering/access-control.md) · [Feature list](../product/feature-list.md)

Tracks findings from the July 2026 full-app security audit (Authentication, Authorization/RBAC/RLS, injection/XSS/CSRF, API security & architecture) and their remediation status. Read this before re-auditing so prior findings aren't rediscovered as new.

---

## Critical

| # | Finding | Fix | Status |
|---|---------|-----|--------|
| 1 | Cross-tenant account takeover: `provisionTeamMemberAccount` and `createInvitedMemberAccount` reset the password of any **pre-existing** Supabase auth account when the target email already had one — any org admin (or invite-token holder) could take over any account by knowing its email. | Removed the password-reset-on-existing-account branch from both [`provision-team-account.ts`](../../src/lib/auth/provision-team-account.ts) and [`invite-credentials.ts`](../../src/lib/auth/invite-credentials.ts). Existing accounts now must sign in with their own credentials (password or OAuth) to accept an invite — `acceptPendingInvitesForUser` already auto-claims the invite once authenticated. [`InviteAcceptForm.tsx`](../../src/components/auth/InviteAcceptForm.tsx) updated to show a "Sign in to accept" CTA instead of a password form when the account already exists. | ✅ Fixed |
| 2 | `organization_canva_connections` (Canva OAuth tokens), `organization_ai_profile`, and `organization_training_documents` had `using (true)` RLS policies granted to **`anon` and `authenticated`** — missed by the 064–067 membership-scoped RLS hardening sweep. | Added `private.is_active_org_member(organization_id)`-scoped policies to all three tables, dropped `anon` grants. Migration: [`20260725080000_secure_canva_ai_training_rls.sql`](../../supabase/migrations/20260725080000_secure_canva_ai_training_rls.sql). Applied directly to production for `organization_canva_connections` (the only one of the three that exists in prod today — `organization_ai_profile`/`organization_training_documents` are defined in migration 007 but not yet applied to prod). Table had 0 rows in production at time of fix, so no Canva token rotation was needed (nothing to rotate). | ✅ Fixed |

## High

| # | Finding | Fix | Status |
|---|---------|-----|--------|
| 3 | No rate limiting anywhere: login, OTP/magic-link send, invite accept, password change, founding-access code entry, Ask Ralli/AI generation all unthrottled. | Postgres-backed fixed-window limiter (`public.rate_limit_hit` RPC + [`rate_limit_buckets`](../../supabase/migrations/20260725090000_rate_limit_buckets.sql) table, service-role only). App helper: [`checkRateLimit`](../../src/lib/security/rate-limit.ts). Wired into `signInWithPasswordAction`, `signInWithEmailAction`, `completeInviteSetupAction`, `changePasswordAction`, `submitFoundingAccessCodeAction` (per-email/user + per-IP) in [`auth/actions.ts`](../../src/lib/auth/actions.ts), `askRalliAssistantAction` (per-user) in [`ralli-assistant/actions.ts`](../../src/lib/ralli-assistant/actions.ts), and a baseline per-org/per-user limit (60/5min) at the core [`generateText`](../../src/lib/ai/provider.ts) entry point covering all other AI action types. Fails **open** on infra errors (missing service role locally, DB hiccup) — defense in depth, not the primary control. | ✅ Fixed |
| 4 | AI credit + `ask_ralli` feature gate fail **open** when org can't be resolved / caller has no active membership → unlimited unmetered OpenAI calls. | `assertAiCreditsAvailable` now returns `{ ok: false, errorCode: "org_unresolved" }` when the org can't be attributed (was `{ ok: true }`); local dev without a service-role key is still allowed through (nothing to meter). `askRalliAssistantAction` now blocks (instead of skipping the gate) when the caller has no active org membership. See [`credits.ts`](../../src/lib/ai/credits.ts), [`ralli-assistant/actions.ts`](../../src/lib/ralli-assistant/actions.ts). | ✅ Fixed |
| 5 | Forgeable HMAC secrets: `download-token.ts` / `founding-access-link-token.ts` fall back from service-role key to the public anon key, then a hardcoded literal. | Added dedicated `DEVELOPER_AGREEMENT_DOWNLOAD_SECRET` / `FOUNDING_ACCESS_LINK_SECRET` (provisioned in Vercel Production + Preview and local `.env.local`); anon-key and hardcoded-literal fallbacks removed. Falls back to `SUPABASE_SERVICE_ROLE_KEY` (still private) with a logged warning only if the dedicated secret is unset, and throws if neither is configured. See [env-and-secrets.md](../ops/env-and-secrets.md#hmac-signing-secrets). | ✅ Fixed |
| 6 | Host-header injection into emailed auth links (`invite-url.ts` / `url.ts` trust `origin`/`x-forwarded-host`). | `resolveSiteOrigin` / `resolveSiteUrlFromHeaders` in [`site/url.ts`](../../src/lib/site/url.ts) now only ever reflect a recognized hostname (localhost, this project's `*.vercel.app` previews, the legacy Vercel host, or the configured `NEXT_PUBLIC_SITE_URL`) back into a URL; any other `Origin`/`X-Forwarded-Host` value falls through to the configured/default site URL instead of being echoed. Covered by [`url.test.ts`](../../src/lib/site/__tests__/url.test.ts). | ✅ Fixed |
| 7 | Weak session cookie flags — no explicit `secure`/`maxAge` on any Supabase client. | Added [`getSupabaseCookieOptions()`](../../src/lib/supabase/cookie-options.ts) (`secure` in production, `sameSite: "lax"`, 30-day `maxAge`) applied to every Supabase client that issues auth cookies (browser, server, middleware, `/auth/callback`, `/auth/signout`). `httpOnly` intentionally left as the SDK default (false) since the browser client reads these cookies directly. | ✅ Fixed |

## Medium

| # | Finding | Fix | Status |
|---|---------|-----|--------|
| 8 | OAuth callback CSRF: Meta + Monday callbacks accepted a validly-**signed** `state` even when it didn't match the browser's `state` cookie (`stateMatchesCookie \|\| parsedState.valid` / `!parsedState.valid` skip) — since the signing secret is server-wide, an attacker could mint their own valid `state` via `/oauth/start`, get a `code` for their own Meta/Monday account, and trick a logged-in victim into visiting the callback URL, linking the *attacker's* integration account into the *victim's* organization. | Both callbacks now require an exact `state`-cookie match **and** a valid signature (`AND`, not `OR`) — see [`meta/oauth/callback/route.ts`](../../src/app/api/meta/oauth/callback/route.ts) and [`monday/oauth/callback/route.ts`](../../src/app/api/monday/oauth/callback/route.ts). Google and Canva callbacks already required a strict cookie match. | ✅ Fixed |
| 9 | OAuth start routes (`meta`, `monday`, `google`, `canva`) have no `manage_integrations` permission check — any authenticated member (any role) could connect/replace an org's social, calendar, or PM integration. | Added `hasPermission("manage_integrations")` checks to all four `oauth/start` routes; unauthorized callers are redirected back to the relevant settings page with `error=forbidden`. | ✅ Fixed |
| 10 | Active-org data leaks: communications-calendar, creative-assets, vendor metadata queries | ⏳ Not started |
| 11 | Unsanitized HTML in developer agreements (no DOMPurify; inline `text/html` re-serve) | ⏳ Not started |
| 12 | Client-controlled Content-Type on public bucket uploads | ⏳ Not started |
| 13 | CSRF-able `POST /api/insights/sync` | ⏳ Not started |
| 14 | No security headers (`next.config.ts` missing CSP/HSTS/etc.) | ⏳ Not started |
| 15 | Deactivating a member doesn't revoke their session/refresh token | ⏳ Not started |
| 16 | Unsanitized filename in calendar-import upload storage path | ⏳ Not started |

## Low / Info (cleanup, not launch-blocking)

- Founding access codes: static shared secret, non-constant-time compare, disableable via env flag.
- CSV formula injection in insights export.
- `escapeHtml` doesn't validate URL schemes before use in email `href`s.
- OAuth provider tokens stored in plaintext rather than encrypted at rest.
- Account enumeration via verbose Supabase error passthrough on OTP/password-reset paths.
- Password change has no re-authentication (current-password) step.
- Verbose OAuth token-exchange error logging may leak partial request/response details.
- Duplicate dead file `src/lib/events/export-events-list-pdf 2.ts`.

## Already solid — no action needed

- RLS enabled on all `public` tables; membership-scoped policies (064–067) use `security definer` + `search_path=''` correctly.
- No raw/dynamic SQL across migrations; the one `.rpc()` call is fully parameterized.
- Stripe and Meta webhook signature verification are correct, raw-body based, fail closed.
- No secrets reach the client bundle; `server-only` guards used correctly throughout.
- No permissive CORS; middleware fails closed on protected paths.
- Ask Ralli AI context packs are correctly org-scoped.
