import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { CommunicationStrategy } from "@/types/communication-strategy";

export type ResponsibilityType =
  | "facebook"
  | "instagram"
  | "newsletter"
  | "website"
  | "morning_announcements"
  | "artwork"
  | "volunteer_communications"
  | "publishing"
  | "approvals";

export type CommitteeName =
  | "book_fair"
  | "teacher_appreciation"
  | "spirit_wear"
  | "hospitality"
  | "fundraising"
  | "general_pto_meeting"
  | "family_event"
  | "volunteer_recruitment";

export type OrganizationRoleKind = "president" | "vp" | "other";

export interface OrganizationRole {
  id: string;
  organizationId: string;
  name: string;
  systemRole: boolean;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  roleKind: OrganizationRoleKind | null;
  sortOrder: number;
  archivedAt: string | null;
  campaignRole: CampaignRole | null;
  createdAt: string;
}

export interface OrganizationRoleRow {
  id: string;
  organization_id: string;
  name: string;
  system_role: boolean;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  role_kind: OrganizationRoleKind | null;
  sort_order: number;
  archived_at: string | null;
  campaign_role: CampaignRole | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  organizationRoleId: string | null;
  roleName: string | null;
  active: boolean;
  campaignRole: CampaignRole | null;
  createdAt: string;
  /** Assigned campaign/event ids (roster-first; synced to login when linked). */
  assignedEventIds: string[];
}

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  organization_role_id: string | null;
  active: boolean;
  campaign_role: CampaignRole | null;
  created_at: string;
}

export interface ResponsibilityMatrixEntry {
  id: string;
  organizationId: string;
  responsibilityType: ResponsibilityType;
  defaultRoleId: string | null;
  defaultRoleName: string | null;
  createdAt: string;
}

export interface ResponsibilityMatrixRow {
  id: string;
  organization_id: string;
  responsibility_type: ResponsibilityType;
  default_role_id: string | null;
  created_at: string;
}

export interface CommitteeDefault {
  id: string;
  organizationId: string;
  committeeName: CommitteeName;
  defaultRoleId: string | null;
  defaultRoleName: string | null;
  communicationStrategy: CommunicationStrategy;
  playbookSlug: string | null;
  createdAt: string;
}

export interface CommitteeDefaultRow {
  id: string;
  organization_id: string;
  committee_name: CommitteeName;
  default_role_id: string | null;
  communication_strategy: CommunicationStrategy;
  playbook_slug: string | null;
  created_at: string;
}

export interface OrganizationCommittee {
  id: string;
  organizationId: string;
  name: string;
  parentRoleId: string | null;
  parentRoleName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactName: string | null;
  communicationStrategy: CommunicationStrategy;
  playbookSlug: string | null;
  eventMatchKey: string | null;
  assignedEventId: string | null;
  sortOrder: number;
  archivedAt: string | null;
  campaignRole: CampaignRole | null;
  createdAt: string;
}

export interface OrganizationCommitteeRow {
  id: string;
  organization_id: string;
  name: string;
  parent_role_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  communication_strategy: CommunicationStrategy;
  playbook_slug: string | null;
  event_match_key: string | null;
  assigned_event_id?: string | null;
  sort_order: number;
  archived_at: string | null;
  campaign_role: CampaignRole | null;
  created_at: string;
}

export interface OrganizationWorkspaceData {
  roles: OrganizationRole[];
  members: OrganizationMember[];
  responsibilityMatrix: ResponsibilityMatrixEntry[];
  committeeDefaults: CommitteeDefault[];
  committees: OrganizationCommittee[];
}

export interface OrganizationDefaultItem {
  label: string;
  roleName: string;
}

export interface EventOrganizationDefaults {
  responsibilities: OrganizationDefaultItem[];
  committeeOwner: string | null;
  communicationStrategy: CommunicationStrategy | null;
  playbookSlug: string | null;
}
