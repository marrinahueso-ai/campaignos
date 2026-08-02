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
  requireEnv,
} from "./lib/env.mjs";
import { k6Prefix } from "./lib/schools.mjs";

loadDefaultEnvFiles();
assertSafeTarget();

const testRunId = requireEnv("TEST_RUN_ID");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const deleteUsers = process.env.K6_CLEANUP_DELETE_USERS === "true";
const prefix = k6Prefix(testRunId);

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[cleanup] TEST_RUN_ID=${testRunId}`);

  const accountsPath = resolve(k6Root(), "data/accounts.local.json");
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
    console.log(`[cleanup] cleared approvals for ${eventIds.length} events`);
  }

  await admin.from("inbox_threads").delete().in("organization_id", orgIds);

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

  for (const f of ["accounts.local.json", "sessions.local.json"]) {
    const p = resolve(k6Root(), "data", f);
    if (existsSync(p)) {
      unlinkSync(p);
      console.log(`[cleanup] removed ${f}`);
    }
  }
}

main().catch((err) => {
  console.error("[cleanup] FAILED:", err.message || err);
  process.exit(1);
});
