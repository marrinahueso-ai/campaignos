# Meta Calendar DnD + native Graph schedules

**Status:** Living  
**Last updated:** July 21, 2026  
**Related:** [feature-list.md](../product/feature-list.md) · [meta.md](../integrations/meta.md) · [testing-guide.md](./testing-guide.md)

---

## What to expect

| Action | CampignOS | Meta (Business Suite) |
|--------|-----------|------------------------|
| Approve (CB2 Approvals or Meta “Approve scheduled”) | Slots → `approved` + `scheduled_for` | **Facebook feed:** creates unpublished scheduled photo (`published=false` + `scheduled_publish_time`); stores `graph_schedule_id` |
| Calendar drag-and-drop | Updates `scheduled_for` (+ step `due_date`) only — **never** clears approval / never regenerates artwork | If `graph_schedule_id` exists: updates Graph `scheduled_publish_time` (or delete+recreate). On Graph failure: **DB stays updated** + warning toast |
| Publish-when-due cron | Still publishes slots **without** `graph_schedule_id` (legacy + Instagram + stories) | Slots **with** `graph_schedule_id` are owned by Meta; after due time CampignOS marks them `published` without re-posting |

Published / posting chips stay non-draggable.

---

## Instagram / story limits

- **Instagram Content Publishing API** has no reliable `scheduled_publish_time`. Soft-fail is stored on `graph_schedule_error`; CampignOS queue publishes when due.
- **Facebook photo stories** are not scheduled via the same Page feed API; same soft-fail + CampignOS fallback.

---

## QA checklist

1. Approve a future Facebook feed post with Meta connected → slot has `graph_schedule_id` (DB) / post appears scheduled in Business Suite when Graph succeeds.
2. Drag that chip on Calendar → time moves in CampignOS **and** (when Graph id present) in Meta; status stays approved (not back in Approvals queue).
3. Force a Graph failure (invalid token / offline mock) → calendar still shows new time; amber warning toast; approval unchanged.
4. Legacy slot without `graph_schedule_id` → DnD only changes CampignOS time; cron still publishes when due.
5. Instagram-only / story-manual milestones → approve still works; no Graph schedule id required.

---

## Unit coverage

```bash
npm run test:communications-calendar
npm run test:meta-publishing
```

Key files: `native-schedule-utils.ts`, `native-schedule.ts`, `planning-mutations.ts` / `planning-actions.ts`.
