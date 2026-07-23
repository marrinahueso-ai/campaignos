# Cron jobs

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 22, 2026  
**Related:** [Ops](./README.md) · [`vercel.json`](../../vercel.json) · [Env & secrets](./env-and-secrets.md) · [Architecture](../engineering/architecture.md) · [Documentation home](../README.md)

## Auth

All `/api/cron/*` routes expect:

```http
Authorization: Bearer <CRON_SECRET>
```

- Set `CRON_SECRET` in Vercel Production (and Preview if you invoke crons there).
- Vercel Cron sends this header automatically when the secret is configured for the project.
- Manual test (staging/prod):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://heyralli.com/api/cron/<path>"
```

Without a valid bearer, handlers reject the request (do not treat that as a job failure in product data).

## Schedule table (from `vercel.json`)

Schedules are **UTC** (Vercel Cron).

| Path | Schedule (UTC) | Rough US Central* | Purpose |
|------|----------------|-------------------|---------|
| `/api/cron/calendar-subscribe-sync` | `0 6 * * *` | ~1:00 AM CDT | Refresh ICS / subscribe imports |
| `/api/cron/google-calendar-sync` | `30 6 * * *` | ~1:30 AM CDT | Sync org Google Calendar connections → review |
| `/api/cron/meta-token-health` | `0 8 * * *` | ~3:00 AM CDT | Check Meta token health |
| `/api/cron/inbox-sync` | `0 9 * * *` | ~4:00 AM CDT | Sync Meta inbox |
| `/api/cron/story-post-reminders` | `0 13 * * *` | ~8:00 AM CDT | Email story post kit reminders (Resend) |
| `/api/cron/manual-upload-emails` | `30 13 * * *` | ~8:30 AM CDT | Manual IG upload reminder emails |
| `/api/cron/meta-publish` | `0 14 * * *` | ~9:00 AM CDT | Publish / process due Meta schedule |

\*Central offset changes with DST; treat UTC as source of truth.

**Also in code (not necessarily in `vercel.json`):** `/api/cron/insights-sync` uses the same `CRON_SECRET` pattern — invoke manually or add to `vercel.json` if you want it scheduled.

## Dependencies

| Cron | Needs |
|------|--------|
| Google Calendar sync | `GOOGLE_*` + rows in `organization_google_calendar_connections` |
| Meta publish / token / inbox | Org Meta connection (or legacy env tokens) + Graph API |
| Story / manual-upload emails | `RESEND_API_KEY` (+ optional template IDs) |
| All | `SUPABASE_SERVICE_ROLE_KEY` (admin client) + `CRON_SECRET` |

## Failure symptoms

| Symptom | Likely cron / cause |
|---------|---------------------|
| ICS subscribe stale | `calendar-subscribe-sync` failing or bad subscribe URL |
| Google events not refreshing overnight | `google-calendar-sync`; OAuth revoked / `deleted_client`; no active school year |
| Scheduled FB/IG posts not going out | `meta-publish`; cron loads due slots + org Meta connection via **service role** (no user session). Token expired → check `meta-token-health`. Create with AI **Publish Now** bypasses cron and publishes on approve. |
| Inbox not updating | `inbox-sync`; Meta connection scope / token |
| Reminder emails missing | `story-post-reminders` / `manual-upload-emails`; Resend config |
| Cron returns 401 | Missing/wrong `CRON_SECRET` |

Check Vercel → Project → **Logs** / deployment cron invocations, and Sentry if configured.

## Changing schedules

1. Edit [`vercel.json`](../../vercel.json) `crons` array.
2. Merge to `main` and deploy Production.
3. Confirm the new schedule appears in Vercel → Settings → Cron Jobs (or deployment summary).
