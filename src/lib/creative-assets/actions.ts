"use server";

import { revalidatePath } from "next/cache";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import {
  campaignRoleLabel,
} from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  canDeleteCampaignAssets,
  canManageBrandKit,
  canRestoreAssetVersions,
  canUploadCampaignAssets,
} from "@/lib/creative-assets/permissions";
import {
  createCampaignAsset,
  deleteCampaignAsset,
  duplicateInspirationToCampaign,
  restoreCampaignAssetVersion,
  setCampaignAssetCanvaUrl,
  toggleInspirationFavorite,
  uploadEventAsset,
  uploadNewCampaignAsset,
} from "@/lib/creative-assets/mutations";
import {
  isAllowedEventAssetFile,
  MAX_EVENT_ASSET_BYTES,
} from "@/lib/event-workspace/storage";
import type { EventAssetType } from "@/types/event-workspace";

export type CreativeAssetActionState = {
  error: string | null;
  success: boolean;
  assetId?: string;
};

function revalidateCreativePaths(eventId?: string): void {
  revalidatePath("/creative-studio");
  if (eventId) {
    revalidateEventPaths(eventId);
  }
}

async function uploadedByLabel(): Promise<string> {
  const role = await getCurrentCampaignRole();
  return campaignRoleLabel(role);
}

function validateFile(file: unknown): { file: File } | { error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (!isAllowedEventAssetFile(file)) {
    return { error: "Upload PNG, JPG, WebP, or PDF files only." };
  }
  if (file.size > MAX_EVENT_ASSET_BYTES) {
    return { error: "File is too large (max 10 MB)." };
  }
  return { file };
}

export async function uploadCampaignAssetAction(
  eventId: string,
  assetId: string,
  formData: FormData,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { error: "You do not have permission to upload assets.", success: false };
  }

  const validated = validateFile(formData.get("file"));
  if ("error" in validated) {
    return { error: validated.error, success: false };
  }

  const success = await uploadEventAsset(
    eventId,
    assetId,
    validated.file,
    await uploadedByLabel(),
  );

  if (!success) {
    return { error: "Unable to upload asset.", success: false };
  }

  revalidateCreativePaths(eventId);
  return { error: null, success: true, assetId };
}

export async function createAndUploadCampaignAssetAction(
  eventId: string,
  assetType: EventAssetType,
  formData: FormData,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { error: "You do not have permission to upload assets.", success: false };
  }

  const validated = validateFile(formData.get("file"));
  if ("error" in validated) {
    return { error: validated.error, success: false };
  }

  const success = await uploadNewCampaignAsset(
    eventId,
    assetType,
    validated.file,
    await uploadedByLabel(),
  );

  if (!success) {
    return { error: "Unable to upload asset.", success: false };
  }

  revalidateCreativePaths(eventId);
  return { error: null, success: true };
}

export async function deleteCampaignAssetAction(
  eventId: string,
  assetId: string,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canDeleteCampaignAssets(role)) {
    return { error: "You do not have permission to delete assets.", success: false };
  }

  const success = await deleteCampaignAsset(eventId, assetId);
  if (!success) {
    return { error: "Unable to delete asset.", success: false };
  }

  revalidateCreativePaths(eventId);
  return { error: null, success: true };
}

export async function restoreCampaignAssetVersionAction(
  eventId: string,
  assetId: string,
  versionId: string,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canRestoreAssetVersions(role)) {
    return { error: "Only board members can restore versions.", success: false };
  }

  const success = await restoreCampaignAssetVersion(
    eventId,
    assetId,
    versionId,
    await uploadedByLabel(),
  );

  if (!success) {
    return { error: "Unable to restore version.", success: false };
  }

  revalidateCreativePaths(eventId);
  return { error: null, success: true };
}

export async function toggleInspirationFavoriteAction(
  assetId: string,
  isFavorite: boolean,
): Promise<CreativeAssetActionState> {
  const success = await toggleInspirationFavorite(assetId, isFavorite);
  if (!success) {
    return { error: "Unable to update favorite.", success: false };
  }

  revalidatePath("/creative-studio");
  return { error: null, success: true };
}

export async function duplicateInspirationAction(
  sourceAssetId: string,
  targetEventId: string,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { error: "You do not have permission to duplicate assets.", success: false };
  }

  const success = await duplicateInspirationToCampaign(
    sourceAssetId,
    targetEventId,
    await uploadedByLabel(),
  );

  if (!success) {
    return { error: "Unable to duplicate asset.", success: false };
  }

  revalidateCreativePaths(targetEventId);
  return { error: null, success: true };
}

export async function createCampaignAssetSlotAction(
  eventId: string,
  assetType: EventAssetType,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { error: "You do not have permission to create assets.", success: false };
  }

  const assetId = await createCampaignAsset(eventId, assetType, await uploadedByLabel());
  if (!assetId) {
    return { error: "Unable to create asset slot.", success: false };
  }

  revalidateCreativePaths(eventId);
  return { error: null, success: true, assetId };
}

export async function setCanvaUrlAction(
  eventId: string,
  assetId: string,
  canvaUrl: string,
): Promise<CreativeAssetActionState> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { error: "You do not have permission to update assets.", success: false };
  }

  const success = await setCampaignAssetCanvaUrl(
    eventId,
    assetId,
    canvaUrl,
    await uploadedByLabel(),
  );

  if (!success) {
    return { error: "Unable to save Canva link.", success: false };
  }

  revalidateCreativePaths(eventId);
  return { error: null, success: true };
}

export async function canManageBrandKitAction(): Promise<boolean> {
  const role = await getCurrentCampaignRole();
  return canManageBrandKit(role);
}
