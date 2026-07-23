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

/**
 * One-time OpenAI Usage API history import (Owner monitoring only).
 * Rows are daily×model aggregates attributed to Edmondson; School B is pinned
 * in the org filter/cost chart with $0 until it has live app logs.
 */
export const AI_APIS_OPENAI_IMPORT_FEATURE = "openai_account_history";
export const AI_APIS_OPENAI_IMPORT_ACTION = "openai_usage_import";
export const AI_APIS_HISTORY_ATTRIBUTE_ORG_ID =
  "d88b2f96-b924-4bd5-b6e2-40ad8ee84592"; // Edmondson Elementary (marrina admin)
export const AI_APIS_PINNED_ORGANIZATIONS = [
  {
    id: "d88b2f96-b924-4bd5-b6e2-40ad8ee84592",
    name: "Edmondson Elementary",
  },
  {
    id: "0a7efc8a-ff81-4d68-8a5d-a695d2df5476",
    name: "School B",
  },
] as const;

export const AI_APIS_CONNECTED_PROVIDERS = [
  "meta",
  "resend",
  "google",
  "microsoft",
  "signupgenius",
  "stripe",
  "supabase",
] as const;
