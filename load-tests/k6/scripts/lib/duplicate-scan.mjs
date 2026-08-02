/**
 * Shared duplicate/collision detection for the 100-school-architecture
 * seed. Used in two places:
 *
 *   1. Preflight (seed-architecture-dataset.mjs, before any write): resolves
 *      organizations by their intended display name, then scans everything
 *      derived from any orgs that already exist (a rerun scenario).
 *   2. Post-seed validation (validate-architecture-seed.mjs): scans the
 *      exact org IDs recorded in the accounts fixture as defense-in-depth,
 *      confirming the idempotent insert logic never produced duplicates.
 *
 * Every check is a natural-key group-count: if any (parent, child-key) pair
 * has more than one row, that is an ambiguous duplicate this tooling will
 * never silently resolve on its own.
 */

import { schoolName } from "./schools.mjs";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function selectIn(admin, table, columns, column, ids) {
  let rows = [];
  for (const batch of chunk(ids, 200)) {
    if (!batch.length) continue;
    const { data, error } = await admin.from(table).select(columns).in(column, batch);
    if (error) throw new Error(`${table} select: ${error.message}`);
    rows = rows.concat(data || []);
  }
  return rows;
}

function findDuplicateGroups(rows, keyFn) {
  const counts = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([key, count]) => `${key} (x${count})`);
}

/**
 * Scans every child table for duplicate natural keys, scoped to a known set
 * of organization IDs. Returns [] when clean, otherwise an array of
 * { table, issue, keys } collision groups.
 */
export async function scanOrganizationsForDuplicates(admin, orgIds) {
  const report = [];
  if (!orgIds.length) return report;

  const { data: years, error: yErr } = await admin
    .from("school_years")
    .select("id, organization_id")
    .in("organization_id", orgIds);
  if (yErr) throw new Error(`school_years select: ${yErr.message}`);
  const yearIds = (years || []).map((y) => y.id);

  let eventIds = [];
  if (yearIds.length) {
    const events = await selectIn(admin, "events", "id, school_year_id, title", "school_year_id", yearIds);
    eventIds = events.map((e) => e.id);
    const dupEventTitles = findDuplicateGroups(events, (e) => `${e.school_year_id}::${e.title}`);
    if (dupEventTitles.length) {
      report.push({ table: "events", issue: "duplicate title per school_year", keys: dupEventTitles });
    }
  }

  if (eventIds.length) {
    const milestones = await selectIn(admin, "approval_scheduling_items", "event_id, milestone_name", "event_id", eventIds);
    const dupMilestones = findDuplicateGroups(milestones, (m) => `${m.event_id}::${m.milestone_name}`);
    if (dupMilestones.length) {
      report.push({ table: "approval_scheduling_items", issue: "duplicate milestone_name per event", keys: dupMilestones });
    }

    const assets = await selectIn(admin, "event_assets", "event_id, asset_type", "event_id", eventIds);
    const dupAssets = findDuplicateGroups(assets, (a) => `${a.event_id}::${a.asset_type}`);
    if (dupAssets.length) {
      report.push({ table: "event_assets", issue: "duplicate asset_type per event", keys: dupAssets });
    }
  }

  const brandKit = await selectIn(admin, "organization_brand_kit_items", "organization_id, label", "organization_id", orgIds);
  const dupBrandKit = findDuplicateGroups(brandKit, (b) => `${b.organization_id}::${b.label}`);
  if (dupBrandKit.length) {
    report.push({ table: "organization_brand_kit_items", issue: "duplicate label per organization", keys: dupBrandKit });
  }

  const calendarImports = await selectIn(admin, "calendar_imports", "organization_id, filename", "organization_id", orgIds);
  const dupCalendar = findDuplicateGroups(calendarImports, (c) => `${c.organization_id}::${c.filename}`);
  if (dupCalendar.length) {
    report.push({ table: "calendar_imports", issue: "duplicate filename per organization", keys: dupCalendar });
  }

  const playbooks = await selectIn(admin, "communication_playbooks", "id, organization_id", "organization_id", orgIds);
  const playbookIds = playbooks.map((p) => p.id);
  if (playbookIds.length) {
    const steps = await selectIn(admin, "communication_playbook_steps", "playbook_id, sort_order", "playbook_id", playbookIds);
    const dupSteps = findDuplicateGroups(steps, (s) => `${s.playbook_id}::${s.sort_order}`);
    if (dupSteps.length) {
      report.push({ table: "communication_playbook_steps", issue: "duplicate sort_order per playbook", keys: dupSteps });
    }
  }

  return report;
}

/**
 * Preflight entry point — resolves organizations by intended display name
 * (since, on a fresh seed, no IDs exist yet) and scans anything found.
 * Safe to call before any row exists (returns [] in that case).
 */
export async function runPreflightDuplicateScan(admin, { testRunId, schoolIndexes, schoolNamePad }) {
  const report = [];
  const intendedNames = schoolIndexes.map((i) => `${schoolName(i, { pad: schoolNamePad })} (${testRunId})`);

  const { data: existingOrgs, error } = await admin.from("organizations").select("id, name").in("name", intendedNames);
  if (error) throw new Error(`organizations select: ${error.message}`);

  const dupOrgNames = findDuplicateGroups(existingOrgs || [], (o) => o.name);
  if (dupOrgNames.length) {
    report.push({ table: "organizations", issue: "duplicate name (pre-existing collision)", keys: dupOrgNames });
  }

  const orgIds = (existingOrgs || []).map((o) => o.id);
  const childReport = await scanOrganizationsForDuplicates(admin, orgIds);
  return [...report, ...childReport];
}

export { findDuplicateGroups };
