/**
 * Launch headroom — 50-VU confidence check (~11 minutes: 0→15→30→50 over 4m,
 * hold 50 for 5m, ramp down 2m). Measures whether meaningful performance
 * headroom exists above expected launch traffic. Not a breaking-point stress
 * test. Reuses the validated 15/30-VU traffic mix, launch gates, and pinned
 * per-VU session assignment.
 *
 *   BASE_URL=… TEST_RUN_ID=… VERCEL_JWT=… npm run test:load:headroom
 *
 * Run a discardable warm-up first:
 *   npm run test:load:headroom-warmup
 */

import { prepareTestContext, warmAuth } from "./helpers/auth.js";
import { buildHeadroom50Thresholds, SUMMARY_TREND_STATS } from "./config/thresholds.js";
import { HEADROOM_50VU_WORKLOAD, LIGHT_PEAK_TRAFFIC_WEIGHTS } from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

export const options = {
  scenarios: {
    launch_headroom: HEADROOM_50VU_WORKLOAD,
  },
  thresholds: buildHeadroom50Thresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const data = prepareTestContext();
  warmAuth(data.baseUrl, data.sessions[0]);

  if (data.sessions.length < 50) {
    throw new Error(
      `Headroom 50-VU requires ≥50 pinned sessions; found ${data.sessions.length}. Re-mint sessions.`,
    );
  }

  const multiOrgUsers = (data.sessions || []).filter(
    (s) => Array.isArray(s.organizationIds) && s.organizationIds.length > 1,
  ).length;

  console.log(
    `[k6 headroom-50vu] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length} maxVUs=50 pinned=true`,
  );
  if (multiOrgUsers === 0) {
    console.warn(
      "[k6 headroom-50vu] No seeded user belongs to 2+ organizations — the " +
        "orgSwitch traffic slice (5%) will fall back to plain dashboard " +
        "views this run (logged, not counted as a real org-switch test).",
    );
  }

  return data;
}

export default function (data) {
  runWeightedIteration(data, {
    crossTenantEvery: 5,
    weights: LIGHT_PEAK_TRAFFIC_WEIGHTS,
    pinnedSession: true,
  });
}

export function handleSummary(data) {
  const testRunId = __ENV.TEST_RUN_ID || "unknown";
  const safeRunId = String(testRunId).replace(/[^a-z0-9._-]/gi, "-");
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`load-tests/k6/results/launch-headroom-${safeRunId}-summary.json`]: JSON.stringify(
      data,
      null,
      2,
    ),
    "load-tests/k6/results/launch-headroom-summary.json": JSON.stringify(data, null, 2),
  };
}
