import type {
  OrganizationUser,
  OrganizationUserRow,
} from "@/types/auth";

export function mapOrganizationUserRow(
  row: OrganizationUserRow,
  organizationRoleName: string | null = null,
): OrganizationUser {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.email,
    organizationRoleId: row.organization_role_id,
    organizationRoleName,
    campaignRole: row.campaign_role,
    status: row.status,
    inviteToken: row.invite_token,
    invitedAt: row.invited_at,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
  };
}
