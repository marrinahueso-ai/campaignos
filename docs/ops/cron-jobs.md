# Cron jobs

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 15, 2026 — meta-tags-sync every 30 minutes; inbox-sync remains daily  
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
| `/api/cron/meta-token-health` | `0 8 * * *` | ~3:00 AM CDT | Meta token health + approval backfill + soft-launch transactional emails (see below) |
| `/api/cron/inbox-sync` | `0 9 * * *` | ~4:00 AM CDT | Full Meta inbox sync (DMs, comments, tags) |
| `/api/cron/meta-tags-sync` | `*/30 * * * *` | Every ~30 min | Tags-only Meta sync (FB `/{page-id}/tagged` + IG `/{ig-user-id}/tags`; not @ Mentions) |
| `/api/cron/story-post-reminders` | `0 13 * * *` | ~8:00 AM CDT | Email story post kit reminders (Resend) — service role (see below) |
| `/api/cron/manual-upload-emails` | `30 13 * * *` | ~8:30 AM CDT | Manual IG upload reminder emails |
| `/api/cron/meta-publish` | `*/20 * * * *` | Every ~20 min | Publish **due** Meta slots (IG feed/stories; mark native FB schedules published in DB) |
| `/api/cron/volunteer-sync` | `*/30 * * * *` | Every ~30 min | Refresh stale SignUpGenius snapshots (connected sources only; ≥30 min spacing; capped per run) |
| `/api/cron/newsletter-scheduled-sends` | `*/10 * * * *` | Every ~10 min | Execute due scheduled newsletter sends (single-flight claim; re-verifies approval/version/audience + production gate at execution time) |

\*Central offset changes with DST; treat UTC as source of truth.

**Also in code (not necessarily in `vercel.json`):** `/api/cron/insights-sync` uses the same `CRON_SECRET` pattern — invoke manually or add to `vercel.json` if you want it scheduled.

## `meta-token-health` — token check + operational emails

Daily job (`src/app/api/cron/meta-token-health/route.ts`) runs four parallel tasks:

| Task | Code | Email (if any) |
|------|------|----------------|
| Meta connection health | `refreshAllMetaConnectionHealth()` | Invalid Page token → `meta-disconnected` once per connection row |
| Approval request backfill | `backfillMetaApprovalRequests(null, null, true)` — service role | — |
| Pending approval reminders | `sendPendingApprovalReminders()` | Assigned pending approval after **24h** → `approval-reminder` once per request |
| Trial ending notices | `sendTrialEndingNotices()` | `trialing` org with **1–3 days** left → `trial-ending` once per org + `trial_ends_at` |

**Approval backfill scope (as of Aug 12, 2026):** the dedupe/stale-resolution repair (`dedupePendingApprovalRequestsInDb` / `resolveStalePendingApprovalRequestsForApprovedItems`) now runs with `useServiceRole: true` from this cron — previously it used the cookie/anon client with no user session, so RLS silently returned zero rows every day (a no-op that looked healthy: `ok: true`, `approvalRequestsBackfilled: 0`). A failed elevated call (e.g. missing `SUPABASE_SERVICE_ROLE_KEY`) now surfaces as a non-null `approvalBackfillError` in the JSON response instead of looking identical to "nothing needed reconciling." The meta_publication_slots scan that discovers and *creates* brand-new missing approval requests still uses the plain session client and remains a no-op under cron — it depends on the bundle-computation pipeline's own session-scoped lookups (`getEventById`/`getCurrentOrganization`), which is a larger, separate follow-up. `/approvals` page loads (Phase 4, `backfillMetaApprovalRequestsForEvents`) already cover that creation path correctly for the viewing org via the real user session.

All four email paths use the durable `transactional_notification_deliveries` ledger plus Resend idempotency keys. Policy details: [resend-email-templates.md § Soft-launch notification policy](./resend-email-templates.md#soft-launch-notification-policy).

**Stripe `payment-failed`** is **not** cron-driven — it fires from `POST /api/stripe/webhook` on `invoice.payment_failed` ([stripe-integration.md](../engineering/stripe-integration.md)).

## `story-post-reminders` — cron-vs-interactive client fix (Aug 13, 2026)

`sendStoryPostKitForMilestone()` (`src/lib/meta-publishing/send-story-post-kit.ts`) is shared by two callers: an interactive path (fires right after schedule/publish, has a normal user session) and this daily cron backup (no session). Every internal read/write in that file previously used the plain session client, so — same bug class as the pre-fix `meta-token-health` cron — the cron's calls silently hit RLS on `event_communication_steps` / `events` / `school_years` and returned zero rows, making every reminder fail with `"Post not found."` while the cron still reported `ok: true`. Fixed the same way: the function now takes a `useServiceRole` flag (default `false`, so the interactive caller is unaffected) and `send-story-post-reminders.ts` passes `useServiceRole: true`. `sentReminders`/`errors` in the cron's own response were already wired to surface failures, so no response-shape change was needed here.

## Meta: Publish Now vs Schedule (ops)

| Delivery | What happens |
|----------|----------------|
| **Publish Now** | On approve, Hey Ralli publishes immediately via Meta Graph (no cron wait). Unchanged. |
| **Schedule** | Approvals store `scheduled_for` in DB. **Facebook Page feed** posts with a healthy Meta connection also get a native Graph schedule on approve (Meta publishes those). **Instagram feed/stories** and **Facebook stories** are published by Hey Ralli when `scheduled_for` is due — the `meta-publish` cron runs every **~20 minutes**, processes only approved slots whose time has passed (max **20 bundles per run**), and never republishes already-published slots. Native FB feed slots with a Graph schedule id are marked published in DB at due time without a second Graph publish call. |

So a post scheduled for 2:00 PM Central typically goes out within **~20 minutes** of that time (not only at a single daily 9 AM batch).

Page loads (Dashboard, Approvals, etc.) stay **DB reads only** — no Meta polling on Dashboard focus.

## Newsletter scheduled sends

`/api/cron/newsletter-scheduled-sends` (`src/app/api/cron/newsletter-scheduled-sends/route.ts`) lists `newsletter_sends` rows with `status = "scheduled"` and `scheduled_for` in the past, across every org, and executes each via `executeScheduledSend`. Each send is claimed atomically (`claim_newsletter_scheduled_send` RPC, `scheduled → sending`) so overlapping cron invocations can't double-send; the executor re-checks the newsletter is still `scheduled` with an unchanged approved version/audience, re-checks `NEWSLETTER_PRODUCTION_SEND_ENABLED`, and recomputes recipient eligibility fresh (never trusting counts captured at schedule time) before delivering. Details: [newsletter-composer.md § Schedule cron + idempotency](../engineering/newsletter-composer.md#12-schedule-cron--idempotency).

## Volunteer background sync

`/api/cron/volunteer-sync` re-reads public SignUpGenius pages for **connected** event sources whose last successful sync is older than **30 minutes** (or never synced). Each run processes at most **10** sources; interactive refresh on the Volunteers tab still works and respects the same spacing. Pending-review sources are skipped. Dashboard `/volunteers` and Today widgets read snapshots from DB — they do not scrape SignUpGenius on load.

## Dependencies

| Cron | Needs |
|------|--------|
| Google Calendar sync | `GOOGLE_*` + rows in `organization_google_calendar_connections` |
| Meta publish / token / inbox | Org Meta connection (or legacy env tokens) + Graph API |
| `meta-token-health` emails | `RESEND_API_KEY` + published templates + `transactional_notification_deliveries` table |
| Volunteer sync | Connected `event_volunteer_sources` with public SignUpGenius URLs |
| Story / manual-upload emails | `RESEND_API_KEY` (+ optional template IDs) |
| Newsletter scheduled sends | `NEWSLETTER_PRODUCTION_SEND_ENABLED=true` (fails closed otherwise) + `RESEND_API_KEY` + migrations `20260810120000` / `20260810130000` applied |
| All | `SUPABASE_SERVICE_ROLE_KEY` (admin client) + `CRON_SECRET` |

## Failure symptoms

| Symptom | Likely cron / cause |
|---------|---------------------|
| ICS subscribe stale | `calendar-subscribe-sync` failing or bad subscribe URL. Cron **must** use service role (`SUPABASE_SERVICE_ROLE_KEY`) — membership RLS returns zero orgs with the cookie client. Manual **Refresh** and overnight cron both **stage Review** (`stageForReview` / `autoImport: false`); they do not silent-apply New/Update. Prior-year dates outside Jul–Jun school year are dropped. |
| Google events not refreshing overnight | `google-calendar-sync`; OAuth revoked / `deleted_client`; no active school year |
| Scheduled FB/IG posts not going out | `meta-publish`; cron loads due slots + org Meta connection via **service role** (no user session). Token expired → check `meta-token-health`. Create with AI **Publish Now** bypasses cron and publishes on approve. |
| Scheduled posts delayed >30 min | Check Vercel cron invocations for `meta-publish`; due backlog may exceed per-run cap (20 bundles) — clears on subsequent runs |
| Volunteer numbers stale on Master | `volunteer-sync`; source in error or SignUpGenius page unreadable — refresh on event Volunteers tab |
| Inbox not updating | `inbox-sync`; Meta connection scope / token |
| Tags slow / missing | `meta-tags-sync` (30 min); confirm Tag people on Page/IG (not caption @); Sync now still runs full inbox |
| Scheduled newsletter not sending at its due time | `newsletter-scheduled-sends`; check `NEWSLETTER_PRODUCTION_SEND_ENABLED` is `true` in that environment and the newsletter's approval/version/audience haven't drifted since scheduling (either fails the send with an explicit reason on the `newsletter_sends` row, visible on `/newsletters/[id]`) |
| Reminder emails missing | `story-post-reminders` / `manual-upload-emails`; Resend config |
| Cron returns 401 | Missing/wrong `CRON_SECRET` |

Check Vercel → Project → **Logs** / deployment cron invocations, and Sentry if configured.

## Runtime headroom

Every `/api/cron/*` route now declares `export const maxDuration = 300;`. Without it, a route falls back to the platform's default function timeout, and an org-wide sweep that outgrows that default gets silently killed mid-run — indistinguishable from a clean, fast run in the cron's own success response. 300s gives real headroom as org count grows; raise further (or introduce batching/pagination) if a specific cron's own logs show it approaching that ceiling.

## `insights-sync` — cron RLS fix (Aug 13, 2026)

Same bug class as `meta-token-health` and `story-post-reminders`: `syncOrganizationInsights()`'s `fetchPublishedSlotsForOrganization()` helper used the shared, session-only `getOrganizationSchoolYearIds()` (`createClient()`), so under the cron (no user session) the org's `school_years` → `events` → `meta_publication_slots` lookup silently returned `[]` via RLS. This didn't fully zero out the sync — Graph API discovery of recent posts is a direct external call, unaffected by RLS — but it meant discovered posts never got linked to their internal scheduling-slot metadata (milestone titles, `metaPublicationSlotId`) when synced by cron, while the route still reported `ok: true`. Fixed the same way: `syncOrganizationInsights()` now takes a `useServiceRole` flag (default `false`; the interactive `syncInsightsAction`/`/api/insights/sync` callers are unaffected) and `fetchPublishedSlotsForOrganization()` queries directly via `createJobClient(useServiceRole)` instead of the shared session-only helper. The cron route passes `useServiceRole: true`. This cron is **still not scheduled** in `vercel.json` — invoke it manually or add a schedule if you want it running; this fix just means it will work correctly once it is.

## `inbox-sync` — cron RLS fix (Aug 13, 2026)

Same bug class again, this time in the org-loop wrapper: `syncAllOrganizationsInbox()` (the cron entry point) correctly lists connected orgs with `createAdminClient()`, but the per-org `syncInboxForOrganization()` it calls read/wrote `organization_inbox_settings` (via `getOrganizationInboxSettings`/`upsertOrganizationInboxSettings`) and `inbox_threads`/`inbox_messages` (via `upsertInboxBatch`) through the plain session client with no service-role opt-in. Under the cron (no user session), those RLS-protected reads/writes silently no-op'd: Graph API discovery of new messages/comments/tags still worked (external call, no RLS), but nothing was persisted and no sync error was recorded — while the cron still reported `ok: true`. Fixed by adding a `useServiceRole` option that threads from `syncAllOrganizationsInbox()` → `syncInboxForOrganization(organizationId, { useServiceRole: true })` → every settings/upsert call it makes. The two interactive callers (`inbox/actions.ts`'s "Sync now" and the post-OAuth-connect kickoff in `/api/meta/oauth/callback`) call `syncInboxForOrganization` without the option, so they keep the session-scoped client as before.

## Changing schedules

1. Edit [`vercel.json`](../../vercel.json) `crons` array.
2. Merge to `main` and deploy Production.
3. Confirm the new schedule appears in Vercel → Settings → Cron Jobs (or deployment summary).
