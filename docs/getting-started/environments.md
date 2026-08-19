# Environments

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 18, 2026  
**Related:** [Getting started](./README.md) · [Contractor onboarding](../engineering/contractor-onboarding.md) · [Env & secrets](../ops/env-and-secrets.md) · [Documentation home](../README.md)

How Local, Vercel Preview, and Production differ. Contractors use **staging**, never production.

| Environment | App URL | Database | Who uses it |
|-------------|---------|----------|-------------|
| **Local** | http://localhost:3000 | Staging Supabase `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) | Founder (today still on production — do not copy that laptop env) and contractors (staging only) |
| **Preview** | `campaignos-*-campignos.vercel.app` (Vercel login required) | Must be staging. Founder must confirm `NEXT_PUBLIC_SUPABASE_URL` before inviting anyone. | PR review |
| **Production** | [heyralli.com](https://heyralli.com) | `zyllfqieeihshnwpakiv` | Live site. Founder-only credentials. |

OAuth: leave `NEXT_PUBLIC_SITE_URL` unset on localhost. Production site URL is `https://heyralli.com`. Register `http://localhost:3000/auth/callback` on the **staging** Supabase project.

Git production branch: **`main`**. Merging to `main` deploys Production.

Full contractor workflow, access matrix, and founder checklists: [contractor-onboarding.md](../engineering/contractor-onboarding.md).
