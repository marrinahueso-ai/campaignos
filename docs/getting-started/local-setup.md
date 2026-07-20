# Local setup

**Status:** Living  
**Last updated:** July 20, 2026  
**Related:** [Getting started](./README.md) · [`.env.local.example`](../../.env.local.example) · [Env & secrets](../ops/env-and-secrets.md) · [Database](../engineering/database.md) · [Documentation home](../README.md)

## Prerequisites

- Node.js 20+ (matches Vercel / Next.js 15)
- npm
- A Supabase project (shared staging or your own)
- Optional for full features: OpenAI, Meta, Google Calendar, Resend keys (see [env catalog](../../.env.local.example))

## 1. Install

```bash
git clone <repo-url>
cd CampignOS   # or your local folder name
npm install
```

## 2. Environment

```bash
cp .env.local.example .env.local
```

**Minimum to sign in and load the app**

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |

**Strongly recommended locally**

| Variable | Why |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Team invites, founding welcome email, some admin paths |
| `CAMPAIGNOS_REQUIRE_ACCESS_CODE=false` | Skip founding-code gate while developing |
| `OPENAI_API_KEY` | Create with AI, captions, calendar AI fix |

Leave `NEXT_PUBLIC_SITE_URL` **unset** for local OAuth so callbacks default to `http://localhost:3000`. If it points at Production, Google/Monday/Canva redirects will leave localhost.

Full catalog: [ops/env-and-secrets.md](../ops/env-and-secrets.md) and [`.env.local.example`](../../.env.local.example).

## 3. Supabase Auth redirects

In Supabase → Authentication → URL configuration, add:

- `http://localhost:3000/auth/callback`

For OAuth providers you test locally, also register localhost callback URLs in the provider consoles (see [Meta](../integrations/meta.md), [Google Calendar](../integrations/google-calendar.md)).

| Provider | Local redirect (typical) |
|----------|---------------------------|
| Google Calendar | `http://localhost:3000/api/google/oauth/callback` |
| Meta | `http://localhost:3000/api/meta/oauth/callback` |
| Monday | `http://localhost:3000/api/monday/oauth/callback` |
| Canva | `http://localhost:3000/api/canva/oauth/callback` |

## 4. Database migrations

Schema lives in `supabase/migrations/` (**not** a single `001_*.sql`). Apply the **full** ordered set to your project.

Options:

1. **Supabase CLI** (preferred if linked): `supabase db push` / `supabase migration up` against the linked project  
2. **SQL Editor**: run files in filename order (including timestamped access-template migrations after `069`)

Details: [engineering/database.md](../engineering/database.md).

## 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the Next cache is corrupt:

```bash
npm run dev:clean
```

## 6. Optional checks

| Command | Purpose |
|---------|---------|
| `npm run build` | Catch type / build errors before PR |
| `npm run test:hey-ralli` | Playwright smokes (needs `HEY_RALLI_TEST_*` — staging only) |
| `npm run verify` | Repo verify script |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Connection refused on `:3000` | Start `npm run dev` |
| 500 / missing module under `.next` | `npm run dev:clean` |
| Auth redirect errors | Add `http://localhost:3000/auth/callback` in Supabase Auth URLs |
| Google / Monday OAuth jumps to Vercel | Unset `NEXT_PUBLIC_SITE_URL` locally; register localhost redirect in provider console |
| AI features say not configured | Set `OPENAI_API_KEY` |
| Founding signup blocked | Set `CAMPAIGNOS_REQUIRE_ACCESS_CODE=false` or use a valid founding code |
| Sentry slow in `next dev` | Leave `SENTRY_ENABLED` unset (off by default in local dev) |

## Where next

- [Architecture](../engineering/architecture.md)  
- [Feature list](../product/feature-list.md)  
- [QA testing guide](../qa/testing-guide.md)
