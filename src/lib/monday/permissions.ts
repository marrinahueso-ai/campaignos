import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";

export function canManageMondayIntegration(role: CampaignRole): boolean {
  return canManageTeam(role);
}
