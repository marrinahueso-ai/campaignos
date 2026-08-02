import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Chair/VP style Create with AI browsing using seeded content.
 * Never calls OpenAI generate endpoints.
 */
export function runCommunicationsCreator(data, session) {
  const start = Date.now();
  group("communications_creator", () => {
    getHtml(data.baseUrl, "/create-with-ai", session, {
      route: "create_with_ai",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });

    const eventId = pickEventId(session);
    if (eventId) {
      getHtml(data.baseUrl, `/events/${eventId}`, session, {
        route: "event_detail",
        schools: data.schools,
        minThink: 2,
        maxThink: 6,
      });
      getHtml(data.baseUrl, `/events/${eventId}/campaign-builder`, session, {
        route: "campaign_builder",
        schools: data.schools,
        minThink: 3,
        maxThink: 8,
      });
      getHtml(data.baseUrl, `/events/${eventId}?tab=planning`, session, {
        route: "event_planning",
        schools: data.schools,
        minThink: 2,
        maxThink: 7,
      });
    }

    pauseBetweenActions(2, 8);
  });
  workflowDuration.add(Date.now() - start, { workflow: "comms_creator" });
}

function pickEventId(session) {
  const ids = session.eventIds || [];
  if (!ids.length) return null;
  return ids[(__VU + __ITER) % ids.length];
}
