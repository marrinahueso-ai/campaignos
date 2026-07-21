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

## Playwright (deferred — add later)

Outline for Hey Ralli smokes (not implemented yet):

1. Upload ICS with UIDs → import → re-upload same ICS → duplicates skipped, no second events.
2. Same UID, changed `DTSTART` → review shows **Update**; Apply patches date; Skip leaves old date.
3. File with two identical SUMMARY+DTSTART → **Conflict** row.
4. AI/PDF same title+date re-import → Duplicate / skip via fingerprint or title+date.
5. (Optional / staging) Google or subscribe sync with unchanged feed → 0 new rows; date move on feed → update count.

Suggested filenames when added: `tests/hey-ralli/smoke/14-calendar-import-dedupe.spec.ts` (and optionally `14b` for Google if credentials allow).
