/**
 * Discardable warm-up ahead of data-scale-100school-75vu. Small pinned
 * concurrency wakes the Preview and confirms sessions/bypass. Timing from
 * this stage is never authoritative — always followed by a fresh recorded
 * 75-VU run with a new TEST_RUN_ID.
 *
 *   BASE_URL=... VERCEL_JWT=... TEST_RUN_ID=warmup-... \
 *   K6_SESSIONS_FILE=../data/sessions.100-school-architecture.local.json \
 *   npm run test:load:data-scale:100school:75vu:warmup
 */

import { prepareTestContext } from "./helpers/auth.js";
import {
  buildDataScale100School75VuThresholds,
  SUMMARY_TREND_STATS,
} from "./config/thresholds.js";
import {
  DATA_SCALE_100SCHOOL_75VU_WARMUP_WORKLOAD,
  DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS,
} from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

export const options = {
  scenarios: {
    data_scale_100school_75vu_warmup: DATA_SCALE_100SCHOOL_75VU_WARMUP_WORKLOAD,
  },
  // Soft: warm-up must not fail the program if a cold Preview hiccups once.
  // Hard gates belong on the recorded 75-VU profile only.
  thresholds: {
    ...buildDataScale100School75VuThresholds(),
    // Override latency gates to be advisory-only for warm-up by using
    // extremely loose bounds — correctness counters stay strict.
    "http_req_duration{kind:read}": ["p(95)<30000"],
    "http_req_duration{route:dashboard}": ["p(95)<30000"],
    "http_req_duration{route:calendar}": ["p(95)<30000"],
    "http_req_duration{name:events_list}": ["p(95)<30000"],
  },
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  const data = prepareTestContext();
  console.log(
    `[data-scale-100school-75vu-warmup] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} (discardable warm-up — not recorded)`,
  );
  return data;
}

export default function (data) {
  runWeightedIteration(data, {
    crossTenantEvery: 5,
    weights: DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS,
    pinnedSession: true,
  });
}

export function handleSummary(data) {
  const testRunId = __ENV.TEST_RUN_ID || "unknown";
  const safeRunId = String(testRunId).replace(/[^a-z0-9._-]/gi, "-");
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`load-tests/k6/results/data-scale-100school-75vu-warmup-${safeRunId}-summary.json`]:
      JSON.stringify(data, null, 2),
  };
}
