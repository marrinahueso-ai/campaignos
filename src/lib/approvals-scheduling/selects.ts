/**
 * Column splits for Approvals & Scheduling hub.
 * List path keeps thumbnail URLs; omits long caption bodies until preview open.
 */

/** Queue / table columns — no caption_text / story_caption. */
export const SCHEDULING_LIST_SELECT = [
  "id",
  "event_id",
  "approval_request_id",
  "communication_item_id",
  "source",
  "campaign_milestone_id",
  "campaign_name",
  "milestone_name",
  "workflow_status",
  "assigned_user_id",
  "assigned_organization_role_id",
  "requested_by_user_id",
  "delivery_method",
  "platforms",
  "schedule_at",
  "feed_artwork_url",
  "story_artwork_url",
  "manual_upload_link",
  "manual_email_to",
  "manual_email_send_at",
  "manual_upload_email_sent_at",
  "notes",
  "requested_at",
  "resolved_at",
  "created_at",
  "updated_at",
].join(", ");

/** Rich preview fields loaded on demand for the opened review item. */
export const SCHEDULING_PREVIEW_SELECT = [
  "id",
  "caption_text",
  "story_caption",
  "feed_artwork_url",
  "story_artwork_url",
].join(", ");
