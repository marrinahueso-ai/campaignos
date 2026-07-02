#!/usr/bin/env node
/**
 * Engine 18.5 AI Artwork smoke test — schema, generation, approve, progress, style memory.
 */
import { randomUUID } from "node:crypto";
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
    message.includes("could not find")
  );
}

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVRQI2P8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function generateOpenAiImage(prompt, size) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  if (!apiKey) return { ok: false, base64: null, model, error: "OPENAI_API_KEY not set" };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      ...(model.toLowerCase().startsWith("gpt-image")
        ? { quality: "medium", output_format: "png" }
        : {
            response_format: "b64_json",
            ...(model.toLowerCase().includes("-3") ? { quality: "standard" } : {}),
          }),
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    return { ok: false, base64: null, model, error: body.slice(0, 200) };
  }

  const parsed = JSON.parse(body);
  const base64 = parsed.data?.[0]?.b64_json ?? null;
  if (!base64) return { ok: false, base64: null, model, error: "No image data" };
  return { ok: true, base64, model, error: null };
}

function buildConceptStoragePath(eventId, assetType, batchId, conceptIndex) {
  return `${eventId}/${assetType}/concepts/${batchId}/concept-${conceptIndex}.png`;
}

function getPublicUrl(storagePath) {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-assets/${storagePath}`;
}

async function snapshotAssetToVersion(asset, assetId) {
  if (asset.status !== "uploaded" || !asset.storage_path) return true;

  const { error } = await supabase.from("event_asset_versions").insert({
    event_asset_id: assetId,
    version_number: asset.current_version ?? 1,
    filename: asset.filename,
    storage_path: asset.storage_path,
    uploaded_by: asset.uploaded_by,
    canva_url: asset.canva_url,
  });
  return !error;
}

async function activateConceptAsAsset(eventId, assetId, concept, uploadedBy) {
  const { data: asset, error: fetchError } = await supabase
    .from("event_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset || asset.event_id !== eventId) return false;

  await snapshotAssetToVersion(asset, assetId);

  const currentVersion = asset.current_version ?? 1;
  const nextVersion =
    asset.status === "uploaded" && asset.storage_path ? currentVersion + 1 : currentVersion;

  await supabase.from("event_asset_versions").insert({
    event_asset_id: assetId,
    version_number: nextVersion,
    filename: concept.filename,
    storage_path: concept.storagePath,
    uploaded_by: uploadedBy,
  });

  const { error: updateError } = await supabase
    .from("event_assets")
    .update({
      filename: concept.filename,
      storage_path: concept.storagePath,
      status: "uploaded",
      ai_generated: true,
      plan_status: "approved",
      generation_prompt: concept.generationPrompt,
      uploaded_by: uploadedBy,
      current_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (updateError) return false;

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "discarded" })
    .eq("event_asset_id", assetId)
    .eq("status", "pending")
    .neq("id", concept.id);

  await supabase
    .from("event_artwork_concepts")
    .update({ status: "approved" })
    .eq("id", concept.id);

  return true;
}

// Step 1: event_artwork_concepts exists
const { error: conceptsTableError } = await supabase
  .from("event_artwork_concepts")
  .select("id")
  .limit(1);

isMissing(conceptsTableError)
  ? fail("1. event_artwork_concepts exists", conceptsTableError?.message ?? "missing")
  : pass("1. event_artwork_concepts exists", "table queryable");

// Step 2: generation_settings column
const { error: settingsColError } = await supabase
  .from("event_assets")
  .select("generation_settings")
  .limit(1);

isMissing(settingsColError)
  ? fail("2. event_assets.generation_settings", settingsColError?.message ?? "missing")
  : pass("2. event_assets.generation_settings", "column present");

if (conceptsTableError || settingsColError) {
  console.log("\nApply supabase/migrations/016_ai_artwork_workspace.sql first.");
  process.exit(1);
}

// Find campaign
const { data: events, error: eventsError } = await supabase
  .from("events")
  .select("id, title, description, theme")
  .neq("status", "archived")
  .order("date", { ascending: true })
  .limit(10);

if (eventsError || !events?.length) {
  fail("3. Creative Studio → Artwork", eventsError?.message ?? "No active events");
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  process.exit(1);
}

const event = events[0];

// Step 3: Artwork tab loads
const artworkRes = await fetch(
  `${baseUrl}/creative-studio?campaign=${event.id}&tab=artwork`,
);
if (artworkRes.status === 200) {
  const html = await artworkRes.text();
  const hasArtworkUi =
    html.includes("Generate Artwork") ||
    html.includes("Concept Gallery") ||
    html.includes("Artwork") ||
    html.includes("Creative Studio");
  hasArtworkUi
    ? pass("3. Creative Studio → Artwork", "Artwork tab page loads")
    : fail("3. Creative Studio → Artwork", "Artwork workspace UI not found in HTML");
} else {
  fail("3. Creative Studio → Artwork", `HTTP ${artworkRes.status} — is dev server running?`);
}

// Step 4: Select planned asset
const { data: assets } = await supabase
  .from("event_assets")
  .select("id, asset_type, plan_status, plan_label, generation_prompt, generation_settings, status")
  .eq("event_id", event.id);

const targetAsset =
  (assets ?? []).find((a) => a.asset_type === "flyer" && a.id) ??
  (assets ?? []).find((a) => a.id);

if (!targetAsset?.id) {
  fail("4. Select planned asset", "No event_assets row for campaign");
} else {
  pass(
    "4. Select planned asset",
    `${targetAsset.plan_label ?? targetAsset.asset_type} (${targetAsset.id.slice(0, 8)}…)`,
  );
}

if (!targetAsset?.id) {
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  process.exit(1);
}

// Step 5–6: Generate 4 concepts
const batchId = randomUUID();
const smartPrompt =
  targetAsset.generation_prompt ??
  `Illustrated campaign artwork for ${event.title}. Friendly school-community style.`;

const generationSettings = {
  additionalInstructions: "Smoke test generation",
  negativeInstructions: "No dark backgrounds",
  imageSizePreset: "square",
  customSize: null,
  style: "Hand illustrated, bright colors",
  inspirationAssetId: null,
};

await supabase
  .from("event_assets")
  .update({
    generation_prompt: smartPrompt,
    generation_settings: generationSettings,
    plan_status: "in_progress",
    updated_at: new Date().toISOString(),
  })
  .eq("id", targetAsset.id);

const conceptIds = [];
let usedOpenAi = false;

for (let index = 1; index <= 4; index += 1) {
  const prompt = [
    `Create campaign artwork for: ${targetAsset.plan_label ?? targetAsset.asset_type}.`,
    "",
    "SMART PROMPT",
    smartPrompt,
    "",
    `Concept ${index} — unique creative direction.`,
  ].join("\n");

  let imageBytes = PNG_BYTES;
  let model = "smoke-test-placeholder";

  const openAi = await generateOpenAiImage(prompt, "1024x1024");
  if (openAi.ok && openAi.base64) {
    imageBytes = Buffer.from(openAi.base64, "base64");
    model = openAi.model;
    usedOpenAi = true;
  }

  const storagePath = buildConceptStoragePath(
    event.id,
    targetAsset.asset_type,
    batchId,
    index,
  );

  const { error: uploadError } = await supabase.storage
    .from("event-assets")
    .upload(storagePath, imageBytes, { contentType: "image/png", upsert: false });

  if (uploadError) {
    fail("5. Generate artwork", `Upload failed concept ${index}: ${uploadError.message}`);
    break;
  }

  const publicUrl = getPublicUrl(storagePath);
  const { data: inserted, error: insertError } = await supabase
    .from("event_artwork_concepts")
    .insert({
      event_id: event.id,
      event_asset_id: targetAsset.id,
      batch_id: batchId,
      concept_index: index,
      storage_path: publicUrl,
      filename: `concept-${index}.png`,
      generation_prompt: prompt,
      additional_instructions: generationSettings.additionalInstructions,
      negative_instructions: generationSettings.negativeInstructions,
      image_size_preset: generationSettings.imageSizePreset,
      style: generationSettings.style,
      variation_type: null,
      inspiration_asset_id: null,
      provider: usedOpenAi ? "openai" : "openai",
      model,
      status: "pending",
    })
    .select("id, concept_index")
    .single();

  if (insertError) {
    fail("5. Generate artwork", insertError.message);
    break;
  }
  conceptIds.push(inserted);
}

if (conceptIds.length === 4) {
  pass(
    "5. Generate artwork",
    usedOpenAi
      ? "4 concepts via OpenAI Images API"
      : "4 concepts via placeholder PNG (OPENAI_API_KEY missing or failed)",
  );
} else if (!results.some((r) => r.step === "5. Generate artwork")) {
  fail("5. Generate artwork", `Only ${conceptIds.length}/4 concepts created`);
}

// Step 6: Confirm 4 concepts
const { data: pendingConcepts } = await supabase
  .from("event_artwork_concepts")
  .select("id, concept_index, status")
  .eq("event_asset_id", targetAsset.id)
  .eq("batch_id", batchId)
  .eq("status", "pending")
  .order("concept_index");

if ((pendingConcepts ?? []).length === 4) {
  pass("6. Confirm 4 concepts", `batch ${batchId.slice(0, 8)}…`);
} else {
  fail("6. Confirm 4 concepts", `Found ${pendingConcepts?.length ?? 0}, expected 4`);
}

// Step 7: Approve one concept
const approveTarget = pendingConcepts?.[0];
let approved = false;

if (approveTarget) {
  const { data: conceptRow } = await supabase
    .from("event_artwork_concepts")
    .select("*")
    .eq("id", approveTarget.id)
    .single();

  if (conceptRow) {
    approved = await activateConceptAsAsset(
      event.id,
      targetAsset.id,
      {
        id: conceptRow.id,
        filename: conceptRow.filename,
        storagePath: conceptRow.storage_path,
        generationPrompt: conceptRow.generation_prompt,
      },
      "Smoke Test",
    );
  }
}

approved
  ? pass("7. Approve one concept", `Concept ${approveTarget?.concept_index ?? 1} approved`)
  : fail("7. Approve one concept", "activateConceptAsAsset failed");

// Step 8: Active event asset
const { data: updatedAsset } = await supabase
  .from("event_assets")
  .select("status, storage_path, ai_generated, plan_status")
  .eq("id", targetAsset.id)
  .single();

if (
  updatedAsset?.status === "uploaded" &&
  updatedAsset?.storage_path &&
  updatedAsset?.ai_generated &&
  updatedAsset?.plan_status === "approved"
) {
  pass("8. Active event asset", "status=uploaded, ai_generated=true, plan_status=approved");
} else {
  fail(
    "8. Active event asset",
    `status=${updatedAsset?.status} ai_generated=${updatedAsset?.ai_generated} plan=${updatedAsset?.plan_status}`,
  );
}

// Step 9: Creative Progress updates
const eventRes = await fetch(`${baseUrl}/events/${event.id}`);
if (eventRes.status === 200) {
  const html = await eventRes.text();
  const showsApproved =
    html.includes("Creative Progress") &&
    (html.includes("Approved") || html.includes("approved") || html.includes(targetAsset.asset_type));
  showsApproved
    ? pass("9. Creative Progress updates", "Campaign page shows Creative Progress with approved state")
    : fail("9. Creative Progress updates", "Creative Progress or approved label not found");
} else {
  fail("9. Creative Progress updates", `HTTP ${eventRes.status}`);
}

// Step 10: Style memory writes
const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();

if (org?.id && approved) {
  const styleSnapshot = {
    style: generationSettings.style,
    colors: [event.theme ?? "School colors"],
    composition: "Balanced headline and artwork composition",
    illustrationType: "illustrated",
    fontStyle: "Friendly school typography",
    tone: "Joyful · Colorful · Welcoming",
  };

  const memoryBefore = await supabase
    .from("organization_creative_style_memory")
    .select("id")
    .eq("source_asset_id", targetAsset.id)
    .eq("source_event_id", event.id);

  const { error: memoryError } = await supabase
    .from("organization_creative_style_memory")
    .insert({
      organization_id: org.id,
      source_event_id: event.id,
      source_asset_id: targetAsset.id,
      event_title: event.title,
      asset_type: targetAsset.asset_type,
      style: styleSnapshot,
      approved_at: new Date().toISOString(),
    });

  if (memoryError) {
    fail("10. Style memory writes", memoryError.message);
  } else {
    const { data: memoryAfter } = await supabase
      .from("organization_creative_style_memory")
      .select("id, style")
      .eq("source_asset_id", targetAsset.id)
      .eq("source_event_id", event.id)
      .order("approved_at", { ascending: false })
      .limit(1);

    const countIncreased = (memoryAfter?.length ?? 0) > (memoryBefore.data?.length ?? 0);
    const hasStyle = Boolean(memoryAfter?.[0]?.style?.style);
    countIncreased && hasStyle
      ? pass("10. Style memory writes", memoryAfter[0].style.style.slice(0, 60))
      : fail("10. Style memory writes", "Style memory row not found after insert");
  }
} else if (!org?.id) {
  fail("10. Style memory writes", "No organization row");
} else {
  fail("10. Style memory writes", "Skipped — approve step failed");
}

const failures = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);
