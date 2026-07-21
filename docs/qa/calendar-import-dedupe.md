# Calendar import dedupe + date-change updates

**Status:** Living  
**Last updated:** July 21, 2026  
**Related:** [feature-list.md](../product/feature-list.md) · [testing-guide.md](./testing-guide.md) · [google-calendar.md](../integrations/google-calendar.md)

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

Org scoping: events are unique per **school year** (`school_year_id` + source + external id). Existing rows with null external ids keep title+date fallback.

### Interactive review vs cron / auto-sync

- **Import review UI:** statuses **New / Duplicate / Update / Conflict** with reason text. Update rows offer **Apply** / **Skip** (default Apply).
- **Subscribe cron / Google auto-import:** external-id field changes are **auto-applied**; unchanged ids are skipped.

---

## Migration

Apply in Supabase SQL editor (or CLI):

`supabase/migrations/20260721195203_events_import_external_ids.sql`

---

## Unit coverage

```bash
npm run test:calendar-import
```

Covers UID skip, UID date-change → update, title+date fallback, near-miss not skipped, within-file conflict key parity, Google id path, AI fingerprint stability.

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
