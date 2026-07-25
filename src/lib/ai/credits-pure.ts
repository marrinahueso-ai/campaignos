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
