/**
 * Lean column lists for Event Workspace / event-detail UI loaders.
 * Omits heavy generation JSON (prompts, AI review, inspiration match, settings)
 * while keeping fields used by workspace mappers and asset cards.
 */

export {
  PLANNING_ITEM_SELECT as WORKSPACE_COMMUNICATION_SELECT,
  PLANNING_VERSION_SELECT as WORKSPACE_VERSION_SELECT,
  PLANNING_APPROVAL_SELECT as WORKSPACE_APPROVAL_SELECT,
  PLANNING_SCHEDULE_SELECT as WORKSPACE_SCHEDULE_SELECT,
} from "@/lib/communications-calendar/planning-selects";

/** Omits generation_prompt, ai_review, inspiration_match, generation_settings. */
export const WORKSPACE_ASSET_SELECT = [
  "id",
  "event_id",
  "asset_type",
  "filename",
  "storage_path",
  "status",
  "ai_generated",
  "uploaded_by",
  "current_version",
  "tags",
  "is_favorite",
  "canva_url",
  "is_custom",
  "plan_status",
  "plan_label",
  "created_at",
  "updated_at",
].join(", ");

export const WORKSPACE_ACTIVITY_SELECT = [
  "id",
  "event_id",
  "activity_type",
  "title",
  "description",
  "occurred_at",
  "created_at",
].join(", ");

/** Approval request columns used by mapApprovalRequestRow (+ relation joins). */
export const WORKSPACE_APPROVAL_REQUEST_WITH_RELATIONS_SELECT = `
  id,
  event_id,
  communication_item_id,
  communication_version_id,
  status,
  requested_at,
  resolved_at,
  notes,
  assigned_organization_role_id,
  assigned_user_id,
  requested_by_user_id,
  created_at,
  assigned_role:organization_roles!approval_requests_assigned_organization_role_id_fkey (
    name,
    contact_name
  ),
  assigned_user:organization_users!approval_requests_assigned_user_id_fkey (
    email,
    organization_roles ( name )
  )
`;
