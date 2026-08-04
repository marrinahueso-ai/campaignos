/**
 * Data-scale 100-school / 75-VU — staging-only boundary discovery against
 * the 100-school / Micro-compute dataset. Same 11-minute stage durations
 * as HEADROOM_50VU / data-scale 50-VU (hold fractions stay valid) with
 * peak raised to 75 (0→25→50→75); 100-school read-only traffic mix;
 * pinned owners across 75 distinct orgs.
 *
 * Purpose: determine whether 75 concurrent VUs is stable headroom or the
 * first meaningful performance boundary. Not a forced pass — latency-only
 * breaches of the unchanged 1.5s read gate are capacity evidence.
 *
 *   BASE_URL=https://your-preview.vercel.app \
 *   TEST_RUN_ID=data-scale-100school-75vu-001 \
 *   VERCEL_JWT=eyJhbGciOi... \
 *   K6_SESSIONS_FILE=../data/sessions.100-school-architecture.local.json \
 *   npm run test:load:data-scale:100school:75vu
 *
 * Requires the 100-school-architecture fixture seeded + fresh sessions:
 *   npm run test:load:validate:100-schools
 *   TEST_RUN_ID=arch100 npm run test:load:mint-sessions:100-schools
 *
 * After full preflight, remint the 75 pinned owners (or at least
 * s001-owner) before k6 — RLS negative check signs out org-A owner.
 */

import http from "k6/http";
import { interleaveBySchool, prepareTestContext } from "./helpers/auth.js";
import { looksLikeLoginRedirect } from "./helpers/checks.js";
import { sessionHeaders } from "./helpers/http.js";
import { authFailures } from "./helpers/metrics.js";
import {
  buildDataScale100School75VuThresholds,
  SUMMARY_TREND_STATS,
} from "./config/thresholds.js";
import {
  DATA_SCALE_100SCHOOL_75VU_WORKLOAD,
  DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS,
} from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

const PROFILE = "data-scale-100school-75vu";

/** Derived from the workload shape, not hardcoded, so the two can never drift apart. */
const REQUIRED_VUS = Math.max(
  ...DATA_SCALE_100SCHOOL_75VU_WORKLOAD.stages.map((s) => s.target),
);

export const options = {
  scenarios: {
    data_scale_100school_75vu: DATA_SCALE_100SCHOOL_75VU_WORKLOAD,
  },
  thresholds: buildDataScale100School75VuThresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

/**
 * Deterministically compute the exact `vuCount` sessions that
 * pickSession(data, { pinned: true }) will assign to VUs 1..vuCount —
 * identical formula to helpers/auth.js pickSession.
 */
function computePinnedAllocation(sessions, vuCount) {
  const interleaved = interleaveBySchool(sessions);
  const allocation = [];
  for (let vu = 1; vu <= vuCount; vu++) {
    allocation.push(interleaved[(vu - 1) % interleaved.length]);
  }
  return allocation;
}

function validateAllocationStructure(allocation, vuCount) {
  if (allocation.length !== vuCount) {
    throw new Error(`Expected ${vuCount} pinned sessions, computed ${allocation.length}.`);
  }

  const requiredFields = ["cookie", "organizationId", "userId", "schoolIndex", "role"];
  allocation.forEach((s, i) => {
    for (const field of requiredFields) {
      if (!s || !s[field]) {
        throw new Error(`Pinned session for VU${i + 1} is missing required field "${field}".`);
      }
    }
  });

  const cookies = new Set(allocation.map((s) => s.cookie));
  const userIds = new Set(allocation.map((s) => s.userId));
  const orgIds = new Set(allocation.map((s) => s.organizationId));
  const schoolIdx = new Set(allocation.map((s) => Number(s.schoolIndex)));

  if (cookies.size !== vuCount) {
    throw new Error(
      `Expected ${vuCount} unique cookies among pinned sessions, found ${cookies.size} ` +
        `(duplicate session assignment — two VUs would replay the same cookie).`,
    );
  }
  if (userIds.size !== vuCount) {
    throw new Error(
      `Expected ${vuCount} unique user IDs among pinned sessions, found ${userIds.size} ` +
        `(duplicate session assignment).`,
    );
  }
  if (orgIds.size !== vuCount) {
    throw new Error(
      `Expected ${vuCount} distinct organizations among pinned sessions, found ${orgIds.size}.`,
    );
  }
  if (schoolIdx.size !== vuCount) {
    throw new Error(
      `Expected ${vuCount} distinct school indexes among pinned sessions, found ${schoolIdx.size}.`,
    );
  }

  const nonOwner = allocation.filter((s) => s.role !== "owner");
  if (nonOwner.length > 0) {
    throw new Error(
      `Expected all ${vuCount} pinned sessions to use the "owner" (admin) role; found ` +
        `${nonOwner.length} non-owner session(s). Check the fixture or interleaveBySchool ordering.`,
    );
  }
}

function validateAllocationLive(baseUrl, allocation) {
  const failures = [];
  allocation.forEach((session, i) => {
    const res = http.get(`${baseUrl}/dashboard`, {
      headers: sessionHeaders(session),
      redirects: 5,
      tags: { name: "session_warmup", route: "dashboard", kind: "read" },
    });
    const loginRedirect = looksLikeLoginRedirect(res);
    const bodyOk = Boolean(res.body) && String(res.body).length > 200;
    const ok = res.status === 200 && !loginRedirect && bodyOk;
    if (!ok) {
      authFailures.add(1);
      failures.push({
        vu: i + 1,
        school: session.schoolIndex,
        status: res.status,
        loginRedirect,
        bodyOk,
      });
    }
  });

  if (failures.length > 0) {
    const detail = failures
      .map(
        (f) =>
          `VU${String(f.vu).padStart(2, "0")}(school ${f.school}, status=${f.status}` +
          `${f.loginRedirect ? ", login-redirect" : ""}${!f.bodyOk ? ", short-body" : ""})`,
      )
      .join("; ");
    throw new Error(
      `Live session validation failed for ${failures.length}/${allocation.length} pinned sessions: ${detail}. ` +
        `Re-mint sessions (TEST_RUN_ID=arch100 npm run test:load:mint-sessions:100-schools) and retry.`,
    );
  }
}

function logAllocationSummary(allocation) {
  console.log(`[${PROFILE}] Session allocation (${allocation.length} VUs):`);
  allocation.forEach((s, i) => {
    const vu = String(i + 1).padStart(2, "0");
    const school = String(s.schoolIndex).padStart(3, "0");
    const orgPrefix = String(s.organizationId).slice(0, 8);
    console.log(`  VU${vu} → School ${school} | ${s.role} | org ${orgPrefix}`);
  });
}

export function setup() {
  const data = prepareTestContext();

  if (data.sessions.length < REQUIRED_VUS) {
    throw new Error(
      `${PROFILE} requires >= ${REQUIRED_VUS} pinned sessions; found ` +
        `${data.sessions.length}. Re-mint sessions for the 100-school-architecture profile.`,
    );
  }

  const allocation = computePinnedAllocation(data.sessions, REQUIRED_VUS);
  validateAllocationStructure(allocation, REQUIRED_VUS);
  validateAllocationLive(data.baseUrl, allocation);
  logAllocationSummary(allocation);

  const distinctOrgs = new Set(allocation.map((s) => s.organizationId)).size;
  console.log(
    `[${PROFILE}] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length} pinnedVUs=${REQUIRED_VUS} ` +
      `distinctOrganizations=${distinctOrgs} pinned=true`,
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
    [`load-tests/k6/results/${PROFILE}-${safeRunId}-summary.json`]: JSON.stringify(data, null, 2),
    [`load-tests/k6/results/${PROFILE}-summary.json`]: JSON.stringify(data, null, 2),
  };
}
