# Back to School Fair — temporary name rollback

**Companion file:** [`BACK-TO-SCHOOL-FAIR-NAME-ROLLBACK-2026-08-08.json`](./BACK-TO-SCHOOL-FAIR-NAME-ROLLBACK-2026-08-08.json)  
**Event:** Back to School Fair · `1bdb2018-11ce-4610-9375-a1e382325d08` · 2026-08-05  
**Org:** Lincoln Elementary

## Where names come from (trace)

| UI surface | Source |
|------------|--------|
| Event **Volunteers** tab people list | `event_volunteer_participants.volunteer_name` on the source’s **latest confirmed** snapshot (`event_volunteer_sources.latest_confirmed_snapshot_id` → `58fe33e6-…`) |
| Arrived marks | `event_volunteer_ops.subject_key` (embeds the same name as `participant_key`) |
| Event lead / owner text | `events.event_owner` |
| Org `/volunteers` master | Aggregates only — **no person names** (unchanged) |

SignUpGenius public URL remains the external origin; Hey Ralli stores name-only copies on each snapshot.

## What was temporarily changed

Database rows only (not display-only, not app code).

1. **14** rows in `event_volunteer_participants` (latest snapshot only): `volunteer_name` + `participant_key`
2. **5** rows in `event_volunteer_ops` (`subject_type=participant`): `subject_key` (keep Arrived state working)
3. **1** row in `events`: `event_owner` `John Kidd` → `Jennifer Hayes`

Historical snapshots (older participant rows) were **not** changed — they are not shown in the normal Volunteers UI.

## Sync warning

This event’s SignUpGenius source is still **connected**. A successful auto-sync will create a **new** snapshot with real SUG names and point `latest_confirmed_snapshot_id` at it, undoing the marketing rename for the Volunteers tab. If that happens mid-recording, re-apply the rename against the new latest snapshot (or restore from JSON then re-run the marketing patch).

## Status

**Rolled back** 2026-08-09T03:31:00Z — original volunteer names, arrived `subject_key`s, and `event_owner` (`John Kidd`) restored on snapshot `58fe33e6-…` (still latest confirmed).

## Rollback procedure

Restore every original value from the JSON:

1. Open `BACK-TO-SCHOOL-FAIR-NAME-ROLLBACK-2026-08-08.json`.
2. For each row in `tables.event_volunteer_participants.rows`, set:
   - `volunteer_name` and `participant_key` back to the recorded originals (`id` match).
3. For each row in `tables.event_volunteer_ops.rows`, set:
   - `subject_key` back to the recorded original (`id` match).
4. For the event in `tables.events.rows`, set:
   - `event_owner` back to `John Kidd`.

Do **not** delete rows. Do **not** touch auth users or other events.

If a SignUpGenius sync already replaced the snapshot after this patch, restoring participant rows on snapshot `58fe33e6-…` alone may not change the live UI — restore ops + `event_owner` still, and either:

- point `event_volunteer_sources.latest_confirmed_snapshot_id` back to `58fe33e6-…` **only if** you intentionally want that older snapshot live again, or  
- ask an agent to re-apply the demo-name map on whatever snapshot is currently latest confirmed.
