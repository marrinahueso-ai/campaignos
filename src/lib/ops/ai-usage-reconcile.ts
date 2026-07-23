/**
 * Pure helpers for Phase 5 OpenAI day reconciliation (Owner checklist / CLI).
 * Tolerances mirror `ai-apis-constants` (kept numeric here for Node test runner ESM).
 */

const TOKEN_TOLERANCE_PCT = 15;
const COST_TOLERANCE_PCT = 25;

export type AiUsageDayRollup = {
  dayUtc: string;
  requests: number;
  successes: number;
  failures: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  byModel: Array<{
    model: string;
    requests: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  byFeature: Array<{
    feature: string;
    requests: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
};

export type AiUsageReconcileRow = {
  model: string;
  feature: string;
  success: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

function num(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return value;
}

export function utcDayBounds(dayUtc: string): { fromIso: string; toIso: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayUtc)) {
    throw new Error(`Expected YYYY-MM-DD UTC day, got: ${dayUtc}`);
  }
  return {
    fromIso: `${dayUtc}T00:00:00.000Z`,
    toIso: `${dayUtc}T23:59:59.999Z`,
  };
}

export function rollupAiUsageDay(
  dayUtc: string,
  rows: AiUsageReconcileRow[],
): AiUsageDayRollup {
  const byModel = new Map<
    string,
    { requests: number; totalTokens: number; estimatedCostUsd: number }
  >();
  const byFeature = new Map<
    string,
    { requests: number; totalTokens: number; estimatedCostUsd: number }
  >();

  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let estimatedCostUsd = 0;
  let successes = 0;

  for (const row of rows) {
    const tokens = num(row.totalTokens);
    const cost = num(row.estimatedCostUsd);
    promptTokens += num(row.promptTokens);
    completionTokens += num(row.completionTokens);
    totalTokens += tokens;
    estimatedCostUsd += cost;
    if (row.success) successes += 1;

    const modelBucket = byModel.get(row.model) ?? {
      requests: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
    modelBucket.requests += 1;
    modelBucket.totalTokens += tokens;
    modelBucket.estimatedCostUsd += cost;
    byModel.set(row.model, modelBucket);

    const featureBucket = byFeature.get(row.feature) ?? {
      requests: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
    featureBucket.requests += 1;
    featureBucket.totalTokens += tokens;
    featureBucket.estimatedCostUsd += cost;
    byFeature.set(row.feature, featureBucket);
  }

  const sortDesc = (
    a: { requests: number },
    b: { requests: number },
  ) => b.requests - a.requests;

  return {
    dayUtc,
    requests: rows.length,
    successes,
    failures: rows.length - successes,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    byModel: [...byModel.entries()]
      .map(([model, stats]) => ({ model, ...stats }))
      .sort(sortDesc),
    byFeature: [...byFeature.entries()]
      .map(([feature, stats]) => ({ feature, ...stats }))
      .sort(sortDesc),
  };
}

export function withinTolerancePct(
  appValue: number,
  providerValue: number,
  tolerancePct: number,
): boolean {
  if (!Number.isFinite(appValue) || !Number.isFinite(providerValue)) return false;
  if (providerValue === 0) return appValue === 0;
  const deltaPct = (Math.abs(appValue - providerValue) / Math.abs(providerValue)) * 100;
  return deltaPct <= tolerancePct;
}

export function evaluateOpenAiReconcile(input: {
  appTokens: number;
  openAiTokens: number;
  appCostUsd: number;
  openAiCostUsd: number;
}): {
  tokensOk: boolean;
  costOk: boolean;
  tokenTolerancePct: number;
  costTolerancePct: number;
} {
  return {
    tokensOk: withinTolerancePct(
      input.appTokens,
      input.openAiTokens,
      TOKEN_TOLERANCE_PCT,
    ),
    costOk: withinTolerancePct(
      input.appCostUsd,
      input.openAiCostUsd,
      COST_TOLERANCE_PCT,
    ),
    tokenTolerancePct: TOKEN_TOLERANCE_PCT,
    costTolerancePct: COST_TOLERANCE_PCT,
  };
}

export function formatAiUsageDayRollup(rollup: AiUsageDayRollup): string {
  const lines = [
    `AI usage reconcile — UTC day ${rollup.dayUtc}`,
    `Requests: ${rollup.requests} (${rollup.successes} ok / ${rollup.failures} failed)`,
    `Tokens: prompt=${rollup.promptTokens} completion=${rollup.completionTokens} total=${rollup.totalTokens}`,
    `Estimated cost (app pricing ${rollup.estimatedCostUsd.toFixed(6)} USD)`,
    "",
    "By model:",
    ...rollup.byModel.map(
      (row) =>
        `  - ${row.model}: ${row.requests} req, ${row.totalTokens} tokens, $${row.estimatedCostUsd.toFixed(6)}`,
    ),
    "",
    "By feature:",
    ...rollup.byFeature.map(
      (row) =>
        `  - ${row.feature}: ${row.requests} req, ${row.totalTokens} tokens, $${row.estimatedCostUsd.toFixed(6)}`,
    ),
    "",
    `Compare OpenAI Usage → ${rollup.dayUtc} (UTC). Tokens within ±${TOKEN_TOLERANCE_PCT}%; cost within ±${COST_TOLERANCE_PCT}%.`,
  ];
  return lines.join("\n");
}
