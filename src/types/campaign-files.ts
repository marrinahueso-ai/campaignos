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

export interface CampaignFileFolderRow {
  id: string;
  event_id: string;
  organization_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignFileFolder {
  id: string;
  eventId: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
}

export interface CampaignFileRow {
  id: string;
  event_id: string;
  folder_id: string | null;
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
  folderId: string | null;
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

export type FilesFolderFilter = "all" | "unfiled" | string;

export interface FilesPageData {
  tablesAvailable: boolean;
  foldersAvailable: boolean;
  /** Event-scoped folders keyed by event id. */
  foldersByEventId: Record<string, CampaignFileFolder[]>;
  files: CampaignFile[];
  events: CampaignFileEventSummary[];
  eventList: Event[];
  uploaderNames: string[];
  currentUserName: string | null;
  /** True when org-wide fetch hit FILES_ORG_FETCH_CAP (newest files kept). */
  listCapped?: boolean;
  listCap?: number;
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
  folderId: FilesFolderFilter;
  eventId: string | "all";
  fileType: CampaignFileType | "all";
  category: CampaignFileCategory | "all";
  platform: CampaignFilePlatform | "all";
  status: CampaignFileStatus | "all";
  uploader: string | "all";
  dateStart: string;
  dateEnd: string;
}
