import {
  getActiveMembership,
} from "@/lib/auth/membership-queries";
import { cookies } from "next/headers";
import {
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";

export const SIMULATED_ROLE_COOKIE = "campaignos-simulated-role";

const DEFAULT_ROLE: CampaignRole = "contributor";

/**
 * Resolves the active campaign role from organization membership.
 * Dev role simulator cookie still overrides for local testing.
 */
export async function getCurrentCampaignRole(): Promise<CampaignRole> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SIMULATED_ROLE_COOKIE)?.value;

  if (raw && isCampaignRole(raw)) {
    return raw;
  }

  const membership = await getActiveMembership();
  if (membership?.user.campaignRole) {
    return membership.user.campaignRole;
  }

  return DEFAULT_ROLE;
}
