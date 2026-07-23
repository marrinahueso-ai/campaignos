/** Stub monthly spend threshold (USD) for “Orgs near limit” — not billed plan limits. */
export const AI_ORGS_NEAR_LIMIT_USD = 50;

/** Max rows loaded for Owner aggregates / charts in one request. */
export const AI_APIS_AGGREGATE_ROW_CAP = 8_000;

/** Max rows for CSV export. */
export const AI_APIS_CSV_EXPORT_CAP = 2_000;

/** Default table page size. */
export const AI_APIS_TABLE_PAGE_SIZE = 25;

/**
 * First day durable `ai_usage_log` / `api_usage_log` instrumentation was applied
 * (Phase 1 migration). Shown in empty states — not a claim of backfilled history.
 */
export const AI_APIS_COLLECTING_SINCE = "2026-07-23";

/**
 * Phase 5 OpenAI reconcile tolerance for a sample UTC day.
 * App `estimated_cost_usd` can diverge from OpenAI invoices (pricing lag,
 * image units, failed retries). Token totals should stay within this band.
 */
export const AI_APIS_RECONCILE_TOKEN_TOLERANCE_PCT = 15;
export const AI_APIS_RECONCILE_COST_TOLERANCE_PCT = 25;

/** Preferred Owner soak window before customer QA (calendar days). */
export const AI_APIS_SOAK_DAYS_TARGET = 3;

export const AI_APIS_CONNECTED_PROVIDERS = [
  "meta",
  "resend",
  "google",
  "microsoft",
  "signupgenius",
  "stripe",
  "supabase",
] as const;
