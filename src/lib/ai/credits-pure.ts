/** Pure AI credit helpers (no server / DB). Safe for unit tests. */

export type BurnBucketSplit = {
  periodBurn: number;
  reserveBurn: number;
  usedAfter: number;
  reserveAfter: number;
};

/** Period allowance first, then reserve. */
export function splitBurnAcrossBuckets(input: {
  allowance: number;
  used: number;
  reserveBalance: number;
  cost: number;
}): BurnBucketSplit {
  const cost = Math.max(0, Math.floor(input.cost));
  const periodRemaining = Math.max(0, input.allowance - input.used);
  const periodBurn = Math.min(periodRemaining, cost);
  const reserveBurn = Math.min(
    Math.max(0, input.reserveBalance),
    cost - periodBurn,
  );
  return {
    periodBurn,
    reserveBurn,
    usedAfter: input.used + periodBurn,
    reserveAfter: Math.max(0, input.reserveBalance - reserveBurn),
  };
}

/** Period + Reserve fully spent (founding / unlimited never exhausted). */
export function isAiCreditsExhausted(input: {
  unlimited: boolean;
  periodRemaining: number;
  reserveBalance: number;
}): boolean {
  if (input.unlimited) return false;
  return (
    Math.max(0, input.periodRemaining) + Math.max(0, input.reserveBalance) <= 0
  );
}

/** True when the org can afford this action cost (Phase 6 hard-block). */
export function canAffordAiCredits(input: {
  unlimited: boolean;
  periodRemaining: number;
  reserveBalance: number;
  cost: number;
}): boolean {
  if (input.unlimited) return true;
  const cost = Math.max(0, Math.floor(input.cost));
  if (cost <= 0) return true;
  const total =
    Math.max(0, input.periodRemaining) + Math.max(0, input.reserveBalance);
  return total >= cost;
}
