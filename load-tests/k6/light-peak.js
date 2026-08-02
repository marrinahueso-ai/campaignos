/**
 * Light peak — realistic short launch-period peak, max 15 concurrent VUs
 * (~10 minutes: 0→5→10→15 over 3m, hold 15 for 5m, ramp down 2m).
 * Controlled capacity check, not a breaking-point stress test.
 *
 *   BASE_URL=… TEST_RUN_ID=… npm run test:load:light-peak
 *   BASE_URL=… TEST_RUN_ID=… k6 run load-tests/k6/light-peak.js
 *
 * VERCEL_JWT (optional): Vercel Authentication bypass cookie value when
 * BASE_URL is a protected Preview deployment (see README "Vercel Preview").
 */

import { prepareTestContext, warmAuth } from "./helpers/auth.js";
import { buildLightPeakThresholds, SUMMARY_TREND_STATS } from "./config/thresholds.js";
import { LIGHT_PEAK_WORKLOAD, LIGHT_PEAK_TRAFFIC_WEIGHTS } from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

export const options = {
  scenarios: {
    light_peak: LIGHT_PEAK_WORKLOAD,
  },
  thresholds: buildLightPeakThresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const data = prepareTestContext();
  warmAuth(data.baseUrl, data.sessions[0]);

  const multiOrgUsers = (data.sessions || []).filter(
    (s) => Array.isArray(s.organizationIds) && s.organizationIds.length > 1,
  ).length;

  console.log(
    `[k6 light-peak] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length} maxVUs=15`,
  );
  if (multiOrgUsers === 0) {
    console.warn(
      "[k6 light-peak] No seeded user belongs to 2+ organizations — the " +
        "orgSwitch traffic slice (5%) will fall back to plain dashboard " +
        "views this run. See README 'Known coverage limitations'.",
    );
  }

  return data;
}

export default function (data) {
  runWeightedIteration(data, {
    crossTenantEvery: 4,
    weights: LIGHT_PEAK_TRAFFIC_WEIGHTS,
  });
}

export function handleSummary(data) {
  const testRunId = __ENV.TEST_RUN_ID || "unknown";
  const safeRunId = String(testRunId).replace(/[^a-z0-9._-]/gi, "-");
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`load-tests/k6/results/light-peak-${safeRunId}-summary.json`]: JSON.stringify(
      data,
      null,
      2,
    ),
    "load-tests/k6/results/light-peak-summary.json": JSON.stringify(data, null, 2),
  };
}
