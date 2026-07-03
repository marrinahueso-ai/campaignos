import type { ApprovalActor } from "@/lib/event-workspace/approval-permissions";

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function contactNameMatchesEmail(
  contactName: string | null | undefined,
  email: string | null | undefined,
): boolean {
  if (!contactName?.trim() || !email?.trim()) {
    return false;
  }

  const normalizedContact = normalizeMatchText(contactName);
  const emailLocal = normalizeMatchText(email.split("@")[0] ?? "");
  const contactWords = normalizedContact.split(/\s+/).filter(Boolean);

  if (!emailLocal || contactWords.length === 0) {
    return false;
  }

  if (normalizedContact.includes(emailLocal) || emailLocal.includes(contactWords[0]!)) {
    return true;
  }

  const firstName = contactWords[0]!;
  const lastName = contactWords[contactWords.length - 1]!;

  return emailLocal.includes(firstName) || emailLocal.includes(lastName);
}

export function isActorAssignedToApproval(
  actor: ApprovalActor | null,
  assignment: {
    assignedOrganizationRoleId: string | null;
    assignedUserId: string | null;
    assignedRoleContactName?: string | null;
  },
): boolean {
  if (!actor) {
    return false;
  }

  if (
    assignment.assignedUserId &&
    actor.organizationUserId === assignment.assignedUserId
  ) {
    return true;
  }

  if (
    assignment.assignedOrganizationRoleId &&
    actor.organizationRoleId === assignment.assignedOrganizationRoleId
  ) {
    return true;
  }

  if (
    assignment.assignedOrganizationRoleId &&
    contactNameMatchesEmail(assignment.assignedRoleContactName, actor.email)
  ) {
    return true;
  }

  return false;
}
