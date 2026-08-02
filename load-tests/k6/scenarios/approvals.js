import http from "k6/http";
import { group } from "k6";
import {
  assertCrossTenantDenied,
  recordStatusMetrics,
} from "../helpers/checks.js";
import { getHtml, pauseBetweenActions, sessionHeaders } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Approver browses the queue and preview surfaces (seeded pending items).
 * Does NOT call approveUnifiedItemAction (Meta + Resend side effects).
 */
export function runApprover(data, session) {
  const start = Date.now();
  group("approvals", () => {
    getHtml(data.baseUrl, "/approvals", session, {
      route: "approvals",
      schools: data.schools,
      minThink: 3,
      maxThink: 8,
    });

    // Revision / preview page when present
    getHtml(data.baseUrl, "/approvals/revision", session, {
      route: "approvals_revision",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });

    const eventId = pickEventId(session);
    if (eventId) {
      getHtml(data.baseUrl, `/events/${eventId}?tab=approvals`, session, {
        route: "event_approvals",
        schools: data.schools,
        minThink: 2,
        maxThink: 7,
      });
    }

    pauseBetweenActions(2, 6);
  });
  workflowDuration.add(Date.now() - start, { workflow: "approvals" });
}

/**
 * Staging-only controlled negative: request another school's event.
 */
export function runCrossTenantProbe(data, session) {
  const probe = data.foreignProbe;
  if (!probe || !probe.eventId) return;
  if (probe.organizationId === session.organizationId) return;

  group("tenant_negative", () => {
    const res = http.get(`${data.baseUrl}/events/${probe.eventId}`, {
      headers: sessionHeaders(session),
      redirects: 5,
      tags: { name: "cross_tenant_event", route: "cross_tenant", kind: "read" },
    });
    recordStatusMetrics(res, { expectAuth: true });
    assertCrossTenantDenied(res, {
      foreignOrgId: probe.organizationId,
      foreignEventTitle: probe.eventTitle,
      tag: "cross_tenant_event",
    });
    pauseBetweenActions(2, 4);
  });
}

function pickEventId(session) {
  const ids = session.eventIds || [];
  if (!ids.length) return null;
  return ids[(__VU + __ITER) % ids.length];
}
