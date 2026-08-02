import { group } from "k6";
import { getHtml, pauseBetweenActions } from "../helpers/http.js";
import { workflowDuration } from "../helpers/metrics.js";

/**
 * Calendar + event list + individual seeded event (read-only by default).
 * Writes only when data.allowWrites — still no unlimited duplicates (cap 0 here;
 * seed script creates events; optional write path reserved for future form posts).
 */
export function runCalendarEventsUser(data, session) {
  const start = Date.now();
  group("calendar_events", () => {
    getHtml(data.baseUrl, "/calendar", session, {
      route: "calendar",
      schools: data.schools,
      minThink: 3,
      maxThink: 8,
    });
    getHtml(data.baseUrl, "/events", session, {
      route: "events_list",
      schools: data.schools,
      minThink: 2,
      maxThink: 6,
    });

    const eventId = pickEventId(session);
    if (eventId) {
      getHtml(data.baseUrl, `/events/${eventId}`, session, {
        route: "event_detail",
        schools: data.schools,
        minThink: 3,
        maxThink: 8,
      });
      // Planning / milestones surface on event detail tabs (RSC).
      getHtml(data.baseUrl, `/events/${eventId}?tab=planning`, session, {
        route: "event_planning",
        schools: data.schools,
        minThink: 2,
        maxThink: 7,
      });
    }

    // Documented: event create/update only when K6_ALLOW_WRITES and a write helper exists.
    // Default suite does not POST server actions (deploy-fragile Next-Action hashes).
    if (data.allowWrites) {
      pauseBetweenActions(2, 4);
      // Read create form only — does not insert rows.
      getHtml(data.baseUrl, "/events/create", session, {
        route: "event_create_form",
        schools: data.schools,
        minThink: 2,
        maxThink: 5,
      });
    }

    pauseBetweenActions(2, 6);
  });
  workflowDuration.add(Date.now() - start, { workflow: "calendar" });
}

function pickEventId(session) {
  const ids = session.eventIds || [];
  if (!ids.length) return null;
  return ids[(__VU + __ITER) % ids.length];
}
