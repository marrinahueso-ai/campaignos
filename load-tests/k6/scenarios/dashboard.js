import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Most common workflow: dashboard + events list + related hubs.
 */
export function runDashboardViewer(data, session) {
  const start = Date.now();
  group("dashboard_viewer", () => {
    getHtml(data.baseUrl, "/dashboard", session, {
      route: "dashboard",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });
    getHtml(data.baseUrl, "/events", session, {
      route: "events_list",
      schools: data.schools,
      minThink: 2,
      maxThink: 7,
    });
    // Approvals / attention counts ride on dashboard SSR; light second peek.
    getHtml(data.baseUrl, "/dashboard", session, {
      route: "dashboard",
      schools: data.schools,
      minThink: 2,
      maxThink: 5,
    });
    pauseBetweenActions(2, 5);
  });
  workflowDuration.add(Date.now() - start, { workflow: "dashboard" });
}
