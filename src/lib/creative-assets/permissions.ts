import type { CampaignRole } from "@/lib/auth/campaign-roles";
import {
  APPROVER_ROLES,
  canPublishCampaignContent,
} from "@/lib/auth/campaign-roles";

/**
 * Sync helper for client props from CampaignRole only.
 * Prefer EffectiveAccess `upload_artwork` (hasPermission / canUploadArtwork props)
 * — role helpers ignore org template overrides (e.g. developer with upload off).
 */
export function canManageCampaignAssets(role: CampaignRole): boolean {
  // Testers may draft/review content but not publish/upload campaign assets by default.
  return canPublishCampaignContent(role);
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
