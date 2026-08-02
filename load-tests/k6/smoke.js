/**
 * Smoke profile — 2 VUs, 2 minutes, schools 01–02 only.
 * Confirms scripts, auth, routes, and checks before larger runs.
 *
 *   BASE_URL=… TEST_RUN_ID=… k6 run load-tests/k6/smoke.js
 *   # or COOKIE=… for single-session ad-hoc smoke
 */

import { prepareTestContext, warmAuth } from "./helpers/auth.js";
import { buildSmokeThresholds, SUMMARY_TREND_STATS } from "./config/thresholds.js";
import { SMOKE_WORKLOAD } from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

export const options = {
  scenarios: {
    smoke: SMOKE_WORKLOAD,
  },
  thresholds: buildSmokeThresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const data = prepareTestContext();
  const warmSession = data.sessions.find((s) =>
    [1, 2].includes(Number(s.schoolIndex)),
  ) || data.sessions[0];

  warmAuth(data.baseUrl, warmSession);

  console.log(
    `[k6 smoke] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length}`,
  );

  return data;
}

export default function (data) {
  runWeightedIteration(data, {
    schoolIndexes: [1, 2],
    crossTenantEvery: 3,
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "load-tests/k6/results/smoke-summary.json": JSON.stringify(data, null, 2),
  };
}
