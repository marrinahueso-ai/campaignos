import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const vars = {};

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    vars[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return vars;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const results = [];
const errors = [];

function pass(label, detail = "") {
  results.push({ status: "PASS", label, detail });
  console.log(`PASS: ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  errors.push({ label, detail });
  console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
}

async function verifyTable(name) {
  const { error } = await supabase.from(name).select("*").limit(1);

  if (error) {
    fail(`${name} table`, error.message);
    return false;
  }

  pass(`${name} table exists`);
  return true;
}

async function verifyBuckets() {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    fail("storage buckets", error.message);
    return false;
  }

  const bucketNames = (data ?? []).map((bucket) => bucket.name);
  const required = ["school-assets", "calendar-uploads"];

  for (const bucket of required) {
    if (bucketNames.includes(bucket)) {
      pass(`storage bucket "${bucket}" exists`);
    } else {
      fail(`storage bucket "${bucket}" exists`, `found: ${bucketNames.join(", ") || "none"}`);
    }
  }

  return required.every((bucket) => bucketNames.includes(bucket));
}

function createSampleFiles() {
  const fixturesDir = resolve(process.cwd(), "scripts/fixtures");
  mkdirSync(fixturesDir, { recursive: true });

  const calendarPath = resolve(fixturesDir, "sample-calendar.csv");
  writeFileSync(
    calendarPath,
    "date,event\n2026-09-15,Fall Carnival\n2026-10-01,Book Fair\n",
  );

  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const logoPath = resolve(fixturesDir, "sample-logo.png");
  writeFileSync(logoPath, Buffer.from(pngBase64, "base64"));

  return { calendarPath, logoPath };
}

async function runWizardSaveTest() {
  const { calendarPath, logoPath } = createSampleFiles();
  const stamp = Date.now();
  const schoolName = `Sprint 3 Verification School ${stamp}`;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name: schoolName,
      district: "Verification District",
      school_year: "2025-2026",
      mascot: "Eagles",
      principal: "Dr. Alex Morgan",
      school_website: "https://verify.example.edu",
      pto_website: "https://pto-verify.example.org",
    })
    .select("*")
    .single();

  if (organizationError || !organization) {
    fail("save organization", organizationError?.message ?? "no row returned");
    return null;
  }

  pass("organization saved", organization.id);

  const logoBuffer = readFileSync(logoPath);
  const ptoLogoPath = `${organization.id}/pto-logo.png`;
  const schoolLogoPath = `${organization.id}/school-logo.png`;

  const { error: ptoLogoError } = await supabase.storage
    .from("school-assets")
    .upload(ptoLogoPath, logoBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (ptoLogoError) {
    fail("upload PTO logo", ptoLogoError.message);
    return organization.id;
  }

  pass("PTO logo uploaded");

  const { error: schoolLogoError } = await supabase.storage
    .from("school-assets")
    .upload(schoolLogoPath, logoBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (schoolLogoError) {
    fail("upload school logo", schoolLogoError.message);
    return organization.id;
  }

  pass("school logo uploaded");

  const { data: publicUrl } = supabase.storage
    .from("school-assets")
    .getPublicUrl(ptoLogoPath);

  const { data: brandAssets, error: brandError } = await supabase
    .from("brand_assets")
    .insert({
      organization_id: organization.id,
      pto_logo: publicUrl.publicUrl,
      school_logo: supabase.storage.from("school-assets").getPublicUrl(schoolLogoPath)
        .data.publicUrl,
      primary_color: "#4F46E5",
      secondary_color: "#0F172A",
      font_family: "Inter",
    })
    .select("*")
    .single();

  if (brandError || !brandAssets) {
    fail("save brand_assets", brandError?.message ?? "no row returned");
    return organization.id;
  }

  pass("brand_assets saved", brandAssets.id);

  const calendarBuffer = readFileSync(calendarPath);
  const calendarStoragePath = `${organization.id}/${stamp}-sample-calendar.csv`;

  const { error: calendarUploadError } = await supabase.storage
    .from("calendar-uploads")
    .upload(calendarStoragePath, calendarBuffer, {
      contentType: "text/csv",
      upsert: true,
    });

  if (calendarUploadError) {
    fail("upload calendar file", calendarUploadError.message);
    return organization.id;
  }

  pass("calendar file uploaded");

  const { data: calendarImport, error: calendarImportError } = await supabase
    .from("calendar_imports")
    .insert({
      organization_id: organization.id,
      filename: "sample-calendar.csv",
      file_type: "csv",
      upload_status: "uploaded",
      storage_path: calendarStoragePath,
    })
    .select("*")
    .single();

  if (calendarImportError || !calendarImport) {
    fail("save calendar_imports", calendarImportError?.message ?? "no row returned");
    return organization.id;
  }

  pass("calendar_imports saved", calendarImport.id);

  const { count: brandCount } = await supabase
    .from("brand_assets")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const { count: calendarCount } = await supabase
    .from("calendar_imports")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  if ((brandCount ?? 0) >= 1 && (calendarCount ?? 0) >= 1) {
    pass("related records verified", `brand_assets=${brandCount}, calendar_imports=${calendarCount}`);
  } else {
    fail(
      "related records verified",
      `brand_assets=${brandCount ?? 0}, calendar_imports=${calendarCount ?? 0}`,
    );
  }

  return organization.id;
}

console.log("=== Sprint 3 Supabase Verification ===\n");

await verifyTable("organizations");
await verifyTable("brand_assets");
await verifyTable("calendar_imports");
await verifyBuckets();
await runWizardSaveTest();

console.log("\n=== Summary ===");
console.log(`Passed: ${results.length}`);
console.log(`Failed: ${errors.length}`);

if (errors.length > 0) {
  console.log("\nErrors:");
  for (const error of errors) {
    console.log(`- ${error.label}: ${error.detail}`);
  }
  process.exit(1);
}
