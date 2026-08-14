# Environment variables and secrets

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 20, 2026  
**Related:** [Ops](./README.md) · [`.env.local.example`](../../.env.local.example) · [Local setup](../getting-started/local-setup.md) · [Cron jobs](./cron-jobs.md) · [Documentation home](../README.md)

## Rules

1. **Never commit** `.env.local`, service-role keys, OAuth secrets, or `CRON_SECRET`.
2. **Source catalog** for names and comments: [`.env.local.example`](../../.env.local.example) (keep it in sync when you add vars).
3. **Production / Preview** secrets live in the Vercel project (`campaignos` / team `campignos`). Prefer Vercel → Settings → Environment Variables over pasting into chat or tickets.
4. **Public vs server:** only `NEXT_PUBLIC_*` is exposed to the browser. Everything else is server-only.

## Environments

| Env | Where values live | Notes |
|-----|-------------------|--------|
| **Local** | `.env.local` | Leave `NEXT_PUBLIC_SITE_URL` unset for OAuth on localhost |
| **Preview** | Vercel Preview env | Branch / PR deployments |
| **Production** | Vercel Production env | [heyralli.com](https://heyralli.com); `NEXT_PUBLIC_SITE_URL` must be the public site |

Git Production branch: **`main`**. Deploy from `main` (or promote a deployment of `main`).

## Required by surface

### Core (app boots + auth)

| Variable | Local | Preview | Production |
|----------|:-----:|:-------:|:----------:|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended | ✓ | ✓ |
| `NEXT_PUBLIC_SITE_URL` | omit | Preview URL or unset | `https://heyralli.com` (or canonical) |
| `DEVELOPER_AGREEMENT_DOWNLOAD_SECRET` | recommended | ✓ | ✓ |
| `FOUNDING_ACCESS_LINK_SECRET` | recommended | ✓ | ✓ |

### AI

| Variable | Notes |
|----------|-------|
| `OPENAI_API_KEY` | Captions, Create with AI, calendar AI, Inbox drafts, Ask Ralli |
| `OPENAI_*_MODEL` / artwork vars | Optional overrides — see `.env.local.example` |

### Meta

| Variable | Notes |
|----------|-------|
| `META_APP_ID` / `META_APP_SECRET` | OAuth Connect |
| `META_REDIRECT_URI` | Must match Meta app + environment |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhooks |
| Legacy `META_PAGE_ACCESS_TOKEN` etc. | Optional fallback — prefer org OAuth connection |

### Google Calendar

| Variable | Notes |
|----------|-------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Calendar API OAuth (no Gmail scopes) |
| `GOOGLE_REDIRECT_URI` | Prod vs `http://localhost:3000/api/google/oauth/callback` |

See [integrations/google-calendar.md](../integrations/google-calendar.md). If Google Console shows `deleted_client`, create a new OAuth client and update **both** Vercel and `.env.local`.

### Email / invites

| Variable | Notes |
|----------|-------|
| `RESEND_API_KEY` | Welcome email, team invites, story / manual-upload reminders |
| `RESEND_FROM_EMAIL` | Default From |
| `RESEND_*_TEMPLATE_ID` | Optional template overrides |

### HMAC signing secrets

| Variable | Notes |
|----------|-------|
| `DEVELOPER_AGREEMENT_DOWNLOAD_SECRET` | Signs the emailed executed-agreement download link (`download-token.ts`). Dedicated secret — never falls back to a public key. Generate with `openssl rand -hex 32`. |
| `FOUNDING_ACCESS_LINK_SECRET` | Signs the pending founding-access-code magic-link param (`founding-access-link-token.ts`). Dedicated secret. Generate with `openssl rand -hex 32`. |

Both fall back to `SUPABASE_SERVICE_ROLE_KEY` with a logged warning if unset (never to `NEXT_PUBLIC_*` or a hardcoded literal), and throw if neither is configured — set the dedicated secret in every environment that issues or verifies these tokens.

### OAuth token encryption at rest

| Variable | Notes |
|----------|-------|
| `OAUTH_TOKEN_ENCRYPTION_KEY` | AES-256-GCM key (32 raw bytes, base64-encoded) that encrypts Meta/Canva/Monday/Google Calendar OAuth tokens before they're stored (`lib/security/token-encryption.ts`). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |

Optional in local development. **Required in Preview/Production** — `encryptOAuthToken` throws if the key is missing in deployed environments (refuses plaintext storage). Set `ALLOW_PLAINTEXT_OAUTH_TOKENS=true` only for an emergency local/prod recovery path (never leave on). Boot instrumentation logs missing required secrets via `checkProductionSecrets`.

### Cron

| Variable | Notes |
|----------|-------|
| `CRON_SECRET` | Bearer token for `/api/cron/*` — **required in Production and Preview** (`isCronRequestAuthorized` fails closed when `VERCEL_ENV` is production/preview and the secret is missing) |
| `SENTRY_VERIFY_SECRET` | Bearer token for `/api/sentry-verify` and `/dev/sentry-verify` — a **dedicated** secret, deliberately separate from `CRON_SECRET`. The browser verify page necessarily carries its secret in a URL query string (browser history, access logs); using its own single-purpose secret means a leaked verify-page URL can't be replayed against real `/api/cron/*` routes. Leave unset to disable both verify routes entirely (they fail closed). |

See [cron-jobs.md](./cron-jobs.md).

### Stripe (billing Phase 5)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | Server Checkout / Portal / webhooks |
| `STRIPE_WEBHOOK_SECRET` | Verify `POST /api/stripe/webhook` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional client use |
| `STRIPE_PRICE_STARTER` / `_PROFESSIONAL` / `_PREMIUM` | Monthly plan Price ids |
| `STRIPE_PRICE_RESERVE` / `_RESERVE_STAR` / `_RESERVE_MAX` | One-time AI Reserve Price ids |

Checkout UI stays disabled until plan price IDs + secret key are set — as of July 2026 these are set in Production and Checkout is live. Living: [billing-and-access.md](./billing-and-access.md) · eng: [stripe-integration.md](../engineering/stripe-integration.md).

### Optional integrations

| Area | Variables |
|------|-----------|
| Canva | `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REDIRECT_URI` |
| Monday | `MONDAY_CLIENT_ID`, `MONDAY_CLIENT_SECRET`, `MONDAY_REDIRECT_URI` |
| GIPHY (Inbox GIFs) | `GIPHY_API_KEY` — server-only; powers Communications Hub DM GIF search via `/api/giphy/*` (see [meta.md](../integrations/meta.md)) |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*`, Report-a-Problem allowlists |
| Access codes | `CAMPAIGNOS_FOUNDING_ACCESS_CODES`, `CAMPAIGNOS_REQUIRE_ACCESS_CODE` |
| Role simulator | `ALLOW_ROLE_SIMULATOR` — local/dev only by default; **Preview and Production stay closed unless set to `true` explicitly** |
| OAuth token encryption | `OAUTH_TOKEN_ENCRYPTION_KEY` — see [OAuth token encryption at rest](#oauth-token-encryption-at-rest) above |
| Playwright | `HEY_RALLI_TEST_*` — **staging accounts only** |

## Rotation checklist

When rotating a secret:

1. Generate new value in the provider (Google / Meta / Supabase / Resend / OpenAI).
2. Update **Vercel Production** (and Preview if used).
3. Update local `.env.local` for developers who need it.
4. Redeploy Production so serverless picks up env (Vercel usually requires a redeploy after env change).
5. Re-test the related Connect / cron / email path.
6. Revoke the old credential in the provider console.

**OAuth clients:** redirect URIs are part of the client config — update localhost + production URLs together when recreating a client.

## What not to do

- Do not paste Production `service_role` or `CRON_SECRET` into GitHub issues, Slack, or docs.
- Do not put secrets in `NEXT_PUBLIC_*` names.
- Do not point local `NEXT_PUBLIC_SITE_URL` at Production while testing OAuth on localhost.
