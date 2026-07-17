import type {
  OrganizationUser,
  OrganizationUserRow,
} from "@/types/auth";

export function mapOrganizationUserRow(
  row: OrganizationUserRow,
  organizationRoleName: string | null = null,
  assignedEventIds: string[] = [],
): OrganizationUser {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name ?? null,
    organizationRoleId: row.organization_role_id,
    organizationRoleName,
    organizationMemberId: row.organization_member_id ?? null,
    committeeId: row.committee_id ?? null,
    inviteMessage: row.invite_message ?? null,
    campaignRole: row.campaign_role,
    accessTemplateId: row.access_template_id ?? row.campaign_role ?? null,
    status: row.status,
    inviteToken: row.invite_token,
    invitedAt: row.invited_at,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    assignedEventIds,
  };
}
