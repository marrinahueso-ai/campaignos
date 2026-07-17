import type { CampaignRole } from "@/lib/auth/campaign-roles";

/** Stable permission keys — labels can change; these IDs do not. */
export type AccessPermissionKey =
  | "view_all_events"
  | "view_assigned_events_only"
  | "access_assigned_events_only"
  | "draft_edit"
  | "submit_approval"
  | "approve_comms"
  | "publish_social"
  | "upload_artwork"
  | "manage_people"
  | "manage_billing"
  | "manage_integrations";

export const ACCESS_PERMISSION_KEYS: AccessPermissionKey[] = [
  "view_all_events",
  "view_assigned_events_only",
  "access_assigned_events_only",
  "draft_edit",
  "submit_approval",
  "approve_comms",
  "publish_social",
  "upload_artwork",
  "manage_people",
  "manage_billing",
  "manage_integrations",
];

export const ACCESS_PERMISSION_LABELS: Record<AccessPermissionKey, string> = {
  view_all_events: "See all events",
  view_assigned_events_only: "Show only assigned events",
  access_assigned_events_only: "Can only work on assigned events",
  draft_edit: "Draft & edit",
  submit_approval: "Submit for approval",
  approve_comms: "Approve communications",
  publish_social: "Publish / social",
  upload_artwork: "Upload artwork",
  manage_people: "Manage people",
  manage_billing: "Manage billing",
  manage_integrations: "Manage integrations",
};

/** Short helper copy for the Access templates editor (see vs work). */
export const ACCESS_PERMISSION_DESCRIPTIONS: Partial<
  Record<AccessPermissionKey, string>
> = {
  view_all_events: "Event cards appear for every event in the org.",
  view_assigned_events_only:
    "Hide unassigned events from lists (strict). Implies work is limited to assigned events.",
  access_assigned_events_only:
    "Open, edit, and mutate only events this person is assigned to. Lists can still show all when “See all events” is on.",
};

/** System template ids match CampaignRole; custom ids are `custom_*`. */
export type AccessTemplateId = string;

export type AccessTemplatePermissions = Record<AccessPermissionKey, boolean>;

export interface AccessTemplate {
  id: AccessTemplateId;
  /** Org-customizable display name (HOA / church / sports / school). */
  displayName: string;
  description: string;
  permissions: AccessTemplatePermissions;
  /** Auth role written to organization_users.campaign_role. */
  baseRole: CampaignRole;
  /** True for org-created templates (can be deleted). */
  isCustom: boolean;
}

export interface AccessTemplateRow {
  organization_id: string;
  template_id: string;
  display_name: string;
  description: string | null;
  permissions: Record<string, boolean> | null;
  base_role?: string | null;
  updated_at: string;
}

export function isCustomAccessTemplateId(value: string): boolean {
  return /^custom_[a-z0-9_]+$/.test(value);
}
