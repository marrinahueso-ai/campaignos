import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";
import { runDashboardViewer } from "./dashboard.js";

/**
 * A session is eligible for org switching only when the fixture explicitly
 * lists 2+ organization memberships for that signed-in user
 * (`session.organizationIds`). The current seed (one email per school) does
 * not produce any such user — see README "Known coverage limitations".
 */
function eligibleSwitchTargets(session) {
  const ids = session.organizationIds;
  if (!Array.isArray(ids) || ids.length < 2) return null;
  return ids;
}

/**
 * Organization switcher — only exercised for a seeded user who legitimately
 * belongs to 2+ test organizations. Reuses the same signed-in session/cookie
 * for both requests (a real switch only changes the active-organization
 * preference cookie, never the underlying auth session) and re-asserts
 * tenant isolation against the newly active organization.
 *
 * When no eligible multi-org user exists for this VU's session, falls back
 * to an ordinary dashboard view rather than fabricating a same-user switch
 * across unrelated sessions.
 */
export function runOrgSwitch(data, session) {
  const start = Date.now();
  const orgIds = eligibleSwitchTargets(session);

  if (!orgIds) {
    runDashboardViewer(data, session);
    return;
  }

  group("org_switch", () => {
    const home = session.organizationId;
    const target = orgIds.find((id) => id !== home) || home;

    getHtml(data.baseUrl, "/dashboard", session, {
      route: "dashboard",
      schools: data.schools,
      minThink: 1,
      maxThink: 3,
    });

    pauseBetweenActions(1, 2);

    // Same auth session; only the active-organization cookie changes.
    getHtml(data.baseUrl, "/dashboard", { ...session, organizationId: target }, {
      route: "dashboard_after_switch",
      schools: data.schools,
      minThink: 2,
      maxThink: 5,
    });
  });
  workflowDuration.add(Date.now() - start, { workflow: "org_switch" });
}
