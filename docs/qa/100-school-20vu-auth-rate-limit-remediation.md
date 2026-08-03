# Auth rate-limit remediation — after 100-school / 20-VU Run 1

**Status:** Code fix applied; Supabase config change recommended but **not**
applied. Do not rerun the load test until this report is reviewed.
**Date:** August 3, 2026
**Related:** [Run 1 report](./100-school-20vu-data-scale-run1.md)

---

## Verdict

Run 1’s only hard failure (`auth_failures` / `checks`) was caused by **our
middleware calling `supabase.auth.getUser()` on every matched request**. That
method always performs `GET /auth/v1/user` against Supabase Auth. Under a
sustained 20-VU read load those Auth calls exhausted Auth’s rate limit /
connection budget; middleware then treated the 429 as “no user” and redirected
to `/login`.

This is **primarily an application auth-path defect**, amplified by a real
but secondary **Supabase Auth capacity setting** (absolute 10 DB connections).
It is not a tenant-isolation, RLS, or product-page latency problem.

---

## What we verified

| Check | Evidence |
|---|---|
| Middleware calls Auth on every cookie-bearing request | `src/lib/supabase/middleware.ts` previously awaited `supabase.auth.getUser()` |
| `getUser()` always hits Auth | `@supabase/auth-js` `_getUser` → `GET ${url}/user` on every call |
| Staging already has asymmetric JWT keys | `GET …/auth/v1/.well-known/jwks.json` returns ES256 (`kid` present) |
| `getClaims()` can verify locally on this project | Same auth-js: ES256 + WebCrypto → JWKS verify, no `/user` call; refresh only near expiry (~90s margin) |
| Matcher is not the main problem | Already skips static assets; public paths without cookies skip Auth. The cost was `getUser` on every authenticated navigation, not matching extra routes |
| Token refresh was not the primary burst | Access tokens are 1h (`jwt_expiry = 3600`); Run 1 lasted ~28m with freshly minted sessions. Failures clustered from `/user` volume, not mass refresh |
| Auth rate limits (dashboard) | Token refreshes = **150 / 5 min** (editable). IP address forwarding = **off** |
| Auth DB connections (dashboard) | Strategy = **Absolute**, max = **10 / 60**. Supabase UI text: prefer percentage so Auth scales with compute |

Approx Auth load under Run 1 before the fix:

- Peak ~3 authenticated page GETs/s
- Middleware `getUser` + RSC `getAuthUser` → **~2 Auth `/user` calls per page**
- ≈ **6 Auth calls/s** sustained → hundreds per 5-minute window, all from Vercel edge IPs sharing one rate-limit bucket when IP forwarding is off

---

## Code changes applied (safe)

1. **Middleware** (`src/lib/supabase/middleware.ts`): identity gate uses
   `auth.getClaims()` instead of `auth.getUser()`. Maps JWT `sub` /
   `app_metadata` via a small helper. Still refreshes near-expiry tokens
   through the normal SSR cookie path. Org / developer-agreement gates
   unchanged (still use Postgres via the user id from claims).
2. **RSC auth helper** (`src/lib/auth/queries.ts` `getAuthUser`): same switch
   to `getClaims()`, so layouts do not double-hit `/user` after middleware.
3. **Helpers + tests** (`middleware-auth.ts`, node:test coverage).

**Not weakened:**

- RLS still enforces tenancy on every data query (JWT in cookies).
- Server Actions / sensitive paths that call `auth.getUser()` directly are
  unchanged (still server-confirmed user records where already used).
- Spoofed cookies still fail: `getClaims` verifies the ES256 signature against
  the project JWKS (cached).

**Tradeoff (accepted, Supabase-recommended):** a server-side logout is not
visible to middleware until the access token expires (≤ 1h). Previously
`getUser` detected revoked sessions immediately at the cost of an Auth round
trip on every request.

---

## Supabase configuration — what to change (manual)

Do **not** raise rate limits as the primary fix. After the code change, Auth
traffic from page loads should drop dramatically. Still apply this capacity
hygiene so Auth scales with Micro (and future tiers):

### 1. Auth → Performance → Connection management (recommended)

| Setting | Current (verified) | Change to |
|---|---|---|
| Allocation strategy | **Absolute** | **Percentage** |
| Maximum connections | **10** absolute (of 60) | Leave Supabase’s recommended percentage default after switching (or ~15–20% if you must pick) |

**Why:** Absolute 10 does not grow when compute is upgraded (Nano→Micro already
proved this). Percentage is what Supabase’s own advisor and dashboard copy
recommend. This is a dashboard toggle + save — no migration.

### 2. Auth → Rate Limits → IP address forwarding (optional, staging)

Currently **off**. When off, Auth rates Vercel edge egress IPs, so many users
share one bucket. Enabling forwarding (and sending `sb-forwarded-for` from the
app if required by Supabase’s docs for your plan) makes limits per end-user IP.
Useful for production realism; **not required** to validate the code fix.

### 3. Do **not** change yet

- `token_refresh = 150` — fine once we stop flooding `/user`
- JWT expiry (3600s) — no need to lengthen; that would only delay logout
  detection further
- Matcher denylist — already adequate; narrowing further risks missing
  protected routes

---

## What we did **not** do

- No load-test rerun
- No production changes
- No RLS / schema / compute tier changes
- No Auth dashboard settings saved (config change left for you to approve)

---

## Suggested next step

1. Deploy this code to the staging preview used by k6.
2. Optionally flip Auth connection strategy Absolute → Percentage on
   `heyralli-staging`.
3. Re-mint sessions (or at least the 20 pinned owners) and run Run 2 with the
   same profile/thresholds.

Expect: `auth_failures == 0`, `checks == 100%`, latency gates still green.
