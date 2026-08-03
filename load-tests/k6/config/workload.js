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
 * Headroom (50 VU): 0→15→30→50 over 4 minutes, hold 50 for 5 minutes, ramp
 * down over 2 minutes — ~11 minutes total. Max 50 concurrent VUs. Purpose is
 * to measure whether meaningful headroom exists above expected launch
 * traffic — not to find a breaking point. Uses the same traffic mix and
 * pinned-session assignment as launch-spike.
 */
export const HEADROOM_50VU_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: 15 },
    { duration: "1m", target: 30 },
    { duration: "2m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "2m", target: 0 },
  ],
  gracefulRampDown: "60s",
};

/**
 * Discardable warm-up ahead of recorded 50-VU headroom runs: ~5 VUs for
 * 2 minutes to wake the Preview deployment and confirm sessions/bypass.
 */
export const HEADROOM_50VU_WARMUP_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "20s", target: 5 },
    { duration: "1m40s", target: 5 },
  ],
  gracefulRampDown: "20s",
};

/** Hold window within HEADROOM_50VU_WORKLOAD as fraction of scenario progress. */
export const HEADROOM_50VU_HOLD_PROGRESS = {
  start: 4 / 11, // after 4m of ramp
  end: 9 / 11, // before 2m ramp-down
};

/**
 * Data-scale 100-school / 20-VU traffic mix — read-heavy, no org-switch
 * (the 100-school fixture, like the 20-school one, has no seeded user with
 * 2+ organization memberships). Adds `brandKit` (settings/branding, a
 * verified read-only page) in place of org-switch's slice.
 */
export const DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS = {
  dashboard: 20,
  calendar: 25,
  approvals: 15,
  communicationsHub: 15,
  communicationsCreator: 10,
  settings: 8,
  brandKit: 7,
};

/**
 * Data-scale 100-school / 20-VU: 0→5→20 VUs over 5 minutes, hold 20 for
 * 20 minutes (3x longer than any prior 20-school profile's 5-minute hold),
 * ramp down over 3 minutes — ~28 minutes total. Purpose is architecture
 * validation at 100-school data scale (stability/isolation/responsiveness
 * over a sustained window on the new Micro compute tier), not peak-VU
 * discovery — 20 VUs is a modest, realistic concurrency level. Uses pinned
 * per-VU session assignment (see helpers/auth.js pickSession `pinned` mode)
 * exactly like launch-spike/headroom. gracefulRampDown/gracefulStop are
 * both extended to 90s (vs the usual 60s) because this profile's workflows
 * run up to 4 sequential page loads with 2-8s think-time each, so a single
 * in-flight iteration can legitimately take 35-45s to finish cleanly.
 */
export const DATA_SCALE_100SCHOOL_20VU_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "2m", target: 5 },
    { duration: "3m", target: 20 },
    { duration: "20m", target: 20 },
    { duration: "3m", target: 0 },
  ],
  gracefulRampDown: "90s",
  gracefulStop: "90s",
};

/**
 * Data-scale 100-school / 50-VU headroom: same ramp shape as the validated
 * 20-school HEADROOM_50VU_WORKLOAD (0→15→30→50 over 4m, hold 50 for 5m,
 * ramp down 2m) so results compare directly, but uses the 100-school
 * read-only traffic mix and pinned owners across 50 distinct orgs. Purpose
 * is to find whether 5× data volume reduces concurrency headroom vs the
 * 20-school / 50-VU pass — not to re-prove the auth fix. gracefulRampDown/
 * Stop stay at 90s to match the longer data-scale workflows.
 */
export const DATA_SCALE_100SCHOOL_50VU_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "1m", target: 15 },
    { duration: "1m", target: 30 },
    { duration: "2m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "2m", target: 0 },
  ],
  gracefulRampDown: "90s",
  gracefulStop: "90s",
};

/**
 * Discardable warm-up ahead of the 50-VU data-scale run: small pinned
 * concurrency to wake the Preview and confirm sessions/bypass before the
 * recorded ramp. Timing from this stage is never authoritative.
 */
export const DATA_SCALE_100SCHOOL_50VU_WARMUP_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "20s", target: 5 },
    { duration: "1m40s", target: 5 },
  ],
  gracefulRampDown: "20s",
  gracefulStop: "20s",
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
