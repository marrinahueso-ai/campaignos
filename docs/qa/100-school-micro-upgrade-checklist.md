# Nano → Micro upgrade checklist — `heyralli-staging`

**Status:** Preparation only. **The upgrade has NOT been performed.** This checklist exists so the upgrade, when someone chooses to do it, is a deliberate manual action with a clean before/after record — not something this or any automated tooling does on its own.

**Scope:** `heyralli-staging` (`hdoujyngcqrsgtvqehyt`) only. Production is never touched by this checklist or by any tool referenced in it.

**Current state as of this checklist (from the [post-seed Nano baseline](./100-school-post-seed-nano-baseline.md)):**

| Metric | Value |
|---|---:|
| Compute tier | **Nano** |
| CPU utilization (idle) | 44% |
| Memory utilization (idle) | 62% |
| Disk IO utilization (idle) | 1% |
| Active connections / max | 16 / 60 |
| Database logical size | 28 MB |
| Disk used / provisioned | 0.274 GB / 2 GB (14%) |

---

## Before upgrade

- [ ] Confirm the [post-seed Nano snapshot](./100-school-post-seed-nano-baseline.md) is saved and committed (it is — see git history for `docs/qa/100-school-post-seed-nano-baseline.md`).
- [ ] Confirm no seed or cleanup process is currently running. Check with:
  ```bash
  TEST_RUN_ID=arch100 npm run test:load:preflight:100-schools
  ```
  Look specifically at the **"No concurrent seed or cleanup lock is active"** line — it must say `PASS`/inactive before proceeding. (A lock held during a compute resize is not itself dangerous — Supabase resizes safely regardless — but resizing mid-seed would introduce a connection blip that's easiest to just avoid.)
- [ ] Confirm the fixture and documentation are backed up in Git:
  - `docs/qa/100-school-pre-seed-baseline.md`, `docs/qa/100-school-post-seed-nano-baseline.md`, `docs/qa/100-school-seed-architecture-design-review.md` are committed.
  - `load-tests/k6/data/accounts.100-school-architecture.local.json` is **intentionally gitignored** (see design-review §13) — it is the local source of truth for org/user/event IDs. If the machine holding it could be lost before the upgrade, copy it somewhere durable (a password manager, encrypted drive, or private artifact store) — **do not commit it** (see §13 for why).
- [ ] Note current CPU / memory / connections / compute tier (recorded in the table above — re-check the Supabase dashboard Infrastructure page immediately before starting in case anything has drifted since this doc was written).
- [ ] Note expected temporary downtime: Supabase compute resizes typically cause **a brief connection interruption (usually well under a minute)** while the instance restarts on new hardware; the project is not reachable during that window. Do this at a time when no one else is actively using `heyralli-staging` (check with the team / #eng-staging if applicable).

## Manual Supabase dashboard action

- [ ] In the Supabase dashboard, open **Project Settings → Infrastructure** (or **Compute and Disk**) for `heyralli-staging`.
- [ ] Resize the compute add-on from **Nano → Micro**.
- [ ] **Do not** touch the production project (`zyllfqieeihshnwpakiv`) — verify the project name/ref in the dashboard header before confirming the resize.
- [ ] Wait until the project's health indicator returns to normal (Supabase shows a "restarting"/"upgrading" state during the resize — wait for it to clear before proceeding to the checks below).

## After upgrade

- [ ] Verify database access:
  ```bash
  TEST_RUN_ID=arch100 npm run test:load:validate:100-schools
  ```
  Expect `25/25 checks passed` — the same result as before the upgrade, proving the resize didn't disturb the data or connectivity.
- [ ] Verify Supabase Auth: the validation run above already includes a real `signInWithPassword` call (part of the RLS negative check) — a `PASS` there confirms Auth is healthy post-resize.
- [ ] Verify Storage: 
  ```bash
  node --env-file=.env.staging.local -e "import('@supabase/supabase-js').then(async({createClient})=>{const c=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const {data,error}=await c.storage.listBuckets();console.log(error||data.map(b=>b.id));});"
  ```
  Expect all 8 buckets listed with no error.
- [ ] Verify Vercel Preview: load the current staging Preview URL in a browser and confirm the app renders (dashboard/login page reachable).
- [ ] Run one manual authenticated dashboard request: sign in as one seeded user (e.g. via the app's login page using a `loadtest+...@loadtest.heyralli.invalid` email + the shared `K6_TEST_PASSWORD`) and load their org dashboard — confirms end-to-end app→Supabase connectivity on Micro, not just direct API calls.
- [ ] Confirm seeded organization data is unchanged:
  ```bash
  npm run test:load:snapshot:database
  ```
  Compare row counts against the [post-seed baseline](./100-school-post-seed-nano-baseline.md) table — every count should match exactly (120 organizations, 960 organization_users, 2,540 events, 12,540 milestones, etc.).
- [ ] Capture a Micro idle snapshot: repeat the same dashboard-based capture process used for the [pre-seed](./100-school-pre-seed-baseline.md) and [post-seed](./100-school-post-seed-nano-baseline.md) docs (Database size, Storage usage, Table row counts, Largest tables, Largest indexes, Bucket sizes, Supabase compute metrics) and save as `docs/qa/100-school-post-upgrade-micro-baseline.md`, diffed against the post-seed Nano baseline.
- [ ] **Do not run load until preflight passes:**
  ```bash
  TEST_RUN_ID=arch100 npm run test:load:preflight:100-schools
  ```
  This will still report the two expected "pending" items (session fixture not minted, so freshness/exclusive-session checks fail) until sessions are actually minted for this profile — that is expected and is a separate, later step, not part of this checklist.

---

## Explicitly out of scope for this checklist

- Running the 20-VU data-scale test, or 50/75/100-VU profiles.
- Automatically or silently performing the resize (this is a **manual, human-confirmed dashboard action only**).
- Any query, index, RLS, or storage-architecture change.
- Any change to production.
