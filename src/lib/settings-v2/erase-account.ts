import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import type { CampaignRole } from "@/lib/auth/campaign-roles";

export const ACCOUNT_ERASE_CONFIRMATION = "DELETE";

export type AccountEraseMembership = {
  organizationId: string;
  campaignRole: CampaignRole | string;
  status: string;
};

/**
 * Block erase when the caller is the last admin/president on any active
 * workspace — otherwise that org would be left without anyone who can manage
 * people or recover access.
 */
export function lastWorkspaceAdminEraseError(
  memberships: ReadonlyArray<AccountEraseMembership>,
  otherManageCountsByOrg: Readonly<Record<string, number>>,
): string | null {
  for (const membership of memberships) {
    if (membership.status !== "active") continue;
    if (!canManageTeam(membership.campaignRole as CampaignRole)) continue;

    const others = otherManageCountsByOrg[membership.organizationId] ?? 0;
    if (others < 1) {
      return "You are the last admin for a workspace. Transfer admin access to another teammate in Team & Access before erasing your account.";
    }
  }

  return null;
}

export function isValidAccountEraseConfirmation(value: string): boolean {
  return value.trim() === ACCOUNT_ERASE_CONFIRMATION;
}

/** Email/password identities need a password re-check; OAuth-only can confirm with DELETE. */
export function accountEraseRequiresPassword(
  identities: ReadonlyArray<{ provider?: string | null } | null> | null | undefined,
): boolean {
  if (!identities || identities.length === 0) {
    return true;
  }
  return identities.some((identity) => identity?.provider === "email");
}
