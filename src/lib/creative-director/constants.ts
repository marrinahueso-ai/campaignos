import type { AssetPlanSpec, CreativePlanStatus, CreativeStudioTabId } from "@/lib/creative-director/types";

export const CREATIVE_STUDIO_TABS: {
  id: CreativeStudioTabId;
  label: string;
  description: string;
}[] = [
  { id: "overview", label: "Overview", description: "Creative progress at a glance" },
  { id: "brief", label: "Creative Brief", description: "Campaign visual direction" },
  { id: "planner", label: "Asset Planner", description: "Every asset this campaign needs" },
  { id: "artwork", label: "Artwork", description: "Upload and manage files" },
  { id: "inspiration", label: "Inspiration", description: "Past campaign artwork" },
  { id: "brand-kit", label: "Brand Kit", description: "Organization brand assets" },
  { id: "history", label: "History", description: "Version history" },
];

export const PLAN_STATUS_LABELS: Record<CreativePlanStatus, string> = {
  needed: "Needs Artwork",
  in_progress: "In Progress",
  generated: "Generated",
  approved: "Approved",
  published: "Published",
};

export const PLAN_STATUS_ORDER: CreativePlanStatus[] = [
  "needed",
  "in_progress",
  "generated",
  "approved",
  "published",
];

/** Core social artwork — default for active campaigns. */
export const CORE_SOCIAL_ASSET_SPECS: AssetPlanSpec[] = [
  {
    assetType: "facebook_graphic",
    label: "Facebook Graphic",
    channels: ["facebook"],
  },
  {
    assetType: "facebook_graphic",
    label: "Facebook Story",
    channels: ["facebook"],
  },
  {
    assetType: "instagram_graphic",
    label: "Instagram Square",
    channels: ["instagram"],
  },
  {
    assetType: "instagram_story",
    label: "Story Graphic",
    channels: ["instagram"],
  },
];

/** Extended artwork — optional; included when event type or existing assets warrant it. */
export const EXTENDED_ASSET_PLAN_SPECS: AssetPlanSpec[] = [
  {
    assetType: "flyer",
    label: "Flyer",
    channels: ["flyer"],
    optional: true,
  },
  {
    assetType: "hero_image",
    label: "Website Banner",
    channels: ["website_announcement"],
    optional: true,
  },
  {
    assetType: "newsletter_banner",
    label: "Newsletter Banner",
    channels: ["newsletter", "email"],
    optional: true,
  },
];

/** @deprecated Prefer CORE_SOCIAL_ASSET_SPECS — kept for imports that expect the old name. */
export const CORE_ASSET_PLAN_SPECS: AssetPlanSpec[] = [
  ...CORE_SOCIAL_ASSET_SPECS,
  ...EXTENDED_ASSET_PLAN_SPECS,
];

/** Optional print / volunteer assets — included when volunteer comms exist. */
export const OPTIONAL_ASSET_PLAN_SPECS: AssetPlanSpec[] = [
  {
    assetType: "miscellaneous",
    label: "Volunteer Sign",
    channels: ["volunteer_signup"],
    optional: true,
  },
  {
    assetType: "pdf",
    label: "Yard Sign",
    channels: [],
    optional: true,
  },
  {
    assetType: "miscellaneous",
    label: "Sponsor Thank You Graphic",
    channels: [],
    optional: true,
  },
];

export const INSPIRATION_STYLE_TAGS = [
  "clean",
  "minimal",
  "bright",
  "illustrated",
  "playful",
  "professional",
  "bold",
  "warm",
  "photo",
  "typography-forward",
] as const;
