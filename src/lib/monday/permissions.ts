import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";

/** Sync helper — server gates should use hasPermission("manage_integrations"). */
export function canManageMondayIntegration(role: CampaignRole): boolean {
  return canManageTeam(role);
}
