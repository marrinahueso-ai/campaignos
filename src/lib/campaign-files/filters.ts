import type {
  CampaignFile,
  CampaignFileCategory,
  CampaignFilePlatform,
  CampaignFileRow,
  CampaignFileStatus,
  CampaignFileType,
  FilesFilterState,
  FilesSortDirection,
  FilesSortField,
} from "@/types/campaign-files";
import { detectFileType } from "@/lib/campaign-files/file-type";
import { categoryLabel } from "@/lib/campaign-files/constants";

export const DEFAULT_FILES_SORT_FIELD: FilesSortField = "uploaded";
export const DEFAULT_FILES_SORT_DIRECTION: FilesSortDirection = "desc";

const DESC_DEFAULT_SORT_FIELDS = new Set<FilesSortField>(["uploaded", "size"]);

const VALID_CATEGORIES = new Set<CampaignFileCategory>([
  "flyer",
  "vendor_list",
  "contract",
  "volunteer_form",
  "artwork",
  "caption_copy",
  "approval_notes",
  "other",
]);

const VALID_PLATFORMS = new Set<CampaignFilePlatform>([
  "facebook",
  "instagram",
  "linkedin",
  "website",
  "email",
]);

const VALID_STATUSES = new Set<CampaignFileStatus>([
  "active",
  "pending",
  "archived",
]);

export function mapCampaignFileRow(row: CampaignFileRow): CampaignFile {
  const fileType = (row.file_type as CampaignFileType | null) ?? detectFileType(row.name, row.mime_type);
  const category = VALID_CATEGORIES.has(row.category) ? row.category : "other";
  const status = VALID_STATUSES.has(row.status) ? row.status : "active";
  const platforms = (row.platforms ?? []).filter((value): value is CampaignFilePlatform =>
    VALID_PLATFORMS.has(value as CampaignFilePlatform),
  );

  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    url: row.url,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    fileType,
    category,
    platforms,
    status,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    uploaderName: row.uploader_name,
    updatedAt: row.updated_at,
  };
}

export function createDefaultFilesFilterState(
  eventId?: string,
): FilesFilterState {
  return {
    search: "",
    eventId: eventId ?? "all",
    fileType: "all",
    category: "all",
    platform: "all",
    status: "all",
    uploader: "all",
    dateStart: "",
    dateEnd: "",
  };
}

export function filterCampaignFiles(
  files: CampaignFile[],
  filters: FilesFilterState,
  eventTitles: Map<string, string> = new Map(),
): CampaignFile[] {
  const search = filters.search.trim().toLowerCase();

  return files.filter((file) => {
    if (filters.eventId !== "all" && file.eventId !== filters.eventId) {
      return false;
    }

    if (filters.fileType !== "all" && file.fileType !== filters.fileType) {
      return false;
    }

    if (filters.category !== "all" && file.category !== filters.category) {
      return false;
    }

    if (
      filters.platform !== "all" &&
      !file.platforms.includes(filters.platform)
    ) {
      return false;
    }

    if (filters.status !== "all" && file.status !== filters.status) {
      return false;
    }

    if (
      filters.uploader !== "all" &&
      (file.uploaderName ?? "").toLowerCase() !== filters.uploader.toLowerCase()
    ) {
      return false;
    }

    if (filters.dateStart) {
      const start = new Date(filters.dateStart);
      const uploaded = new Date(file.uploadedAt);
      if (!Number.isNaN(start.getTime()) && uploaded < start) {
        return false;
      }
    }

    if (filters.dateEnd) {
      const end = new Date(filters.dateEnd);
      end.setHours(23, 59, 59, 999);
      const uploaded = new Date(file.uploadedAt);
      if (!Number.isNaN(end.getTime()) && uploaded > end) {
        return false;
      }
    }

    if (search) {
      const eventTitle = (eventTitles.get(file.eventId) ?? "").toLowerCase();
      const matchesName = file.name.toLowerCase().includes(search);
      const matchesEvent = eventTitle.includes(search);
      if (!matchesName && !matchesEvent) {
        return false;
      }
    }

    return true;
  });
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortValueForFile(
  file: CampaignFile,
  field: FilesSortField,
  eventTitles: Map<string, string>,
): string | number | null {
  switch (field) {
    case "name":
      return file.name;
    case "event":
      return eventTitles.get(file.eventId) ?? "";
    case "type":
      return file.fileType;
    case "category":
      return categoryLabel(file.category);
    case "platform":
      return [...file.platforms].sort().join(", ");
    case "uploaded":
      return file.uploadedAt;
    case "size":
      return file.sizeBytes;
    default:
      return null;
  }
}

function compareSortValues(
  left: string | number | null,
  right: string | number | null,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return compareStrings(String(left), String(right));
}

export function sortCampaignFiles(
  files: CampaignFile[],
  field: FilesSortField,
  direction: FilesSortDirection,
  eventTitles: Map<string, string> = new Map(),
): CampaignFile[] {
  const directionFactor = direction === "asc" ? 1 : -1;

  return [...files].sort((left, right) => {
    const primary =
      compareSortValues(
        sortValueForFile(left, field, eventTitles),
        sortValueForFile(right, field, eventTitles),
      ) * directionFactor;

    if (primary !== 0) {
      return primary;
    }

    const uploadedTie =
      compareStrings(left.uploadedAt, right.uploadedAt) * -1;
    if (uploadedTie !== 0) {
      return uploadedTie;
    }

    return compareStrings(left.name, right.name);
  });
}

export function nextFilesSortState(
  currentField: FilesSortField,
  currentDirection: FilesSortDirection,
  nextField: FilesSortField,
): { field: FilesSortField; direction: FilesSortDirection } {
  if (currentField === nextField) {
    return {
      field: currentField,
      direction: currentDirection === "asc" ? "desc" : "asc",
    };
  }

  return {
    field: nextField,
    direction: DESC_DEFAULT_SORT_FIELDS.has(nextField) ? "desc" : "asc",
  };
}

export function paginateFiles<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}
