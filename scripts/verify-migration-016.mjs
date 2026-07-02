#!/usr/bin/env node
/**
 * Migration 016 verification — event_artwork_concepts + generation_settings.
 */
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

function isMissing(error) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("generation_settings")
  );
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function checkConceptsTable() {
  const { error } = await supabase.from("event_artwork_concepts").select("id").limit(1);
  if (!error) return { ok: true, message: "table exists" };
  if (isMissing(error)) return { ok: false, message: error.message };
  return { ok: true, message: `table exists (${error.message})` };
}

async function checkGenerationSettingsColumn() {
  const { error } = await supabase
    .from("event_assets")
    .select("generation_settings")
    .limit(1);
  if (isMissing(error)) return { ok: false, message: error.message };
  return { ok: true, message: "generation_settings column present" };
}

const [concepts, settings] = await Promise.all([
  checkConceptsTable(),
  checkGenerationSettingsColumn(),
]);

console.log("Migration 016 verification");
console.log(
  "event_artwork_concepts:",
  concepts.ok ? "PASS" : "FAIL",
  "-",
  concepts.message,
);
console.log(
  "event_assets.generation_settings:",
  settings.ok ? "PASS" : "FAIL",
  "-",
  settings.message,
);

const allOk = concepts.ok && settings.ok;
process.exit(allOk ? 0 : 1);
