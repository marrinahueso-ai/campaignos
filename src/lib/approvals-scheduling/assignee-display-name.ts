/**
 * Label for “Assigned to …” on Approvals.
 * Prefer Account / edit-profile display name over email.
 */
export function resolveApprovalAssigneeLabel(input: {
  userDisplayName?: string | null;
  userEmail?: string | null;
  roleContactName?: string | null;
  roleName?: string | null;
  userOrgRoleName?: string | null;
  fallback?: string;
}): string {
  const displayName = input.userDisplayName?.trim();
  if (displayName) {
    return displayName;
  }

  const contactName = input.roleContactName?.trim();
  if (contactName) {
    return contactName;
  }

  const email = input.userEmail?.trim();
  if (email) {
    return email;
  }

  const roleName = input.roleName?.trim();
  if (roleName) {
    return roleName;
  }

  const userOrgRoleName = input.userOrgRoleName?.trim();
  if (userOrgRoleName) {
    return userOrgRoleName;
  }

  return input.fallback ?? "Board";
}
