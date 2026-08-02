#!/usr/bin/env node
/**
 * Mint Supabase SSR cookie jars for each seeded load-test user.
 *
 *   TEST_RUN_ID=… K6_TEST_PASSWORD=… \
 *     node --env-file=.env.local load-tests/k6/scripts/mint-sessions.mjs
 *
 * Reads data/accounts.local.json → writes data/sessions.local.json
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertSafeTarget,
  k6Root,
  loadDefaultEnvFiles,
  requireEnv,
} from "./lib/env.mjs";

loadDefaultEnvFiles();
assertSafeTarget();

const testRunId = requireEnv("TEST_RUN_ID");
const password = requireEnv("K6_TEST_PASSWORD");
const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const ACTIVE_ORG_COOKIE = "campaignos-active-organization-id";

// SEED_PROFILE is optional. Unset → original 20-school fixture (unchanged
// behavior). Set (e.g. 100-school-architecture) → that profile's fixture,
// so the same session-minting tool works for future large-scale load tests
// without touching the already-validated 20-school files.
const seedProfile = process.env.SEED_PROFILE || "";
const accountsFileName = seedProfile ? `accounts.${seedProfile}.local.json` : "accounts.local.json";
const sessionsFileName = seedProfile ? `sessions.${seedProfile}.local.json` : "sessions.local.json";

const accountsPath = resolve(k6Root(), "data", accountsFileName);
if (!existsSync(accountsPath)) {
  console.error(
    `[mint] Missing ${accountsPath}. Run the matching seed script first ` +
      `(npm run test:load:seed${seedProfile ? ":100-schools" : ""}).`,
  );
  process.exit(1);
}

const accounts = JSON.parse(readFileSync(accountsPath, "utf8"));
if (accounts.testRunId && accounts.testRunId !== testRunId) {
  console.warn(
    `[mint] WARNING: accounts.testRunId=${accounts.testRunId} != TEST_RUN_ID=${testRunId}`,
  );
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname; // xxx.supabase.co
    return host.split(".")[0];
  } catch {
    throw new Error(`Bad NEXT_PUBLIC_SUPABASE_URL: ${url}`);
  }
}

/** Mirror @supabase/ssr base64url encoding (base64- prefix). */
function stringToBase64URL(str) {
  const bytes = Buffer.from(str, "utf8");
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const MAX_CHUNK = 3180;

function createChunks(key, value) {
  const encoded = encodeURIComponent(value);
  if (encoded.length <= MAX_CHUNK) {
    return [{ name: key, value }];
  }
  const chunks = [];
  let remaining = value;
  let encodedRemaining = encoded;
  let index = 0;
  while (encodedRemaining.length > 0) {
    let head = encodedRemaining.slice(0, MAX_CHUNK);
    const lastEscape = head.lastIndexOf("%");
    if (lastEscape > MAX_CHUNK - 3) {
      head = head.slice(0, lastEscape);
    }
    let valueHead = "";
    while (head.length > 0) {
      try {
        valueHead = decodeURIComponent(head);
        break;
      } catch {
        if (head.at(-3) === "%" && head.length > 3) {
          head = head.slice(0, head.length - 3);
        } else {
          throw new Error("Failed to chunk cookie");
        }
      }
    }
    chunks.push({ name: `${key}.${index}`, value: valueHead });
    encodedRemaining = encodedRemaining.slice(head.length);
    remaining = remaining.slice(valueHead.length);
    index += 1;
  }
  return chunks;
}

function sessionToCookieHeader(session, organizationId) {
  const storageKey = `sb-${projectRefFromUrl(supabaseUrl)}-auth-token`;
  const payload = JSON.stringify(session);
  const encoded = `base64-${stringToBase64URL(payload)}`;
  const chunks = createChunks(storageKey, encoded);
  // Cookie values match @supabase/ssr storage (base64url alphabet is cookie-safe).
  const parts = chunks.map((c) => `${c.name}=${c.value}`);
  if (organizationId) {
    parts.push(`${ACTIVE_ORG_COOKIE}=${organizationId}`);
  }
  return parts.join("; ");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mintOne(email, organizationId, { retries = 5, backoffMs = 4000 } = {}) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session) {
      return sessionToCookieHeader(data.session, organizationId);
    }
    const rateLimited = /rate limit/i.test(error?.message || "");
    if (!rateLimited || attempt === retries) {
      throw new Error(`signIn ${email}: ${error?.message || "no session"}`);
    }
    const wait = backoffMs * (attempt + 1);
    process.stdout.write(`(rate limited, retry in ${Math.round(wait / 1000)}s) `);
    await sleep(wait);
  }
  throw new Error(`signIn ${email}: exhausted retries`);
}

async function main() {
  const sessions = [];
  const schoolsMeta = [];

  for (const school of accounts.schools || []) {
    schoolsMeta.push({
      schoolIndex: school.index,
      name: school.name,
      organizationId: school.organizationId,
      eventIds: school.eventIds || [],
    });

    for (const user of school.users || []) {
      process.stdout.write(`[mint] ${user.email}… `);
      try {
        const cookie = await mintOne(user.email, school.organizationId);
        sessions.push({
          schoolIndex: school.index,
          schoolName: school.name,
          organizationId: school.organizationId,
          role: user.key,
          campaignRole: user.campaignRole,
          email: user.email,
          userId: user.userId,
          cookie,
          eventIds: school.eventIds || [],
        });
        console.log("ok");
      } catch (err) {
        console.log("FAIL");
        console.error(`  ${err.message}`);
      }
      // Gentle pacing for Supabase Auth token-endpoint rate limits.
      await sleep(2200);
    }
  }

  if (sessions.length === 0) {
    throw new Error("No sessions minted");
  }

  const out = {
    testRunId: accounts.testRunId || testRunId,
    seedProfile: seedProfile || undefined,
    mintedAt: new Date().toISOString(),
    schools: schoolsMeta,
    sessions,
    foreignProbe: accounts.foreignProbe || null,
  };

  const outDir = resolve(k6Root(), "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, sessionsFileName);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`[mint] Wrote ${sessions.length} sessions → ${outPath}`);
}

main().catch((err) => {
  console.error("[mint] FAILED:", err.message || err);
  process.exit(1);
});
