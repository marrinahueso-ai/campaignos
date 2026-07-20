# Meta connection — one-click for every surface

**Status:** Thin shared OAuth CTA helpers shipped; provider token exchange still per-stack. Goal remains one click → approve use cases → done.  
**Last updated:** July 19, 2026

---

## Product intent

Connecting Meta should feel like **one click, one authorization, one org connection** — not separate logins for Insights, Inbox, Publishing, comments, or scheduling.

A volunteer clicks Connect, approves the use cases Facebook shows, and that connection powers:

| Surface | What the same connection enables |
|---------|----------------------------------|
| Publishing / scheduling | Approved posts → Facebook Page + Instagram |
| Insights | Reach, engagement, top posts, sync, export |
| Unified Inbox | DMs, comments, mentions, reply |
| Approvals → publish | Same Page/IG targets |
| Repost / comment moderation | Same engagement scopes |

Same mental model for Canva and Monday: one Connect CTA per provider, `returnTo` lands them back where they started.

---

## Today

- Combined Meta scopes: `META_COMBINED_OAUTH_SCOPE_LIST` in `src/lib/meta-publishing/oauth-scopes.ts`.
- Shared helpers: `src/lib/integrations/oauth.ts` (`safeOAuthReturnTo`, `buildOAuthStartPath`, `buildIntegrationSettingsPath`).
- Settings → Meta is the manage home; Insights / Inbox Connect CTAs hit the **same** `/api/meta/oauth/start` (no `flow=` fork).
- Canva / Monday panels and Artwork Canva connect use the same start-path helper.
- Connection rows: `organization_meta_connections`, `organization_canva_connections`, `organization_monday_connections`.
- Google Calendar Sign-in is **live and wired** through review → calendar / dashboard, plus daily cron (see [google-calendar.md](./google-calendar.md)); ICS + upload remain alternate streams. Gmail still deferred.

Still later: shared connection-health contract, App Review / production permission lifecycle, env-vs-org tenancy cleanup, Gmail Connect.

---

## Remaining framework work

1. Shared health (`connected` / `needs_reconnect` / `missing_scopes`) consumed by banners.
2. Keep Login for Business `config_id` as source of truth for Meta use cases.
3. Monday post-OAuth board mapping as a short finish-setup step (not a second OAuth).
4. Google Gmail Connect (separate CTA; same GCP project) — see [google-calendar.md](./google-calendar.md).
