import type { CampaignRole } from "@/lib/auth/campaign-roles";

export type OrganizationUserStatus = "active" | "invited" | "deactivated";

export interface OrganizationUser {
  id: string;
  organizationId: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  organizationMemberId: string | null;
  committeeId: string | null;
  inviteMessage: string | null;
  campaignRole: CampaignRole;
  status: OrganizationUserStatus;
  inviteToken: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  createdAt: string;
  /** Assigned campaign/event ids for this membership. */
  assignedEventIds: string[];
}

export interface OrganizationUserRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  display_name?: string | null;
  organization_role_id: string | null;
  organization_member_id?: string | null;
  committee_id?: string | null;
  invite_message?: string | null;
  campaign_role: CampaignRole;
  status: OrganizationUserStatus;
  invite_token: string | null;
  invited_by_user_id: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string | null;
}

export interface OrganizationMembership {
  user: OrganizationUser;
  organizationId: string;
}
