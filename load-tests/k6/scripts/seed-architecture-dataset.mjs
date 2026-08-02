#!/usr/bin/env node
/**
 * 100-school architecture-validation seed ("100-school-architecture" profile).
 *
 * Builds a larger, deterministic synthetic dataset (100 orgs / 800 users /
 * 2,500 events / 12,500 milestones + representative communications,
 * approvals, inbox threads, brand-kit, calendar-import, and AI-asset-metadata
 * rows) so we can validate schema/RLS/indexing behavior at 5x the current
 * 20-school scale — WITHOUT running any k6 load profile and WITHOUT
 * touching the already-validated 20-school fixture
 * (data/accounts.local.json, used by smoke/20-schools/light-peak/
 * launch-spike/headroom).
 *
 * Safety:
 *   - Refuses to run against the known production Supabase project (no override)
 *   - Prints the target project ref before doing anything
 *   - Requires SEED_PROFILE=100-school-architecture
 *   - Requires SEED_CONFIRM=100-school-architecture to write (dry run skips this)
 *   - --dry-run / SEED_DRY_RUN=true reports intended inserts without writing
 *   - Idempotent: safe to re-run after an interruption (fetch-existing-then-
 *     insert-missing pattern for every table; auth users looked up by email)
 *
 * Usage:
 *   TEST_RUN_ID=arch001 SEED_PROFILE=100-school-architecture \
 *   K6_TEST_PASSWORD='…' SEED_DRY_RUN=true \
 *     node --env-file=.env.staging.local load-tests/k6/scripts/seed-architecture-dataset.mjs
 *
 *   TEST_RUN_ID=arch001 SEED_PROFILE=100-school-architecture \
 *   K6_TEST_PASSWORD='…' SEED_CONFIRM=100-school-architecture \
 *     node --env-file=.env.staging.local load-tests/k6/scripts/seed-architecture-dataset.mjs
 *
 * Writes load-tests/k6/data/accounts.100-school-architecture.local.json (gitignored).
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertStagingProject,
  isDryRun,
  k6Root,
  loadDefaultEnvFiles,
  requireEnv,
  requireExplicitConfirmation,
} from "./lib/env.mjs";
import { k6Prefix, listSchools, schoolName, buildSchoolUsers } from "./lib/schools.mjs";
import {
  ARCHITECTURE_CONFIG as CFG,
  ARCHITECTURE_ROLE_BLUEPRINT,
  ARCHITECTURE_PLAYBOOK_STEPS,
  EVENT_TYPES,
  PROFILE_KEY,
  brandKitItemSpecs,
  buildMilestonesForEvent,
  communicationItemForEvent,
  eventAssetSpec,
  inboxThreadSpec,
  schoolYearLabel,
} from "./lib/architecture-profile.mjs";
import { acquireSeedLock } from "./lib/seed-lock.mjs";
import { runPreflightDuplicateScan } from "./lib/duplicate-scan.mjs";

loadDefaultEnvFiles();

const testRunId = requireEnv("TEST_RUN_ID");
const seedProfile = process.env.SEED_PROFILE || "";
const dryRun = isDryRun();

if (seedProfile !== PROFILE_KEY) {
  throw new Error(
    `This script requires SEED_PROFILE=${PROFILE_KEY} (got "${seedProfile || "unset"}"). ` +
      `This guards against accidentally seeding 100 schools with the wrong tooling.`,
  );
}

const password = requireEnv("K6_TEST_PASSWORD");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const emailDomain = process.env.K6_EMAIL_DOMAIN || "loadtest.heyralli.invalid";

const projectRef = assertStagingProject(supabaseUrl);
console.log(`[arch-seed] TEST_RUN_ID=${testRunId} profile=${seedProfile} project=${projectRef}`);
console.log(
  `[arch-seed] schools=${CFG.schoolCount} events/school=${CFG.eventsPerSchool} ` +
    `milestones/event=${CFG.milestonesPerEvent} mode=${dryRun ? "DRY-RUN (no writes)" : "WRITE"}`,
);

if (!dryRun) {
  requireExplicitConfirmation(PROFILE_KEY);
} else {
  console.log("[arch-seed] Dry run — SEED_CONFIRM not required, no rows will be written.");
}

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "public" },
});

const prefix = k6Prefix(testRunId);
const schoolIndexes = listSchools(CFG.schoolCount, { pad: CFG.schoolNamePad }).map((s) => s.index);

// ---------------------------------------------------------------------------
// Preflight duplicate scan — read-only, runs in BOTH dry-run and write mode.
// Write mode refuses to proceed on any collision; dry-run only reports.
// ---------------------------------------------------------------------------
console.log("[arch-seed] Preflight: scanning for pre-existing collisions before writing…");
const collisions = await runPreflightDuplicateScan(admin, {
  testRunId,
  schoolIndexes,
  schoolNamePad: CFG.schoolNamePad,
});
if (collisions.length) {
  console.error(`[arch-seed] Preflight found ${collisions.length} collision group(s):`);
  for (const c of collisions) {
    console.error(`  - ${c.table} (${c.issue}): ${c.keys.length} key(s), e.g. ${JSON.stringify(c.keys.slice(0, 3))}`);
  }
  if (!dryRun) {
    throw new Error(
      "Preflight duplicate scan found ambiguous existing rows. Resolve manually (this tool never silently " +
        "picks one duplicate row) — see docs/qa/100-school-seed-architecture-design-review.md.",
    );
  }
  console.warn("[arch-seed] DRY RUN — collisions reported above are informational only; write mode would refuse to proceed.");
} else {
  console.log("[arch-seed] Preflight: no collisions found.");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Bounded-concurrency map with per-item retry + exponential backoff. */
async function boundedConcurrentMap(items, worker, { concurrency = 5, retries = 5, baseDelayMs = 500 } = {}) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;

  async function runOne(item, idx) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        results[idx] = await worker(item, idx);
        return;
      } catch (err) {
        const rateLimited = /rate limit|too many requests|429/i.test(err?.message || "");
        if (!rateLimited || attempt === retries) throw err;
        const wait = baseDelayMs * 2 ** attempt + Math.random() * 250;
        await sleep(wait);
      }
    }
  }

  async function lane() {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      await runOne(items[idx], idx);
      completed += 1;
      if (completed % 25 === 0 || completed === items.length) {
        process.stdout.write(`[arch-seed] auth users: ${completed}/${items.length}\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => lane()));
  return results;
}

// ---------------------------------------------------------------------------
// Dry-run counters (also used to sanity-check real totals against expectations)
// ---------------------------------------------------------------------------
const expected = {
  organizations: CFG.schoolCount,
  users: CFG.schoolCount * ARCHITECTURE_ROLE_BLUEPRINT.length,
  events: CFG.schoolCount * CFG.eventsPerSchool,
  milestones: CFG.schoolCount * CFG.eventsPerSchool * CFG.milestonesPerEvent,
  communicationItems: CFG.schoolCount * CFG.eventsPerSchool * CFG.communicationItemsPerEvent,
  eventAssets: CFG.schoolCount * CFG.eventsPerSchool * CFG.eventAssetsPerEvent,
  playbooks: CFG.schoolCount,
  playbookSteps: CFG.schoolCount * CFG.playbookStepsPerOrg,
  inboxThreads: CFG.schoolCount * CFG.inboxThreadsPerOrg,
  brandKitItems: CFG.schoolCount * CFG.brandKitItemsPerOrg,
  calendarImports: CFG.schoolCount * CFG.calendarImportsPerOrg,
};

if (dryRun) {
  console.log("[arch-seed] DRY RUN — intended inserts (no writes performed):");
  console.table(expected);
  console.log(
    `[arch-seed] Total non-auth rows ≈ ${Object.values(expected).reduce((a, b) => a + b, 0) - expected.organizations - expected.users}`,
  );
  console.log(`[arch-seed] Plus ${expected.organizations} school_years, ${expected.users} organization_roles, ${expected.users} auth users.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Auth users — resolved once, up front, via bounded concurrency (Step 5)
// ---------------------------------------------------------------------------

/** Fetch every auth user by paging until a short/empty page is returned. */
async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers page ${page}: ${error.message}`);
    const found = (data?.users || []).find((u) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (!data?.users?.length || data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(email, displayName) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName, load_test_run_id: testRunId, seed_profile: PROFILE_KEY },
  });
  if (!error && created?.user) return created.user;

  const msg = error?.message || "";
  if (!/already|registered|exists/i.test(msg)) {
    throw new Error(`createUser ${email}: ${msg}`);
  }
  const found = await findAuthUserByEmail(email);
  if (!found) throw new Error(`User ${email} exists but could not be listed`);
  return found;
}

/**
 * Resolves auth users for every (email, displayName) spec with bounded
 * concurrency, retry + exponential backoff on rate limits, progress
 * reporting, and resumability (already-created users are looked up, not
 * recreated, so re-running after an interruption is safe).
 */
async function provisionAuthUsers(specs) {
  const results = await boundedConcurrentMap(
    specs,
    async (spec) => ensureAuthUser(spec.email, spec.displayName),
    { concurrency: 6, retries: 6, baseDelayMs: 600 },
  );
  const byEmail = new Map();
  specs.forEach((spec, i) => byEmail.set(spec.email, results[i]));
  return byEmail;
}

// ---------------------------------------------------------------------------
// Per-org structural rows
// ---------------------------------------------------------------------------
async function ensureOrganization(index) {
  const name = schoolName(index, { pad: CFG.schoolNamePad });
  const orgDisplayName = `${name} (${testRunId})`;

  const { data: existingOrg, error: findErr } = await admin
    .from("organizations")
    .select("id")
    .eq("name", orgDisplayName)
    .maybeSingle();
  if (findErr) throw new Error(`organizations lookup: ${findErr.message}`);
  if (existingOrg?.id) return { organizationId: existingOrg.id, name, orgDisplayName, created: false };

  const trialEnds = new Date();
  trialEnds.setFullYear(trialEnds.getFullYear() + 1);
  const { data: org, error } = await admin
    .from("organizations")
    .insert({
      name: orgDisplayName,
      timezone: "America/Chicago",
      plan_tier: "trial",
      subscription_status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
      billing_exempt_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`organizations insert (${orgDisplayName}): ${error.message}`);
  return { organizationId: org.id, name, orgDisplayName, created: true };
}

async function ensureSchoolYear(organizationId) {
  const label = schoolYearLabel();
  const { data: existing, error: findErr } = await admin
    .from("school_years")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("label", label)
    .maybeSingle();
  if (findErr) throw new Error(`school_years lookup: ${findErr.message}`);
  if (existing?.id) {
    await admin.from("organizations").update({ active_school_year_id: existing.id }).eq("id", organizationId);
    return existing.id;
  }
  const { data, error } = await admin
    .from("school_years")
    .insert({ organization_id: organizationId, label, status: "active" })
    .select("id")
    .single();
  if (error) throw new Error(`school_years insert: ${error.message}`);
  await admin.from("organizations").update({ active_school_year_id: data.id }).eq("id", organizationId);
  return data.id;
}

async function ensureOrgRoles(organizationId) {
  const { data: existing, error } = await admin
    .from("organization_roles")
    .select("id, name")
    .eq("organization_id", organizationId);
  if (error) throw new Error(`organization_roles lookup: ${error.message}`);
  const byName = new Map((existing || []).map((r) => [r.name, r.id]));

  const missing = ARCHITECTURE_ROLE_BLUEPRINT.filter((r) => !byName.has(r.orgRoleName));
  if (missing.length) {
    const rows = missing.map((r) => ({
      organization_id: organizationId,
      name: r.orgRoleName,
      system_role: false,
      description: `${r.label} — architecture seed`,
      role_kind: r.roleKind,
      sort_order: r.sortOrder,
      campaign_role: r.campaignRole,
    }));
    const { data: inserted, error: insErr } = await admin
      .from("organization_roles")
      .insert(rows)
      .select("id, name");
    if (insErr) throw new Error(`organization_roles insert: ${insErr.message}`);
    for (const r of inserted || []) byName.set(r.name, r.id);
  }
  return byName;
}

async function ensureOrgUsers(organizationId, schoolIndex, authUsersByEmail) {
  const usersSpec = buildSchoolUsers(schoolIndex, testRunId, emailDomain, {
    roleBlueprint: ARCHITECTURE_ROLE_BLUEPRINT,
    pad: CFG.schoolNamePad,
  });
  const roleByName = await ensureOrgRoles(organizationId);

  const { data: existingMembers, error } = await admin
    .from("organization_users")
    .select("id, email, user_id")
    .eq("organization_id", organizationId);
  if (error) throw new Error(`organization_users lookup: ${error.message}`);
  const byEmail = new Map((existingMembers || []).map((m) => [m.email, m]));

  const users = [];
  for (const spec of usersSpec) {
    const authUser = authUsersByEmail.get(spec.email);
    if (!authUser) throw new Error(`No provisioned auth user for ${spec.email}`);
    const orgRoleId = roleByName.get(spec.orgRoleName) || null;
    const existingMember = byEmail.get(spec.email);

    if (!existingMember) {
      const { error: memErr } = await admin.from("organization_users").insert({
        organization_id: organizationId,
        user_id: authUser.id,
        email: spec.email,
        campaign_role: spec.campaignRole,
        organization_role_id: orgRoleId,
        status: "active",
        joined_at: new Date().toISOString(),
      });
      if (memErr) throw new Error(`organization_users insert ${spec.email}: ${memErr.message}`);
    } else if (!existingMember.user_id) {
      await admin
        .from("organization_users")
        .update({ user_id: authUser.id, status: "active" })
        .eq("id", existingMember.id);
    }
    users.push({ ...spec, userId: authUser.id });
  }
  return users;
}

async function ensureEvents(organizationId, schoolYearId, schoolIndex) {
  const { data: existing, error } = await admin
    .from("events")
    .select("id, title")
    .eq("school_year_id", schoolYearId);
  if (error) throw new Error(`events lookup: ${error.message}`);
  const existingTitles = new Set((existing || []).map((e) => e.title));

  const toInsert = [];
  for (let e = 1; e <= CFG.eventsPerSchool; e += 1) {
    const title = `${prefix} School ${String(schoolIndex).padStart(CFG.schoolNamePad, "0")} Event ${String(e).padStart(2, "0")}`;
    if (existingTitles.has(title)) continue;
    const date = new Date();
    date.setDate(date.getDate() + 7 + ((schoolIndex + e) % 90));
    toInsert.push({
      title,
      description: `${prefix} synthetic architecture-seed event — safe to delete`,
      date: date.toISOString().slice(0, 10),
      status: "scheduled",
      school_year_id: schoolYearId,
      location: "Gymnasium",
      event_type: EVENT_TYPES[e % EVENT_TYPES.length],
      communication_strategy: "full_campaign",
    });
  }

  let inserted = [];
  if (toInsert.length) {
    for (const batch of chunk(toInsert, 100)) {
      const { data, error: insErr } = await admin.from("events").insert(batch).select("id, title");
      if (insErr) throw new Error(`events insert: ${insErr.message}`);
      inserted = inserted.concat(data || []);
    }
  }
  return [...(existing || []), ...inserted];
}

async function ensureMilestones(events) {
  const eventIds = events.map((e) => e.id);
  if (!eventIds.length) return 0;

  const existingPairs = new Set();
  for (const batch of chunk(eventIds, 200)) {
    const { data, error } = await admin
      .from("approval_scheduling_items")
      .select("event_id, milestone_name")
      .in("event_id", batch);
    if (error) throw new Error(`approval_scheduling_items lookup: ${error.message}`);
    for (const row of data || []) existingPairs.add(`${row.event_id}::${row.milestone_name}`);
  }

  const toInsert = [];
  for (const ev of events) {
    const milestones = buildMilestonesForEvent(prefix, ev.title, CFG.milestonesPerEvent);
    for (const m of milestones) {
      const key = `${ev.id}::${m.milestone_name}`;
      if (existingPairs.has(key)) continue;
      toInsert.push({ event_id: ev.id, ...m });
    }
  }

  let count = 0;
  for (const batch of chunk(toInsert, 500)) {
    const { error } = await admin.from("approval_scheduling_items").insert(batch);
    if (error) throw new Error(`approval_scheduling_items insert: ${error.message}`);
    count += batch.length;
  }
  return count;
}

async function ensureCommunicationItems(events) {
  const eventIds = events.map((e) => e.id);
  if (!eventIds.length) return 0;

  const existingKeys = new Set();
  for (const batch of chunk(eventIds, 200)) {
    const { data, error } = await admin
      .from("communication_items")
      .select("event_id, channel")
      .in("event_id", batch);
    if (error) throw new Error(`communication_items lookup: ${error.message}`);
    for (const row of data || []) existingKeys.add(`${row.event_id}::${row.channel}`);
  }

  const toInsert = [];
  events.forEach((ev, i) => {
    const spec = communicationItemForEvent(i);
    const key = `${ev.id}::${spec.channel}`;
    if (existingKeys.has(key)) return;
    toInsert.push({ event_id: ev.id, ...spec });
  });

  let count = 0;
  for (const batch of chunk(toInsert, 500)) {
    const { error } = await admin.from("communication_items").insert(batch);
    if (error) throw new Error(`communication_items insert: ${error.message}`);
    count += batch.length;
  }
  return count;
}

async function ensureEventAssets(events) {
  const eventIds = events.map((e) => e.id);
  if (!eventIds.length) return 0;

  const spec = eventAssetSpec();
  const existingEventIds = new Set();
  for (const batch of chunk(eventIds, 200)) {
    const { data, error } = await admin
      .from("event_assets")
      .select("event_id")
      .eq("asset_type", spec.asset_type)
      .in("event_id", batch);
    if (error) throw new Error(`event_assets lookup: ${error.message}`);
    for (const row of data || []) existingEventIds.add(row.event_id);
  }

  const toInsert = events.filter((ev) => !existingEventIds.has(ev.id)).map((ev) => ({ event_id: ev.id, ...spec }));

  let count = 0;
  for (const batch of chunk(toInsert, 500)) {
    const { error } = await admin.from("event_assets").insert(batch);
    if (error) throw new Error(`event_assets insert: ${error.message}`);
    count += batch.length;
  }
  return count;
}

async function ensurePlaybook(organizationId, orgIndex) {
  const slug = "architecture-general";
  const { data: existing, error } = await admin
    .from("communication_playbooks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`communication_playbooks lookup: ${error.message}`);

  let playbookId = existing?.id;
  if (!playbookId) {
    const { data, error: insErr } = await admin
      .from("communication_playbooks")
      .insert({
        organization_id: organizationId,
        slug,
        name: `${prefix} General Event Playbook`,
        description: "Architecture-seed playbook — safe to delete",
        event_type: "general_event",
        is_system: false,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(`communication_playbooks insert (org ${orgIndex}): ${insErr.message}`);
    playbookId = data.id;
  }

  // Natural key = (playbook_id, sort_order): ARCHITECTURE_PLAYBOOK_STEPS has
  // one fixed, deterministic sort_order per step (0..4), so this is the
  // stable identity to check per-step rather than an all-or-nothing count.
  // This means a run interrupted after inserting only some steps (e.g. a
  // crash mid-batch) is safely resumable, and any content drift on an
  // existing step (someone hand-edited it) is reported but never overwritten.
  const { data: existingSteps, error: stepsErr } = await admin
    .from("communication_playbook_steps")
    .select("id, sort_order, title, channel, relative_day")
    .eq("playbook_id", playbookId);
  if (stepsErr) throw new Error(`communication_playbook_steps lookup: ${stepsErr.message}`);

  const bySortOrder = new Map();
  for (const row of existingSteps || []) {
    if (bySortOrder.has(row.sort_order)) {
      throw new Error(
        `communication_playbook_steps: duplicate sort_order=${row.sort_order} for playbook ${playbookId} — ` +
          `refusing to guess which row is correct (see design-review doc § idempotency).`,
      );
    }
    bySortOrder.set(row.sort_order, row);
  }

  const toInsert = [];
  const driftWarnings = [];
  for (const step of ARCHITECTURE_PLAYBOOK_STEPS) {
    const existing = bySortOrder.get(step.sort_order);
    if (!existing) {
      toInsert.push({ playbook_id: playbookId, ...step, is_required: true });
      continue;
    }
    if (existing.title !== step.title || existing.channel !== step.channel || existing.relative_day !== step.relative_day) {
      driftWarnings.push(
        `sort_order=${step.sort_order} expected title="${step.title}" channel=${step.channel} relative_day=${step.relative_day}, ` +
          `found title="${existing.title}" channel=${existing.channel} relative_day=${existing.relative_day}`,
      );
    }
  }
  if (driftWarnings.length) {
    console.warn(`[arch-seed] communication_playbook_steps content drift for playbook ${playbookId}:`);
    for (const w of driftWarnings) console.warn(`  - ${w}`);
  }

  let stepsInserted = 0;
  if (toInsert.length) {
    const { error: stepErr } = await admin.from("communication_playbook_steps").insert(toInsert);
    if (stepErr) throw new Error(`communication_playbook_steps insert: ${stepErr.message}`);
    stepsInserted = toInsert.length;
  }

  const { count: finalCount, error: finalCountErr } = await admin
    .from("communication_playbook_steps")
    .select("id", { count: "exact", head: true })
    .eq("playbook_id", playbookId);
  if (finalCountErr) throw new Error(`communication_playbook_steps final count: ${finalCountErr.message}`);
  if (finalCount !== ARCHITECTURE_PLAYBOOK_STEPS.length) {
    throw new Error(
      `communication_playbook_steps: expected exactly ${ARCHITECTURE_PLAYBOOK_STEPS.length} steps for playbook ` +
        `${playbookId}, found ${finalCount} (possible duplicate or incomplete insert).`,
    );
  }

  return { playbookId, stepsInserted };
}

async function ensureInboxThreads(organizationId, orgIndex) {
  const { data: existing, error } = await admin
    .from("inbox_threads")
    .select("external_thread_id")
    .eq("organization_id", organizationId);
  if (error) throw new Error(`inbox_threads lookup: ${error.message}`);
  const existingIds = new Set((existing || []).map((r) => r.external_thread_id));

  const toInsert = [];
  for (let i = 0; i < CFG.inboxThreadsPerOrg; i += 1) {
    const externalThreadId = `${prefix}-arch-o${orgIndex}-thread-${i}`;
    if (existingIds.has(externalThreadId)) continue;
    const spec = inboxThreadSpec(i);
    toInsert.push({
      organization_id: organizationId,
      channel_type: spec.channel_type,
      external_thread_id: externalThreadId,
      status: spec.status,
      unread_count: spec.status === "pending" ? 1 : 0,
      metadata: { load_test_run_id: testRunId, seed_profile: PROFILE_KEY, synthetic: true },
    });
  }
  if (toInsert.length) {
    const { error: insErr } = await admin.from("inbox_threads").insert(toInsert);
    if (insErr) throw new Error(`inbox_threads insert: ${insErr.message}`);
  }
  return toInsert.length;
}

async function ensureBrandKitItems(organizationId, orgIndex) {
  const specs = brandKitItemSpecs(orgIndex);
  const { data: existing, error } = await admin
    .from("organization_brand_kit_items")
    .select("label")
    .eq("organization_id", organizationId);
  if (error) throw new Error(`organization_brand_kit_items lookup: ${error.message}`);
  const existingLabels = new Set((existing || []).map((r) => r.label));

  const toInsert = specs
    .filter((s) => !existingLabels.has(s.label))
    .map((s) => ({ organization_id: organizationId, sort_order: 0, ...s }));
  if (toInsert.length) {
    const { error: insErr } = await admin.from("organization_brand_kit_items").insert(toInsert);
    if (insErr) throw new Error(`organization_brand_kit_items insert: ${insErr.message}`);
  }
  return toInsert.length;
}

async function ensureCalendarImport(organizationId, schoolYearId, orgIndex) {
  const filename = `${prefix}-arch-o${orgIndex}-calendar.ics`;
  const { data: existing, error } = await admin
    .from("calendar_imports")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("filename", filename)
    .maybeSingle();
  if (error) throw new Error(`calendar_imports lookup: ${error.message}`);
  if (existing?.id) return 0;

  const { error: insErr } = await admin.from("calendar_imports").insert({
    organization_id: organizationId,
    filename,
    file_type: "ics",
    storage_path: `architecture-seed/org-${orgIndex}/${filename}`,
    upload_status: "uploaded",
    parse_status: "imported",
    parsed_events: { event_count: CFG.eventsPerSchool, synthetic: true },
    imported_at: new Date().toISOString(),
    school_year_id: schoolYearId,
  });
  if (insErr) throw new Error(`calendar_imports insert: ${insErr.message}`);
  return 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seedSchool(schoolIndex, authUsersByEmail) {
  const { organizationId, name, orgDisplayName } = await ensureOrganization(schoolIndex);
  const schoolYearId = await ensureSchoolYear(organizationId);
  const users = await ensureOrgUsers(organizationId, schoolIndex, authUsersByEmail);
  const events = await ensureEvents(organizationId, schoolYearId, schoolIndex);
  const milestonesInserted = await ensureMilestones(events);
  const commsInserted = await ensureCommunicationItems(events);
  const assetsInserted = await ensureEventAssets(events);
  const { stepsInserted } = await ensurePlaybook(organizationId, schoolIndex);
  const inboxInserted = await ensureInboxThreads(organizationId, schoolIndex);
  const brandKitInserted = await ensureBrandKitItems(organizationId, schoolIndex);
  const calendarInserted = await ensureCalendarImport(organizationId, schoolYearId, schoolIndex);

  return {
    index: schoolIndex,
    name,
    orgDisplayName,
    organizationId,
    schoolYearId,
    eventIds: events.map((e) => e.id),
    eventTitles: events.map((e) => e.title),
    users,
    counts: {
      events: events.length,
      milestonesInserted,
      commsInserted,
      assetsInserted,
      stepsInserted,
      inboxInserted,
      brandKitInserted,
      calendarInserted,
    },
  };
}

async function main() {
  console.log(
    `[arch-seed] Phase 1/2: provisioning ${schoolIndexes.length * ARCHITECTURE_ROLE_BLUEPRINT.length} auth users ` +
      `(bounded concurrency=6, retry+backoff on rate limits)…`,
  );
  const allUserSpecs = schoolIndexes.flatMap((index) =>
    buildSchoolUsers(index, testRunId, emailDomain, {
      roleBlueprint: ARCHITECTURE_ROLE_BLUEPRINT,
      pad: CFG.schoolNamePad,
    }),
  );
  const authStart = Date.now();
  const authUsersByEmail = await provisionAuthUsers(allUserSpecs);
  console.log(
    `[arch-seed] Auth provisioning done: ${authUsersByEmail.size}/${allUserSpecs.length} users ` +
      `(${Math.round((Date.now() - authStart) / 1000)}s)`,
  );

  console.log("[arch-seed] Phase 2/2: seeding organizations + structural data…");
  const schools = [];
  const totals = {
    milestonesInserted: 0,
    commsInserted: 0,
    assetsInserted: 0,
    stepsInserted: 0,
    inboxInserted: 0,
    brandKitInserted: 0,
    calendarInserted: 0,
  };

  const startedAt = Date.now();
  for (const index of schoolIndexes) {
    const t0 = Date.now();
    const seeded = await seedSchool(index, authUsersByEmail);
    schools.push(seeded);
    for (const k of Object.keys(totals)) totals[k] += seeded.counts[k] || 0;
    console.log(
      `[arch-seed] School ${index}/${CFG.schoolCount} ok org=${seeded.organizationId} ` +
        `events=${seeded.counts.events} (+${Math.round((Date.now() - t0) / 100) / 10}s)`,
    );
  }

  const totalUsers = schools.reduce((sum, s) => sum + s.users.length, 0);
  const totalEvents = schools.reduce((sum, s) => sum + s.eventIds.length, 0);

  console.log("[arch-seed] Done. Totals:");
  console.table({
    organizations: schools.length,
    users: totalUsers,
    events: totalEvents,
    ...totals,
  });
  console.log(`[arch-seed] Elapsed: ${Math.round((Date.now() - startedAt) / 1000)}s`);

  const foreign = schools[1] || schools[0];
  const accounts = {
    testRunId,
    seedProfile: PROFILE_KEY,
    createdAt: new Date().toISOString(),
    passwordEnv: "K6_TEST_PASSWORD",
    projectRef,
    schools: schools.map((s) => ({
      index: s.index,
      name: s.name,
      organizationId: s.organizationId,
      schoolYearId: s.schoolYearId,
      eventIds: s.eventIds,
      eventTitles: s.eventTitles,
      users: s.users.map((u) => ({
        key: u.key,
        email: u.email,
        userId: u.userId,
        campaignRole: u.campaignRole,
        orgRoleName: u.orgRoleName,
        label: u.label,
      })),
    })),
    foreignProbe: foreign
      ? { organizationId: foreign.organizationId, eventId: foreign.eventIds[0], eventTitle: foreign.eventTitles[0] }
      : null,
  };

  const outDir = resolve(k6Root(), "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `accounts.${PROFILE_KEY}.local.json`);
  writeFileSync(outPath, JSON.stringify(accounts, null, 2));
  console.log(`[arch-seed] Wrote ${outPath}`);
  console.log("[arch-seed] Next: npm run test:load:validate:100-schools");
}

async function run() {
  const lock = await acquireSeedLock(admin, {
    projectRef,
    profile: PROFILE_KEY,
    testRunId,
    heldBy: "seed",
  });
  try {
    await main();
  } finally {
    await lock.release();
  }
}

run().catch((err) => {
  console.error("[arch-seed] FAILED:", err.message || err);
  process.exit(1);
});
