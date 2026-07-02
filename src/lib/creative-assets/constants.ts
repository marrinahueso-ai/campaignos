import type { EventAssetType } from "@/types/event-workspace";
import type { BrandKitCategory, CreateWorkflowId } from "@/lib/creative-assets/types";

export const CREATIVE_ASSET_TYPE_LABELS: Record<EventAssetType, string> = {
  hero_image: "Hero Image",
  flyer: "Flyer",
  facebook_graphic: "Facebook Graphic",
  instagram_graphic: "Instagram Graphic",
  instagram_story: "Instagram Story",
  newsletter_banner: "Newsletter Banner",
  email_header: "Email Header",
  pdf: "PDF",
  canva_link: "Canva Link",
  logo_used: "Logo Used",
  miscellaneous: "Miscellaneous",
  square_graphic: "Instagram Graphic",
  logo: "Logo Used",
  document: "PDF",
};

export const UPLOADABLE_ASSET_TYPES: EventAssetType[] = [
  "hero_image",
  "flyer",
  "facebook_graphic",
  "instagram_graphic",
  "instagram_story",
  "newsletter_banner",
  "email_header",
  "pdf",
  "canva_link",
  "logo_used",
  "miscellaneous",
];

export const CREATE_WORKFLOW_ACTIONS: {
  id: CreateWorkflowId;
  label: string;
  description: string;
  placeholder: boolean;
}[] = [
  {
    id: "ai_artwork",
    label: "Generate from prompt",
    description: "Open the Artwork tab to generate AI concepts from your smart prompt",
    placeholder: false,
  },
  {
    id: "flyer_builder",
    label: "Flyer Builder",
    description: "Layout and export a print-ready flyer",
    placeholder: true,
  },
  {
    id: "social_graphic",
    label: "Social Graphic",
    description: "Size artwork for Facebook or Instagram",
    placeholder: true,
  },
  {
    id: "newsletter_banner",
    label: "Newsletter Banner",
    description: "Header image for your next newsletter",
    placeholder: true,
  },
  {
    id: "resize_artwork",
    label: "Resize Artwork",
    description: "Adapt an existing asset to new dimensions",
    placeholder: true,
  },
  {
    id: "canva_design",
    label: "Canva Design",
    description: "Open or attach a Canva template",
    placeholder: true,
  },
];

export const BRAND_KIT_SECTIONS: {
  category: BrandKitCategory;
  label: string;
  description: string;
}[] = [
  { category: "school_logo", label: "School Logos", description: "Official school marks" },
  { category: "pto_logo", label: "PTO Logos", description: "PTO and booster club logos" },
  { category: "color", label: "Approved Colors", description: "Primary and secondary palette" },
  { category: "font", label: "Fonts", description: "Approved typefaces" },
  { category: "canva_template", label: "Canva Templates", description: "Linked Canva designs" },
  { category: "brand_voice", label: "Brand Voice", description: "Tone and writing guidelines" },
  { category: "icon", label: "Approved Icons", description: "Reusable iconography" },
  { category: "background", label: "Approved Backgrounds", description: "Patterns and backgrounds" },
];

/** Reserved for future engines — do not wire yet. */
export const CREATIVE_ENGINE_INTEGRATIONS = [
  { id: "ai-artwork-generator", label: "AI Artwork Generator", status: "planned" as const },
  { id: "canva-api", label: "Canva API", status: "planned" as const },
  { id: "chatgpt-image-edit", label: "ChatGPT Image Editing", status: "planned" as const },
  { id: "dalle", label: "DALL·E", status: "planned" as const },
  { id: "midjourney-upload", label: "Midjourney Upload", status: "planned" as const },
  { id: "adobe-express", label: "Adobe Express", status: "planned" as const },
  { id: "publishing", label: "Publishing", status: "planned" as const },
  { id: "approval-workflow", label: "Approval Workflow", status: "planned" as const },
];

export function getCreativeAssetTypeLabel(assetType: EventAssetType): string {
  return CREATIVE_ASSET_TYPE_LABELS[assetType] ?? assetType.replaceAll("_", " ");
}
