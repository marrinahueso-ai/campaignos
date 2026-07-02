import { APPROVER_ROLES } from "@/lib/auth/campaign-roles";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import type { OrganizationRole } from "@/types/organization-workspace";

export type ApprovalAssignee = {
  organizationRoleId: string | null;
  organizationRoleName: string | null;
  assignedUserId: string | null;
  assigneeDisplayName: string;
};

function formatAssigneeDisplayName(
  role: OrganizationRole | undefined,
  userEmail: string | null,
  userOrgRoleName: string | null,
): string {
  if (role?.contactName?.trim()) {
    return role.contactName.trim();
  }

  if (userEmail) {
    return userEmail;
  }

  if (role?.name) {
    return role.name;
  }

  if (userOrgRoleName) {
    return userOrgRoleName;
  }

  return "Board";
}

export async function resolveApprovalAssignee(
  organizationId: string,
  eventApprovalRoleId?: string | null,
): Promise<ApprovalAssignee> {
  const workspace = await getOrganizationWorkspaceData(organizationId);

  if (!workspace) {
    return {
      organizationRoleId: null,
      organizationRoleName: null,
      assignedUserId: null,
      assigneeDisplayName: "Board",
    };
  }

  const approvalsEntry = workspace.responsibilityMatrix.find(
    (entry) => entry.responsibilityType === "approvals",
  );

  const resolvedRoleId =
    eventApprovalRoleId ?? approvalsEntry?.defaultRoleId ?? null;

  if (!resolvedRoleId) {
    return {
      organizationRoleId: null,
      organizationRoleName: approvalsEntry?.defaultRoleName ?? null,
      assignedUserId: null,
      assigneeDisplayName: approvalsEntry?.defaultRoleName ?? "Board",
    };
  }

  const role = workspace.roles.find((entry) => entry.id === resolvedRoleId);

  const teamMembers = await getOrganizationUsers(organizationId);
  const matchingMembers = teamMembers.filter(
    (member) =>
      member.status === "active" &&
      member.organizationRoleId === resolvedRoleId,
  );

  const preferredMember =
    matchingMembers.find((member) =>
      APPROVER_ROLES.includes(member.campaignRole),
    ) ?? matchingMembers[0];

  const assigneeDisplayName = formatAssigneeDisplayName(
    role,
    preferredMember?.email ?? null,
    preferredMember?.organizationRoleName ?? null,
  );

  return {
    organizationRoleId: resolvedRoleId,
    organizationRoleName: role?.name ?? approvalsEntry?.defaultRoleName ?? null,
    assignedUserId: preferredMember?.id ?? null,
    assigneeDisplayName,
  };
}
