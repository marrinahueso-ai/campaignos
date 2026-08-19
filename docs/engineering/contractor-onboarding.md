# Contractor onboarding

**Status:** Living  
**Owner:** Engineering / Founder  
**Last updated:** August 19, 2026  
**Related:** [Local setup](../getting-started/local-setup.md) · [Environments](../getting-started/environments.md) · [Env & secrets](../ops/env-and-secrets.md) · [Architecture](./architecture.md) · [Commercial-readiness handoff](../ops/commercial-readiness-engineer-handoff.md) · [`.env.contractor.example`](../../.env.contractor.example) · [Documentation home](../README.md)

Safe workflow for a temporary full-stack contractor: clone Hey Ralli, run it locally against **staging**, open pull requests, use Vercel Preview, and never touch production credentials.

Founder checklists are at the bottom. Send [Contractor first-day checklist](#contractor-first-day-checklist) after hiring.

---

## Hard rules

1. **Never use production credentials.** Production Supabase is `zyllfqieeihshnwpakiv` (heyralli.com). Staging is `heyralli-staging` / `hdoujyngcqrsgtvqehyt`.
2. **Never copy someone else’s `.env.local`.** Create yours from [`.env.contractor.example`](../../.env.contractor.example).
3. **Never push directly to `main`.** Branch → pull request → Preview → founder approval → merge.
4. **Never apply database migrations to production.** Test on staging first. The founder applies production SQL after merge.
5. **Never trigger production cron jobs** (`CRON_SECRET`, `/api/cron/*` on heyralli.com).
6. **Never set** `NEWSLETTER_PRODUCTION_SEND_ENABLED=true` or `ALLOW_PLAINTEXT_OAUTH_TOKENS=true` locally.
7. Leave `NEXT_PUBLIC_SITE_URL` **unset** on your laptop.

---

## Local setup

### Prerequisites

- **Node.js 20 LTS** (see `.nvmrc`). Do not use whatever happens to be on the founder’s laptop.
- npm (comes with Node). This repo uses `package-lock.json`, not pnpm or yarn.
- Staging values from the founder’s 1Password item (not production).

### Steps

```bash
git clone https://github.com/marrinahueso-ai/campaignos.git
cd campaignos   # folder may also be named CampignOS
nvm use         # or otherwise install Node 20
npm install
cp .env.contractor.example .env.local
# paste STAGING keys from 1Password into .env.local — never production
npm run dev     # http://localhost:3000
```

Required in `.env.local` to boot and sign in:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL (`hdoujyngcqrsgtvqehyt.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging Project Settings → API → anon / publishable |
| `CAMPAIGNOS_REQUIRE_ACCESS_CODE=false` | Already set in the contractor template |

After the app boots, the founder may add **staging** `SUPABASE_SERVICE_ROLE_KEY` (bypasses row security — staging only) and a spend-capped OpenAI project key.

If magic-link / email sign-in fails, the staging Supabase project must allow:

- `http://localhost:3000/auth/callback`

### Checks before a pull request

```bash
npm run build
npm run lint
npm run test:security
```

Optional (needs staging Playwright logins — never production passwords):

```bash
npx playwright install   # once per machine
npm run test:hey-ralli
```

Do not run k6 load tests or production-pointed Playwright as part of normal PR work.

If the dev cache is corrupt: `npm run dev:clean`. Only one `npm run dev` at a time (the script frees ports 3000 and 3001).

---

## Git / pull request workflow

```text
branch (feat/… or fix/…)
  → push
  → GitHub pull request into main
  → GitHub Actions “PR checks” + Vercel Preview
  → founder reviews Preview and approves
  → merge to main
  → Vercel Production (heyralli.com)
```

- Default branch is **`main`**. It deploys to production. Treat it as live.
- You do not merge your own PR unless the founder explicitly asks.
- You do not run `vercel deploy --prod`.
- Schema changes: add SQL under `supabase/migrations/`, apply and verify on **staging**, note in the PR that production SQL must be applied by the founder **before or with** the production deploy.

---

## Where to read next

Read in this order:

1. This page  
2. [Commercial-readiness engineer handoff](../ops/commercial-readiness-engineer-handoff.md) — what not to redo  
3. [Architecture](./architecture.md)  
4. [Feature list](../product/feature-list.md)  
5. [Access & onboarding](../security/access-and-onboarding.md) and [access control](./access-control.md)  
6. [Database](./database.md) · [Env & secrets](../ops/env-and-secrets.md) · [Cron jobs](../ops/cron-jobs.md)

Ignore `docs/archive/`.

---

## Access matrix

### Day one

| Access | Level | Why |
|--------|--------|-----|
| GitHub `campaignos` | **Write** collaborator (not Admin) | Branches and pull requests |
| Vercel team `campignos` | **Member** (not Owner / Billing) | Open Preview URLs and Preview logs |
| Staging env file | 1Password item from `.env.contractor.example` | Local app against staging Supabase |
| Hey Ralli staging login | In-app **Developer** seat on a throwaway staging school | Must sign NDA/IP in-app; not Owner /ops |

### Only if a specific task needs it

| Access | Notes |
|--------|--------|
| OpenAI | Separate **project** API key with a monthly spend cap — not the org admin key |
| Stripe | **Test mode** (`sk_test_` / `pk_test_`) only |
| Sentry | Team member, read issues — not org Owner |
| Meta | Tester on a test app + localhost redirect — not Business Admin |
| Google Calendar | Staging/test OAuth client + localhost redirect — not production client secret |
| Resend | Optional sending key, or founder sends the test email |

### Never

- Production Supabase service-role or database credentials (`zyllfqieeihshnwpakiv`)
- Live Stripe secret (`sk_live_`)
- `CRON_SECRET`
- `OPENAI_ADMIN_KEY`
- Production `OAUTH_TOKEN_ENCRYPTION_KEY`
- Founding / beta access codes
- Production test passwords (`HEY_RALLI_PROD_TEST_*`)
- GitHub **Admin**
- Vercel **Owner** or **Billing**
- Meta Business ownership
- Domain / DNS logins
- Founder’s personal passwords
- `HEY_RALLI_OWNER_EMAILS` (opens `/ops`)

---

## Marrina's contractor setup checklist

Do these **in order** before sending the contractor anything. None of these steps should copy your laptop’s `.env.local`.

### 1. GitHub (required before invite)

- [ ] Decide whether the repo should stay **public**. Right now `marrinahueso-ai/campaignos` is public. For a pre-launch product, **private is safer**. Settings → General → Danger zone → Change repository visibility → Private.
- [ ] Protect `main` (see [Founder action — GitHub](#founder-action-required--github) below). Require a pull request. Do not allow force pushes. Do not give the contractor a bypass.
- [ ] After the `PR checks` workflow exists on `main`, require that check to pass before merge.
- [ ] Invite the contractor as a collaborator with **Write**, not Admin.

### 2. Staging Supabase (required)

- [ ] Open [heyralli-staging](https://supabase.com/dashboard/project/hdoujyngcqrsgtvqehyt) — confirm the name is **heyralli-staging**, not the production project.
- [ ] Authentication → URL Configuration → add `http://localhost:3000/auth/callback` (and `http://localhost:3000/**` if Site URL redirects need a wildcard). Do **not** change production unless you are sure.
- [ ] Confirm the latest repo migration (`20260814190000_legal_acceptances.sql` or newer on `main`) is applied on staging. Database → Migrations (or SQL history). If staging is behind, apply **staging only**.
- [ ] Create a throwaway staging school (or pick an existing non-production org). Invite the contractor as role **Developer** from Team & Access. Do **not** add them to `HEY_RALLI_OWNER_EMAILS`.
- [ ] Copy **staging** Project URL + anon key into a **new** 1Password item (not your personal `.env.local`). Optionally add staging `service_role` **after** they boot the app.

### 3. Vercel (required)

- [ ] Confirm Preview `NEXT_PUBLIC_SUPABASE_URL` is `https://hdoujyngcqrsgtvqehyt.supabase.co` and **not** `zyllfqieeihshnwpakiv`. Settings → Environment Variables → Preview. If it is production, **stop** and split the variables before inviting anyone.
- [ ] If Preview `STRIPE_SECRET_KEY` is shared with Production or starts with `sk_live_`, remove Preview from that live key and add a **test-mode** key for Preview only.
- [ ] Keep Deployment Protection (Vercel login on Preview URLs) **on**.
- [ ] Invite the contractor to team `campignos` as **Member**. Do not make them Owner. Do not give Billing. They should **not** be able to edit Production env vars.

### 4. 1Password packet (required)

- [ ] New shared vault or item: “Hey Ralli contractor staging”.
- [ ] Include: GitHub repo URL, Node 20, this doc URL, staging Supabase URL + anon key, `CAMPAIGNOS_REQUIRE_ACCESS_CODE=false`, staging Developer login, Vercel team invite.
- [ ] Do **not** include: your `.env.local`, production service_role, live Stripe, `CRON_SECRET`, OpenAI admin key, founding codes, production test passwords.

### 5. Send

- [ ] Send the 1Password item + [Contractor first-day checklist](#contractor-first-day-checklist).
- [ ] Counter-sign their in-app NDA/IP when the email arrives.

---

## Contractor first-day checklist

Send this block to the developer after hiring.

```text
Hey Ralli — first day

1. Install Node 20 LTS (nvm use in the repo, or equivalent).
2. git clone https://github.com/marrinahueso-ai/campaignos.git
3. npm install
4. cp .env.contractor.example .env.local
5. Fill STAGING keys from the 1Password item. If the Supabase hostname is
   zyllfqieeihshnwpakiv, stop — that is production.
6. npm run dev → http://localhost:3000
7. Sign in with the staging Developer account. Sign the in-app NDA/IP.
8. Read docs/engineering/contractor-onboarding.md then
   docs/ops/commercial-readiness-engineer-handoff.md
9. Make a tiny branch, open a pull request, confirm GitHub Actions and
   Vercel Preview run. Do not merge it yourself.

Never: push to main, production keys, production migrations, production
cron, vercel deploy --prod, or NEWSLETTER_PRODUCTION_SEND_ENABLED=true.
```

---

## Founder action required — GitHub

You do this in the browser. Do not share your GitHub password.

### A. Protect `main`

1. Open [github.com/marrinahueso-ai/campaignos](https://github.com/marrinahueso-ai/campaignos).
2. Click **Settings** (repo settings, not your profile).
3. Left sidebar → **Branches** (under Code and automation).
4. **Add branch protection rule** (or **Add classic branch protection rule**).
5. Branch name pattern: `main`
6. Enable:
   - **Require a pull request before merging**
   - Required approvals: **1**
   - **Dismiss stale pull request approvals when new commits are pushed**
7. After the `PR checks` workflow has run once on `main`, also enable **Require status checks to pass before merging**, search for **PR checks** / **Lint, security tests, build**, and require it.
8. Enable **Do not allow bypassing the above settings** (so the contractor cannot skip the rules). You will merge via the GitHub **Merge** button on the PR, which still works.
9. Leave **unchecked**: Allow force pushes, Allow deletions, Allow specified actors to bypass.
10. Save.

If GitHub shows **Rulesets** instead: New ruleset → Target `main` → Restrict updates → Require a pull request (1 approval) → Block force pushes → Do not allow bypass for the contractor.

### B. Invite with Write, not Admin

1. Settings → **Collaborators** (or Collaborators and teams).
2. **Add people** → their GitHub username.
3. Choose role **Write**.
4. Do **not** choose Admin or Maintain.
5. Send the invite.

### C. Do not enable

- Admin for the contractor  
- Force-push on `main`  
- Bypass list that includes the contractor  
- GitHub Actions write access they did not ask for  
- Deploy keys or personal access tokens from your account  

---

## Founder action required — Supabase

Work only in **heyralli-staging** (`hdoujyngcqrsgtvqehyt`). The production project is `zyllfqieeihshnwpakiv`. Check the project name in the dashboard header every time.

### Localhost login

1. [Staging project](https://supabase.com/dashboard/project/hdoujyngcqrsgtvqehyt) → **Authentication** → **URL Configuration**.
2. Site URL can stay the staging/Preview URL.
3. Additional Redirect URLs: add `http://localhost:3000/auth/callback`.
4. Save. Do not paste production keys.

### Schema

1. Same staging project → **Database** → **Migrations** (or the SQL editor history).
2. Confirm the newest file on GitHub `main` under `supabase/migrations/` is applied.
3. If staging is behind, apply missing files **on staging only**, in filename order. Do not run this on production.

### Contractor Developer seat

1. Sign in to a **Preview or staging** copy of the app (not as a way to hand them production).
2. Settings → Team & Access → Invite → role **Developer**.
3. Use their real email. They will hit `/account/agreements` and must sign.
4. Do not add that email to Vercel `HEY_RALLI_OWNER_EMAILS`.

Copy staging **Project URL** and **anon key** from Settings → API into 1Password. Copy **service_role** only after they can boot the app — still staging.

---

## Founder action required — Vercel

Project: team **campignos**, project **campaignos**. Do not change Production values except to **uncheck Preview** from a live secret if it was accidentally shared.

### Confirm Preview is staging (critical)

1. [Vercel](https://vercel.com) → team **campignos** → project **campaignos**.
2. **Settings** → **Environment Variables**.
3. Find `NEXT_PUBLIC_SUPABASE_URL`.
4. Open the **Preview** value (eye icon). Look **only** at the hostname.
   - Safe: `hdoujyngcqrsgtvqehyt.supabase.co`
   - **Stop — production data:** `zyllfqieeihshnwpakiv.supabase.co`
5. Repeat for `SUPABASE_SERVICE_ROLE_KEY`: Preview must not be the production key. If you are unsure, do not give the contractor Vercel env **edit** rights; ask an engineer to split the values later without putting production on their laptop.

### Stripe on Preview

1. Same Environment Variables list.
2. `STRIPE_SECRET_KEY` currently appears as one variable for **Preview and Production**. That often means **the same key**.
3. Click it. If the value starts with `sk_live_`, uncheck **Preview** on that row, save, then **Add New** with a **test** key (`sk_test_`) scoped to **Preview only**.
4. Do not paste the live key into chat or 1Password for the contractor.

### Invite as Member

1. Vercel → team **campignos** → **Settings** → **Members**.
2. Invite their email as **Member**.
3. Do not make them Owner. Do not give Billing.
4. Keep **Deployment Protection** on so Preview URLs require a Vercel login (this is why Previews currently show “Login – Vercel”).

They do **not** need permission to edit Production environment variables or to create production deployments.

---

## What this repo already wired for you

- [`.env.contractor.example`](../../.env.contractor.example) — staging-first template  
- [`.github/workflows/pr-checks.yml`](../../.github/workflows/pr-checks.yml) — lint, `npm run test:security`, `npm run build` on every PR and on push to `main` (dummy public env only; no production secrets). `tsx` is a lockfile devDependency so CI can run the security tests without a laptop `npx` cache.  
- `.nvmrc` → Node 20  
- `package.json` `engines.node` ≥ 20  
