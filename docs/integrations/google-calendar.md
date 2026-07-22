# Google Calendar connection

**Status:** Phase 1 **live in production** — Sign in with Google + ICS subscribe + file upload.  
**Gmail inbox:** deferred (separate Connect later; same Google Cloud project, extra scopes).  
**Last updated:** July 21, 2026

---

## Product model

Calendar is critical, so Hey Ralli keeps **three import streams**:

1. **Sign in with Google** — OAuth + Calendar API (`calendar.readonly`) — **verified on heyralli.com**
2. **Subscribe link** — ICS / webcal URL (no Google OAuth)
3. **Upload a file** — ICS / PDF / spreadsheet → review

**Canonical import + Phase 2 review:** `/calendar/import` → `/calendar/review` (file upload, Google sync into review, subscribe; New/Duplicate/Update/Conflict).

**Connect / manage only:** Settings → Integrations → Google Calendar (`/settings/integrations/calendar`) — primary Connect card; subscribe + deep-links under “Other ways to import” (not the full review UI).

Also surfaced on Calendar header (Import → `/calendar/import`, Google Calendar → settings), review empty state, and Get started (legacy wizard calendar step deep-links to `/calendar/import` when an org already exists; founding setup still accepts file/ICS inline and then routes to Import).

**Not** one forced “Google for Calendar + Gmail” button. Gmail scopes are restricted and would block shipping Calendar.

---

## Data flow (wired)

```
Sign in with Google
  → save organization_google_calendar_connections
  → auto-sync (if active school year)
  → calendar_imports (parsed)
  → /calendar/review?import=<id>
  → user confirms
  → events table
  → /calendar + Dashboard (Today / week ahead) + Events list
```

| Step | Behavior |
|------|----------|
| After OAuth | First sync runs automatically; new events land in review |
| Manual Sync | Settings / Import page → same review path |
| Daily cron | `/api/cron/google-calendar-sync` at 06:30 UTC — **auto-imports** new deduped events (like ICS subscribe) |
| Calendar UI | Reads `events` only after review confirm (manual) or cron auto-import |

**Import identity / re-import behavior** (UID / Google id / Update on date change): [calendar-import-dedupe.md](../qa/calendar-import-dedupe.md). That path is school **events**, not Meta post scheduling — Meta Calendar DnD is [meta-calendar-dnd.md](../qa/meta-calendar-dnd.md).

---

## Phase 1 implementation

| Piece | Location |
|-------|----------|
| Env | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_REDIRECT_URI` |
| Start / callback | `/api/google/oauth/start`, `/api/google/oauth/callback` |
| Storage | `organization_google_calendar_connections` |
| Sync | `src/lib/google-calendar/sync.ts` → existing `calendar_imports` + review / auto-import |
| Cron | `src/lib/google-calendar/sync-cron.ts` → `/api/cron/google-calendar-sync` |
| Settings UI | `/settings/integrations/calendar` |
| Import UI | `/calendar/import` (Google section) |
| Shared CTA helper | `buildOAuthStartPath("google", …)` in `src/lib/integrations/oauth.ts` |

Scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`.

---

## Production Google Cloud (operator)

| Item | Value |
|------|--------|
| GCP project | **Hey Ralli** (`hey-ralli`) |
| API | Google Calendar API enabled |
| OAuth client | Web application (do not delete) |
| Redirect URIs | `https://heyralli.com/api/google/oauth/callback`, `http://localhost:3000/api/google/oauth/callback` |
| Origins | `https://heyralli.com`, `http://localhost:3000` |
| Env | `GOOGLE_CLIENT_*` on Vercel Production + Preview, and `.env.local` |

While the consent screen is in **Testing**, only listed test users can complete Sign in. Publish / verification is a later step if we open beyond testers.

**Ops notes**

- After rotating or recreating a client, update Vercel env and redeploy — stale IDs cause `Error 401: deleted_client`.
- Google may take a few minutes for new client secrets to propagate.
- Never commit client secrets to git.
- Cron uses `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` (same as other crons).

---

## Phase 2 (later)

- Connect Gmail CTA with mail scopes only when clicked
- Communications Hub Gmail threads
- Google App Verification for restricted Gmail scopes
- Optional calendar picker (today: primary calendar only)
