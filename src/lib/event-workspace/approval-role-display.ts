import type { ApprovalRoleOption } from "@/components/event-workspace/CampaignCommunicationPlanSettings";

export function formatApprovalRoleLabel(role: ApprovalRoleOption): string {
  if (role.contactName?.trim()) {
    return `${role.name} (${role.contactName.trim()})`;
  }

  return role.name;
}

export function resolveEventApprovalRole(
  approvalOrganizationRoleId: string | null,
  defaultApprovalRoleId: string | null,
  approvalRoles: ApprovalRoleOption[],
): ApprovalRoleOption | null {
  const roleId = approvalOrganizationRoleId ?? defaultApprovalRoleId;
  if (!roleId) {
    return null;
  }

  return approvalRoles.find((role) => role.id === roleId) ?? null;
}

export function resolveEventApprovalRoleLabel(
  approvalOrganizationRoleId: string | null,
  defaultApprovalRoleId: string | null,
  approvalRoles: ApprovalRoleOption[],
): string | null {
  const role = resolveEventApprovalRole(
    approvalOrganizationRoleId,
    defaultApprovalRoleId,
    approvalRoles,
  );

  return role ? formatApprovalRoleLabel(role) : null;
}
