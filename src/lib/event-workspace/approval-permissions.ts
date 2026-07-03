import {
  canApproveDraft,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { isActorAssignedToApproval } from "@/lib/event-workspace/approval-actor-matching";

export type ApprovalActor = {
  organizationUserId: string | null;
  organizationRoleId: string | null;
  email: string | null;
};

export type ApprovalAssignment = {
  assignedOrganizationRoleId: string | null;
  assignedUserId: string | null;
  assignedRoleContactName?: string | null;
};

export function canActOnAssignedApproval(
  role: CampaignRole,
  actor: ApprovalActor | null,
  assignment: ApprovalAssignment | null,
): boolean {
  if (!canApproveDraft(role)) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  const hasAssignment =
    Boolean(assignment?.assignedOrganizationRoleId) ||
    Boolean(assignment?.assignedUserId);

  if (!hasAssignment) {
    return true;
  }

  return isActorAssignedToApproval(actor, {
    assignedOrganizationRoleId: assignment?.assignedOrganizationRoleId ?? null,
    assignedUserId: assignment?.assignedUserId ?? null,
    assignedRoleContactName: assignment?.assignedRoleContactName ?? null,
  });
}

export function getApprovalItemContext(
  communicationItemId: string,
  approvalRequests: Array<{
    communicationItemId: string | null;
    status: string;
    assigneeDisplayName: string | null;
    assignedOrganizationRoleId: string | null;
    assignedUserId: string | null;
  }>,
  role: CampaignRole,
  actor: ApprovalActor | null,
): {
  assigneeDisplayName: string | null;
  canApproveAssigned: boolean;
} {
  const pending = approvalRequests.find(
    (request) =>
      request.communicationItemId === communicationItemId &&
      request.status === "pending",
  );

  const assignment = pending
    ? {
        assignedOrganizationRoleId: pending.assignedOrganizationRoleId,
        assignedUserId: pending.assignedUserId,
      }
    : null;

  return {
    assigneeDisplayName: pending?.assigneeDisplayName ?? null,
    canApproveAssigned: canActOnAssignedApproval(role, actor, assignment),
  };
}
