#!/usr/bin/env node
/**
 * Read-only environment preflight for the first authoritative 100-school
 * performance test. Verifies the environment without writing anything —
 * no seed, no cleanup, no session minting, no k6 run.
 *
 *   TEST_RUN_ID=arch100 \
 *     node --env-file=.env.staging.local load-tests/k6/scripts/preflight-100-schools.mjs
 *
 * Optional: BASE_URL=https://<preview>.vercel.app to also check the Vercel
 * target + bypass token.
 *
 * Exits 0 with "PASS" only if every check passes. Exits 1 with "FAIL" and a
 * list of failing checks otherwise. Safe to run at any time, repeatedly —
 * it never inserts, updates, or deletes anything.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  k6Root,
  loadDefaultEnvFiles,
  projectRefFromSupabaseUrl,
  requireEnv,
} from "./lib/env.mjs";
import { PROFILE_KEY } from "./lib/architecture-profile.mjs";
import { checkSeedLockStatus } from "./lib/seed-lock.mjs";
import { runIntegrityChecks } from "./validate-architecture-seed.mjs";

loadDefaultEnvFiles();

const STAGING_PROJECT_REF = "hdoujyngcqrsgtvqehyt"; // heyralli-staging
const PRODUCTION_PROJECT_REFS = new Set(["zyllfqieeihshnwpakiv"]);
const PRODUCTION_HOST_PATTERNS = [/^heyralli\.com$/i, /^www\.heyralli\.com$/i, /^app\.heyralli\.com$/i];
const SESSION_FRESH_MS = 55 * 60 * 1000; // Supabase access-token TTL ~1hr
const MIN_EXCLUSIVE_SESSIONS = 20;
const EXTERNAL_PROVIDER_ENV_VARS = [
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_API_KEY",
  "META_APP_SECRET",
  "META_PAGE_ACCESS_TOKEN",
  "FACEBOOK_PAGE_ACCESS_TOKEN",
];

const checks = [];
function record(name, pass, detail) {
  checks.push({ name, pass, detail });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  const testRunId = requireEnv("TEST_RUN_ID");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const password = process.env.K6_TEST_PASSWORD || "";

  console.log(`[preflight] 100-school-architecture preflight — TEST_RUN_ID=${testRunId}\n`);
  console.log("[preflight] This tool is READ-ONLY. It will not seed, clean up, mint sessions, or run load.\n");

  // 1 & 2. Supabase project ref checks
  let projectRef = "";
  try {
    projectRef = projectRefFromSupabaseUrl(supabaseUrl);
  } catch (err) {
    record("Supabase project ref is heyralli-staging", false, err.message);
    record("Production project is blocked", false, "could not parse NEXT_PUBLIC_SUPABASE_URL");
  }
  if (projectRef) {
    record(
      "Supabase project ref is heyralli-staging",
      projectRef === STAGING_PROJECT_REF,
      `ref=${projectRef} expected=${STAGING_PROJECT_REF}`,
    );
    record(
      "Production project is blocked",
      !PRODUCTION_PROJECT_REFS.has(projectRef),
      PRODUCTION_PROJECT_REFS.has(projectRef) ? "TARGET IS PRODUCTION — do not proceed" : `ref=${projectRef} not in production set`,
    );
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Fixture exists
  const accountsPath = resolve(k6Root(), "data", `accounts.${PROFILE_KEY}.local.json`);
  const fixtureExists = existsSync(accountsPath);
  record("100-school fixture exists", fixtureExists, fixtureExists ? accountsPath : `missing: ${accountsPath}`);

  let accounts = null;
  if (fixtureExists) {
    try {
      accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
    } catch (err) {
      record("Fixture is valid JSON matching this profile", false, err.message);
    }
  }
  if (accounts) {
    record(
      "Fixture is valid JSON matching this profile",
      accounts.seedProfile === PROFILE_KEY,
      `seedProfile=${accounts.seedProfile}`,
    );
  }

  // 4 & 5. Expected orgs/users exist + full integrity check suite still passes
  if (accounts && password) {
    const results = await runIntegrityChecks({
      admin,
      supabaseUrl,
      anonKey,
      password,
      testRunId: accounts.testRunId || testRunId,
      accounts,
      log: () => {}, // suppress per-check noise here; we print our own summary line
    });
    const failed = results.filter((r) => !r.pass);
    record(
      `Expected organizations and users exist (from integrity checks)`,
      results.some((r) => r.name.includes("organizations") && r.pass) && results.some((r) => r.name.includes("memberships") && r.pass),
      "",
    );
    record(
      `All integrity checks pass (${results.length - failed.length}/${results.length})`,
      failed.length === 0,
      failed.length ? failed.map((f) => f.name).join("; ") : "",
    );
  } else {
    record("Expected organizations and users exist (from integrity checks)", false, "skipped — fixture or K6_TEST_PASSWORD missing");
    record("All integrity checks pass", false, "skipped — fixture or K6_TEST_PASSWORD missing");
  }

  // 6 & 7. Vercel Preview target
  const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    record("Vercel Preview target is not production", true, "BASE_URL unset — no HTTP target configured yet (informational)");
    record("Vercel bypass token present when required", true, "BASE_URL unset — not applicable yet");
  } else {
    let hostname = "";
    try {
      hostname = new URL(baseUrl).hostname;
    } catch {
      hostname = "";
    }
    const isProdHost = PRODUCTION_HOST_PATTERNS.some((re) => re.test(hostname));
    record("Vercel Preview target is not production", hostname && !isProdHost, `BASE_URL host=${hostname || "(unparseable)"}`);
    const isVercelPreview = /\.vercel\.app$/i.test(hostname);
    if (isVercelPreview) {
      record("Vercel bypass token present when required", Boolean(process.env.VERCEL_JWT), "BASE_URL is a *.vercel.app preview host");
    } else {
      record("Vercel bypass token present when required", true, `host=${hostname} is not a *.vercel.app preview — not required`);
    }
  }

  // 8. External write routes remain out of scope. Two signals:
  //   (a) no 100-school-scoped k6 profile/scenario file exists yet to audit
  //       (this phase hasn't built one — nothing new to check).
  //   (b) informational: flag (don't fail on) provider keys present in this
  //       *local* tooling shell/.env.local — normal for full-stack local
  //       dev, and irrelevant to what k6 actually hits (the deployed Vercel
  //       target), but worth surfacing before minting sessions.
  let arch100ProfileFiles = [];
  try {
    arch100ProfileFiles = readdirSync(k6Root()).filter((f) => /100.?school/i.test(f) && f.endsWith(".js"));
  } catch {
    arch100ProfileFiles = [];
  }
  record(
    "External write routes remain out of scope (no 100-school k6 profile to audit yet)",
    arch100ProfileFiles.length === 0,
    arch100ProfileFiles.length
      ? `found ${arch100ProfileFiles.join(", ")} — manually confirm it only reuses already-reviewed read-only scenario functions`
      : "no 100-school-specific k6 profile/scenario file exists yet (expected at this stage per Part 6)",
  );

  const setProviderVars = EXTERNAL_PROVIDER_ENV_VARS.filter((k) => process.env[k]);
  console.log(
    `  [INFO] Local tooling env provider keys: ${setProviderVars.length ? setProviderVars.join(", ") + " (normal for full-stack local dev; irrelevant to the deployed Vercel target k6 actually hits)" : "none set"}`,
  );

  // 9 & 10. Session fixture freshness + pinned exclusive-session headroom
  const sessionsPath = resolve(k6Root(), "data", `sessions.${PROFILE_KEY}.local.json`);
  if (!existsSync(sessionsPath)) {
    record("Session fixture is fresh enough for the planned test duration", false, `not minted yet: ${sessionsPath} (expected before this profile has been load-tested)`);
    record(`Pinned session assignment can provide >= ${MIN_EXCLUSIVE_SESSIONS} exclusive sessions`, false, "no sessions fixture yet");
  } else {
    try {
      const sessions = JSON.parse(readFileSync(sessionsPath, "utf8"));
      const mintedAt = Date.parse(sessions.mintedAt || "");
      const ageMs = Number.isFinite(mintedAt) ? Date.now() - mintedAt : Infinity;
      const fresh = ageMs <= SESSION_FRESH_MS;
      record(
        "Session fixture is fresh enough for the planned test duration",
        fresh,
        Number.isFinite(mintedAt) ? `minted ${Math.round(ageMs / 60000)}m ago (limit ${Math.round(SESSION_FRESH_MS / 60000)}m)` : "missing/invalid mintedAt",
      );
      const sessionCount = (sessions.sessions || []).length;
      record(
        `Pinned session assignment can provide >= ${MIN_EXCLUSIVE_SESSIONS} exclusive sessions`,
        sessionCount >= MIN_EXCLUSIVE_SESSIONS,
        `sessions=${sessionCount}`,
      );
    } catch (err) {
      record("Session fixture is fresh enough for the planned test duration", false, `unreadable: ${err.message}`);
      record(`Pinned session assignment can provide >= ${MIN_EXCLUSIVE_SESSIONS} exclusive sessions`, false, "unreadable sessions file");
    }
  }

  // 11. No concurrent seed/cleanup lock active
  if (projectRef) {
    const lockStatus = await checkSeedLockStatus(admin, { projectRef, profile: PROFILE_KEY });
    record("No concurrent seed or cleanup lock is active", !lockStatus.active, lockStatus.detail);
  } else {
    record("No concurrent seed or cleanup lock is active", false, "skipped — could not resolve project ref");
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n[preflight] ${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length) {
    console.log("\n[preflight] FAILING CHECKS:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? " — " + f.detail : ""}`);
    console.log("\n[preflight] RESULT: FAIL — do not start the 100-school performance test yet.");
    process.exitCode = 1;
    return;
  }
  console.log("\n[preflight] RESULT: PASS — environment is ready for the 100-school performance test.");
}

main().catch((err) => {
  console.error("[preflight] FAILED:", err.message || err);
  process.exit(1);
});
