import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Team / settings viewer — read-only. Never submits settings forms
 * (org profile, branding, integrations, billing writes are all out of scope).
 */
export function runSettingsViewer(data, session) {
  const start = Date.now();
  group("settings_viewer", () => {
    getHtml(data.baseUrl, "/settings/organization", session, {
      route: "settings_organization",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });
    getHtml(data.baseUrl, "/settings/team-access", session, {
      route: "settings_team_access",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });
    pauseBetweenActions(2, 5);
  });
  workflowDuration.add(Date.now() - start, { workflow: "settings" });
}
