# Hey Ralli — Launch Certification Report

**Status:** Living  
**Owner:** Engineering / Security  
**Last updated:** August 7, 2026 (operator Production smoke reconciliation)  
**Related:** [Production readiness verification](./production-readiness-verification-2026-08.md) · [Audit remediation](./audit-remediation.md) · [Multi-tenant isolation](./multi-tenant-isolation.md) · [Access & onboarding](./access-and-onboarding.md) · [OWASP ZAP](./owasp-zap.md) · [Storage RLS](../engineering/storage-rls.md) · [Env & secrets](../ops/env-and-secrets.md) · [Integrations](../integrations/README.md)

Independent production-readiness review of Hey Ralli (CampignOS). Goal: determine whether the **core platform** is ready to serve real schools from a security perspective—not to rubber-stamp every third-party integration as feature-complete.

---

## How to read this report

Three separate questions are answered here. They must not be collapsed into one “launch” boolean.

| Layer | Question | Blocks core PTA/PTO launch? |
|-------|----------|-----------------------------|
| **1. Core platform launch readiness** | Are auth, tenancy, billing, AI metering, storage, and app security good enough for open school signup? | **Yes — this is the launch gate** |
| **2. External integration readiness** | Is each third-party integration secure enough to operate, and is product work on it finished? | **No** — integrations can ship as partial / under review |
| **3. Third-party approval readiness** | Have Meta, Google, or other vendors completed App Review / partner certification? | **No** — external calendars; tracked separately |

**Meta and Google Calendar are not considered final for this certification.** They remain under active product/security review and may change before public marketing of those features. Core platform launch **must not** wait on Meta or Google final review.

---

## 1. Executive summary

Hey Ralli has completed two security hardening waves (July audit remediations + August launch execution). The **core platform** is in a **launch-ready posture for unrestricted PTA/PTO school signup**, subject to the ops checklist in §10 and documented residual risks.

**Core platform sign-off (PTA/PTO):**  
**Yes — deploy, secrets, fail-closed, and human Production product smokes verified; remaining launch-security smoke is Calendar SSRF Production-path (§10 + [verification report](./production-readiness-verification-2026-08.md)).**  

**Meta / Google feature-complete sign-off:**  
**No — not in scope for this certification.** Classify as *Operationally Ready but Pending Final Review*.

**Enterprise / district RFP sign-off:**  
**No** — until historical public media migration, nonce CSP, and an external pen test are done.

Highest remaining **core** residuals: historical public media URLs, CSP `unsafe-inline`, transitive npm advisories needing breaking upgrades.

---

## 2. Overall security posture (core platform)

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Authentication | **Good** | Supabase Auth + middleware; founding codes; password re-auth; session revoke |
| Authorization / RBAC | **Good** | Templates + membership RLS; IDOR gates on service-role paths |
| Multi-tenant isolation | **Good** | Org-scoped; active-org cookie never trusted alone |
| Data / RLS | **Good** | Membership helpers; Canva/AI training fixed; school-media private |
| API / Server Actions | **Good** | Same-origin CSRF tightened; Zod on flyer mutating APIs |
| Billing / credits | **Good** | Signed webhooks; Stripe Reserve idempotency; atomic burn/grant RPCs live |
| Storage | **Good enough for launch** | New school photos private+signed; marketing/public buckets intentional |
| Abuse / DoS | **Fair–Good** | Rate limits fail closed when admin configured; cron requires secret on deploy |
| XSS / CSP | **Fair–Good** | Headers + no `unsafe-eval` in production; `unsafe-inline` remains |
| Secrets / ops | **Good** | Boot-time secret gap reporting; OAuth encrypt fail-closed on Preview/Production |
| Supply chain | **Fair** | `npm audit` / `audit:ci`; 5 remaining vulns need breaking upgrades |

---

## 3. Architecture observations

Stack: Next.js 15 · Supabase Auth/Postgres/Storage · Vercel · Stripe · OpenAI · Meta/Google/Canva/Monday · Resend · Sentry.

**Deliberate design choices (core):**

1. **Hybrid storage** — Public CDN for AI marketing art / logos / Background Library where durable URLs are needed. Private `school-media` + signed URLs for school-uploaded inspiration photos.
2. **App-layer fine-grained permissions + membership RLS** — Mitigated by IDOR gates and service-role discipline.
3. **Credit metering in Postgres RPCs** — Matches `rate_limit_hit` pattern; closes lost-update races.

**Integration note:** Meta publish paths and Google Calendar sync are **operational** code paths with real security controls, but product completeness and vendor review are tracked in §6 — not as core launch blockers.

---

## 4. Confirmed vulnerabilities — status (core)

### Closed in initial Aug 7 review

| ID | Finding | Status |
|----|---------|--------|
| H1–H3 | SSRF (calendar + flyer), Stripe Reserve double-grant | ✅ Fixed + migrations applied (prod + staging) |
| H4 / M1–M4 | Cron auth, rate-limit fail-open, role simulator Preview, flyer CSRF, artwork fetch hosts | ✅ Fixed |

### Closed in launch execution pass

| ID | Finding | Status |
|----|---------|--------|
| R1 | AI credit lost-update races | ✅ Atomic `ai_credit_*` RPCs — **applied to prod + staging** |
| R2 | OAuth tokens plaintext if key missing | ✅ Encrypt **throws** on Preview/Production without key |
| R3 | School-uploaded inspiration photos on public CDN | ✅ Private `school-media` + signed URLs for CB2 inspiration |
| R4 | Production secret misconfig silent | ✅ `reportProductionSecretGaps` in `instrumentation.ts` |
| R5 | CSP `unsafe-eval` | ✅ Removed in production builds |
| R6 | Flyer API body validation | ✅ Zod schemas |
| R7 | CSRF / Sec-Fetch-Site | ✅ Reject `cross-site` |
| R8 | Stripe ledger unique index | ✅ Applied prod + staging |
| R9 | Dependency visibility | ✅ `npm run audit:ci` |

**Regression check (this certification):** Recent SSRF, storage, credit, CSP, and CSRF changes were reviewed against Meta/Google/Canva/Stripe/Resend/OpenAI call paths. No launch-blocking regressions identified. Meta/Google were **not** redesigned for certification; only existing security properties were verified.

---

## 5. Potential risks (core platform remaining)

1. **Historical public URLs** for media uploaded before school-media.
2. **Public buckets by design** for AI art, logos, stickers, platform backgrounds.
3. **CSP `unsafe-inline`** + non-httpOnly Supabase cookies.
4. **Prompt injection** into org-scoped AI (metering limits cost only).
5. **Service-role blast radius** on new admin-client writes.
6. **npm high advisories** (Next/postcss, sharp, exceljs/uuid) — breaking upgrades deferred.
7. **No external pen test yet** — ZAP soft-launch done; formal test recommended within ~30 days of open enrollment.
8. **Non-inspiration photo uploads** may still use public buckets — extend school-media next (**internal engineering**).

---

## 6. External Integration Readiness

Each integration is evaluated independently for **security of the current implementation** and **product/final-review status**. Classifications:

| Classification | Meaning |
|----------------|---------|
| **Production Ready** | Secure enough and stable enough to treat as a core launch dependency |
| **Operationally Ready but Pending Final Review** | Secure enough to operate; product/vendor review not final; **may change** |
| **Development Complete** | Engineering done for optional/secondary use; not a launch dependency |
| **Requires Additional Engineering** | Internal code work still required before relying on it |
| **Blocked by External Approval** | Waiting on a third party (App Review, partner cert, etc.) |

### Summary matrix

| Integration | Classification | Work type | Core launch dependency? |
|-------------|----------------|-----------|-------------------------|
| **Stripe** | Production Ready | Internal | **Yes** (billing) |
| **Resend** | Production Ready | Internal | **Yes** (transactional email) |
| **OpenAI** | Production Ready | Internal | **Yes** (AI features + credits) |
| **Meta** | Operationally Ready but Pending Final Review | Internal + **external** (App Review / product finalization) | **No** |
| **Google Calendar** | Operationally Ready but Pending Final Review | Internal + **external** (product finalization) | **No** |
| **Canva** | Development Complete | Internal (optional) | **No** |

### Meta

| Aspect | Status |
|--------|--------|
| Auth | OAuth; `manage_integrations` on connect; org-scoped connection rows |
| Tokens | AES-GCM at rest; Preview/Production refuse plaintext writes; legacy plaintext decrypt still works until reconnect |
| Webhooks | `X-Hub-Signature-256` + verify token; cron gated by `CRON_SECRET` |
| Recent hardening | Feed/story image fetch via `safeFetch` (Supabase hosts) — SSRF reduced |
| Residual | Shared `META_PAGE_ACCESS_TOKEN` env fallback is an ops footgun if set in multi-tenant prod — prefer org OAuth only |
| Product completeness | **Not final** — publishing/inbox/insights surfaces remain under active review |
| Third-party approval | Meta App Review / use-case certification tracked separately ([ops/meta-app-review-use-cases.md](../ops/meta-app-review-use-cases.md)) |

**Classification: Operationally Ready but Pending Final Review**  
Do not block core platform launch on Meta finalization or App Review.

### Google Calendar

| Aspect | Status |
|--------|--------|
| Auth | OAuth (`calendar.readonly`); `manage_integrations` on connect; org-scoped |
| Tokens | Access + refresh AES-GCM; same fail-closed encrypt policy |
| Sync | Cron gated by `CRON_SECRET`; org-scoped |
| Related | ICS subscribe feeds use `safeFetch` (SSRF hardened) — shared calendar-import surface |
| Product completeness | **Not final** — sync/import UX and edge cases remain under review |

**Classification: Operationally Ready but Pending Final Review**  
Do not block core platform launch on Google finalization.

### Canva

| Aspect | Status |
|--------|--------|
| Auth | OAuth + PKCE; `manage_integrations` / `upload_artwork` gates |
| Tokens | AES-GCM at rest (same policy) |
| Residual | Export download still uses raw `fetch` of Canva-issued URLs — lower risk if URL is provider-controlled; optional follow-up to route through `safeFetch` |
| Product | Optional creative path; docs still secondary to Social/Flyer |

**Classification: Development Complete** (optional; not a launch dependency)

### Stripe

| Aspect | Status |
|--------|--------|
| Auth | Platform secret + signed webhooks (`constructEvent`) |
| Integrity | Reserve grant idempotency + atomic credit RPCs |
| Scoping | Org via Checkout metadata / customer mapping |

**Classification: Production Ready** — **core launch dependency**

### Resend

| Aspect | Status |
|--------|--------|
| Auth | Platform API key (env) |
| Scoping | App-layer org/membership before send |
| Recent | Attachment fetches hardened via `safeFetch` where applicable |

**Classification: Production Ready** — **core launch dependency** (invites, notices, kits)

### OpenAI

| Aspect | Status |
|--------|--------|
| Auth | Platform API key (env) |
| Metering | Membership/event-scoped credit assert; atomic `ai_credit_burn`; org/user rate limits |
| Abuse | Prompt injection residual accepted with metering |

**Classification: Production Ready** — **core launch dependency**

### Monday.com (informational)

Not in the required evaluation list. Same OAuth encryption / `manage_integrations` pattern as Canva. Treat as optional; not a core launch dependency.

---

## 7. Recommended improvements

### Core platform (internal engineering)

| Priority | Item |
|----------|------|
| P1 | Extend school-media to flyer / campaign-files photo uploads |
| P1 | Upgrade Next/sharp when Next 16 is validated |
| P1 | Schedule external pen test + retest ZAP |
| P2 | Nonce-based CSP |
| P2 | Zod across remaining mutating APIs / high-risk actions |
| P2 | Audit trail for team / billing / integration / Owner credit events |
| P3 | Migrate historical public inspiration objects → school-media |

### Integrations (not core launch blockers)

| Priority | Item | Owner type |
|----------|------|------------|
| — | Complete Meta product final review | Internal product/eng |
| — | Complete Google Calendar product final review | Internal product/eng |
| — | Meta App Review / use-case approval | **External** (Meta) |
| — | Remove or strictly gate `META_PAGE_ACCESS_TOKEN` env fallback in multi-tenant prod | Internal eng |
| — | Optional: Canva export fetch via `safeFetch` | Internal eng |

---

## 8. Work completed

### Review pass
- SSRF hardening (`safe-outbound-url` / `safe-fetch`)
- Stripe Reserve idempotency
- Cron auth helper; rate-limit fail-closed; role simulator Preview lock
- Flyer CSRF Origin checks

### Launch execution pass
- Atomic AI credit RPCs (DB live on prod + staging)
- Private `school-media` + CB2 inspiration signed URLs
- OAuth encryption required on Preview/Production
- Boot-time production secret checks
- CSP: drop `unsafe-eval` in production
- Zod on flyer save / approval APIs
- CSRF: reject cross-site `Sec-Fetch-Site`
- Security unit tests + `audit:ci`
- Docs updates (storage-rls, env-and-secrets, this report)

### This clarification pass
- Separated core platform / integration / third-party approval readiness
- Verified integration security without redesigning Meta/Google for certification

---

## 9. Remaining concerns

### Internal (engineering / ops)

- Deploy this branch to Vercel Production before treating approval as live.
- Confirm Production secrets (`OAUTH_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, Stripe, HMAC, service role).
- Historical public media + CSP inline scripts (accepted for PTA launch).
- Transitive npm highs (deferred breaking upgrades).
- Meta/Google product finalization (tracked; **not** launch-blocking).

### External (vendor / third-party)

- Meta App Review and any Google partner/review requirements — calendars owned by those vendors.
- Formal third-party penetration test vendor engagement.

---

## 10. Launch readiness assessment

### 10.1 Core platform

| Cohort | Verdict |
|--------|---------|
| Private founding schools | **Ready** |
| Open self-serve PTA/PTO signup | **Ready after deploy + secret verification** |
| Enterprise / school-district RFP | **Not ready** (media migration, nonce CSP, pen test) |

Core platform launch **does not** require Meta or Google to be feature-complete or externally approved.

### 10.2 External integrations

| Integration | Blocks core launch? | Status |
|-------------|---------------------|--------|
| Stripe / Resend / OpenAI | Yes (must work) | Production Ready |
| Meta | No | Operationally Ready but Pending Final Review |
| Google Calendar | No | Operationally Ready but Pending Final Review |
| Canva | No | Development Complete |

### 10.3 Third-party approval

| Item | Blocks core launch? | Status |
|------|---------------------|--------|
| Meta App Review | No | External calendar — track in ops docs |
| Google final product/partner review | No | External / internal product calendar |
| External pen test | No for PTA soft-open; Yes for enterprise claims | Recommended ≤30 days post open enrollment |

### Objective criteria before “go live” on Production traffic (core only)

- [x] This branch (or equivalent) deployed to Vercel Production — Production `94853e2` includes hardening `b0438ea` ([verification report](./production-readiness-verification-2026-08.md))
- [x] Vercel Production env **present** for `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `OAUTH_TOKEN_ENCRYPTION_KEY`, HMAC secrets, `SUPABASE_SERVICE_ROLE_KEY` — Sensitive **format** not CLI-readable; OAuth encryption proven via `encv1:` ciphertext; Stripe webhook secret proven via `Invalid signature` path
- [x] `ALLOW_ROLE_SIMULATOR` unset/false in Production
- [x] Smoke: inspiration / school-media signed URL on Production — upload → `/object/sign/` → public deny → delete ([verification report](./production-readiness-verification-2026-08.md))
- [x] Smoke: authenticated Production flows + AI credit decrease observed (human Production smoke; see verification report)
- [ ] Smoke (remaining): calendar subscribe rejects `http://127.0.0.1/` on authenticated Production path — Stripe unsigned/invalid webhook **verified** rejected
- [ ] Ops acknowledges residual public historical media + CSP inline + npm backlog
- [ ] Ops acknowledges Meta/Google remain **Pending Final Review** and are not marketed as final

### Criteria already satisfied in code/DB (core)

- [x] Atomic credit RPCs on production DB
- [x] Stripe Reserve unique index on production DB
- [x] Private school-media bucket on production DB
- [x] SSRF / CSRF / cron / rate-limit / OAuth encrypt fail-closed in codebase
- [x] Automated security unit tests passing (`npm run test:security`)

---

## 11. Prioritized remediation roadmap (forward)

| Priority | Item | Type | Status |
|----------|------|------|--------|
| P0 | Deploy launch hardening branch | Internal ops | **Done** (Production `94853e2`) |
| P0 | Verify Production secrets | Internal ops | **Done (presence + runtime)** — format of Sensitive values still CLI-redacted; see verification report |
| P0 | Authenticated Production smoke (browser / AI burn / school-media) | Internal ops | **Done** (human Production smoke + storage API) |
| P0 | Calendar SSRF Production-path smoke | Internal ops | Remaining — see verification report §5.1 |
| P0 | Atomic credits + school-media + Stripe migrations | Internal | Done (prod + staging) |
| P1 | Extend private media lane; Next/sharp upgrade; pen test | Internal | Backlog |
| P2 | Nonce CSP; broader Zod; audit logging | Internal | Backlog |
| — | Meta / Google final product review | Internal product | Pending (non-blocking) |
| — | Meta App Review | **External** | Pending (non-blocking) |

---

## 12. Testing notes

```bash
npm run test:security
npx tsc --noEmit -p tsconfig.json
npm run audit:ci   # expect remaining highs until Next 16 / sharp bump
```

DB verification (prod): `ai_credit_ensure_period`, `ai_credit_burn`, `ai_credit_apply_reserve_delta` present; `storage.buckets.school-media.public = false`.

---

## 13. Sign-off statement

**Core platform:** Security controls are sufficient for unrestricted production launch to school PTO/PTA customers, provided the §10.1 deploy/secret checklist is completed.

**External integrations:** Stripe, Resend, and OpenAI are Production Ready as core dependencies. **Meta and Google Calendar are Operationally Ready but Pending Final Review** — they must not be treated as feature-complete, and their finalization must not gate core platform launch.

**Third-party approvals:** Meta App Review (and any Google partner processes) are external calendars. They do not determine core platform certification.

I would not yet certify the platform for enterprise district procurement without the core P1 backlog (media migration, nonce CSP, external pen test).
