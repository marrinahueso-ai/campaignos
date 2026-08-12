# Calendar import dedupe + date-change updates

**Status:** Living  
**Owner:** Engineering  
**Last updated:** August 12, 2026  
**Related:** [feature-list.md](../product/feature-list.md) · [testing-guide.md](./testing-guide.md) · [google-calendar.md](../integrations/google-calendar.md) · [architecture.md](../engineering/architecture.md)

> **Not the same as Meta Calendar DnD.** This doc covers **school-year event intake** (ICS / Google / PDF → `events` rows). Rescheduling **approved Meta posts** on the calendar is a separate feature — see [meta-calendar-dnd.md](./meta-calendar-dnd.md).

---

## What shipped

Stable import identity on `events` so re-imports do not create duplicate school dates:

- Columns `import_source` + `import_external_id` with a partial unique index per school year
- Review statuses: **New / Duplicate / Update / Conflict** (interactive Apply/Skip for Updates)
- Subscribe cron + Google overnight sync **stage** New/Update/Conflict into Review (no silent apply); identical external ids skipped; prior-year dates outside Jul–Jun school year dropped before classify
- Unit suite + Playwright smoke `14-calendar-import-dedupe`

**Canonical import UX:** [`/calendar?tab=import`](https://heyralli.com/calendar?tab=import) (Google · RSS/subscribe · Doc upload). Header **Review** opens [`/calendar?tab=review`](https://heyralli.com/calendar?tab=review) with a pending badge. Legacy URLs `/calendar/import` and `/calendar/review` redirect to those tabs.

**Connect-only (not the review page):** [`/settings/integrations/calendar`](https://heyralli.com/settings/integrations/calendar) — Google OAuth + subscribe management; file upload and review CTAs deep-link to the import/review tabs.

**Flow:** **Bring in calendar** (three methods) → Review → **Import** → `/calendar`. Overnight Google/RSS also land in Review. **View imported items** is a supporting link inside the import hub — not a peer calendar view tab.

**Plan type on review:** The **Plan type** column lists org playbooks from Settings → Playbooks (plus **On the calendar only**). Selection stores `playbookId` on the review row and assigns that playbook on import; `communicationStrategy` remains `full_campaign` / `calendar_only` for pipeline gates. Defaults follow import preferences (strategy) + event-type / system playbook when no playbook is stored yet. Duplicate / Update / Conflict status logic is unchanged.

**Review filters + past cleanup:** Summary cards filter by category / Conflicts / Duplicates / Updates. A toolbar above the table supports **search** (name, category, match reason, and date/year/month — e.g. `2025`, `Jul`, `July 30`, `07/30`) and **All dates / Upcoming / Past** (local calendar date; today counts as upcoming). **Archive past events** bulk-removes every review row with a date before today from the import queue (same persistence as Delete selected — not a separate DB archive). Confirm dialog says archive / remove from import queue. Search, type filter, and date filter combine; Select all / Delete all apply to the visible filtered rows.

**Import list search + mass delete (post-import):** **Bring in calendar** → **View imported items** (`/calendar?tab=import-list`). Search matches event title, category, and the same date/year/month tokens. Select all / Delete selected apply to the visible filtered rows (already-imported events — **hard delete** from `events`, which also removes them from Events / Campaigns / Publishing / Approvals). The list includes every non-archived event for the org’s school years (aligned with Events), not only the rolling calendar planning date window — so misdated imports (e.g. July 30 of the prior year) stay visible and deletable.

**Code:** `src/lib/calendar-import/event-dedup.ts` (classify + fingerprints), `parse-ics.ts` / Google sync / subscribe sync, `mutations.ts` (persist), `review-plan-options.ts` (plan type ↔ playbook), `date-search.ts` (shared date tokens), `review-filters.ts` / `import-list-filters.ts` (type / date / search).

---

## Rules

| Situation | Result |
|-----------|--------|
| Same `import_source` + `import_external_id`, exact source title/date unchanged | **Duplicate** — skip (no second row) |
| Same external id, title and/or date changed | **Update** — patch existing event (not a new event) |
| No external id, same title + date | **Duplicate** — skip |
| No external id, same title, different date | **New** — create (no auto-merge) |
| Two identical title+date rows inside one file | **Conflict** (within-file) |

### External ids by source

| Source | `import_source` | `import_external_id` |
|--------|-----------------|----------------------|
| ICS upload | `ics` | ICS `UID` (+ `#YYYY-MM-DD` when `RECURRENCE-ID` present) |
| Subscribe / webcal feed | `subscribe` | ICS `UID` (same path) |
| Google Calendar sync | `google` | Google event id (UID `…@heyralli.google` stripped) |
| PDF / AI parse | `ai_parse` | Content fingerprint of normalized title+date (not a fake ICS UID) |

Org scoping: events are unique per **school year** (`school_year_id` + source + external id). Existing rows with null external ids keep normalized title+date fallback. Allowed `import_source` values also include `manual` (constraint); dedupe keys still require a non-null external id for the unique index.

**External-id matching:** Duplicate skip requires the **exact source title and date** on the same external id (case/spacing on the stored row may differ until an **Update** applies). Title-only or date-only changes on a known id classify as **Update**, not a second create.

**Missing UID:** ICS rows without a `UID` get `import_external_id = null` and dedupe via normalized title+date only.

**Legacy near-dups:** Pre-identity pairs (same school year + date + normalized title, no external id) are not auto-merged. Clean up via **View imported items** — founder policy: **keep the most recent import**, delete the older copy. Forward re-imports with stable UIDs/Google ids patch the matched row in place.

**Cron scope:** Subscribe + Google overnight sync classify against the **entire active school year**, fetch/list within Jul–Jun school-year bounds, and **stage** actionable rows into Review (`stageForReview: true`). Both crons use the **service-role** Supabase client (`SUPABASE_SERVICE_ROLE_KEY`); the cookie/session client has no membership under cron and would return zero targets after membership-scoped RLS.

### Interactive review vs cron / overnight sync

- **Import review UI:** Sync Review summary (new / changed / needs attention). Statuses **New / Duplicate / Update / Conflict** (+ `needs_review`). Update rows show old → new (Hey Ralli vs connected calendar). Conflict / needs-review cards use **Currently in Hey Ralli** · **From your connected calendar** with **Use Calendar Update** / **Keep Hey Ralli Event** / **Keep Both**. Primary action: **Finish Review** (same create / patch / skip import path).
- **Subscribe cron / Google overnight:** same classification; New/Update/Conflict **stage into Review** (not auto-applied). Unchanged ids skipped; prior-year dates filtered out.

---

## Migration

Apply in Supabase SQL editor (or CLI):

`supabase/migrations/20260721195203_events_import_external_ids.sql` and `supabase/migrations/20260730002733_enforce_calendar_import_external_identity.sql`

Add `events.import_source`, `events.import_external_id`, check constraint, and unique index `events_school_year_import_external_uidx` (where school year + source + external id are all non-null). The enforcement migration is safe for legacy rows because null identities are excluded.

---

## Unit coverage

```bash
npm run test:calendar-import
```

Suite: `src/lib/calendar-import/__tests__/event-dedup.test.ts` — UID skip, UID title-case/date changes → update, missing-UID normalized title+date fallback, near-miss not skipped, within-file conflict key parity, Google id path, AI fingerprint stability.

Also: `src/lib/calendar-import/__tests__/review-plan-options.test.ts` — plan type options from playbooks, selection → `playbookId` / strategy, defaults, status preserved.

Also: `src/lib/calendar-import/__tests__/review-filters.test.ts` — past vs upcoming relative to today, search match on name/category/reason/date-year, combined type+date+search filters, past-id list for mass archive.

Also: `src/lib/calendar-import/__tests__/import-list-filters.test.ts` — Import list search on title/category/date-year.

---

## Playwright (Hey Ralli smokes)

**Implemented:** `tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts`  
**Helpers / fixtures:** `tests/hey-ralli/helpers/calendar-import.ts`, `tests/hey-ralli/fixtures/calendar-import-dedupe-*.ics`

### Coverage

1. Upload ICS with unique UID → **Import All** succeeds (New → created).
2. Re-upload same ICS → **Duplicate** status + Duplicates stat; Import All reports already-on-calendar skip; calendar still has one row for that title.
3. Same UID, changed `DTSTART` → **Update** status; Apply + Import All; re-upload of updated ICS is Duplicate; still one calendar row.
4. Within-file two identical SUMMARY+DTSTART → **Conflict** visible in review (Import All not clicked — non-destructive).

Not covered yet (optional follow-ups): AI/PDF fingerprint re-import; Google / subscribe cron auto-apply (`14b` if credentials allow).

### How to run

Requires staging credentials in `.env.local` (`HEY_RALLI_TEST_EMAIL` / `HEY_RALLI_TEST_PASSWORD`). Soft-skips when missing. Staging org must have school setup complete so `/calendar/import` accepts uploads. Migration `20260721195203_events_import_external_ids.sql` must be applied on the target DB.

```bash
npm run test:hey-ralli -- tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts
```

Or:

```bash
./scripts/hey-ralli-test.sh tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts
```

Each run uses timestamped event titles/UIDs (`HR Dedupe Smoke <ms>`) so staging collisions stay rare. Conflict case leaves review without importing.

**Staging notes:** Assertions key off review status badges (New / Duplicate / Update / Conflict), stats cards, and Import All result copy. A best-effort check of the calendar **Import list** view is included but soft-skips when that view toggle does not stick under automation (month grid still showing); review messaging remains authoritative for “no second create.”

---

## Known limits

- Title+date fallback cannot merge “same event, new date” without an external id (by design → **New**).
- AI fingerprints change if normalized title or date changes → treated as a different external id (may create a new row rather than Update).
- Unique index is partial; pre-migration or manually created rows with null external ids rely on title+date only.
- Cross-source collisions (e.g. same school date from ICS and Google) are **not** auto-merged — different `import_source` keys.

---

## Related (do not confuse)

| Feature | What it is | Living doc |
|---------|------------|------------|
| School calendar import / dedupe | Intake of school-year **events** | This page |
| Meta Calendar DnD / native schedule | Reschedule **approved Meta posts** (Graph `scheduled_publish_time`) | [meta-calendar-dnd.md](./meta-calendar-dnd.md) |
| Google Calendar OAuth + sync | Connect + sync stream into import/review | [google-calendar.md](../integrations/google-calendar.md) |
