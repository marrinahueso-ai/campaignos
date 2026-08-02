#!/usr/bin/env node
/**
 * Remove synthetic load-test records for TEST_RUN_ID.
 *
 *   TEST_RUN_ID=… node --env-file=.env.local load-tests/k6/scripts/cleanup-test-data.mjs
 *
 * Optional: K6_CLEANUP_DELETE_USERS=true to delete auth users
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSafeTarget,
  k6Root,
  loadDefaultEnvFiles,
  projectRefFromSupabaseUrl,
  requireEnv,
} from "./lib/env.mjs";
import { k6Prefix } from "./lib/schools.mjs";
import { acquireSeedLock } from "./lib/seed-lock.mjs";

loadDefaultEnvFiles();
assertSafeTarget();

const testRunId = requireEnv("TEST_RUN_ID");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const deleteUsers = process.env.K6_CLEANUP_DELETE_USERS === "true";
const seedProfile = process.env.SEED_PROFILE || "";
const prefix = k6Prefix(testRunId);
// Only profile-scoped cleanups (e.g. 100-school-architecture) take the
// cross-machine lock — it's keyed by (projectRef, profile) and the
// unscoped/legacy 20-school cleanup path predates this mechanism.
const projectRef = seedProfile ? projectRefFromSupabaseUrl(supabaseUrl) : null;

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[cleanup] TEST_RUN_ID=${testRunId}${seedProfile ? ` profile=${seedProfile}` : ""}`);

  const accountsFileName = seedProfile ? `accounts.${seedProfile}.local.json` : "accounts.local.json";
  const accountsPath = resolve(k6Root(), "data", accountsFileName);
  let orgIds = [];
  let userIds = [];
  let eventIds = [];

  if (existsSync(accountsPath)) {
    const accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
    for (const s of accounts.schools || []) {
      orgIds.push(s.organizationId);
      eventIds.push(...(s.eventIds || []));
      for (const u of s.users || []) {
        if (u.userId) userIds.push(u.userId);
      }
    }
  } else {
    console.log(`[cleanup] ${accountsPath} not found — relying on name-pattern lookup only.`);
  }

  // Also find orgs by name pattern
  const { data: namedOrgs } = await admin
    .from("organizations")
    .select("id, name")
    .ilike("name", `%${testRunId}%`);

  for (const o of namedOrgs || []) {
    if (!orgIds.includes(o.id)) orgIds.push(o.id);
  }

  orgIds = [...new Set(orgIds.filter(Boolean))];
  console.log(`[cleanup] organizations=${orgIds.length}`);

  if (orgIds.length === 0) {
    console.log("[cleanup] Nothing to delete.");
    return;
  }

  // Resolve school years → events if eventIds empty
  const { data: years } = await admin
    .from("school_years")
    .select("id")
    .in("organization_id", orgIds);
  const yearIds = (years || []).map((y) => y.id);

  if (yearIds.length) {
    const { data: events } = await admin
      .from("events")
      .select("id")
      .in("school_year_id", yearIds);
    eventIds = [...new Set([...(eventIds || []), ...(events || []).map((e) => e.id)])];
  }

  if (eventIds.length) {
    await admin.from("approval_scheduling_items").delete().in("event_id", eventIds);
    // Classic approvals if present
    await admin.from("approval_requests").delete().in("event_id", eventIds);
    // Architecture-profile extras (also covered by ON DELETE CASCADE on events delete below)
    await admin.from("communication_items").delete().in("event_id", eventIds);
    await admin.from("event_assets").delete().in("event_id", eventIds);
    console.log(`[cleanup] cleared approvals/communications/assets for ${eventIds.length} events`);
  }

  await admin.from("inbox_threads").delete().in("organization_id", orgIds);

  // Architecture-profile extras (also covered by ON DELETE CASCADE on organizations delete below)
  const { data: playbooks } = await admin
    .from("communication_playbooks")
    .select("id")
    .in("organization_id", orgIds);
  const playbookIds = (playbooks || []).map((p) => p.id);
  if (playbookIds.length) {
    await admin.from("communication_playbook_steps").delete().in("playbook_id", playbookIds);
    await admin.from("communication_playbooks").delete().in("id", playbookIds);
  }
  await admin.from("organization_brand_kit_items").delete().in("organization_id", orgIds);
  await admin.from("calendar_imports").delete().in("organization_id", orgIds);

  if (eventIds.length) {
    await admin.from("events").delete().in("id", eventIds);
  }

  if (yearIds.length) {
    await admin
      .from("organizations")
      .update({ active_school_year_id: null })
      .in("id", orgIds);
    await admin.from("school_years").delete().in("id", yearIds);
  }

  await admin.from("responsibility_matrix").delete().in("organization_id", orgIds);
  await admin.from("organization_committees").delete().in("organization_id", orgIds);
  await admin.from("organization_roles").delete().in("organization_id", orgIds);
  await admin.from("organization_users").delete().in("organization_id", orgIds);
  await admin.from("organizations").delete().in("id", orgIds);
  console.log(`[cleanup] deleted ${orgIds.length} organizations (${prefix})`);

  if (deleteUsers && userIds.length) {
    for (const id of [...new Set(userIds)]) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) {
        console.warn(`[cleanup] user ${id}: ${error.message}`);
      }
    }
    console.log(`[cleanup] deleted ${userIds.length} auth users`);
  } else {
    console.log(
      "[cleanup] Auth users kept (set K6_CLEANUP_DELETE_USERS=true to remove).",
    );
  }

  const filesToRemove = seedProfile
    ? [`accounts.${seedProfile}.local.json`, `sessions.${seedProfile}.local.json`]
    : ["accounts.local.json", "sessions.local.json"];
  for (const f of filesToRemove) {
    const p = resolve(k6Root(), "data", f);
    if (existsSync(p)) {
      unlinkSync(p);
      console.log(`[cleanup] removed ${f}`);
    }
  }
}

async function run() {
  const lock = seedProfile
    ? await acquireSeedLock(admin, { projectRef, profile: seedProfile, testRunId, heldBy: "cleanup" })
    : null;
  try {
    await main();
  } finally {
    if (lock) await lock.release();
  }
}

run().catch((err) => {
  console.error("[cleanup] FAILED:", err.message || err);
  process.exit(1);
});
