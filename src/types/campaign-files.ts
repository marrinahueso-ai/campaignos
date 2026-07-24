import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { Event } from "@/types";

export type CampaignFileCategory =
  | "flyer"
  | "vendor_list"
  | "contract"
  | "volunteer_form"
  | "artwork"
  | "caption_copy"
  | "approval_notes"
  | "other";

export type CampaignFilePlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "website"
  | "email";

export type CampaignFileType = "pdf" | "docx" | "xlsx" | "png" | "jpg" | "other";

export type CampaignFileStatus = "active" | "pending" | "archived";

export interface CampaignFileRow {
  id: string;
  event_id: string;
  name: string;
  url: string | null;
  storage_path: string | null;
  uploaded_at: string;
  file_type: string | null;
  category: CampaignFileCategory;
  platforms: CampaignFilePlatform[];
  status: CampaignFileStatus;
  size_bytes: number | null;
  mime_type: string | null;
  uploader_name: string | null;
  updated_at: string;
}

export interface CampaignFile {
  id: string;
  eventId: string;
  name: string;
  url: string | null;
  storagePath: string | null;
  uploadedAt: string;
  fileType: CampaignFileType;
  category: CampaignFileCategory;
  platforms: CampaignFilePlatform[];
  status: CampaignFileStatus;
  sizeBytes: number | null;
  mimeType: string | null;
  uploaderName: string | null;
  updatedAt: string;
}

export interface CampaignFileEventSummary {
  eventId: string;
  title: string;
  date: string;
  artwork: HeroArtworkSelection | null;
  fileCount: number;
}

export interface FilesPageData {
  tablesAvailable: boolean;
  files: CampaignFile[];
  events: CampaignFileEventSummary[];
  eventList: Event[];
  uploaderNames: string[];
  currentUserName: string | null;
}

export type FilesViewMode = "list" | "grid";

export type FilesSortField =
  | "name"
  | "event"
  | "type"
  | "category"
  | "platform"
  | "uploaded"
  | "size";

export type FilesSortDirection = "asc" | "desc";

export interface FilesFilterState {
  search: string;
  eventId: string | "all";
  fileType: CampaignFileType | "all";
  category: CampaignFileCategory | "all";
  platform: CampaignFilePlatform | "all";
  status: CampaignFileStatus | "all";
  uploader: string | "all";
  dateStart: string;
  dateEnd: string;
}
