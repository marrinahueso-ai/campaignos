#!/usr/bin/env node
/**
 * Programmatic slice of a database snapshot: row counts for known
 * seed-relevant tables (via PostgREST `count: exact, head: true`) and
 * storage bucket object counts/sizes (via the Supabase Storage API).
 *
 * This does NOT capture logical DB size, largest tables/indexes, active
 * connections, or CPU/memory/disk-IO utilization — those require direct
 * Postgres catalog access or the Supabase Management API, neither of which
 * this project has credentials for. Capture those manually from the
 * Supabase dashboard (Database → Database size / Infrastructure pages,
 * SQL Editor for pg_database_size / pg_total_relation_size queries) the
 * same way the pre-seed baseline (docs/qa/100-school-pre-seed-baseline.md)
 * was captured, and merge with this script's output.
 *
 * Usage:
 *   node --env-file=.env.staging.local load-tests/k6/scripts/snapshot-database.mjs [--profile=100-school-architecture]
 *
 * Writes load-tests/k6/data/db-snapshot.<label>.local.json (gitignored).
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertStagingProject, k6Root, loadDefaultEnvFiles, requireEnv } from "./lib/env.mjs";

loadDefaultEnvFiles();

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const projectRef = assertStagingProject(supabaseUrl);

const profileArg = process.argv.find((a) => a.startsWith("--profile="));
const label = profileArg ? profileArg.split("=")[1] : process.env.SEED_PROFILE || "default";

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Every table any seed profile in this repo currently writes to, plus a
// couple of always-present system-seeded tables for context.
const TABLES = [
  "organizations",
  "organization_users",
  "organization_roles",
  "school_years",
  "events",
  "approval_scheduling_items",
  "communication_playbooks",
  "communication_playbook_steps",
  "communication_items",
  "inbox_threads",
  "organization_brand_kit_items",
  "calendar_imports",
  "event_assets",
  "vendor_categories",
  "organization_ai_credit_ledger",
  "organization_ai_credit_balances",
  "ai_usage_log",
];

async function tableCount(table) {
  // "*" avoids assuming a primary key column named "id" (e.g.
  // organization_ai_credit_balances is keyed on organization_id).
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) return { table, count: null, error: error.message };
  return { table, count };
}

async function listAllObjects(bucketName, prefix = "") {
  const { data, error } = await admin.storage.from(bucketName).list(prefix, { limit: 1000 });
  if (error) return { objects: 0, bytes: 0, error: error.message };
  let objects = 0;
  let bytes = 0;
  for (const entry of data || []) {
    if (entry.id === null && !entry.metadata) {
      // Folder placeholder — recurse
      const sub = await listAllObjects(bucketName, prefix ? `${prefix}/${entry.name}` : entry.name);
      objects += sub.objects;
      bytes += sub.bytes;
    } else {
      objects += 1;
      bytes += entry.metadata?.size || 0;
    }
  }
  return { objects, bytes };
}

async function bucketSummary() {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`listBuckets: ${error.message}`);
  const summaries = [];
  for (const b of buckets || []) {
    const { objects, bytes } = await listAllObjects(b.id);
    summaries.push({ bucket: b.id, public: b.public, objects, bytes });
  }
  return summaries;
}

async function main() {
  console.log(`[snapshot] project=${projectRef} label=${label}`);
  console.log("[snapshot] Row counts (PostgREST count=exact):");
  const rowCounts = [];
  for (const table of TABLES) {
    const result = await tableCount(table);
    rowCounts.push(result);
    console.log(`  ${table}: ${result.count ?? `ERROR (${result.error})`}`);
  }

  console.log("[snapshot] Storage buckets (Storage API):");
  const buckets = await bucketSummary();
  for (const b of buckets) {
    console.log(`  ${b.bucket} (public=${b.public}): ${b.objects} objects, ${b.bytes} bytes`);
  }

  const snapshot = {
    capturedAt: new Date().toISOString(),
    projectRef,
    label,
    rowCounts,
    totalRows: rowCounts.reduce((sum, r) => sum + (r.count || 0), 0),
    buckets,
    note:
      "Row counts + bucket sizes only. DB logical size, largest tables/indexes, " +
      "connections, and CPU/memory/disk-IO must be captured manually from the " +
      "Supabase dashboard/SQL editor (see script header comment).",
  };

  const outDir = resolve(k6Root(), "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `db-snapshot.${label}.local.json`);
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`[snapshot] Wrote ${outPath}`);
}

main().catch((err) => {
  console.error("[snapshot] FAILED:", err.message || err);
  process.exit(1);
});
