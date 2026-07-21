# Calendar import dedupe + date-change updates

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 21, 2026  
**Related:** [feature-list.md](../product/feature-list.md) · [testing-guide.md](./testing-guide.md) · [google-calendar.md](../integrations/google-calendar.md) · [architecture.md](../engineering/architecture.md)

> **Not the same as Meta Calendar DnD.** This doc covers **school-year event intake** (ICS / Google / PDF → `events` rows). Rescheduling **approved Meta posts** on the calendar is a separate feature — see [meta-calendar-dnd.md](./meta-calendar-dnd.md).

---

## What shipped

Stable import identity on `events` so re-imports do not create duplicate school dates:

- Columns `import_source` + `import_external_id` with a partial unique index per school year
- Review statuses: **New / Duplicate / Update / Conflict** (interactive Apply/Skip for Updates)
- Subscribe cron + Google auto-import auto-apply field changes for known external ids
- Unit suite + Playwright smoke `14-calendar-import-dedupe`

**Canonical import UX:** [`/calendar/import`](https://heyralli.com/calendar/import) (upload / Google sync into review / subscribe). Phase 2 review (New / Duplicate / Update / Conflict, Apply update) is [`/calendar/review`](https://heyralli.com/calendar/review).

**Connect-only (not the review page):** [`/settings/integrations/calendar`](https://heyralli.com/settings/integrations/calendar) — Google OAuth + subscribe management; file upload and review CTAs deep-link to `/calendar/import` and `/calendar/review`.

**Flow:** `/calendar/import` → `/calendar/review` → confirm → `/calendar` (and Google/ICS cron auto-import paths).

**Plan type on review:** The **Plan type** column lists org playbooks from Settings → Playbooks (plus **On the calendar only**). Selection stores `playbookId` on the review row and assigns that playbook on import; `communicationStrategy` remains `full_campaign` / `calendar_only` for pipeline gates. Defaults follow import preferences (strategy) + event-type / system playbook when no playbook is stored yet. Duplicate / Update / Conflict status logic is unchanged.

**Code:** `src/lib/calendar-import/event-dedup.ts` (classify + fingerprints), `parse-ics.ts` / Google sync / subscribe sync, `mutations.ts` (persist), `review-plan-options.ts` (plan type ↔ playbook).

---

## Rules

| Situation | Result |
|-----------|--------|
| Same `import_source` + `import_external_id`, title/date unchanged | **Duplicate** — skip (no second row) |
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

Org scoping: events are unique per **school year** (`school_year_id` + source + external id). Existing rows with null external ids keep title+date fallback. Allowed `import_source` values also include `manual` (constraint); dedupe keys still require a non-null external id for the unique index.

### Interactive review vs cron / auto-sync

- **Import review UI:** statuses **New / Duplicate / Update / Conflict** with reason text. Update rows offer **Apply** / **Skip** (default Apply).
- **Subscribe cron / Google auto-import:** external-id field changes are **auto-applied**; unchanged ids are skipped.

---

## Migration

Apply in Supabase SQL editor (or CLI):

`supabase/migrations/20260721195203_events_import_external_ids.sql`

Adds `events.import_source`, `events.import_external_id`, check constraint, and unique index `events_school_year_import_external_uidx` (where school year + source + external id are all non-null).

---

## Unit coverage

```bash
npm run test:calendar-import
```

Suite: `src/lib/calendar-import/__tests__/event-dedup.test.ts` — UID skip, UID date-change → update, title+date fallback, near-miss not skipped, within-file conflict key parity, Google id path, AI fingerprint stability.

Also: `src/lib/calendar-import/__tests__/review-plan-options.test.ts` — plan type options from playbooks, selection → `playbookId` / strategy, defaults, status preserved.

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
