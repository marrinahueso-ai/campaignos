/**
 * Shared PostgREST column lists for event reads that do not need planning
 * JSON blobs (quick links, vendors, volunteer needs, approved square image, etc.).
 *
 * Use for list/calendar/summary hot paths. Detail editors that mutate planning
 * fields should keep `select("*")` (e.g. getEventById).
 */
export const EVENT_SUMMARY_SELECT = [
  "id",
  "title",
  "description",
  "date",
  "time",
  "location",
  "status",
  "category",
  "event_type",
  "communication_strategy",
  "event_owner",
  "school_year_id",
  "created_at",
  "updated_at",
].join(", ");
