import type {
  BrandKitItem,
  BrandKitItemRow,
  InspirationAsset,
} from "@/lib/creative-assets/types";
import type {
  EventAssetVersion,
  EventAssetVersionRow,
} from "@/types/event-workspace";

export function mapEventAssetVersionRow(row: EventAssetVersionRow): EventAssetVersion {
  return {
    id: row.id,
    eventAssetId: row.event_asset_id,
    versionNumber: row.version_number,
    filename: row.filename,
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    canvaUrl: row.canva_url,
    createdAt: row.created_at,
  };
}

export function mapBrandKitItemRow(row: BrandKitItemRow): BrandKitItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    category: row.category,
    label: row.label,
    valueText: row.value_text,
    storagePath: row.storage_path,
    filename: row.filename,
    uploadedBy: row.uploaded_by,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function extractCampaignYear(eventDate: string, schoolYear: string | null): string {
  if (schoolYear) return schoolYear;
  const year = eventDate.slice(0, 4);
  return `${year}-${Number(year) + 1}`;
}

export function mapInspirationAsset(input: {
  asset: {
    id: string;
    eventId: string;
    assetType: InspirationAsset["assetType"];
    filename: string | null;
    storagePath: string | null;
    canvaUrl: string | null;
    tags: string[];
    isFavorite: boolean;
    uploadedBy: string | null;
    updatedAt: string;
  };
  eventTitle: string;
  eventDate: string;
  schoolYear: string | null;
}): InspirationAsset {
  return {
    assetId: input.asset.id,
    eventId: input.asset.eventId,
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    campaignYear: extractCampaignYear(input.eventDate, input.schoolYear),
    assetType: input.asset.assetType,
    filename: input.asset.filename,
    storagePath: input.asset.storagePath,
    canvaUrl: input.asset.canvaUrl,
    tags: input.asset.tags,
    isFavorite: input.asset.isFavorite,
    uploadedBy: input.asset.uploadedBy,
    uploadedAt: input.asset.updatedAt,
  };
}
