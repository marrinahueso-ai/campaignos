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
import { pathToFileURL } from "node:url";
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

// --- Data-scale 100-school / 20-VU profile audit -----------------------
const DATA_SCALE_PROFILE_FILE = "data-scale-100school-20vu.js";
const DATA_SCALE_MIN_VUS = 20;
// Method-based, not a route-substring denylist — a read-only route whose
// *name* contains a write-sounding word (e.g. /create-with-ai, GET-only)
// must never be falsely flagged. See Phase 3 instructions.
const WRITE_METHOD_RE = /\bhttp\.\s*(post|put|patch|del|delete)\s*\(/i;
// Informational-only hint pattern (never a fail condition on its own).
const ROUTE_HINT_RE = /\/(invite|billing|checkout)\b|generate|publish|webhook/i;

/**
 * Audits the 100-school / 20-VU data-scale profile now that it exists
 * (previously this check only confirmed no such profile existed yet).
 * Uses two complementary techniques:
 *  - dynamic import() of the *pure* config modules (config/workload.js,
 *    config/thresholds.js — plain ESM, no k6-only imports) to introspect
 *    real structured values (VU targets, threshold keys) instead of
 *    regex-guessing them from source text;
 *  - regex/text scanning of the profile file itself and every file under
 *    scenarios/ + helpers/http.js, because those import from "k6/http" /
 *    "k6" and cannot be import()-ed by plain Node.
 * This is intentionally a shallow source-text audit for the k6-only files
 * (no AST parse) — adequate for this repo's small, hand-written profiles;
 * noted as a known limitation if these files grow significantly more
 * complex in the future.
 */
async function auditDataScaleProfile() {
  const profilePath = resolve(k6Root(), DATA_SCALE_PROFILE_FILE);
  const profileExists = existsSync(profilePath);
  record(
    "Data-scale 100-school/20-VU profile file exists",
    profileExists,
    profileExists ? profilePath : `missing: ${profilePath}`,
  );
  if (!profileExists) {
    record("Profile references the 100-school session fixture", false, "skipped — profile file missing");
    record("Profile uses pinned session assignment", false, "skipped — profile file missing");
    record("Profile reuses the production-blocking guard (prepareTestContext)", false, "skipped — profile file missing");
    record(`Profile workload reaches >= ${DATA_SCALE_MIN_VUS} VUs`, false, "skipped — profile file missing");
    record("Profile references required safety threshold builder", false, "skipped — profile file missing");
    record("workflow_duration_ms is not threshold-gated", false, "skipped — profile file missing");
    record("No write-capable HTTP methods (post/put/patch/del/delete) in profile or its scenarios", false, "skipped — profile file missing");
    return;
  }

  const profileText = readFileSync(profilePath, "utf8");

  record(
    "Profile references the 100-school session fixture",
    /sessions\.100-school-architecture\.local\.json/.test(profileText) || /K6_SESSIONS_FILE/.test(profileText),
    "checked profile header/docstring for K6_SESSIONS_FILE / sessions.100-school-architecture.local.json",
  );

  record(
    "Profile uses pinned session assignment",
    /pinnedSession:\s*true/.test(profileText) || /pinned:\s*true/.test(profileText),
    "checked for pinnedSession: true / pinned: true",
  );

  record(
    "Profile reuses the production-blocking guard (prepareTestContext)",
    /prepareTestContext\s*\(/.test(profileText) && /from\s+["']\.\/helpers\/auth\.js["']/.test(profileText),
    "checked for prepareTestContext() imported from ./helpers/auth.js",
  );

  // VU capacity — introspect the real workload constant via dynamic
  // import rather than regex-guessing stage targets from source text.
  try {
    const workloadMod = await import(pathToFileURL(resolve(k6Root(), "config", "workload.js")).href);
    const workload = workloadMod.DATA_SCALE_100SCHOOL_20VU_WORKLOAD;
    const maxVus =
      workload && Array.isArray(workload.stages)
        ? Math.max(...workload.stages.map((s) => Number(s.target) || 0))
        : null;
    record(
      `Profile workload reaches >= ${DATA_SCALE_MIN_VUS} VUs`,
      typeof maxVus === "number" && maxVus >= DATA_SCALE_MIN_VUS,
      maxVus === null
        ? "DATA_SCALE_100SCHOOL_20VU_WORKLOAD not found in config/workload.js"
        : `DATA_SCALE_100SCHOOL_20VU_WORKLOAD max stage target=${maxVus}`,
    );
  } catch (err) {
    record(`Profile workload reaches >= ${DATA_SCALE_MIN_VUS} VUs`, false, `could not import config/workload.js: ${err.message}`);
  }

  // Required safety thresholds + workflow_duration_ms not gated —
  // introspect the real threshold object via dynamic import.
  try {
    const thresholdsMod = await import(pathToFileURL(resolve(k6Root(), "config", "thresholds.js")).href);
    const build = thresholdsMod.buildDataScale100School20VuThresholds;
    if (typeof build !== "function") {
      record(
        "Profile references required safety threshold builder",
        false,
        "buildDataScale100School20VuThresholds not exported from config/thresholds.js",
      );
      record("workflow_duration_ms is not threshold-gated", false, "skipped — threshold builder missing");
    } else {
      const built = build();
      const requiredKeys = [
        "tenant_isolation_failures",
        "auth_failures",
        "unexpected_401",
        "unexpected_403",
        "unexpected_429",
        "unexpected_500",
        "dropped_iterations",
        "checks",
        "http_req_failed",
      ];
      const missing = requiredKeys.filter((k) => !(k in built));
      record(
        "Profile references required safety threshold builder",
        missing.length === 0,
        missing.length
          ? `missing keys: ${missing.join(", ")}`
          : `buildDataScale100School20VuThresholds() present with all ${requiredKeys.length} required keys`,
      );
      record(
        "workflow_duration_ms is not threshold-gated",
        !("workflow_duration_ms" in built),
        "workflow_duration_ms" in built
          ? "found a workflow_duration_ms threshold — should remain informational only"
          : "absent, as expected (informational Trend only)",
      );
    }
  } catch (err) {
    record("Profile references required safety threshold builder", false, `could not import config/thresholds.js: ${err.message}`);
    record("workflow_duration_ms is not threshold-gated", false, "skipped — import failed");
  }

  // Read-only method audit: the profile itself + every file under
  // scenarios/ (simplest, most conservative — scans the whole directory
  // rather than hand-maintaining a list of "which scenarios this profile
  // uses") + helpers/http.js where getHtml() actually issues requests.
  const scenariosDir = resolve(k6Root(), "scenarios");
  const scannedFiles = [profilePath, resolve(k6Root(), "helpers", "http.js")];
  try {
    for (const f of readdirSync(scenariosDir)) {
      if (f.endsWith(".js")) scannedFiles.push(resolve(scenariosDir, f));
    }
  } catch {
    // scenarios/ always exists in this repo; ignore if somehow missing.
  }

  const writeMethodHits = [];
  for (const file of scannedFiles) {
    if (!existsSync(file)) continue;
    if (WRITE_METHOD_RE.test(readFileSync(file, "utf8"))) {
      writeMethodHits.push(file.replace(`${k6Root()}/`, ""));
    }
  }
  record(
    "No write-capable HTTP methods (post/put/patch/del/delete) in profile or its scenarios",
    writeMethodHits.length === 0,
    writeMethodHits.length ? `found in: ${writeMethodHits.join(", ")}` : `scanned ${scannedFiles.length} files, all http.get-only`,
  );

  // Informational only (never a fail condition by itself — the hard gate
  // is the method-based check above). Surfaces write-sounding route
  // literals for a human to spot-check. calendar-events.js's
  // "/events/create" GET (a form-page *read*, gated behind K6_ALLOW_WRITES
  // which this profile's run instructions never set) is a known, expected
  // example that should NOT be treated as a failure — confirming why this
  // stays informational rather than a denylist gate.
  const routeHints = [];
  for (const file of scannedFiles) {
    if (!existsSync(file)) continue;
    if (ROUTE_HINT_RE.test(readFileSync(file, "utf8"))) {
      routeHints.push(file.replace(`${k6Root()}/`, ""));
    }
  }
  console.log(
    `  [INFO] Write-sounding route/keyword hints (context only, not a failure — method audit above is authoritative): ${
      routeHints.length ? routeHints.join(", ") : "none"
    }`,
  );
}

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

  // 8. Data-scale 100-school / 20-VU profile audit — now that the profile
  // exists, verify it for real (file presence, fixture reference, pinned
  // sessions, VU capacity, production-guard reuse, required thresholds,
  // workflow_duration_ms not gated, no write-capable HTTP methods).
  await auditDataScaleProfile();

  // Informational: flag (don't fail on) provider keys present in this
  // *local* tooling shell/.env.local — normal for full-stack local dev,
  // and irrelevant to what k6 actually hits (the deployed Vercel target),
  // but worth surfacing before minting sessions.
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
