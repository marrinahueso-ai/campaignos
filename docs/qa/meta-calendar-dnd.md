# Meta Calendar DnD + native Graph schedules

**Status:** Living  
**Owner:** Engineering  
**Last updated:** July 21, 2026  
**Related:** [feature-list.md](../product/feature-list.md) · [meta.md](../integrations/meta.md) · [testing-guide.md](./testing-guide.md) · [architecture.md](../engineering/architecture.md)

> **Not the same as school calendar import.** This doc covers **Meta publication slots** on the communications calendar (Approve → Graph schedule → drag to reschedule). Importing school dates (ICS / Google / PDF) is separate — see [calendar-import-dedupe.md](./calendar-import-dedupe.md).

---

## What shipped

- On **Approve** (CB2 Approvals or Meta “Approve scheduled”): Facebook **Page feed** slots get a Meta-native unpublished scheduled photo (`published=false` + `scheduled_publish_time`) when the org Meta connection is healthy and the time is inside Graph’s window (~10 minutes–75 days). Ids stored on `meta_publication_slots.graph_schedule_id`.
- **Calendar drag-and-drop** for Meta milestones updates CampignOS `scheduled_for` (+ related step `due_date`) **without** clearing approval or regenerating artwork. When `graph_schedule_id` exists, Graph `scheduled_publish_time` is updated (or delete+recreate if update fails). Graph failure → **DB stays updated** + warning toast.
- Publish-when-due cron **skips** slots that already have `graph_schedule_id` (Meta owns delivery); after due time CampignOS marks them `published` without re-posting. Legacy slots without a Graph id still publish via CampignOS cron.

**Surfaces:** Approvals hub / event Approvals → `/calendar` (unified calendar Meta chips).

**Code:** `src/lib/meta-publishing/native-schedule.ts` (+ `native-schedule-utils.ts`), Approve path via `schedule-meta-from-approval.ts` / `meta-publishing/actions.ts`, DnD via `communications-calendar/planning-actions.ts` → `planning-mutations.ts` → `rescheduleNativeMetaSchedulesForMilestone`.

---

## What to expect

| Action | CampignOS | Meta (Business Suite) |
|--------|-----------|------------------------|
| Approve (CB2 Approvals or Meta “Approve scheduled”) | Slots → `approved` + `scheduled_for` | **Facebook feed:** creates unpublished scheduled photo (`published=false` + `scheduled_publish_time`); stores `graph_schedule_id` |
| Calendar drag-and-drop | Updates `scheduled_for` (+ step `due_date`) only — **never** clears approval / never regenerates artwork | If `graph_schedule_id` exists: updates Graph `scheduled_publish_time` (or delete+recreate). On Graph failure: **DB stays updated** + warning toast |
| Publish-when-due cron | Still publishes slots **without** `graph_schedule_id` (legacy + Instagram + stories) | Slots **with** `graph_schedule_id` are owned by Meta; after due time CampignOS marks them `published` without re-posting |

Published / posting chips stay non-draggable (`isPlanningItemDraggable` → false when display status is `published`).

Warning copy when Graph sync fails after a successful local move:

`Calendar updated, but Meta schedule sync had issues: …`

---

## Instagram / story limits

- **Instagram Content Publishing API** has no reliable `scheduled_publish_time`. Soft-fail is stored on `graph_schedule_error`; CampignOS queue publishes when due.
- **Facebook photo stories** are not scheduled via the same Page feed API; same soft-fail + CampignOS fallback.
- Only `platform === "facebook"` && `placement === "feed"` uses native Graph schedule helpers.

---

## Migration

`supabase/migrations/20260721194236_meta_publication_slots_graph_schedule.sql`

Adds `meta_publication_slots.graph_schedule_id` and `graph_schedule_error` (soft-failure message; does not clear approval).

---

## QA checklist

1. Approve a future Facebook feed post with Meta connected → slot has `graph_schedule_id` (DB) / post appears scheduled in Business Suite when Graph succeeds.
2. Drag that chip on Calendar → time moves in CampignOS **and** (when Graph id present) in Meta; status stays approved (not back in Approvals queue).
3. Force a Graph failure (invalid token / offline mock) → calendar still shows new time; amber warning toast; approval unchanged.
4. Legacy slot without `graph_schedule_id` → DnD only changes CampignOS time; cron still publishes when due.
5. Instagram-only / story-manual milestones → approve still works; no Graph schedule id required; `graph_schedule_error` may record the soft-fail reason.
6. Outside Graph window (sooner than ~10 minutes or later than ~75 days) → native schedule create may soft-fail; CampignOS still holds `scheduled_for` for cron path when no Graph id.

---

## Unit coverage

```bash
npm run test:communications-calendar
npm run test:meta-publishing
```

| Suite | Focus |
|-------|--------|
| `src/lib/meta-publishing/__tests__/native-schedule-utils.test.ts` | Window bounds, FB feed-only support, cron skip when Graph id present, schedule-only reschedule payload |
| `src/lib/meta-publishing/__tests__/graph-native-schedule.test.ts` | Graph id candidates / update path |
| `src/lib/communications-calendar/__tests__/meta-milestone-reschedule.test.ts` | DnD payload never flips `status`; wires to `rescheduleNativeMetaSchedulesForMilestone` |

---

## Playwright

**No dedicated smoke yet** for Meta Calendar DnD / native schedule (Graph + staging Meta connection required). Manual QA checklist above is the E2E path until a smoke lands.

Regression neighbors (not a substitute): Create-with-AI / Approvals smokes under `tests/hey-ralli/smoke/` — see [testing-guide.md](./testing-guide.md).

---

## Known limits

- Native Graph schedule = **Facebook Page feed only**.
- Graph schedule window ~**10 minutes–75 days** from “now.”
- DnD never rolls back CampignOS time if Meta sync fails (by design — prefer local calendar correctness + warning).
- Delete+recreate path needs artwork available; otherwise Graph may stay out of sync with a warning.
- School calendar **event** import/dedupe is unrelated — [calendar-import-dedupe.md](./calendar-import-dedupe.md).

---

## Related (do not confuse)

| Feature | What it is | Living doc |
|---------|------------|------------|
| Meta Calendar DnD / native schedule | Approve + drag **Meta posts** | This page |
| School calendar import / dedupe | Intake of school-year **events** | [calendar-import-dedupe.md](./calendar-import-dedupe.md) |
| Meta OAuth / connect model | One org connection for publish / inbox / insights | [meta.md](../integrations/meta.md) |
