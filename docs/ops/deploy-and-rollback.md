# Deploy and rollback

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 22, 2026  
**Related:** [Ops](./README.md) · [Env & secrets](./env-and-secrets.md) · [Launch QA checklist](../qa/launch-checklist.md) · [Documentation home](../README.md)

## Project

| Item | Value |
|------|--------|
| Vercel project | `campaignos` |
| Team | `campignos` |
| Production URL | [heyralli.com](https://heyralli.com) |
| Git Production branch | **`main`** |
| Framework | Next.js (App Router) |

New product work should branch from `main` (`feat/…`, `docs/…`, `fix/…`). Do not treat long-lived side branches as Production trunk.

## How Production updates

1. **Preferred:** Merge PR → `main` → GitHub integration builds and promotes a **Production** deployment automatically.
2. **CLI:** From a clean checkout of the commit you want: `vercel deploy --prod` (scoped to the linked project). Prefer shipping via `main` so GitHub and Vercel stay aligned.
3. **Promote:** In Vercel, promote a Preview deployment of `main` to Production only when you intentionally skip a new build.

After changing Environment Variables, **redeploy** Production so new serverless instances pick up values.

## Preview

- Every PR / branch push gets a Preview URL (e.g. `campaignos-*-campignos.vercel.app`).
- Use Preview for QA before merge.
- Preview env vars are separate from Production — keep secrets in both if Preview must exercise OAuth/cron.

## Deploy checklist (Production)

1. PR into `main` (merge commit preferred for large history-preserving merges).
2. Confirm Vercel Production deployment is **Ready** for the merge SHA.
3. Spot-check: login, Calendar Google CTA, Meta settings, Tasks, Insights, one Create-with-AI path if AI changed. For full soft-launch sign-off use [Launch QA checklist](../qa/launch-checklist.md) §12.
4. If schema changed: confirm Supabase migrations applied **before** or **with** the deploy that needs them (see [database.md](../engineering/database.md)).
5. If env changed: update Vercel Production → redeploy → re-test the related integration.

## Rollback

### Instant traffic rollback (preferred)

1. Vercel → Project `campaignos` → **Deployments**.
2. Open the last known-good **Production** deployment.
3. **⋯ → Promote to Production** (or Instant Rollback if shown).

This restores the previous build artifact quickly. It does **not** reverse database migrations.

### Git rollback

1. Revert the bad commit(s) on `main` (or restore a prior SHA) and push.
2. Let the new Production deploy finish.
3. Only use force-push / history rewrite with explicit team agreement.

### Database caution

If a release applied a **forward** migration that is incompatible with an older build:

- Prefer a **forward-fix** migration over restoring an old app build against a new schema.
- Do not “roll back” Production SQL casually from the dashboard without a plan.

## Related ops

- Crons: [cron-jobs.md](./cron-jobs.md)  
- Secrets: [env-and-secrets.md](./env-and-secrets.md)  
- Incidents (stub): [incident-response.md](./incident-response.md)
