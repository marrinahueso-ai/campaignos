import http from "k6/http";
import { sleep } from "k6";
import exec from "k6/execution";
import { K6_USER_AGENT } from "../config/environments.js";
import { HEADROOM_50VU_HOLD_PROGRESS, thinkTime } from "../config/workload.js";
import {
  assertPageOk,
  assertTenantIsolation,
  recordStatusMetrics,
} from "./checks.js";
import {
  slowReqOver3s,
  slowReqOver3sHold,
  slowReqOver5s,
  slowReqOver5sHold,
  slowReqOver10s,
  slowReqOver10sHold,
} from "./metrics.js";
import { foreignOrganizationIds, withActiveOrganization } from "./organization.js";

/**
 * @param {{ cookie: string, organizationId: string }} session
 */
export function sessionHeaders(session) {
  let cookie = withActiveOrganization(session.cookie, session.organizationId);

  // Vercel Authentication (SSO) blocks *.vercel.app deployments by default.
  // VERCEL_JWT is the short-lived bypass cookie from a share link
  // (see README "Vercel Preview"); harmless/no-op against non-Vercel hosts.
  const vercelBypass = String(__ENV.VERCEL_JWT || "").trim();
  if (vercelBypass) {
    cookie = `${cookie}; _vercel_jwt=${vercelBypass}`;
  }

  return {
    Cookie: cookie,
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": K6_USER_AGENT,
  };
}

function recordSlowRequest(res, route) {
  const ms = res.timings.duration;
  if (ms < 3000) return;

  const trackHold =
    String(__ENV.TEST_RUN_ID || "").includes("headroom") ||
    __ENV.K6_TRACK_HOLD_SLOW === "true";

  let progress = 0;
  let inHold = false;
  if (trackHold) {
    try {
      progress = exec.scenario.progress;
    } catch {
      progress = 0;
    }
    inHold =
      progress >= HEADROOM_50VU_HOLD_PROGRESS.start &&
      progress < HEADROOM_50VU_HOLD_PROGRESS.end;
  }

  const bucket = ms >= 10000 ? "over_10s" : ms >= 5000 ? "over_5s" : "over_3s";
  slowReqOver3s.add(1, { route });
  if (ms >= 5000) slowReqOver5s.add(1, { route });
  if (ms >= 10000) slowReqOver10s.add(1, { route });
  if (inHold) {
    slowReqOver3sHold.add(1, { route });
    if (ms >= 5000) slowReqOver5sHold.add(1, { route });
    if (ms >= 10000) slowReqOver10sHold.add(1, { route });
  }

  // Structured, non-sensitive log for post-run tail analysis.
  console.warn(
    JSON.stringify({
      event: "slow_request",
      bucket,
      durationMs: Math.round(ms),
      route,
      status: res.status,
      vu: __VU,
      iteration: __ITER,
      inHold,
      scenarioProgress: Number(progress.toFixed(4)),
      timestamp: new Date().toISOString(),
      testRunId: __ENV.TEST_RUN_ID || null,
    }),
  );
}

/**
 * Tagged document GET with common checks.
 */
export function getHtml(baseUrl, path, session, {
  route = "page",
  kind = "read",
  schools = [],
  pause = true,
  minThink = 2,
  maxThink = 8,
} = {}) {
  const url = `${baseUrl}${path}`;
  const res = http.get(url, {
    headers: sessionHeaders(session),
    redirects: 5,
    tags: { name: route, route, kind },
  });

  recordStatusMetrics(res);
  assertPageOk(res, route);
  assertTenantIsolation(res, {
    expectedOrgId: session.organizationId,
    foreignOrgIds: foreignOrganizationIds(schools, session.organizationId),
    tag: route,
    userLabel: session.email || null,
  });
  recordSlowRequest(res, route);

  if (pause) {
    sleep(thinkTime(minThink, maxThink));
  }

  return res;
}

export function pauseBetweenActions(minThink = 2, maxThink = 8) {
  sleep(thinkTime(minThink, maxThink));
}
