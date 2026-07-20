import type { OrganizationUserStatus } from "@/types/auth";

export type OrganizationAccessState = "active" | "deactivated" | "none";

export const ACCOUNT_DEACTIVATED_LOGIN_PATH =
  "/login?error=account_deactivated";

/** Collapse membership rows for one auth user into a single access state. */
export function resolveOrganizationAccessState(
  statuses: ReadonlyArray<OrganizationUserStatus | string>,
): OrganizationAccessState {
  if (statuses.some((status) => status === "active")) {
    return "active";
  }
  if (statuses.some((status) => status === "deactivated")) {
    return "deactivated";
  }
  return "none";
}

/**
 * Block self-deactivate / self-remove so admins cannot lock themselves out
 * (and then fall into founding/school-setup UX).
 */
export function selfMembershipChangeError(input: {
  actorUserId: string;
  targetUserId: string | null | undefined;
  change: "deactivate" | "remove";
}): string | null {
  if (!input.targetUserId || input.targetUserId !== input.actorUserId) {
    return null;
  }

  if (input.change === "deactivate") {
    return "You cannot deactivate your own account. Ask another admin to deactivate you, or transfer admin access first.";
  }

  return "You cannot remove your own account. Ask another admin to remove you.";
}
