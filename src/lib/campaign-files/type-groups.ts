import {
  mapDocumentCategoryToLegacyCategory,
  suggestDocumentCategory,
} from "@/lib/campaign-files/document-category";
import type {
  CampaignFile,
  CampaignFileCategory,
  CampaignFileType,
  FileUploadContext,
} from "@/types/campaign-files";
import { detectFileType } from "@/lib/campaign-files/file-type";

export type CampaignFileTypeGroup =
  | "all"
  | "graphics"
  | "photos"
  | "documents"
  | "other";

export const FILE_TYPE_GROUP_OPTIONS: {
  id: CampaignFileTypeGroup;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "graphics", label: "Graphics" },
  { id: "photos", label: "Photos" },
  { id: "documents", label: "Documents" },
  { id: "other", label: "Other" },
];

const GRAPHIC_NAME_HINTS =
  /\b(banner|poster|graphic|social|square|flyer|artwork|instagram|facebook|story)\b/i;

export function resolveCampaignFileType(
  filename: string,
  mimeType?: string | null,
  storedType?: CampaignFileType | null,
): CampaignFileType {
  return storedType ?? detectFileType(filename, mimeType);
}

export function inferTypeGroup(
  filename: string,
  mimeType?: string | null,
  fileType?: CampaignFileType | null,
  category?: CampaignFileCategory | null,
): Exclude<CampaignFileTypeGroup, "all"> {
  const type = resolveCampaignFileType(filename, mimeType, fileType);

  if (type === "pdf" || type === "docx" || type === "xlsx") {
    return "documents";
  }

  if (type === "png" || type === "jpg") {
    if (category === "artwork" || category === "flyer") {
      return "graphics";
    }
    if (GRAPHIC_NAME_HINTS.test(filename)) {
      return "graphics";
    }
    return "photos";
  }

  return "other";
}

export function inferUploadCategory(
  filename: string,
  mimeType?: string | null,
  context: FileUploadContext = "general",
): CampaignFileCategory {
  const documentCategory = suggestDocumentCategory(filename, mimeType, context);
  return mapDocumentCategoryToLegacyCategory(documentCategory, filename, mimeType);
}

export function fileMatchesTypeGroup(
  file: CampaignFile,
  typeGroup: CampaignFileTypeGroup,
): boolean {
  if (typeGroup === "all") {
    return true;
  }

  return (
    inferTypeGroup(file.name, file.mimeType, file.fileType, file.category) ===
    typeGroup
  );
}

export function filterByTypeGroup<T extends CampaignFile>(
  files: T[],
  typeGroup: CampaignFileTypeGroup,
): T[] {
  if (typeGroup === "all") {
    return files;
  }

  return files.filter((file) => fileMatchesTypeGroup(file, typeGroup));
}
