import {
  getActiveMembership,
} from "@/lib/auth/membership-queries";
import { canUseRoleSimulator } from "@/lib/auth/role-simulator-access";
import { cookies } from "next/headers";
import {
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";

export const SIMULATED_ROLE_COOKIE = "campaignos-simulated-role";

const DEFAULT_ROLE: CampaignRole = "contributor";

/**
 * Resolves the active campaign role from organization membership.
 * Dev role simulator cookie overrides only when the caller is allowlisted
 * for role simulation (admin/developer tooling in non-production).
 */
export async function getCurrentCampaignRole(): Promise<CampaignRole> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SIMULATED_ROLE_COOKIE)?.value;

  if (raw && isCampaignRole(raw) && (await canUseRoleSimulator())) {
    return raw;
  }

  const membership = await getActiveMembership();
  if (membership?.user.campaignRole) {
    return membership.user.campaignRole;
  }

  return DEFAULT_ROLE;
}
