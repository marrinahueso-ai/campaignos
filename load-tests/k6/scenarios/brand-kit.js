import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Brand kit viewer — read-only glance at organization branding settings
 * (colors, logo metadata, labels). Never calls upload, logo-processing,
 * save, or delete endpoints; the seeded brand-kit items use placeholder
 * `storage_path` values (no real files), so this is a plain server-rendered
 * HTML GET like every other scenario, not an asset/CDN fetch.
 */
export function runBrandKitViewer(data, session) {
  const start = Date.now();
  group("brand_kit", () => {
    getHtml(data.baseUrl, "/settings/branding", session, {
      route: "branding",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });
    pauseBetweenActions(2, 5);
  });
  workflowDuration.add(Date.now() - start, { workflow: "brand_kit" });
}
