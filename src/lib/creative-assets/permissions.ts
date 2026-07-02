import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { APPROVER_ROLES } from "@/lib/auth/campaign-roles";

export function canManageCampaignAssets(role: CampaignRole): boolean {
  return role !== "view_only";
}

export function canUploadCampaignAssets(role: CampaignRole): boolean {
  return canManageCampaignAssets(role);
}

export function canReplaceCampaignAssets(role: CampaignRole): boolean {
  return canManageCampaignAssets(role);
}

export function canDeleteCampaignAssets(role: CampaignRole): boolean {
  return canManageCampaignAssets(role);
}

export function canManageBrandKit(role: CampaignRole): boolean {
  return APPROVER_ROLES.includes(role) || role === "admin";
}

export function canRestoreAssetVersions(role: CampaignRole): boolean {
  return APPROVER_ROLES.includes(role) || role === "admin";
}

export function canDeleteBrandKitItems(role: CampaignRole): boolean {
  return role === "admin";
}
