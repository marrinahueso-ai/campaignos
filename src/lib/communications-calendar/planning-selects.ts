/**
 * Lean column lists for calendar / planning / Today / campaign-intelligence
 * hot paths. Omits heavy event_assets JSON (prompts, AI review, generation
 * settings) while keeping fields used by buildPlanningItemsFromRaw and
 * calculateCampaignIntelligence.
 */

export {
  EVENT_SUMMARY_SELECT as PLANNING_EVENT_SELECT,
} from "@/lib/events/selects";

export const PLANNING_STEP_SELECT = [
  "id",
  "event_id",
  "assignment_id",
  "playbook_step_id",
  "sort_order",
  "relative_day",
  "due_date",
  "title",
  "channel",
  "is_required",
  "status",
  "meta_publish_surfaces",
  "story_manual_publish",
  "story_reminder_sent_at",
  "completed_at",
  "created_at",
  "updated_at",
].join(", ");

export const PLANNING_ITEM_SELECT = [
  "id",
  "event_id",
  "channel",
  "event_communication_step_id",
  "status",
  "last_updated",
  "is_published",
  "created_at",
  "updated_at",
].join(", ");

export const PLANNING_VERSION_SELECT = [
  "id",
  "communication_item_id",
  "content",
  "version_number",
  "created_by",
  "created_at",
].join(", ");

/** Omits generation_prompt, ai_review, inspiration_match, generation_settings. */
export const PLANNING_ASSET_SELECT = [
  "id",
  "event_id",
  "asset_type",
  "filename",
  "storage_path",
  "status",
  "ai_generated",
  "created_at",
  "updated_at",
].join(", ");

export const PLANNING_APPROVAL_SELECT = [
  "id",
  "event_id",
  "communication_item_id",
  "communication_version_id",
  "status",
  "requested_at",
  "resolved_at",
  "notes",
  "assigned_organization_role_id",
  "assigned_user_id",
  "requested_by_user_id",
  "created_at",
].join(", ");

export const PLANNING_SCHEDULE_SELECT = [
  "id",
  "event_id",
  "communication_item_id",
  "scheduled_for",
  "status",
  "created_at",
  "updated_at",
].join(", ");

export const UNIFIED_META_SLOT_SELECT = [
  "id",
  "event_id",
  "relative_day",
  "milestone_title",
  "platform",
  "placement",
  "event_asset_id",
  "communication_item_id",
  "scheduled_for",
  "status",
  "external_post_id",
  "graph_schedule_id",
  "graph_schedule_error",
  "publish_error",
  "published_at",
  "created_at",
  "updated_at",
].join(", ");
