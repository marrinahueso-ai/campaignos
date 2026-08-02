#!/usr/bin/env node
/**
 * Manually force-clear the cross-machine seed/cleanup lock for a profile.
 *
 * Only use this when you have confirmed (e.g. by checking with whoever ran
 * it, or via `npm run test:load:preflight:100-schools`) that no seed or
 * cleanup process is actually running against this project/profile. Locks
 * also self-clear automatically once idle for 30 minutes, so this is only
 * needed if you don't want to wait.
 *
 *   TEST_RUN_ID=arch100 SEED_PROFILE=100-school-architecture SEED_FORCE_UNLOCK=true \
 *     node --env-file=.env.staging.local load-tests/k6/scripts/seed-unlock.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { assertStagingProject, loadDefaultEnvFiles, requireEnv } from "./lib/env.mjs";
import { checkSeedLockStatus, forceClearSeedLock } from "./lib/seed-lock.mjs";

loadDefaultEnvFiles();

const testRunId = requireEnv("TEST_RUN_ID");
const profile = requireEnv("SEED_PROFILE");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

if (process.env.SEED_FORCE_UNLOCK !== "true") {
  throw new Error("Refusing to clear a lock without SEED_FORCE_UNLOCK=true.");
}

const projectRef = assertStagingProject(supabaseUrl);
const admin = createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const status = await checkSeedLockStatus(admin, { projectRef, profile });
  if (!status.lock) {
    console.log(`[seed-unlock] No lock object present for project=${projectRef} profile=${profile}. Nothing to do.`);
    return;
  }
  console.log(`[seed-unlock] Current lock: ${status.detail}`);
  console.log(`[seed-unlock] TEST_RUN_ID for this unlock request: ${testRunId}`);
  await forceClearSeedLock(admin, { projectRef, profile });
  console.log(`[seed-unlock] Cleared lock for project=${projectRef} profile=${profile}.`);
}

main().catch((err) => {
  console.error("[seed-unlock] FAILED:", err.message || err);
  process.exit(1);
});
