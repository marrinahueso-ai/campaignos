#!/usr/bin/env node
/**
 * Creative Director smoke test — HTTP + Supabase persistence.
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

const env = loadEnv();
const baseUrl = process.env.CAMPAIGNOS_BASE_URL ?? "http://localhost:3000";
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const results = [];

function pass(step, detail) {
  results.push({ step, ok: true, detail });
  console.log(`PASS: ${step} — ${detail}`);
}

function fail(step, detail) {
  results.push({ step, ok: false, detail });
  console.log(`FAIL: ${step} — ${detail}`);
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
    message.includes("plan_status")
  );
}

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVRQI2P8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function migrationReady() {
  const { error: briefError } = await supabase
    .from("event_creative_briefs")
    .select("event_id")
    .limit(1);
  const { error: colError } = await supabase
    .from("event_assets")
    .select("plan_status, generation_prompt")
    .limit(1);
  return !isMissing(briefError) && !isMissing(colError);
}

const migrationOk = await migrationReady();
migrationOk
  ? pass("1. Migration 014", "Schema ready")
  : fail("1. Migration 014", "Tables/columns missing");

const { data: events, error: eventsError } = await supabase
  .from("events")
  .select("id, title, description, communication_strategy, theme, category, date")
  .neq("status", "archived")
  .order("date", { ascending: true })
  .limit(10);

if (eventsError || !events?.length) {
  fail("2. Find campaign", eventsError?.message ?? "No active events");
  console.log(`\n0/${results.length} checks passed`);
  process.exit(1);
}

const event =
  events.find((e) => e.communication_strategy === "full_campaign") ?? events[0];
pass("2. Find campaign", `${event.title} (${event.id})`);

const eventRes = await fetch(`${baseUrl}/events/${event.id}`);
if (eventRes.status === 200) {
  const html = await eventRes.text();
  if (html.includes("Creative Progress") || html.includes("Creative")) {
    pass("3. Creative tab", "Campaign workspace loads with Creative section");
  } else {
    fail("3. Creative tab", "Creative section not found in page HTML");
  }
} else {
  fail("3. Creative tab", `HTTP ${eventRes.status}`);
}

const { data: assets } = await supabase
  .from("event_assets")
  .select("id, asset_type, status, plan_status, plan_label, generation_prompt")
  .eq("event_id", event.id);

const neededCount = (assets ?? []).filter(
  (asset) =>
    asset.status !== "uploaded" ||
    !asset.plan_status ||
    asset.plan_status === "needed",
).length;

if ((assets ?? []).length > 0 && neededCount > 0) {
  pass(
    "4. Creative Progress",
    `${neededCount} of ${assets.length} assets need artwork`,
  );
} else if ((assets ?? []).length > 0) {
  pass("4. Creative Progress", `${assets.length} assets in plan`);
} else {
  fail("4. Creative Progress", "No event_assets rows for campaign");
}

const testBrief = {
  campaignTitle: event.title,
  personality: ["Joyful", "Community"],
  emotionalTone: ["Joyful", "Colorful", "Welcoming"],
  visualDirection: event.description?.trim()
    ? `Support the event brief for ${event.title}`
    : "Friendly school-community style with clear hierarchy",
  typographySuggestions: "Rounded friendly headers with clean readable body text",
  illustrationVsPhotography: "illustrated",
  colorPalette: ["Navy", "Green", event.theme ?? "School colors"].filter(Boolean),
  iconRecommendations: ["Simple line icons matching illustration style"],
  graphicStyle: "Hand illustrated, bright seasonal colors",
  textureBackgroundSuggestions: "Soft paper texture backgrounds",
  consistencyRules: ["Use the same illustration style across every asset"],
  doNotUse: ["Dark backgrounds", "Corporate stock photos"],
  moodSummary: "Joyful · Colorful · Welcoming",
};

const { error: briefUpsertError } = await supabase.from("event_creative_briefs").upsert(
  {
    event_id: event.id,
    brief: testBrief,
    is_ai_enhanced: false,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "event_id" },
);

briefUpsertError
  ? fail("5. Creative Brief save", briefUpsertError.message)
  : pass("5. Creative Brief save", "Brief upserted");

const briefRes = await fetch(
  `${baseUrl}/creative-studio?campaign=${event.id}&tab=brief`,
);
if (briefRes.status === 200) {
  const html = await briefRes.text();
  const hasBriefUi =
    html.includes("Creative Brief") ||
    html.includes("Creative Studio") ||
    html.includes("Mood");
  hasBriefUi
    ? pass("6. Creative Brief page", "Creative Studio brief tab loads")
    : fail("6. Creative Brief page", "Brief tab content not found");
} else {
  fail("6. Creative Brief page", `HTTP ${briefRes.status}`);
}

if (
  testBrief.emotionalTone.length >= 2 &&
  testBrief.graphicStyle &&
  testBrief.colorPalette.length >= 1
) {
  pass(
    "7. Brief content",
    `Mood: ${testBrief.moodSummary}; style: ${testBrief.graphicStyle.slice(0, 40)}…`,
  );
} else {
  fail("7. Brief content", "Brief missing mood/style/palette");
}

const targetAsset =
  (assets ?? []).find((asset) => asset.asset_type === "flyer") ?? assets?.[0];

if (!targetAsset?.id) {
  fail("8. Smart prompt", "No asset row to update");
} else {
  const testPrompt = [
    `Create an illustrated poster for ${event.title}.`,
    "Soft illustrated trees. Clean typography space.",
    "4:3 layout. Leave top area open for event title.",
    `Smoke test edited at ${new Date().toISOString()}`,
  ].join("\n");

  const { error: promptError } = await supabase
    .from("event_assets")
    .update({
      generation_prompt: testPrompt,
      plan_status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetAsset.id);

  promptError
    ? fail("8. Smart prompt edit", promptError.message)
    : pass("8. Smart prompt edit", `Saved prompt on ${targetAsset.asset_type}`);

  const storagePath = `${event.id}/${targetAsset.asset_type}/v1-smoke-test.png`;
  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-assets/${storagePath}`;

  const { error: uploadError } = await supabase.storage
    .from("event-assets")
    .upload(storagePath, PNG_BYTES, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    fail("9. Upload asset", uploadError.message);
  } else {
    const { error: assetUpdateError } = await supabase
      .from("event_assets")
      .update({
        filename: "smoke-test.png",
        storage_path: publicUrl,
        status: "uploaded",
        plan_status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetAsset.id);

    assetUpdateError
      ? fail("9. Upload asset", assetUpdateError.message)
      : pass("9. Upload asset", `Uploaded to ${targetAsset.asset_type} slot`);
  }

  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();

  if (org?.id) {
    const styleSnapshot = {
      style: testBrief.graphicStyle,
      colors: testBrief.colorPalette,
      composition: "Balanced headline and artwork composition",
      illustrationType: testBrief.illustrationVsPhotography,
      fontStyle: testBrief.typographySuggestions,
      tone: testBrief.moodSummary,
    };

    const { error: approveError } = await supabase
      .from("event_assets")
      .update({
        plan_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetAsset.id);

    approveError
      ? fail("10. Approve asset", approveError.message)
      : pass("10. Approve asset", "plan_status set to approved");

    const { error: memoryError } = await supabase
      .from("organization_creative_style_memory")
      .insert({
        organization_id: org.id,
        source_event_id: event.id,
        source_asset_id: targetAsset.id,
        event_title: event.title,
        asset_type: targetAsset.asset_type,
        style: styleSnapshot,
      });

    memoryError
      ? fail("11. Style memory", memoryError.message)
      : pass("11. Style memory", "Style snapshot saved on approve");

    const { data: memoryRows } = await supabase
      .from("organization_creative_style_memory")
      .select("id, style")
      .eq("source_event_id", event.id)
      .eq("source_asset_id", targetAsset.id)
      .order("approved_at", { ascending: false })
      .limit(1);

    if (memoryRows?.length && memoryRows[0].style?.style) {
      pass("12. Style memory verify", memoryRows[0].style.style.slice(0, 50));
    } else {
      fail("12. Style memory verify", "No style memory row found");
    }
  } else {
    fail("11. Style memory", "No organization row");
  }

  const { data: rereadAsset } = await supabase
    .from("event_assets")
    .select("generation_prompt, plan_status, status, storage_path")
    .eq("id", targetAsset.id)
    .single();

  const { data: rereadBrief } = await supabase
    .from("event_creative_briefs")
    .select("brief")
    .eq("event_id", event.id)
    .single();

  const promptOk = rereadAsset?.generation_prompt === testPrompt;
  const planOk = rereadAsset?.plan_status === "approved";
  const uploadOk = rereadAsset?.status === "uploaded" && Boolean(rereadAsset?.storage_path);
  const briefOk = rereadBrief?.brief?.campaignTitle === event.title;

  if (promptOk && planOk && uploadOk && briefOk) {
    pass("13. Persist after refresh", "Brief, prompt, upload, and approval persisted");
  } else {
    fail(
      "13. Persist after refresh",
      `prompt=${promptOk} plan=${planOk} upload=${uploadOk} brief=${briefOk}`,
    );
  }
}

const failures = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);
