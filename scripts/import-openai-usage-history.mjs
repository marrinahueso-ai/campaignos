/**
 * One-time Owner import of OpenAI Usage API history into ai_usage_log.
 *
 * Requires OPENAI_ADMIN_KEY (Admin API key with api.usage.read) — not the
 * project OPENAI_API_KEY — plus NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-openai-usage-history.mjs
 */
import { createClient } from "@supabase/supabase-js";

const COLLECTING_SINCE = "2026-07-23";
const ORG_ID = "d88b2f96-b924-4bd5-b6e2-40ad8ee84592"; // Edmondson Elementary
const FEATURE = "openai_account_history";
const ACTION = "openai_usage_import";
const LOOKBACK_DAYS = 90;

const adminKey =
  process.env.OPENAI_ADMIN_KEY?.trim() ||
  process.env.OPENAI_USAGE_API_KEY?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!adminKey) {
  console.error(
    "FAIL: set OPENAI_ADMIN_KEY (platform.openai.com → Organization → Admin keys, scope api.usage.read)",
  );
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("FAIL: need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const endExclusive = new Date(`${COLLECTING_SINCE}T00:00:00.000Z`);
const start = new Date(endExclusive);
start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS);
const startTime = Math.floor(start.getTime() / 1000);
const endTime = Math.floor(endExclusive.getTime() / 1000);

async function fetchBuckets(path) {
  const buckets = [];
  let page;
  for (let i = 0; i < 40; i += 1) {
    const endpoint = new URL(`https://api.openai.com/v1${path}`);
    endpoint.searchParams.set("start_time", String(startTime));
    endpoint.searchParams.set("end_time", String(endTime));
    endpoint.searchParams.set("bucket_width", "1d");
    endpoint.searchParams.set("limit", "31");
    endpoint.searchParams.append("group_by", "model");
    if (page) endpoint.searchParams.set("page", page);
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || `${path} failed ${res.status}`);
    }
    buckets.push(...(json.data ?? []));
    page = json.next_page || undefined;
    if (!page) break;
  }
  return buckets;
}

async function fetchCosts() {
  const byDay = new Map();
  let page;
  for (let i = 0; i < 40; i += 1) {
    const endpoint = new URL("https://api.openai.com/v1/organization/costs");
    endpoint.searchParams.set("start_time", String(startTime));
    endpoint.searchParams.set("end_time", String(endTime));
    endpoint.searchParams.set("bucket_width", "1d");
    endpoint.searchParams.set("limit", "31");
    if (page) endpoint.searchParams.set("page", page);
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    const json = await res.json();
    if (!res.ok) return byDay;
    for (const bucket of json.data ?? []) {
      const day = new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
      const amount = (bucket.results ?? []).reduce(
        (sum, row) => sum + (Number(row.amount?.value) || 0),
        0,
      );
      byDay.set(day, (byDay.get(day) ?? 0) + amount);
    }
    page = json.next_page || undefined;
    if (!page) break;
  }
  return byDay;
}

const [completions, images, costs] = await Promise.all([
  fetchBuckets("/organization/usage/completions"),
  fetchBuckets("/organization/usage/images").catch((err) => {
    console.warn("images skipped:", err.message);
    return [];
  }),
  fetchCosts(),
]);

const pending = [];
const tokensByDay = new Map();

function add(bucket, kind) {
  const day = new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
  for (const result of bucket.results ?? []) {
    const model =
      (result.model && String(result.model).trim()) ||
      (kind === "images" ? "gpt-image-1" : "unknown");
    const prompt = Math.max(0, Number(result.input_tokens) || 0);
    const completion = Math.max(0, Number(result.output_tokens) || 0);
    const total = prompt + completion;
    const requests = Math.max(0, Number(result.num_model_requests) || 0);
    if (total === 0 && requests === 0) continue;
    tokensByDay.set(day, (tokensByDay.get(day) ?? 0) + Math.max(total, 1));
    pending.push({
      request_id: `openai-hist:${kind}:${day}:${model}`,
      created_at: `${day}T12:00:00.000Z`,
      organization_id: ORG_ID,
      feature: FEATURE,
      action_type: ACTION,
      provider: "openai",
      model,
      environment: "production",
      prompt_tokens: prompt || null,
      completion_tokens: completion || null,
      total_tokens: total || null,
      image_units: kind === "images" ? Math.max(1, requests || 1) : null,
      estimated_cost_usd: null,
      latency_ms: null,
      success: true,
      error_code: null,
      error_message:
        requests > 0
          ? `OpenAI Usage API aggregate: ${requests} model request(s) that day`
          : "OpenAI Usage API daily aggregate (one-time Owner import)",
      channel: null,
      user_id: null,
      event_id: null,
    });
  }
}

for (const b of completions) add(b, "completions");
for (const b of images) add(b, "images");

for (const row of pending) {
  const day = row.created_at.slice(0, 10);
  const dayCost = costs.get(day);
  if (dayCost == null || dayCost <= 0) continue;
  const dayTokens = tokensByDay.get(day) ?? 0;
  const dayRows = pending.filter((r) => r.created_at.startsWith(day));
  if (dayTokens <= 0) {
    row.estimated_cost_usd =
      Math.round((dayCost / Math.max(1, dayRows.length)) * 1e6) / 1e6;
  } else {
    row.estimated_cost_usd =
      Math.round(((row.total_tokens || 0) / dayTokens) * dayCost * 1e6) / 1e6;
  }
}

console.log(
  `Range ${start.toISOString()} → ${endExclusive.toISOString()} (exclusive)`,
);
console.log(`Pending rows: ${pending.length}`);

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ids = pending.map((r) => r.request_id);
const { data: existing, error: existingError } = await admin
  .from("ai_usage_log")
  .select("request_id")
  .in("request_id", ids);
if (existingError) {
  console.error("FAIL existing check:", existingError.message);
  process.exit(1);
}
const have = new Set((existing ?? []).map((r) => r.request_id));
const toInsert = pending.filter((r) => !have.has(r.request_id));
console.log(`Inserting ${toInsert.length} (skip ${pending.length - toInsert.length})`);

for (let i = 0; i < toInsert.length; i += 100) {
  const chunk = toInsert.slice(i, i + 100);
  const { error } = await admin.from("ai_usage_log").insert(chunk);
  if (error) {
    console.error("FAIL insert:", error.message);
    process.exit(1);
  }
}

console.log("OK — attributed to Edmondson Elementary. School B stays $0 until live usage.");
console.log("Re-open /ops/ai-apis with From covering the import range.");
