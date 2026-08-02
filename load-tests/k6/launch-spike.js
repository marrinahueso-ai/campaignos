/**
 * Launch spike — 30-VU launch-period confidence check (~11 minutes:
 * 0→10→20→30 over 4m, hold 30 for 5m, ramp down 2m). Not a breaking-point
 * stress test. Reuses the validated 15-VU light-peak traffic mix and
 * launch-readiness gates unless a documented reason changes them.
 *
 *   BASE_URL=… TEST_RUN_ID=… VERCEL_JWT=… npm run test:load:launch-spike
 *
 * Run a discardable warm-up first:
 *   npm run test:load:launch-spike-warmup
 *
 * VERCEL_JWT (optional): Vercel Authentication bypass cookie value when
 * BASE_URL is a protected Preview deployment (see README "Vercel Preview").
 */

import { prepareTestContext, warmAuth } from "./helpers/auth.js";
import { buildLaunchSpikeThresholds, SUMMARY_TREND_STATS } from "./config/thresholds.js";
import { LAUNCH_SPIKE_WORKLOAD, LIGHT_PEAK_TRAFFIC_WEIGHTS } from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

export const options = {
  scenarios: {
    launch_spike: LAUNCH_SPIKE_WORKLOAD,
  },
  thresholds: buildLaunchSpikeThresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const data = prepareTestContext();
  warmAuth(data.baseUrl, data.sessions[0]);

  const multiOrgUsers = (data.sessions || []).filter(
    (s) => Array.isArray(s.organizationIds) && s.organizationIds.length > 1,
  ).length;

  console.log(
    `[k6 launch-spike] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length} maxVUs=30`,
  );
  if (multiOrgUsers === 0) {
    console.warn(
      "[k6 launch-spike] No seeded user belongs to 2+ organizations — the " +
        "orgSwitch traffic slice (5%) will fall back to plain dashboard " +
        "views this run (logged, not counted as a real org-switch test). " +
        "See README 'Known coverage limitations'.",
    );
  }

  return data;
}

export default function (data) {
  runWeightedIteration(data, {
    crossTenantEvery: 5,
    weights: LIGHT_PEAK_TRAFFIC_WEIGHTS,
    // Pin each VU to one exclusive session/school for its whole run so no
    // two concurrently-running VUs can ever replay the same static
    // session cookie (see helpers/auth.js pickSession `pinned` mode).
    pinnedSession: true,
  });
}

export function handleSummary(data) {
  const testRunId = __ENV.TEST_RUN_ID || "unknown";
  const safeRunId = String(testRunId).replace(/[^a-z0-9._-]/gi, "-");
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`load-tests/k6/results/launch-spike-${safeRunId}-summary.json`]: JSON.stringify(
      data,
      null,
      2,
    ),
    "load-tests/k6/results/launch-spike-summary.json": JSON.stringify(data, null, 2),
  };
}
