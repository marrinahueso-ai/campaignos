import type { ImageSizePreset } from "@/lib/ai-artwork/types";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";

/** Technical output dimensions only — never added to the image prompt. */
export function resolveArtworkV2ImageSizePreset(
  item: Pick<ArtworkWorkflowItem, "id" | "assetType">,
): ImageSizePreset {
  switch (item.id) {
    case "facebook-feed":
      return "facebook";
    case "facebook-story":
    case "instagram-story":
      return "story";
    case "instagram-feed":
      return "square";
    case "flyer":
      return "story";
    case "website-banner":
      return "website_hero";
    case "newsletter-header":
      return "newsletter_banner";
    default:
      break;
  }

  switch (item.assetType) {
    case "instagram_story":
      return "story";
    case "hero_image":
      return "website_hero";
    case "newsletter_banner":
      return "newsletter_banner";
    case "flyer":
      return "story";
    case "instagram_graphic":
    case "square_graphic":
      return "square";
    default:
      return "facebook";
  }
}
