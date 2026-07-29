# Cron jobs

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 28, 2026  
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
| `/api/cron/meta-publish` | `*/20 * * * *` | Every ~20 min | Publish **due** Meta slots (IG feed/stories; mark native FB schedules published in DB) |
| `/api/cron/volunteer-sync` | `*/30 * * * *` | Every ~30 min | Refresh stale SignUpGenius snapshots (connected sources only; ≥30 min spacing; capped per run) |

\*Central offset changes with DST; treat UTC as source of truth.

**Also in code (not necessarily in `vercel.json`):** `/api/cron/insights-sync` uses the same `CRON_SECRET` pattern — invoke manually or add to `vercel.json` if you want it scheduled.

## Meta: Publish Now vs Schedule (ops)

| Delivery | What happens |
|----------|----------------|
| **Publish Now** | On approve, Hey Ralli publishes immediately via Meta Graph (no cron wait). Unchanged. |
| **Schedule** | Approvals store `scheduled_for` in DB. **Facebook Page feed** posts with a healthy Meta connection also get a native Graph schedule on approve (Meta publishes those). **Instagram feed/stories** and **Facebook stories** are published by Hey Ralli when `scheduled_for` is due — the `meta-publish` cron runs every **~20 minutes**, processes only approved slots whose time has passed (max **20 bundles per run**), and never republishes already-published slots. Native FB feed slots with a Graph schedule id are marked published in DB at due time without a second Graph publish call. |

So a post scheduled for 2:00 PM Central typically goes out within **~20 minutes** of that time (not only at a single daily 9 AM batch).

Page loads (Dashboard, Approvals, etc.) stay **DB reads only** — no Meta polling on Dashboard focus.

## Volunteer background sync

`/api/cron/volunteer-sync` re-reads public SignUpGenius pages for **connected** event sources whose last successful sync is older than **30 minutes** (or never synced). Each run processes at most **10** sources; interactive refresh on the Volunteers tab still works and respects the same spacing. Pending-review sources are skipped. Dashboard `/volunteers` and Today widgets read snapshots from DB — they do not scrape SignUpGenius on load.

## Dependencies

| Cron | Needs |
|------|--------|
| Google Calendar sync | `GOOGLE_*` + rows in `organization_google_calendar_connections` |
| Meta publish / token / inbox | Org Meta connection (or legacy env tokens) + Graph API |
| Volunteer sync | Connected `event_volunteer_sources` with public SignUpGenius URLs |
| Story / manual-upload emails | `RESEND_API_KEY` (+ optional template IDs) |
| All | `SUPABASE_SERVICE_ROLE_KEY` (admin client) + `CRON_SECRET` |

## Failure symptoms

| Symptom | Likely cron / cause |
|---------|---------------------|
| ICS subscribe stale | `calendar-subscribe-sync` failing or bad subscribe URL |
| Google events not refreshing overnight | `google-calendar-sync`; OAuth revoked / `deleted_client`; no active school year |
| Scheduled FB/IG posts not going out | `meta-publish`; cron loads due slots + org Meta connection via **service role** (no user session). Token expired → check `meta-token-health`. Create with AI **Publish Now** bypasses cron and publishes on approve. |
| Scheduled posts delayed >30 min | Check Vercel cron invocations for `meta-publish`; due backlog may exceed per-run cap (20 bundles) — clears on subsequent runs |
| Volunteer numbers stale on Master | `volunteer-sync`; source in error or SignUpGenius page unreadable — refresh on event Volunteers tab |
| Inbox not updating | `inbox-sync`; Meta connection scope / token |
| Reminder emails missing | `story-post-reminders` / `manual-upload-emails`; Resend config |
| Cron returns 401 | Missing/wrong `CRON_SECRET` |

Check Vercel → Project → **Logs** / deployment cron invocations, and Sentry if configured.

## Changing schedules

1. Edit [`vercel.json`](../../vercel.json) `crons` array.
2. Merge to `main` and deploy Production.
3. Confirm the new schedule appears in Vercel → Settings → Cron Jobs (or deployment summary).
