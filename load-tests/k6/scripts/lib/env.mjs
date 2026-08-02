import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const K6_ROOT = resolve(__dirname, "../..");

/** Load KEY=VAL from a file into process.env (does not override existing). */
export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadDefaultEnvFiles() {
  loadEnvFile(resolve(K6_ROOT, ".env"));
  loadEnvFile(resolve(K6_ROOT, "cookies.env"));
  // Repo-root .env.local often has Supabase keys for local/staging tooling
  loadEnvFile(resolve(K6_ROOT, "../../.env.local"));
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env ${name}`);
  }
  return v;
}

export function k6Root() {
  return K6_ROOT;
}

const PRODUCTION_HOST_PATTERNS = [
  /^heyralli\.com$/i,
  /^www\.heyralli\.com$/i,
  /^app\.heyralli\.com$/i,
];

export function assertSafeTarget() {
  const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    console.warn("[seed] BASE_URL unset — seed/cleanup use Supabase directly.");
    return;
  }
  let hostname = "";
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`Invalid BASE_URL: ${baseUrl}`);
  }
  const prod = PRODUCTION_HOST_PATTERNS.some((re) => re.test(hostname));
  if (prod && process.env.K6_ALLOW_PRODUCTION !== "true") {
    throw new Error(
      `Refusing seed/cleanup against production-like host ${hostname}. Set K6_ALLOW_PRODUCTION=true to override.`,
    );
  }
}
