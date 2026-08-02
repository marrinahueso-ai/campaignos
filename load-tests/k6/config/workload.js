/**
 * VU ramps and traffic mix for first-20-school simulations.
 */

/** Approximate activity mix (must sum to 100). */
export const TRAFFIC_WEIGHTS = {
  dashboard: 35,
  calendar: 25,
  communicationsCreator: 15,
  approvals: 15,
  communicationsHub: 10,
};

export const SMOKE_WORKLOAD = {
  executor: "constant-vus",
  vus: 2,
  duration: "2m",
};

/** Normal early-launch: ~10 minutes, 4–8 concurrent VUs. */
export const TWENTY_SCHOOLS_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: 4 },
    { duration: "2m", target: 6 },
    { duration: "4m", target: 8 },
    { duration: "2m", target: 5 },
    { duration: "1m", target: 0 },
  ],
  gracefulRampDown: "30s",
};

/**
 * Weighted random workflow key.
 * @param {() => number} [rand] returns [0,1)
 */
export function pickWorkflow(rand = Math.random) {
  const roll = rand() * 100;
  let cursor = 0;
  for (const [key, weight] of Object.entries(TRAFFIC_WEIGHTS)) {
    cursor += weight;
    if (roll < cursor) return key;
  }
  return "dashboard";
}

/** Think-time between actions (seconds). */
export function thinkTime(minSec = 2, maxSec = 8, rand = Math.random) {
  const lo = Math.min(minSec, maxSec);
  const hi = Math.max(minSec, maxSec);
  return lo + rand() * (hi - lo);
}
