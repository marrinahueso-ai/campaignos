import http from "k6/http";
import { sleep } from "k6";
import { K6_USER_AGENT } from "../config/environments.js";
import { thinkTime } from "../config/workload.js";
import {
  assertPageOk,
  assertTenantIsolation,
  recordStatusMetrics,
} from "./checks.js";
import { foreignOrganizationIds, withActiveOrganization } from "./organization.js";

/**
 * @param {{ cookie: string, organizationId: string }} session
 */
export function sessionHeaders(session) {
  const cookie = withActiveOrganization(session.cookie, session.organizationId);
  return {
    Cookie: cookie,
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": K6_USER_AGENT,
  };
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
  });

  if (pause) {
    sleep(thinkTime(minThink, maxThink));
  }

  return res;
}

export function pauseBetweenActions(minThink = 2, maxThink = 8) {
  sleep(thinkTime(minThink, maxThink));
}
