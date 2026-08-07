# Hey Ralli — Launch security assessment

**Status:** Living  
**Owner:** Engineering / Security  
**Last updated:** August 7, 2026 (launch hardening execution pass)  
**Related:** [Audit remediation](./audit-remediation.md) · [Multi-tenant isolation](./multi-tenant-isolation.md) · [Access & onboarding](./access-and-onboarding.md) · [OWASP ZAP](./owasp-zap.md) · [Storage RLS](../engineering/storage-rls.md) · [Env & secrets](../ops/env-and-secrets.md)

Independent production-readiness review of Hey Ralli (CampignOS). Goal: determine whether the platform is ready to serve real schools from a security perspective—not to rubber-stamp a launch.

---

## 1. Executive summary

Hey Ralli has completed two security hardening waves (July audit remediations + August launch execution). The product is now in a **launch-ready posture for unrestricted PTA/PTO school signup**, subject to the ops checklist below and documented residual risks.

**Would I personally sign off on unrestricted production launch today?**  
**Yes — for Hey Ralli’s intended market (school PTO/PTA volunteer orgs), after the deploy + Vercel secret verification steps in §9.**  

**No — for FERPA-heavy district / enterprise RFPs** until historical public media is migrated, CSP is nonce-based, and an external pen test is completed.

Highest remaining residuals are **historical public media URLs**, **CSP `unsafe-inline`** (session cookies remain JS-readable), and **transitive npm advisories** that require breaking upgrades (Next 16 / sharp).

---

## 2. Overall security posture (current)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Authentication | **Good** | Supabase Auth + middleware; founding codes; password re-auth; session revoke |
| Authorization / RBAC | **Good** | Templates + membership RLS; IDOR gates on service-role paths |
| Multi-tenant isolation | **Good** | Org-scoped; active-org cookie never trusted alone |
| Data / RLS | **Good** | Membership helpers; Canva/AI training fixed; school-media private |
| API / Server Actions | **Good** | Same-origin CSRF tightened; Zod on flyer mutating APIs; Zod available for expansion |
| Billing / credits | **Good** | Signed webhooks; Stripe Reserve idempotency; **atomic burn/grant RPCs live** |
| Storage | **Good enough for launch** | New school photos private+signed; marketing/public buckets intentional |
| Abuse / DoS | **Fair–Good** | Rate limits fail closed when admin configured; cron requires secret on deploy |
| XSS / CSP | **Fair–Good** | Headers + no `unsafe-eval` in production; `unsafe-inline` remains |
| Secrets / ops | **Good** | Boot-time secret gap reporting; OAuth encrypt fail-closed on Preview/Production |
| Supply chain | **Fair** | `npm audit` / `audit:ci` scripted; 5 remaining vulns need breaking upgrades |

---

## 3. Architecture observations

Unchanged core: Next.js 15 · Supabase Auth/Postgres/Storage · Vercel · Stripe · OpenAI · Meta/Google/Canva/Monday · Resend · Sentry.

**Deliberate design choices we agree with (for this product):**

1. **Hybrid storage** — Keep public CDN for AI marketing art / logos / Background Library (Meta + email need durable URLs). Put **school-uploaded photos** on private `school-media` with signed URLs. A full private rewrite of `event-assets` would break Meta/email without a multi-week proxy redesign.
2. **App-layer fine-grained permissions + membership RLS** — Correct trade-off for velocity; mitigated by IDOR gates and service-role discipline.
3. **Credit metering in Postgres RPCs** — Stronger than optimistic locking in app code; matches existing `rate_limit_hit` pattern.

**Challenge recorded:** Full nonce CSP + httpOnly auth cookies would be stronger against XSS→session theft, but Supabase browser SSR currently needs readable cookies. Nonce migration remains the right next CSP step—not a rewrite of auth.

---

## 4. Confirmed vulnerabilities — status

### Closed in initial Aug 7 review

| ID | Finding | Status |
|----|---------|--------|
| H1–H3 | SSRF (calendar + flyer), Stripe Reserve double-grant | ✅ Fixed + migrations applied (prod + staging) |
| H4 / M1–M4 | Cron auth, rate-limit fail-open, role simulator Preview, flyer CSRF, artwork fetch hosts | ✅ Fixed |

### Closed in launch execution pass (this update)

| ID | Finding | Status |
|----|---------|--------|
| R1 | AI credit lost-update races | ✅ `ai_credit_ensure_period` / `ai_credit_burn` / `ai_credit_apply_reserve_delta` RPCs — **applied to prod + staging** |
| R2 | OAuth tokens plaintext if key missing | ✅ Encrypt **throws** on Preview/Production without key |
| R3 | School-uploaded inspiration photos on public CDN | ✅ Private `school-media` bucket + signed URLs for CB2 inspiration |
| R4 | Production secret misconfig silent | ✅ `reportProductionSecretGaps` in `instrumentation.ts` |
| R5 | CSP `unsafe-eval` | ✅ Removed in production builds; added `upgrade-insecure-requests` |
| R6 | Flyer API body validation | ✅ Zod schemas on save / send-for-approval |
| R7 | CSRF missing Origin / cross-site Sec-Fetch | ✅ Reject `Sec-Fetch-Site: cross-site` |
| R8 | Stripe ledger unique index | ✅ Applied prod + staging |
| R9 | Dependency visibility | ✅ `npm run audit:ci`; safe `npm audit fix` applied (5 remain, need breaking upgrades) |

---

## 5. Potential risks (remaining)

1. **Historical public URLs** for inspiration/event assets uploaded before school-media — still world-readable if leaked. New inspiration uploads are private.
2. **Public buckets by design** for AI art, logos, stickers, platform backgrounds — acceptable for marketing assets; not for student photos going forward.
3. **CSP `unsafe-inline`** + non-httpOnly Supabase cookies — XSS can still steal sessions; mitigated by sanitization, framing denial, and no eval in prod.
4. **Prompt injection** into org-scoped AI — metering limits cost; treat model output as untrusted for privileged actions.
5. **Service-role blast radius** — every new admin-client write must keep event/org gates.
6. **npm high advisories** in Next/postcss, sharp, exceljs/uuid — fixes require Next 16 / sharp 0.35 / exceljs downgrade; schedule separately.
7. **No external pen test yet** — OWASP ZAP soft-launch pass exists; formal third-party test still recommended within 30 days of open enrollment.
8. **Campaign-files / event asset photo uploads** can still land on public buckets for non-inspiration flows — extend school-media lane next.

---

## 6. Recommended improvements (post-approval backlog)

| Priority | Item |
|----------|------|
| P1 | Extend school-media to flyer photo uploads + campaign-files image uploads |
| P1 | Upgrade Next/sharp when Next 16 is validated in this repo |
| P1 | Schedule external pen test + retest ZAP |
| P2 | Nonce-based CSP |
| P2 | Zod across remaining mutating API routes / high-risk actions |
| P2 | Audit trail for team / billing / integration / Owner credit events |
| P3 | Migrate historical public inspiration objects → school-media (optional purge) |

---

## 7. Work completed

### Review pass
- SSRF hardening (`safe-outbound-url` / `safe-fetch`)
- Stripe Reserve idempotency
- Cron auth helper; rate-limit fail-closed; role simulator Preview lock
- Flyer CSRF Origin checks

### Launch execution pass
- Atomic AI credit RPCs + period_grant uniqueness (DB **live** on prod + staging)
- Private `school-media` bucket + CB2 inspiration routing to signed URLs
- OAuth encryption required on Preview/Production
- Boot-time production secret checks
- CSP: drop `unsafe-eval` in production; `upgrade-insecure-requests`
- Zod on flyer save / approval APIs
- CSRF: reject cross-site `Sec-Fetch-Site`
- `npm run test:security` / `npm run audit:ci`
- Docs: storage-rls, env-and-secrets, this assessment, audit-remediation

---

## 8. Remaining concerns

- Deploy this branch to Vercel Production before treating approval as live.
- Confirm Vercel Production env has `OAUTH_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, Stripe secrets, HMAC secrets (boot logs will scream if not).
- Historical public media + CSP inline scripts are accepted residuals for PTA launch, not for district RFP claims.
- Transitive npm highs deferred (breaking upgrades).

---

## 9. Launch readiness assessment

| Cohort | Verdict |
|--------|---------|
| Private founding schools | **Ready** (was conditional; now cleared with execution pass) |
| Open self-serve PTA/PTO signup | **Ready after deploy + secret verification** |
| Enterprise / school-district RFP | **Not ready** — need historical media migration, nonce CSP, external pen test |

### Objective criteria before I recommend “go live” on Production traffic

- [ ] This branch (or equivalent) deployed to Vercel Production
- [ ] Vercel Production env verified: `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `OAUTH_TOKEN_ENCRYPTION_KEY` (32-byte base64), HMAC secrets, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ALLOW_ROLE_SIMULATOR` unset/false in Production
- [ ] Smoke: Stripe webhook unsigned rejected; AI credit burn after generation; calendar subscribe rejects `http://127.0.0.1/`; inspiration upload produces `/object/sign/` URL not `/object/public/`
- [ ] Ops acknowledges residual public historical media + CSP inline + npm backlog

### Criteria already satisfied in code/DB

- [x] Atomic credit RPCs on production DB
- [x] Stripe Reserve unique index on production DB
- [x] Private school-media bucket on production DB
- [x] SSRF / CSRF / cron / rate-limit / OAuth encrypt fail-closed in codebase
- [x] Automated security unit tests passing (`npm run test:security`)

---

## 10. Prioritized remediation roadmap (forward)

| Priority | Item | Status |
|----------|------|--------|
| P0 | Deploy launch hardening branch | **Ops — remaining** |
| P0 | Verify Production secrets | **Ops — remaining** |
| P0 | Atomic credits + school-media + Stripe idempotency migrations | **Done (prod + staging)** |
| P1 | Extend private media lane; Next/sharp upgrade; pen test | Backlog |
| P2 | Nonce CSP; broader Zod; audit logging | Backlog |

---

## 11. Testing notes

```bash
npm run test:security
npx tsc --noEmit -p tsconfig.json
npm run audit:ci   # expect remaining highs until Next 16 / sharp bump
```

DB verification (prod): `ai_credit_ensure_period`, `ai_credit_burn`, `ai_credit_apply_reserve_delta` present; `storage.buckets.school-media.public = false`.

---

## 12. Sign-off statement

As of this assessment update, Hey Ralli’s **security controls are sufficient for unrestricted production launch to school PTO/PTA customers**, provided the §9 deploy/secret checklist is completed. I would not yet certify the platform for enterprise district procurement without the P1 backlog items above.
