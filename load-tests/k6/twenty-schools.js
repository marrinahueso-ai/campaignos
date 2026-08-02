/**
 * Normal 20-school simulation — ~10 minutes, 4–8 concurrent VUs.
 * Distributes activity across all seeded schools with 2–8s think time.
 *
 *   BASE_URL=… TEST_RUN_ID=… k6 run load-tests/k6/twenty-schools.js
 */

import { prepareTestContext, warmAuth } from "./helpers/auth.js";
import { buildThresholds, SUMMARY_TREND_STATS } from "./config/thresholds.js";
import { TWENTY_SCHOOLS_WORKLOAD } from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

export const options = {
  scenarios: {
    twenty_schools: TWENTY_SCHOOLS_WORKLOAD,
  },
  thresholds: buildThresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const data = prepareTestContext();
  if (data.sessions.length < 2) {
    console.warn(
      "[k6] Fewer than 2 sessions — 20-school mix will be under-represented. Run seed + mint-sessions.",
    );
  }
  warmAuth(data.baseUrl, data.sessions[0]);
  console.log(
    `[k6 20-schools] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length}`,
  );
  return data;
}

export default function (data) {
  runWeightedIteration(data, { crossTenantEvery: 5 });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "load-tests/k6/results/twenty-schools-summary.json": JSON.stringify(
      data,
      null,
      2,
    ),
  };
}
