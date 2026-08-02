import http from "k6/http";
import { resolveEnvironment } from "../config/environments.js";
import { looksLikeLoginRedirect } from "./checks.js";
import { authFailures } from "./metrics.js";
import { sessionHeaders } from "./http.js";
import { loadSessionsFixture } from "./test-data.js";

// open() must run in init context — import side-effect loads fixture once.
const INIT_FIXTURE = loadSessionsFixture(__ENV);

/**
 * Resolve environment + sessions for setup().
 * Supports:
 *  - sessions.local.json (multi-school)
 *  - COOKIE / COOKIE_HEADER fallback (single session, smoke only)
 */
export function prepareTestContext(env = __ENV) {
  const environment = resolveEnvironment(env);
  const fixture = INIT_FIXTURE.sessions.length
    ? INIT_FIXTURE
    : loadSessionsFixture(env);
  let sessions = fixture.sessions || [];

  // Legacy single-cookie path for quick local smoke without seed.
  const cookieHeader = env.COOKIE || env.COOKIE_HEADER || "";
  if (sessions.length === 0 && cookieHeader) {
    const orgId = env.K6_ORG_ID || env.ORGANIZATION_ID || "";
    sessions = [
      {
        schoolIndex: 1,
        schoolName: "Ad-hoc cookie session",
        organizationId: orgId,
        role: "adhoc",
        email: "adhoc@local",
        cookie: cookieHeader,
        eventIds: (env.K6_EVENT_IDS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    ];
    console.warn(
      "[k6] Using COOKIE fallback (single session). Seed + mint-sessions for full 20-school isolation.",
    );
  }

  if (sessions.length === 0) {
    throw new Error(
      "No sessions available. Run seed + mint-sessions, or set COOKIE for a single-session smoke.",
    );
  }

  return {
    ...environment,
    sessions,
    schools: fixture.schools || deriveSchools(sessions),
    foreignProbe: fixture.foreignProbe || null,
  };
}

function deriveSchools(sessions) {
  const byOrg = new Map();
  for (const s of sessions) {
    if (!s.organizationId) continue;
    if (!byOrg.has(s.organizationId)) {
      byOrg.set(s.organizationId, {
        organizationId: s.organizationId,
        name: s.schoolName,
        schoolIndex: s.schoolIndex,
        eventIds: s.eventIds || [],
      });
    }
  }
  return Array.from(byOrg.values());
}

/**
 * Fail fast if the first session cannot load /dashboard authenticated.
 */
export function warmAuth(baseUrl, session) {
  const res = http.get(`${baseUrl}/dashboard`, {
    headers: sessionHeaders(session),
    redirects: 5,
    tags: { name: "warmup", route: "dashboard", kind: "read" },
  });

  if (looksLikeLoginRedirect(res) || res.status !== 200) {
    authFailures.add(1);
    throw new Error(
      `Auth warm-up failed (status=${res.status}). Re-mint sessions or re-export COOKIE for ${baseUrl}.`,
    );
  }
  return res;
}

/**
 * Reorders sessions so consecutive indexes cycle through *different*
 * schools before repeating a school (transpose of the school-grouped
 * fixture). Used by the `pinned` VU-assignment mode so that VU 1..N map
 * to N distinct schools first, instead of clustering on the first few
 * schools in fixture order.
 *
 * Exported (pure function, no shared state) so a profile's setup() can
 * pre-compute and validate the exact N sessions pinned mode will assign to
 * VUs 1..N — e.g. data-scale-100school-20vu.js's structural + live
 * session-allocation checks — without needing live __VU context, which
 * setup() does not have.
 */
export function interleaveBySchool(sessions) {
  const bySchool = new Map();
  for (const s of sessions) {
    const key = Number(s.schoolIndex);
    if (!bySchool.has(key)) bySchool.set(key, []);
    bySchool.get(key).push(s);
  }
  const schoolKeys = Array.from(bySchool.keys()).sort((a, b) => a - b);
  const maxRoles = Math.max(0, ...schoolKeys.map((k) => bySchool.get(k).length));
  const interleaved = [];
  for (let roleIdx = 0; roleIdx < maxRoles; roleIdx++) {
    for (const key of schoolKeys) {
      const roster = bySchool.get(key);
      if (roster[roleIdx]) interleaved.push(roster[roleIdx]);
    }
  }
  return interleaved;
}

let cachedInterleavedPool = null;

/**
 * Pick a session for this VU, optionally limited to school indexes.
 *
 * Two assignment modes:
 *  - default (time-varying): `(VU + ITER) % pool.length` — spreads a VU
 *    across many users/schools over the run (used by smoke/20-schools/
 *    light-peak, already validated). A VU may pick a *different* valid,
 *    fully-isolated session on each new iteration, per design.
 *  - `pinned: true` (used by launch-spike at 30 VUs): each VU keeps a
 *    single, exclusive session for its entire run — `(VU - 1) % pool.length`
 *    over a school-interleaved pool ordering. With VUs <= pool size this
 *    guarantees no two concurrently-running VUs ever replay the same
 *    session cookie, eliminating a rare Supabase refresh-token race
 *    observed when two VUs coincidentally selected the same static
 *    session at the same instant under higher concurrency (see README
 *    "Known coverage limitations").
 */
export function pickSession(data, { schoolIndexes = null, pinned = false } = {}) {
  let pool = data.sessions || [];
  if (schoolIndexes && schoolIndexes.length) {
    const allowed = new Set(schoolIndexes.map(Number));
    pool = pool.filter((s) => allowed.has(Number(s.schoolIndex)));
  }
  if (pool.length === 0) {
    throw new Error("No sessions in pool for this VU / school filter.");
  }

  if (pinned) {
    if (!cachedInterleavedPool || cachedInterleavedPool.length !== pool.length) {
      cachedInterleavedPool = interleaveBySchool(pool);
    }
    const idx = (__VU - 1) % cachedInterleavedPool.length;
    return cachedInterleavedPool[idx];
  }

  // Spread VUs across schools/users
  const idx = (__VU + __ITER) % pool.length;
  return pool[idx];
}
