import type { CampaignRole } from "@/lib/auth/campaign-roles";

export type OrganizationUserStatus = "active" | "invited" | "deactivated";

export interface OrganizationUser {
  id: string;
  organizationId: string;
  userId: string | null;
  email: string;
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  campaignRole: CampaignRole;
  status: OrganizationUserStatus;
  inviteToken: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  createdAt: string;
}

export interface OrganizationUserRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  organization_role_id: string | null;
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
}

export interface OrganizationMembership {
  user: OrganizationUser;
  organizationId: string;
}
