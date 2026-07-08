import type {
  CampaignFileCategory,
  CampaignFilePlatform,
  CampaignFileStatus,
  CampaignFileType,
} from "@/types/campaign-files";

export const CAMPAIGN_FILES_BUCKET = "campaign-files";

export const CAMPAIGN_FILE_CATEGORIES: {
  value: CampaignFileCategory;
  label: string;
}[] = [
  { value: "flyer", label: "Flyer" },
  { value: "vendor_list", label: "Vendor List" },
  { value: "contract", label: "Contract" },
  { value: "volunteer_form", label: "Volunteer Form" },
  { value: "artwork", label: "Artwork" },
  { value: "caption_copy", label: "Caption Copy" },
  { value: "approval_notes", label: "Approval Notes" },
  { value: "other", label: "Other" },
];

export const CAMPAIGN_FILE_PLATFORMS: {
  value: CampaignFilePlatform;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "website", label: "Website" },
  { value: "email", label: "Email" },
];

export const CAMPAIGN_FILE_STATUSES: {
  value: CampaignFileStatus;
  label: string;
}[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "archived", label: "Archived" },
];

export const CAMPAIGN_FILE_TYPES: {
  value: CampaignFileType;
  label: string;
}[] = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "xlsx", label: "XLSX" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "other", label: "Other" },
];

export const ALLOWED_CAMPAIGN_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const ALLOWED_CAMPAIGN_FILE_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".png",
  ".jpg",
  ".jpeg",
]);

export const MAX_CAMPAIGN_FILE_BYTES = 25 * 1024 * 1024;

export const FILES_PAGE_SIZE = 10;

export const CAMPAIGN_FILES_MIGRATION = "046_campaign_files_enhanced.sql";

export function categoryLabel(category: CampaignFileCategory): string {
  return (
    CAMPAIGN_FILE_CATEGORIES.find((entry) => entry.value === category)?.label ??
    "Other"
  );
}

export function platformLabel(platform: CampaignFilePlatform): string {
  return (
    CAMPAIGN_FILE_PLATFORMS.find((entry) => entry.value === platform)?.label ??
    platform
  );
}

export function fileTypeLabel(fileType: CampaignFileType): string {
  return (
    CAMPAIGN_FILE_TYPES.find((entry) => entry.value === fileType)?.label ??
    fileType.toUpperCase()
  );
}

export function statusLabel(status: CampaignFileStatus): string {
  return (
    CAMPAIGN_FILE_STATUSES.find((entry) => entry.value === status)?.label ??
    status
  );
}
