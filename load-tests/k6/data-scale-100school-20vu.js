/**
 * Data-scale 100-school / 20-VU — staging-only architecture validation
 * against the 100-school / Micro-compute dataset (see
 * docs/qa/100-school-20vu-data-scale-design.md for the full design). Holds
 * a modest, realistic 20 VUs for a long (20-minute) peak to observe
 * connection-pool/memory behavior over a sustained window, rather than
 * searching for a breaking point. Reuses every existing safety guard,
 * pinned-session mechanism, check, metric, and threshold convention from
 * the validated 20-school suite (light-peak / launch-spike / headroom) —
 * no parallel framework.
 *
 *   BASE_URL=https://your-preview.vercel.app \
 *   TEST_RUN_ID=data-scale-100school-20vu-001 \
 *   VERCEL_JWT=eyJhbGciOi... \
 *   K6_SESSIONS_FILE=../data/sessions.100-school-architecture.local.json \
 *   npm run test:load:data-scale:100school:20vu
 *
 * Requires the 100-school-architecture fixture to already be seeded,
 * integrity-validated, and have fresh sessions minted:
 *   npm run test:load:validate:100-schools
 *   TEST_RUN_ID=arch100 npm run test:load:mint-sessions:100-schools
 *
 * K6_SESSIONS_FILE is required (not optional) for this profile — the
 * default load path (helpers/test-data.js) only ever resolves the
 * 20-school fixture (data/sessions.local.json), never this one.
 */

import http from "k6/http";
import { interleaveBySchool, prepareTestContext } from "./helpers/auth.js";
import { looksLikeLoginRedirect } from "./helpers/checks.js";
import { sessionHeaders } from "./helpers/http.js";
import { authFailures } from "./helpers/metrics.js";
import {
  buildDataScale100School20VuThresholds,
  SUMMARY_TREND_STATS,
} from "./config/thresholds.js";
import {
  DATA_SCALE_100SCHOOL_20VU_WORKLOAD,
  DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS,
} from "./config/workload.js";
import { runWeightedIteration } from "./scenarios/run-mix.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";

/** Derived from the workload shape, not hardcoded, so the two can never drift apart. */
const REQUIRED_VUS = Math.max(
  ...DATA_SCALE_100SCHOOL_20VU_WORKLOAD.stages.map((s) => s.target),
);

export const options = {
  scenarios: {
    data_scale_100school_20vu: DATA_SCALE_100SCHOOL_20VU_WORKLOAD,
  },
  thresholds: buildDataScale100School20VuThresholds(),
  summaryTrendStats: SUMMARY_TREND_STATS,
};

/**
 * Deterministically compute the exact `vuCount` sessions that
 * pickSession(data, { pinned: true }) will assign to VUs 1..vuCount at
 * runtime — (VU - 1) % interleaveBySchool(pool).length, the identical
 * formula used inside helpers/auth.js's pickSession. setup() has no live
 * __VU context (it always runs as VU 0), so this recomputes the same
 * deterministic mapping directly from data.sessions to validate, live and
 * structurally, precisely the sessions the real run will use — not a
 * sample or an approximation.
 */
function computePinnedAllocation(sessions, vuCount) {
  const interleaved = interleaveBySchool(sessions);
  const allocation = [];
  for (let vu = 1; vu <= vuCount; vu++) {
    allocation.push(interleaved[(vu - 1) % interleaved.length]);
  }
  return allocation;
}

/** Structural checks only — no network calls, fails fast before any live warm-up. */
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

  // This profile's route matrix includes settings/branding/team-access —
  // require the broadest-permission seeded role (owner/admin) for every
  // pinned VU so a permissions difference can never masquerade as an
  // architecture/performance failure (see design doc §5 "Role mix").
  const nonOwner = allocation.filter((s) => s.role !== "owner");
  if (nonOwner.length > 0) {
    throw new Error(
      `Expected all ${vuCount} pinned sessions to use the "owner" (admin) role; found ` +
        `${nonOwner.length} non-owner session(s). Check the fixture or interleaveBySchool ordering.`,
    );
  }
}

/**
 * Live checks — one authenticated /dashboard GET per pinned session.
 * Throws (aborting the whole test before any VU ramps) if any of the 20
 * sessions redirects to login, returns a non-200/auth-error status, or an
 * obviously incomplete page. Modeled directly on helpers/auth.js's
 * warmAuth(), looped over all pinned sessions instead of just the first —
 * kept local to this profile per Phase 3 guidance rather than added to
 * helpers/auth.js, since no other profile currently needs to validate more
 * than one session before ramp-up.
 */
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
      failures.push({ vu: i + 1, school: session.schoolIndex, status: res.status, loginRedirect, bodyOk });
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

/**
 * Sanitized allocation summary — VU number, school index, role, and the
 * first 8 characters of the organization ID only. Never a cookie, token,
 * email, or full user ID.
 */
function logAllocationSummary(allocation) {
  console.log(`[data-scale-100school-20vu] Session allocation (${allocation.length} VUs):`);
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
      `data-scale-100school-20vu requires >= ${REQUIRED_VUS} pinned sessions; found ` +
        `${data.sessions.length}. Re-mint sessions for the 100-school-architecture profile.`,
    );
  }

  const allocation = computePinnedAllocation(data.sessions, REQUIRED_VUS);
  validateAllocationStructure(allocation, REQUIRED_VUS);
  validateAllocationLive(data.baseUrl, allocation);
  logAllocationSummary(allocation);

  const distinctOrgs = new Set(allocation.map((s) => s.organizationId)).size;
  console.log(
    `[data-scale-100school-20vu] BASE_URL=${data.baseUrl} TEST_RUN_ID=${data.testRunId} ` +
      `sessions=${data.sessions.length} schools=${data.schools.length} pinnedVUs=${REQUIRED_VUS} ` +
      `distinctOrganizations=${distinctOrgs} pinned=true`,
  );

  return data;
}

export default function (data) {
  runWeightedIteration(data, {
    crossTenantEvery: 5,
    weights: DATA_SCALE_100SCHOOL_TRAFFIC_WEIGHTS,
    // One exclusive session/organization per VU for the whole run — see
    // helpers/auth.js pickSession `pinned` mode and this file's setup()
    // validation above, which confirms these 20 sessions ahead of time.
    pinnedSession: true,
  });
}

export function handleSummary(data) {
  const testRunId = __ENV.TEST_RUN_ID || "unknown";
  const safeRunId = String(testRunId).replace(/[^a-z0-9._-]/gi, "-");
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`load-tests/k6/results/data-scale-100school-20vu-${safeRunId}-summary.json`]: JSON.stringify(
      data,
      null,
      2,
    ),
    "load-tests/k6/results/data-scale-100school-20vu-summary.json": JSON.stringify(data, null, 2),
  };
}
