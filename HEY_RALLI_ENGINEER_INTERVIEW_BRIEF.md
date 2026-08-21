# Hey Ralli — Engineer Interview Technical Brief

**Audience:** Senior full-stack candidates (pre-interview)  
**Scope:** Product + architecture context only — not onboarding, not runbooks  
**Product:** [heyralli.com](https://heyralli.com)

---

# PAGE 1 — Product & Technical Architecture

### Hey Ralli Overview

Hey Ralli is a calendar-first communications platform for school PTO/PTA volunteer teams. Schools import or sync school-year dates, plan events, generate creative with AI (social posts, flyers, homepage toolkits, newsletters), run human approval, then publish or schedule to Facebook and Instagram.

Primary users are school volunteer leaders and committee members working inside an organization workspace—not district IT admins and not students. Surrounding product surfaces include a Today dashboard, volunteers/sign-up coordination, tasks, Meta inbox/insights, files, vendors, team access, and plan/billing with metered AI usage.

**Product rule:** AI drafts; humans approve. The UI is not the authorization boundary—content that requires approval must not publish or schedule until approval is complete.

### Technology Stack

Verified from the repository (`package.json`, app structure, and living engineering docs):

| Category | Stack |
|----------|--------|
| Frontend | React, Tailwind CSS, shared UI components |
| Application framework | Next.js App Router (server components, server actions, API routes) |
| Language | TypeScript |
| Database / Auth / Storage | Supabase (Auth, PostgreSQL with RLS, Storage) |
| Hosting / deploy | Vercel (Production + Preview; scheduled cron) |
| AI | OpenAI (chat + image generation) with org-scoped credit metering |
| Payments | Stripe (Checkout, Customer Portal, signed webhooks) |
| Email | Resend (transactional + newsletter delivery paths) |
| Social | Meta Graph API (publish, schedule, inbox, insights) |
| Calendar | Google Calendar OAuth + ICS / subscribe import |
| Monitoring | Sentry |
| Testing | Node test runner (domain unit suites), Playwright smoke, k6 load fixtures |

Optional / secondary integrations exist in code (e.g. Canva, Monday.com, SignUpGenius). Treat customer-facing availability as product-gated; do not assume every integration is launch-promoted.

### High-Level Architecture

```
User (browser)
  → Hey Ralli web app (Next.js)
       → Server layer (pages / server actions / API routes)
            → Supabase Auth + PostgreSQL (+ RLS) + Storage
            → External services (branching):
                 Stripe · OpenAI · Meta · Google Calendar · Resend · (optional OAuth partners)
```

**Conventions observed in code:** pages stay thin; domain reads go through `queries`; writes go through `actions` → `mutations`. Background work is primarily Vercel Cron hitting authorized `/api/cron/*` handlers (often with a privileged DB client). OAuth providers use start/callback API routes that persist org-scoped connection state.

### Multi-Tenant Architecture

| Concept | Verified behavior |
|---------|-------------------|
| Tenant | An **organization**. Almost all product data is organization-scoped. |
| Membership | `organization_users` with statuses such as invited → active / deactivated. Only **active** membership grants workspace access. |
| Active workspace | An active-org preference is applied only when it matches an active membership (preference alone is not trusted). Multi-org users can switch workspaces. |
| School year | Context **inside** an org (events hang off school years)—not a separate tenant. |
| Fine-grained authz | **Access templates** / role presets resolve to `EffectiveAccess`; app code gates via permission helpers (`hasPermission` / `requirePermission`) and event access helpers (`canAccessEvent` / `requireEventAccess`). |
| RLS | Membership-scoped Postgres RLS (helpers such as active-org membership / event access). Template permission keys are **app-layer**, not RLS keys. |
| Storage | Bucket paths are org/event-scoped with storage RLS patterns documented for membership isolation. |
| Service role | Privileged client bypasses RLS; required for some cron/jobs. App code must still scope by organization/event identifiers. |

Authentication is Supabase Auth (password, magic link, Google OAuth observed; founding-code gated new-org bootstrap in production posture). Server middleware refreshes session state. Billing gates (including canceled-subscription lockout) also participate in access routing.

### Major Product Areas

High-level areas present in the application:

- **Events & calendar** — school-year calendar, import/review (Google / ICS), planning surfaces  
- **Create with AI** — Social campaign builder, flyer builder, homepage composer, newsletter composer  
- **Approvals & scheduling** — human approval before publish/schedule  
- **Social / Meta** — publish now, scheduled publish, inbox, insights  
- **Communications Hub** — Meta messaging/comments surfaces  
- **Volunteers** — event volunteer coordination (incl. SignUpGenius sync paths)  
- **Tasks** — org/event task boards  
- **Files / resources** — org-scoped file library  
- **Team & Access** — invites, roles/templates, see-vs-work assigned-event modes  
- **Billing & AI credits** — plans, AI Reserve, credit burn/grant  
- **Ask Ralli / Help** — in-product assistant and help surfaces  
- **Settings** — organization, branding, integrations, billing, account  
- **Background processing** — cron for calendar sync, Meta publish/token/inbox, volunteers, newsletters, reminders  

---

# PAGE 2 — Engineering Context

### Current Engineering Stage

Hey Ralli is an **existing application approaching / in commercial launch**. The engineer is **not** being hired to redesign or rebuild the product.

The engagement is to **review the existing implementation**, identify launch and production risks, fix bugs, improve reliability where necessary, and make **targeted, production-safe improvements**. Prior security hardening, RLS/tenancy work, Stripe/credit integrity, and load characterization already exist—spot-check current code and new surfaces rather than restarting closed programs from scratch.

### Areas Requiring Careful Review

**Verified architecture / behavior (do not invent problems here):**

- Organization-scoped tenancy with membership checks and membership-scoped RLS  
- App-layer permission templates separate from RLS  
- Event access gating patterns on many mutations (`requireEventAccess` / `getEventById` style contracts)  
- Stripe webhook signature verification and org subscription sync patterns  
- AI credit metering via atomic database RPCs  
- Cron authorization shared pattern; newsletter scheduled-send claim/idempotency patterns  
- Security unit suites and Playwright access smokes exist in-repo  

**Areas an incoming senior engineer should independently review (judgment + spot-checks):**

- **Multi-tenant / IDOR** on *new* routes, actions, and client-state keys (especially event-scoped UIs and service-role paths)  
- **RLS vs app gates** — confirm both layers still hold for surfaces you touch; RLS is membership isolation, not fine-grained RBAC  
- **Service-role / cron correctness** — privileged jobs that accidentally use a session client can look “healthy” while doing nothing; dual Meta publish/schedule paths need consistent approval and capacity rules  
- **External integrations** — Meta Graph reliability (timeouts, retries, duplicate-publish risk), Google/ICS calendar sync, token health  
- **Stripe / billing defense-in-depth** — webhook/sync correctness; canceled-subscription enforcement beyond page/middleware gates  
- **AI request handling** — cost, rate limits, credit integrity, prompt/image pipeline safety  
- **Background jobs** — global cron fan-out (not a per-org queue today), backlog/caps, idempotency, failure visibility  
- **Webhooks & email** — signed Stripe webhooks; transactional email idempotency ledgers  
- **Observability** — Sentry coverage and ops usefulness under real failures  
- **Performance** — query fan-out on dashboard hubs; cron/Meta backlog at higher school counts (prior k6 work characterized read scale; write/AI/Meta load was not fully characterized)  
- **Regression safety** — prefer existing unit/Playwright suites; do not treat UI-only checks as authz proof  

### Engineering Expectations

> Understand the existing implementation before changing it. Prefer targeted fixes over rewrites. Preserve established patterns unless there is a clear technical reason to change them. Explain significant technical decisions and identify risk before making architectural changes.

Changes that affect **authentication, authorization, tenant isolation, RLS, billing, external integrations, or production data** require additional scrutiny (design note + tests + careful rollout). Prefer fail-closed behavior for secrets, rate limits, and privileged operations.

### Interview Discussion

1. After reviewing this architecture, where would you begin a pre-launch engineering review and why?  
2. What areas would you consider highest risk in a multi-tenant application like this?  
3. How would you validate that tenant isolation is working correctly across both application logic and RLS?  
4. How would you approach reviewing external integrations and background jobs without destabilizing production?  
5. What would make you recommend an architectural change rather than a targeted fix?

---

## OWNER REVIEW — DO NOT SEND YET

*Internal only — remove this section before sending to candidates.*

### Uncertain / confirm before sending

- **Engagement framing:** Brief describes a launch-risk / reliability / targeted-fix engagement (aligned with commercial-readiness handoff). Confirm hours, contractor vs hire, and whether Meta App Review support is in scope.  
- **“Approaching launch” vs live production:** Production is live at heyralli.com with prior “approved for production” core-platform posture; Meta/Google remain “operationally ready but pending final review.” Soften or sharpen launch wording to match how you pitch candidates.  
- **Open findings currency:** Commercial handoff dated mid-August lists specific open items (e.g. dual Meta schedule caption checks, cron approval-creation no-op, canceled-subscription defense-in-depth). This brief intentionally **generalizes** those themes so candidates are not given a free exploit map or a stale punch list. Confirm you want that level of abstraction.  
- **Optional integrations:** Canva/Monday are in stack docs; customer Canva UI has been unshipped for launch in feature-list notes—confirm wording if candidates ask “is Canva live?”  
- **Version pinning:** Brief avoids minor versions; Next 15 / React 19 verified from `package.json` / architecture docs. Confirm you do not want versions named at all.

### Could not fully re-verify in this pass (docs + selective code inspection)

- Exact Production deploy SHA / which mid-August “uncommitted” security fixes are now on `main`  
- Live Supabase policy set vs every migration file (migrations `064`+ and follow-ons exist; remote policy drift not re-probed)  
- Whether every new server action since August audits is gated (spot-check pattern exists; exhaustive audit not performed here)  

### Intentionally excluded (security-sensitive)

- Environment variable names/values, secrets, connection strings  
- Supabase project refs, Stripe price/customer IDs, Meta App IDs, webhook secrets  
- Vercel project identifiers, private Preview URLs, internal owner email allowlists  
- Customer/org names, test account credentials, founding access codes  
- Detailed cron auth header mechanics and exploit-ready descriptions of residual bugs  
- Exact RLS SQL / policy text and storage bucket policy SQL  
- Endpoint-level attack surface inventory beyond high-level architecture  

### Doc placement note

Saved at repo root as `HEY_RALLI_ENGINEER_INTERVIEW_BRIEF.md` per request. Consider moving under `docs/` later if you want it indexed—**do not** commit until you remove **OWNER REVIEW**.
