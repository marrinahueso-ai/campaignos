/**
 * Explicit column lists for organization workspace hot paths.
 * Avoids select("*") fan-out on Event / Tasks / Dashboard reads.
 */

/** Roles — fields consumed by mappers + responsibility projection. */
export const ORGANIZATION_ROLE_SELECT = [
  "id",
  "organization_id",
  "name",
  "system_role",
  "description",
  "contact_email",
  "contact_phone",
  "contact_name",
  "role_kind",
  "sort_order",
  "archived_at",
  "campaign_role",
  "created_at",
].join(", ");

/** Members — shell / Tasks assignee lists (phone optional on lean). */
export const ORGANIZATION_MEMBER_SELECT = [
  "id",
  "organization_id",
  "name",
  "email",
  "phone",
  "organization_role_id",
  "active",
  "campaign_role",
  "created_at",
].join(", ");

export const ORGANIZATION_MEMBER_LEAN_SELECT = [
  "id",
  "organization_id",
  "name",
  "email",
  "organization_role_id",
  "active",
  "campaign_role",
  "created_at",
].join(", ");

export const RESPONSIBILITY_MATRIX_SELECT = [
  "id",
  "organization_id",
  "responsibility_type",
  "default_role_id",
  "created_at",
].join(", ");

export const COMMITTEE_DEFAULT_SELECT = [
  "id",
  "organization_id",
  "committee_name",
  "default_role_id",
  "communication_strategy",
  "playbook_slug",
  "created_at",
].join(", ");

export const ORGANIZATION_COMMITTEE_SELECT = [
  "id",
  "organization_id",
  "name",
  "parent_role_id",
  "contact_email",
  "contact_phone",
  "contact_name",
  "communication_strategy",
  "playbook_slug",
  "event_match_key",
  "assigned_event_id",
  "sort_order",
  "archived_at",
  "campaign_role",
  "created_at",
].join(", ");

/** Event shell: committees for assigned-event link + contact/role names. */
export const ORGANIZATION_COMMITTEE_LEAN_SELECT = [
  "id",
  "organization_id",
  "name",
  "parent_role_id",
  "contact_email",
  "contact_name",
  "communication_strategy",
  "playbook_slug",
  "event_match_key",
  "assigned_event_id",
  "sort_order",
  "archived_at",
  "campaign_role",
  "created_at",
].join(", ");
