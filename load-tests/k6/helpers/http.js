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
  slowReqOver20s,
  slowReqOver20sHold,
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

/**
 * Hold-window classification for the 11-minute 0→15→30→50 / hold-5m /
 * ramp-down-2m shape (20-school headroom and 100-school data-scale 50-VU).
 * Previously gated only on TEST_RUN_ID containing "headroom", which left
 * data-scale 50-VU runs with inHold=false / scenarioProgress=0 always —
 * blinding hold counters. Match scenario name, run id, or explicit env.
 */
function shouldTrackHold() {
  if (__ENV.K6_TRACK_HOLD_SLOW === "true") return true;
  const runId = String(__ENV.TEST_RUN_ID || "");
  if (runId.includes("headroom") || runId.includes("50vu")) return true;
  try {
    const name = String(exec.scenario.name || "");
    if (name.includes("headroom") || name.includes("50vu")) return true;
  } catch {
    // exec.scenario unavailable outside VU context
  }
  return false;
}

function recordSlowRequest(res, route) {
  const ms = res.timings.duration;
  if (ms < 3000) return;

  let progress = 0;
  let inHold = false;
  if (shouldTrackHold()) {
    try {
      progress = exec.scenario.progress;
    } catch {
      progress = 0;
    }
    inHold =
      progress >= HEADROOM_50VU_HOLD_PROGRESS.start &&
      progress < HEADROOM_50VU_HOLD_PROGRESS.end;
  }

  const bucket =
    ms >= 20000 ? "over_20s" : ms >= 10000 ? "over_10s" : ms >= 5000 ? "over_5s" : "over_3s";
  slowReqOver3s.add(1, { route });
  if (ms >= 5000) slowReqOver5s.add(1, { route });
  if (ms >= 10000) slowReqOver10s.add(1, { route });
  if (ms >= 20000) slowReqOver20s.add(1, { route });
  if (inHold) {
    slowReqOver3sHold.add(1, { route });
    if (ms >= 5000) slowReqOver5sHold.add(1, { route });
    if (ms >= 10000) slowReqOver10sHold.add(1, { route });
    if (ms >= 20000) slowReqOver20sHold.add(1, { route });
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
