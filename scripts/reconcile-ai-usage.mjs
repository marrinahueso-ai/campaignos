/**
 * Phase 5 — roll up ai_usage_log for one UTC day for OpenAI dashboard compare.
 *
 * Usage:
 *   node --env-file=.env.local scripts/reconcile-ai-usage.mjs
 *   node --env-file=.env.local scripts/reconcile-ai-usage.mjs 2026-07-23
 */
import { createClient } from "@supabase/supabase-js";

const dayArg = process.argv[2];
const dayUtc =
  dayArg && /^\d{4}-\d{2}-\d{2}$/.test(dayArg)
    ? dayArg
    : new Date().toISOString().slice(0, 10);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "FAIL: need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local)",
  );
  process.exit(1);
}

const fromIso = `${dayUtc}T00:00:00.000Z`;
const toIso = `${dayUtc}T23:59:59.999Z`;
const TOKEN_TOLERANCE_PCT = 15;
const COST_TOLERANCE_PCT = 25;

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin
  .from("ai_usage_log")
  .select(
    "model, feature, success, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd",
  )
  .gte("created_at", fromIso)
  .lte("created_at", toIso)
  .order("created_at", { ascending: true })
  .limit(20_000);

if (error) {
  console.error("FAIL: query ai_usage_log:", error.message);
  process.exit(1);
}

const rows = data ?? [];
const byModel = new Map();
const byFeature = new Map();
let promptTokens = 0;
let completionTokens = 0;
let totalTokens = 0;
let estimatedCostUsd = 0;
let successes = 0;

for (const row of rows) {
  const tokens = Number(row.total_tokens) || 0;
  const cost = Number(row.estimated_cost_usd) || 0;
  promptTokens += Number(row.prompt_tokens) || 0;
  completionTokens += Number(row.completion_tokens) || 0;
  totalTokens += tokens;
  estimatedCostUsd += cost;
  if (row.success) successes += 1;

  const model = row.model || "(unknown)";
  const feature = row.feature || "(unknown)";
  const m = byModel.get(model) ?? { requests: 0, totalTokens: 0, cost: 0 };
  m.requests += 1;
  m.totalTokens += tokens;
  m.cost += cost;
  byModel.set(model, m);

  const f = byFeature.get(feature) ?? { requests: 0, totalTokens: 0, cost: 0 };
  f.requests += 1;
  f.totalTokens += tokens;
  f.cost += cost;
  byFeature.set(feature, f);
}

console.log(`AI usage reconcile — UTC day ${dayUtc}`);
console.log(
  `Requests: ${rows.length} (${successes} ok / ${rows.length - successes} failed)`,
);
console.log(
  `Tokens: prompt=${promptTokens} completion=${completionTokens} total=${totalTokens}`,
);
console.log(`Estimated cost (app pricing): $${estimatedCostUsd.toFixed(6)}`);
console.log("");
console.log("By model:");
for (const [model, stats] of [...byModel.entries()].sort(
  (a, b) => b[1].requests - a[1].requests,
)) {
  console.log(
    `  - ${model}: ${stats.requests} req, ${stats.totalTokens} tokens, $${stats.cost.toFixed(6)}`,
  );
}
console.log("");
console.log("By feature:");
for (const [feature, stats] of [...byFeature.entries()].sort(
  (a, b) => b[1].requests - a[1].requests,
)) {
  console.log(
    `  - ${feature}: ${stats.requests} req, ${stats.totalTokens} tokens, $${stats.cost.toFixed(6)}`,
  );
}
console.log("");
console.log(
  `OpenAI Usage dashboard → compare UTC ${dayUtc}. Tokens ±${TOKEN_TOLERANCE_PCT}%; cost ±${COST_TOLERANCE_PCT}%.`,
);
console.log("Docs: docs/qa/owner-ai-apis.md § F — Accuracy lock");

if (rows.length === 0) {
  console.log("");
  console.log(
    "NOTE: zero rows — soak not started or writers not reaching this project yet.",
  );
  process.exit(0);
}
