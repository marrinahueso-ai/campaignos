/**
 * Code-first AI / API unit pricing for Owner AI & APIs estimated_cost_usd.
 * Update AI_PRICING_VERSION and rates when provider price cards change.
 * These are internal ops estimates — not customer invoices.
 */

export const AI_PRICING_VERSION = "2026-07-23";

export type TokenModelPricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

export type ImageModelPricing = {
  perImageUsd: number;
};

/** OpenAI-style chat/completion models used (or likely) in Hey Ralli. */
export const TOKEN_MODEL_PRICING: Record<string, TokenModelPricing> = {
  "gpt-4o-mini": { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.6 },
  "gpt-4o": { inputPerMillionUsd: 2.5, outputPerMillionUsd: 10 },
  "gpt-4.1-mini": { inputPerMillionUsd: 0.4, outputPerMillionUsd: 1.6 },
  "gpt-4.1": { inputPerMillionUsd: 2, outputPerMillionUsd: 8 },
  "gpt-5-mini": { inputPerMillionUsd: 0.25, outputPerMillionUsd: 2 },
};

/** Image / Responses image unit estimates (per generated image). */
export const IMAGE_MODEL_PRICING: Record<string, ImageModelPricing> = {
  "gpt-image-1": { perImageUsd: 0.04 },
  "dall-e-3": { perImageUsd: 0.04 },
  "dall-e-2": { perImageUsd: 0.02 },
};

/** Per-request ops estimates for connected APIs (USD). Null = leave cost unset. */
export const API_PROVIDER_UNIT_COST_USD: Partial<
  Record<
    | "meta"
    | "resend"
    | "google"
    | "microsoft"
    | "signupgenius"
    | "stripe"
    | "supabase",
    number
  >
> = {
  resend: 0.001,
};

export function normalizeModelKey(model: string): string {
  return model.trim().toLowerCase();
}

/** Longest-prefix match against known pricing keys. */
export function resolveTokenModelPricing(
  model: string,
): TokenModelPricing | null {
  const key = normalizeModelKey(model);
  if (TOKEN_MODEL_PRICING[key]) return TOKEN_MODEL_PRICING[key];
  const match = Object.keys(TOKEN_MODEL_PRICING)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => key.startsWith(candidate));
  return match ? TOKEN_MODEL_PRICING[match] : null;
}

export function resolveImageModelPricing(
  model: string,
): ImageModelPricing | null {
  const key = normalizeModelKey(model);
  if (IMAGE_MODEL_PRICING[key]) return IMAGE_MODEL_PRICING[key];
  if (key.startsWith("gpt-image")) return IMAGE_MODEL_PRICING["gpt-image-1"];
  if (key.includes("dall-e-3") || key.startsWith("dall-e-3")) {
    return IMAGE_MODEL_PRICING["dall-e-3"];
  }
  if (key.includes("dall-e")) return IMAGE_MODEL_PRICING["dall-e-2"];
  return null;
}

export function estimateTokenCostUsd(input: {
  model: string;
  promptTokens: number | null | undefined;
  completionTokens: number | null | undefined;
}): number | null {
  const pricing = resolveTokenModelPricing(input.model);
  if (!pricing) return null;
  const prompt = Math.max(0, input.promptTokens ?? 0);
  const completion = Math.max(0, input.completionTokens ?? 0);
  if (prompt === 0 && completion === 0) return null;
  return (
    (prompt / 1_000_000) * pricing.inputPerMillionUsd +
    (completion / 1_000_000) * pricing.outputPerMillionUsd
  );
}

export function estimateImageCostUsd(input: {
  model: string;
  imageUnits: number | null | undefined;
}): number | null {
  const units = input.imageUnits;
  if (units == null || units <= 0) return null;
  const pricing = resolveImageModelPricing(input.model);
  if (!pricing) return null;
  return units * pricing.perImageUsd;
}

/**
 * Prefer explicit override, else token cost + image cost.
 * Returns null when nothing can be priced (honest empty — not zero).
 */
export function estimateAiUsageCostUsd(input: {
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  imageUnits?: number | null;
  estimatedCostUsd?: number | null;
}): number | null {
  if (input.estimatedCostUsd != null && Number.isFinite(input.estimatedCostUsd)) {
    return Math.max(0, input.estimatedCostUsd);
  }
  const tokenCost = estimateTokenCostUsd({
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
  });
  const imageCost = estimateImageCostUsd({
    model: input.model,
    imageUnits: input.imageUnits,
  });
  if (tokenCost == null && imageCost == null) return null;
  return (tokenCost ?? 0) + (imageCost ?? 0);
}

export function estimateApiUsageCostUsd(input: {
  provider: string;
  estimatedCostUsd?: number | null;
  units?: number | null;
}): number | null {
  if (input.estimatedCostUsd != null && Number.isFinite(input.estimatedCostUsd)) {
    return Math.max(0, input.estimatedCostUsd);
  }
  const key = input.provider.trim().toLowerCase() as keyof typeof API_PROVIDER_UNIT_COST_USD;
  const unit = API_PROVIDER_UNIT_COST_USD[key];
  if (unit == null) return null;
  const units = input.units == null ? 1 : Math.max(0, input.units);
  if (units === 0) return null;
  return unit * units;
}

export function roundCostUsd(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}
