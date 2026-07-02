import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const contents = readFileSync(envPath, "utf8");
  const vars = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    vars[key] = rest.join("=");
  }
  return vars;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function isMissing(error) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("plan_status")
  );
}

async function checkTable(name) {
  const { error } = await supabase.from(name).select("*").limit(1);
  if (!error) return { ok: true, message: "exists" };
  if (isMissing(error)) return { ok: false, message: error.message };
  return { ok: true, message: `exists (${error.message})` };
}

async function checkAssetColumns() {
  const { error } = await supabase
    .from("event_assets")
    .select("plan_status, plan_label, generation_prompt, ai_review, inspiration_match")
    .limit(1);

  if (isMissing(error)) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "plan columns present" };
}

const [briefs, styleMemory, assetCols] = await Promise.all([
  checkTable("event_creative_briefs"),
  checkTable("organization_creative_style_memory"),
  checkAssetColumns(),
]);

console.log("Migration 014 verification");
console.log(
  "event_creative_briefs:",
  briefs.ok ? "PASS" : "FAIL",
  "-",
  briefs.message,
);
console.log(
  "organization_creative_style_memory:",
  styleMemory.ok ? "PASS" : "FAIL",
  "-",
  styleMemory.message,
);
console.log(
  "event_assets plan columns:",
  assetCols.ok ? "PASS" : "FAIL",
  "-",
  assetCols.message,
);

const allOk = briefs.ok && styleMemory.ok && assetCols.ok;
process.exit(allOk ? 0 : 1);
