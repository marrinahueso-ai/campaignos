import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Communications Hub / inbox viewer — no Meta send or sync.
 */
export function runCommunicationsHubViewer(data, session) {
  const start = Date.now();
  group("communications_hub", () => {
    getHtml(data.baseUrl, "/communications", session, {
      route: "communications",
      schools: data.schools,
      minThink: 3,
      maxThink: 8,
    });

    // Optional event context when the session has events
    const eventId = pickEventId(session);
    if (eventId) {
      getHtml(data.baseUrl, `/events/${eventId}`, session, {
        route: "event_detail",
        schools: data.schools,
        minThink: 2,
        maxThink: 6,
      });
    }

    pauseBetweenActions(2, 7);
  });
  workflowDuration.add(Date.now() - start, { workflow: "comms_hub" });
}

function pickEventId(session) {
  const ids = session.eventIds || [];
  if (!ids.length) return null;
  return ids[(__VU + __ITER) % ids.length];
}
