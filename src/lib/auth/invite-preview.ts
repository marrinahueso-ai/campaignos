import { TEAM_INVITE_TTL_DAYS } from "@/lib/auth/invite-constants";
import { lookupInviteByToken } from "@/lib/auth/membership-queries";

export type InvitePreview = {
  organizationName: string;
  email: string;
  roleName: string | null;
  campaignRole: string;
  expired: boolean;
  expiresAt: string | null;
  ttlDays: number;
};

export async function getInvitePreview(
  token: string,
): Promise<InvitePreview | null> {
  const lookup = await lookupInviteByToken(token);
  if (lookup.status === "missing") {
    return null;
  }

  const invite = lookup.invite;

  return {
    organizationName: lookup.organizationName ?? "your PTO",
    email: invite.email,
    roleName: invite.organizationRoleName,
    campaignRole: invite.campaignRole,
    expired: lookup.status === "expired",
    expiresAt: invite.inviteExpiresAt ?? null,
    ttlDays: TEAM_INVITE_TTL_DAYS,
  };
}
