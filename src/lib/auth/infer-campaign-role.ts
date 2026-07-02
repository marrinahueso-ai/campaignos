import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { OrganizationRoleKind } from "@/types/organization-workspace";

export function inferDefaultCampaignRole(
  roleKind: OrganizationRoleKind | null | undefined,
): CampaignRole {
  switch (roleKind) {
    case "president":
      return "president";
    case "vp":
      return "vp_communications";
    default:
      return "contributor";
  }
}

export function isAdminRole(role: CampaignRole): boolean {
  return role === "admin";
}

export function canManageTeam(role: CampaignRole): boolean {
  return role === "admin" || role === "president";
}
