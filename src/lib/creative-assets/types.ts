import type { EventAssetType } from "@/types/event-workspace";

export type BrandKitCategory =
  | "school_logo"
  | "pto_logo"
  | "color"
  | "font"
  | "canva_template"
  | "brand_voice"
  | "icon"
  | "background"
  | "other";

export type CreateWorkflowId =
  | "ai_artwork"
  | "flyer_builder"
  | "social_graphic"
  | "newsletter_banner"
  | "resize_artwork"
  | "canva_design";

export interface BrandKitItem {
  id: string;
  organizationId: string;
  category: BrandKitCategory;
  label: string;
  valueText: string | null;
  storagePath: string | null;
  filename: string | null;
  uploadedBy: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandKitItemRow {
  id: string;
  organization_id: string;
  category: BrandKitCategory;
  label: string;
  value_text: string | null;
  storage_path: string | null;
  filename: string | null;
  uploaded_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InspirationAsset {
  assetId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  campaignYear: string;
  assetType: EventAssetType;
  filename: string | null;
  storagePath: string | null;
  canvaUrl: string | null;
  tags: string[];
  isFavorite: boolean;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface CreativeStudioData {
  events: { id: string; title: string; date: string }[];
  selectedEventId: string | null;
  campaignAssets: import("@/types/event-workspace").EventAsset[];
  assetVersions: Map<string, import("@/types/event-workspace").EventAssetVersion[]>;
  inspirationAssets: InspirationAsset[];
  brandKitItems: BrandKitItem[];
  brandAssets: import("@/types").BrandAssets | null;
  organizationVoice: string | null;
  userRole: import("@/lib/auth/campaign-roles").CampaignRole;
}

/** Future engine integration hooks — not implemented yet. */
export interface CreativeEngineIntegrationPoint {
  id: string;
  label: string;
  status: "placeholder" | "planned";
}
