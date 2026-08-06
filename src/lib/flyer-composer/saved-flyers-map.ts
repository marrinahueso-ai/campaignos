import type { CampaignFile } from "@/types/campaign-files";

export const FLYER_COMPOSER_SAVED_LIST_CAP = 24;

export type SavedFlyerComposerFile = {
  id: string;
  eventId: string;
  name: string;
  imageUrl: string;
  uploadedAt: string;
  updatedAt: string;
  fileType: CampaignFile["fileType"];
  sizeBytes: number | null;
  uploaderName: string | null;
};

function isImageFlyerFile(file: CampaignFile): boolean {
  if (file.status !== "active") return false;
  if (file.category !== "flyer") return false;
  const url = file.url?.trim() || "";
  if (!url) return false;
  const type = file.fileType;
  if (type === "png" || type === "jpg") return true;
  const mime = (file.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(file.name);
}

export function mapCampaignFileToSavedFlyer(
  file: CampaignFile,
): SavedFlyerComposerFile | null {
  if (!isImageFlyerFile(file)) return null;
  const imageUrl = file.url!.trim();
  return {
    id: file.id,
    eventId: file.eventId,
    name: file.name,
    imageUrl,
    uploadedAt: file.uploadedAt,
    updatedAt: file.updatedAt,
    fileType: file.fileType,
    sizeBytes: file.sizeBytes,
    uploaderName: file.uploaderName,
  };
}
