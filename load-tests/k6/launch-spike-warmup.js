/**
 * Launch-spike warm-up — ~4 VUs for ~2 minutes against the same Vercel
 * Preview deployment used for the recorded 30-VU runs. Confirms routes,
 * sessions, and Vercel Deployment-Protection bypass all work before the
 * real ramp. Results are informational only and are never reported as one
 * of the three recorded launch-spike runs.
 *
 *   BASE_URL=… TEST_RUN_ID=… VERCEL_JWT=… npm run test:load:launch-spike-warmup
 */

import { prepareTestContext, warmAuth } from "./helpers/auth.js";
import { LAUNCH_SPIKE_WARMUP_WORKLOAD, LIGHT_PEAK_TRAFFIC_WEIGHTS } from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";

export const options = {
  scenarios: {
    launch_spike_warmup: LAUNCH_SPIKE_WARMUP_WORKLOAD,
  },
  // No thresholds — warm-up is discarded, not a pass/fail gate.
};

export function setup() {
  const data = prepareTestContext();
  warmAuth(data.baseUrl, data.sessions[0]);
  console.log(
    `[k6 launch-spike-warmup] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length} ` +
      `(discardable warm-up — not one of the 3 recorded runs)`,
  );
  return data;
}

export default function (data) {
  runWeightedIteration(data, { weights: LIGHT_PEAK_TRAFFIC_WEIGHTS, pinnedSession: true });
}

export function handleSummary(data) {
  const checks = data.metrics.checks ? data.metrics.checks.values : null;
  const tenantFail = data.metrics.tenant_isolation_failures
    ? data.metrics.tenant_isolation_failures.values.count
    : 0;
  const authFail = data.metrics.auth_failures
    ? data.metrics.auth_failures.values.count
    : 0;
  console.log(
    `[k6 launch-spike-warmup] DISCARDED — checks pass rate=${checks ? (checks.rate * 100).toFixed(1) : "?"}% ` +
      `tenant_isolation_failures=${tenantFail} auth_failures=${authFail}. ` +
      `Timing not reported; not one of the 3 recorded launch-spike runs.`,
  );
  // Intentionally no stdout/file summary export — this run is discarded.
  return {};
}
