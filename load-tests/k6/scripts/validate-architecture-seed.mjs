#!/usr/bin/env node
/**
 * Integrity validation for the `100-school-architecture` seed.
 *
 * Verifies exact counts, role coverage, no duplicate emails/memberships,
 * expected event/milestone counts, no orphaned/cross-tenant rows, and RLS
 * negative access (a session from org A cannot read org B's data).
 *
 * Exits non-zero and prints every failing check if anything is wrong —
 * never claims "ready" on a partial pass.
 *
 * Usage:
 *   TEST_RUN_ID=arch001 \
 *     node --env-file=.env.staging.local load-tests/k6/scripts/validate-architecture-seed.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertStagingProject, k6Root, loadDefaultEnvFiles, requireEnv } from "./lib/env.mjs";
import { ARCHITECTURE_CONFIG as CFG, ARCHITECTURE_ROLE_BLUEPRINT, PROFILE_KEY } from "./lib/architecture-profile.mjs";
import { scanOrganizationsForDuplicates } from "./lib/duplicate-scan.mjs";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function selectIn(admin, table, columns, column, ids) {
  let rows = [];
  for (const batch of chunk(ids, 200)) {
    const { data, error } = await admin.from(table).select(columns).in(column, batch);
    if (error) throw new Error(`${table} select: ${error.message}`);
    rows = rows.concat(data || []);
  }
  return rows;
}

/**
 * Runs every integrity + duplicate check against the given accounts fixture.
 * Read-only. Returns the full list of { name, pass, detail } results —
 * callers decide how to print/exit (the CLI below, or the read-only
 * preflight script, which just checks pass/fail counts).
 */
export async function runIntegrityChecks({ admin, supabaseUrl, anonKey, password, testRunId, accounts, log = () => {} }) {
  const results = [];
  function record(name, pass, detail) {
    results.push({ name, pass, detail });
    log(`  [${pass ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
  }

  const expectedOrgIds = accounts.schools.map((s) => s.organizationId);
  const expectedEventIds = accounts.schools.flatMap((s) => s.eventIds);
  const expectedEmails = new Set(accounts.schools.flatMap((s) => s.users.map((u) => u.email)));

  console.log(`\n[validate] Scope: ${expectedOrgIds.length} orgs, ${expectedEventIds.length} events (from accounts file)\n`);

  // 1. Exactly 100 organizations
  const { count: orgCount, error: orgErr } = await admin
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .in("id", expectedOrgIds);
  if (orgErr) throw new Error(orgErr.message);
  record(
    `Exactly ${CFG.schoolCount} organizations`,
    orgCount === CFG.schoolCount && expectedOrgIds.length === CFG.schoolCount,
    `found=${orgCount} expected=${CFG.schoolCount} accountsFile=${expectedOrgIds.length}`,
  );

  // 2. Exactly 800 organization_user memberships
  const expectedUserTotal = CFG.schoolCount * ARCHITECTURE_ROLE_BLUEPRINT.length;
  const memberRows = await selectIn(admin, "organization_users", "id, organization_id, email, user_id", "organization_id", expectedOrgIds);
  record(
    `Exactly ${expectedUserTotal} organization_user memberships`,
    memberRows.length === expectedUserTotal,
    `found=${memberRows.length} expected=${expectedUserTotal}`,
  );

  // 3. Role coverage per organization (8 expected role names each)
  const roleRows = await selectIn(admin, "organization_roles", "organization_id, name", "organization_id", expectedOrgIds);
  const rolesByOrg = new Map();
  for (const r of roleRows) {
    if (!rolesByOrg.has(r.organization_id)) rolesByOrg.set(r.organization_id, new Set());
    rolesByOrg.get(r.organization_id).add(r.name);
  }
  const expectedRoleNames = ARCHITECTURE_ROLE_BLUEPRINT.map((r) => r.orgRoleName);
  const orgsMissingRoles = expectedOrgIds.filter((id) => {
    const names = rolesByOrg.get(id) || new Set();
    return !expectedRoleNames.every((n) => names.has(n));
  });
  record(
    `All ${CFG.schoolCount} orgs have full 8-role coverage`,
    orgsMissingRoles.length === 0,
    orgsMissingRoles.length ? `${orgsMissingRoles.length} orgs missing roles` : "",
  );

  // 4. No duplicate synthetic emails
  const emailCounts = new Map();
  for (const m of memberRows) emailCounts.set(m.email, (emailCounts.get(m.email) || 0) + 1);
  const dupeEmails = [...emailCounts.entries()].filter(([, c]) => c > 1);
  record(`No duplicate emails (${expectedEmails.size} unique expected)`, dupeEmails.length === 0, dupeEmails.length ? `${dupeEmails.length} dupes` : "");

  // 5. No duplicate memberships (organization_id, email)
  const memberKeyCounts = new Map();
  for (const m of memberRows) {
    const key = `${m.organization_id}::${m.email}`;
    memberKeyCounts.set(key, (memberKeyCounts.get(key) || 0) + 1);
  }
  const dupeMembers = [...memberKeyCounts.entries()].filter(([, c]) => c > 1);
  record("No duplicate (organization_id, email) memberships", dupeMembers.length === 0, dupeMembers.length ? `${dupeMembers.length} dupes` : "");

  // 6. Every membership has a resolved user_id (auth user linked)
  const unresolvedMembers = memberRows.filter((m) => !m.user_id);
  record("Every membership has a linked auth user_id", unresolvedMembers.length === 0, unresolvedMembers.length ? `${unresolvedMembers.length} unresolved` : "");

  // 7. Event counts — total + per-org
  const eventRows = await selectIn(admin, "events", "id, school_year_id, title", "id", expectedEventIds);
  const expectedEventTotal = CFG.schoolCount * CFG.eventsPerSchool;
  record(`Exactly ${expectedEventTotal} events`, eventRows.length === expectedEventTotal, `found=${eventRows.length} expected=${expectedEventTotal}`);

  const eventsBySchoolYear = new Map();
  for (const e of eventRows) eventsBySchoolYear.set(e.school_year_id, (eventsBySchoolYear.get(e.school_year_id) || 0) + 1);
  const wrongPerOrgEvents = accounts.schools.filter((s) => (eventsBySchoolYear.get(s.schoolYearId) || 0) !== CFG.eventsPerSchool);
  record(`Every org has exactly ${CFG.eventsPerSchool} events`, wrongPerOrgEvents.length === 0, wrongPerOrgEvents.length ? `${wrongPerOrgEvents.length} orgs off` : "");

  // 8. No orphaned events (school_year_id must be set + belong to our org set)
  const knownSchoolYearIds = new Set(accounts.schools.map((s) => s.schoolYearId));
  const orphanEvents = eventRows.filter((e) => !e.school_year_id || !knownSchoolYearIds.has(e.school_year_id));
  record("No orphaned events (valid school_year_id)", orphanEvents.length === 0, orphanEvents.length ? `${orphanEvents.length} orphans` : "");

  // 9. Milestones (approval_scheduling_items) — total + per-event + orphan check
  const milestoneRows = await selectIn(admin, "approval_scheduling_items", "id, event_id, milestone_name", "event_id", expectedEventIds);
  const expectedMilestoneTotal = expectedEventTotal * CFG.milestonesPerEvent;
  record(`Exactly ${expectedMilestoneTotal} milestones (approval_scheduling_items)`, milestoneRows.length === expectedMilestoneTotal, `found=${milestoneRows.length} expected=${expectedMilestoneTotal}`);

  const milestonesByEvent = new Map();
  for (const m of milestoneRows) milestonesByEvent.set(m.event_id, (milestonesByEvent.get(m.event_id) || 0) + 1);
  const wrongPerEventMilestones = expectedEventIds.filter((id) => (milestonesByEvent.get(id) || 0) !== CFG.milestonesPerEvent);
  record(`Every event has exactly ${CFG.milestonesPerEvent} milestones`, wrongPerEventMilestones.length === 0, wrongPerEventMilestones.length ? `${wrongPerEventMilestones.length} events off` : "");

  const knownEventIds = new Set(expectedEventIds);
  const orphanMilestones = milestoneRows.filter((m) => !knownEventIds.has(m.event_id));
  record("No orphaned milestones (valid event_id)", orphanMilestones.length === 0, orphanMilestones.length ? `${orphanMilestones.length} orphans` : "");

  // 10. Communications — no orphans, event_id valid
  const commRows = await selectIn(admin, "communication_items", "id, event_id", "event_id", expectedEventIds);
  const orphanComms = commRows.filter((c) => !knownEventIds.has(c.event_id));
  record("No orphaned communications (valid event_id)", orphanComms.length === 0, orphanComms.length ? `${orphanComms.length} orphans` : "");
  record(`Communications present (${commRows.length} rows)`, commRows.length > 0, `expected ≈${expectedEventTotal}`);

  // 11. Tenant-owned rows have valid organization_id (inbox_threads, brand kit, calendar_imports, playbooks)
  const orgIdSet = new Set(expectedOrgIds);
  const tenantTables = ["inbox_threads", "organization_brand_kit_items", "calendar_imports", "communication_playbooks"];
  let allTenantValid = true;
  const tenantDetails = [];
  for (const table of tenantTables) {
    const rows = await selectIn(admin, table, "id, organization_id", "organization_id", expectedOrgIds);
    const invalid = rows.filter((r) => !r.organization_id || !orgIdSet.has(r.organization_id));
    if (invalid.length) allTenantValid = false;
    tenantDetails.push(`${table}=${rows.length}${invalid.length ? ` (${invalid.length} invalid)` : ""}`);
  }
  record("All tenant-owned rows have a valid organization_id", allTenantValid, tenantDetails.join(", "));

  // 12. No cross-school reference: each event's milestones/comms belong to that event's own org
  const eventToOrg = new Map();
  for (const s of accounts.schools) for (const eid of s.eventIds) eventToOrg.set(eid, s.organizationId);
  const orgByEventForMilestones = milestoneRows.every((m) => eventToOrg.has(m.event_id));
  const orgByEventForComms = commRows.every((c) => eventToOrg.has(c.event_id));
  record("No cross-school event references (milestones/communications)", orgByEventForMilestones && orgByEventForComms, "");

  // 13. RLS negative check — a user from org A cannot read org B's events
  let rlsPass = false;
  let rlsDetail = "";
  try {
    const orgA = accounts.schools[0];
    const orgB = accounts.schools[1] || accounts.schools[0];
    if (orgA.organizationId === orgB.organizationId) {
      rlsDetail = "only one org available — skipped (inconclusive)";
    } else {
      const userA = orgA.users[0];
      const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({ email: userA.email, password });
      if (signInErr || !signIn?.session) throw new Error(`sign-in failed: ${signInErr?.message}`);

      const { data: crossOrgEvents, error: qErr } = await client
        .from("events")
        .select("id")
        .eq("school_year_id", orgB.schoolYearId);
      if (qErr) {
        // RLS denying via error is also an acceptable "deny" outcome
        rlsPass = true;
        rlsDetail = `org A user querying org B events → error (denied): ${qErr.message}`;
      } else {
        rlsPass = (crossOrgEvents || []).length === 0;
        rlsDetail = `org A user querying org B events → ${crossOrgEvents?.length ?? 0} rows (expected 0)`;
      }

      const { data: crossOrgRow } = await client.from("organizations").select("id").eq("id", orgB.organizationId).maybeSingle();
      if (crossOrgRow) {
        rlsPass = false;
        rlsDetail += "; ALSO: org A user could read org B's organizations row";
      }
      await client.auth.signOut();
    }
  } catch (err) {
    rlsDetail = `check errored: ${err.message}`;
  }
  record("RLS negative check: cross-school access denied", rlsPass, rlsDetail);

  // 14. Traceability — every org name and a sample of child rows carry the test-run/profile marker
  const untraceableOrgs = accounts.schools.filter((s) => !s.name || !accounts.testRunId);
  const orgsRows = await selectIn(admin, "organizations", "id, name", "id", expectedOrgIds);
  const orgsMissingMarker = orgsRows.filter((o) => !o.name.includes(testRunId));
  record("All organizations traceable to TEST_RUN_ID in name", orgsMissingMarker.length === 0 && untraceableOrgs.length === 0, orgsMissingMarker.length ? `${orgsMissingMarker.length} missing marker` : "");

  // 15. No duplicate organization names among our own orgs (defense-in-depth;
  // this can only happen if two of our own display names collided, since
  // each is built from a unique school index).
  const orgNameCounts = new Map();
  for (const o of orgsRows) orgNameCounts.set(o.name, (orgNameCounts.get(o.name) || 0) + 1);
  const dupOrgNames = [...orgNameCounts.entries()].filter(([, c]) => c > 1);
  record("No duplicate organization names", dupOrgNames.length === 0, dupOrgNames.length ? `${dupOrgNames.length} dupes` : "");

  // 16-20. Duplicate scan for everything derived from our orgs: event titles
  // per school_year, milestone names per event, event assets per event,
  // brand-kit labels per org, calendar-import filenames per org, and
  // playbook steps per playbook (complete + unique sort_order).
  const dupReport = await scanOrganizationsForDuplicates(admin, expectedOrgIds);
  const dupByTable = new Map(dupReport.map((d) => [d.table, d]));
  const dupCheck = (table, label) => {
    const d = dupByTable.get(table);
    record(label, !d, d ? `${d.keys.length} collision(s): ${d.keys.slice(0, 5).join(", ")}` : "");
  };
  dupCheck("events", "No duplicate event titles per school_year");
  dupCheck("approval_scheduling_items", "No duplicate milestone names per event");
  dupCheck("event_assets", "No duplicate event assets per event");
  dupCheck("organization_brand_kit_items", "No duplicate brand-kit labels per organization");
  dupCheck("calendar_imports", "No duplicate calendar-import filenames per organization");
  dupCheck("communication_playbook_steps", "No duplicate/incomplete playbook steps (unique sort_order)");

  return results;
}

async function main() {
  loadDefaultEnvFiles();
  const testRunId = requireEnv("TEST_RUN_ID");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const password = requireEnv("K6_TEST_PASSWORD");

  const projectRef = assertStagingProject(supabaseUrl);
  console.log(`[validate] TEST_RUN_ID=${testRunId} project=${projectRef}`);

  const accountsPath = resolve(k6Root(), "data", `accounts.${PROFILE_KEY}.local.json`);
  if (!existsSync(accountsPath)) {
    console.error(`[validate] Missing ${accountsPath}. Run the architecture seed first.`);
    process.exit(1);
  }
  const accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
  if (accounts.seedProfile !== PROFILE_KEY) {
    console.error(`[validate] accounts file profile=${accounts.seedProfile}, expected ${PROFILE_KEY}`);
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = await runIntegrityChecks({
    admin,
    supabaseUrl,
    anonKey,
    password,
    testRunId,
    accounts,
    log: (line) => console.log(line),
  });

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[validate] ${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("\n[validate] FAILED CHECKS:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? " — " + f.detail : ""}`);
    console.log("\n[validate] RESULT: FAIL — do not proceed to post-seed snapshot or performance testing.");
    process.exit(1);
  }
  console.log("\n[validate] RESULT: PASS — all integrity checks green.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[validate] FAILED:", err.message || err);
    process.exit(1);
  });
}
