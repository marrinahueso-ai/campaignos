import { getActiveMembership } from "@/lib/auth/membership-queries";
import type { ApprovalActor } from "@/lib/event-workspace/approval-permissions";

export async function getApprovalActorFromSession(): Promise<ApprovalActor | null> {
  const membership = await getActiveMembership();
  if (!membership) {
    return null;
  }

  return {
    organizationUserId: membership.user.id,
    organizationRoleId: membership.user.organizationRoleId,
    email: membership.user.email,
  };
}
