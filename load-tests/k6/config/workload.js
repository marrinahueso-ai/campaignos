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

/**
 * Light-peak activity mix — adds settings/team viewing and (best-effort)
 * organization switching on top of the core four workflows.
 * Org-switch only exercises real traffic when a seeded user legitimately
 * belongs to 2+ organizations; otherwise it falls back to a dashboard view
 * (see scenarios/org-switch.js) rather than fabricating a switch.
 */
export const LIGHT_PEAK_TRAFFIC_WEIGHTS = {
  dashboard: 30,
  calendar: 25,
  communicationsCreator: 15,
  approvals: 10,
  communicationsHub: 10,
  settings: 5,
  orgSwitch: 5,
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
 * Light peak: 0→5→10→15 VUs over 3 minutes, hold 15 for 5 minutes, ramp
 * down over 2 minutes — ~10 minutes total. Max 15 concurrent VUs; not a
 * breaking-point stress test. `gracefulRampDown` gives in-flight iterations
 * (think-time pauses included) room to finish instead of being cut off.
 */
export const LIGHT_PEAK_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: 5 },
    { duration: "1m", target: 10 },
    { duration: "1m", target: 15 },
    { duration: "5m", target: 15 },
    { duration: "2m", target: 0 },
  ],
  gracefulRampDown: "60s",
};

/**
 * Launch spike: 0→10→20→30 VUs over 4 minutes, hold 30 for 5 minutes, ramp
 * down over 2 minutes — ~11 minutes total. Max 30 concurrent VUs; a
 * launch-spike confidence check, not a breaking-point stress test.
 */
export const LAUNCH_SPIKE_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: 10 },
    { duration: "1m", target: 20 },
    { duration: "2m", target: 30 },
    { duration: "5m", target: 30 },
    { duration: "2m", target: 0 },
  ],
  gracefulRampDown: "60s",
};

/**
 * Discardable warm-up ahead of a recorded launch-spike run: confirms
 * routes/sessions/deployment-protection work at a small scale before the
 * real ramp. Timing from this stage is never reported.
 */
export const LAUNCH_SPIKE_WARMUP_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "20s", target: 4 },
    { duration: "1m40s", target: 4 },
  ],
  gracefulRampDown: "20s",
};

/**
 * Weighted random workflow key.
 * @param {() => number} [rand] returns [0,1)
 * @param {Record<string, number>} [weights] defaults to the core 20-school mix
 */
export function pickWorkflow(rand = Math.random, weights = TRAFFIC_WEIGHTS) {
  const roll = rand() * 100;
  let cursor = 0;
  for (const [key, weight] of Object.entries(weights)) {
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
