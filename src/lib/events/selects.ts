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

/**
 * Campaigns / Events Home list — summary columns plus promoted hero URL so
 * rows outside the artwork prefetch window still show a thumbnail.
 */
export const EVENT_CAMPAIGN_LIST_SELECT = [
  EVENT_SUMMARY_SELECT,
  "approved_square_image_url",
  "approved_square_image_status",
].join(", ");
