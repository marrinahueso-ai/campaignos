import type { CreativePlanStatus } from "@/lib/creative-director/types";
import type { CommunicationItem, EventAsset } from "@/types/event-workspace";

export function inferPlanStatus(
  asset: EventAsset,
  communications: CommunicationItem[],
): CreativePlanStatus {
  if (asset.planStatus) {
    return asset.planStatus;
  }

  if (asset.status !== "uploaded") {
    return "needed";
  }

  const published = communications.some(
    (item) => item.isPublished && matchesAssetChannel(asset.assetType, item.channel),
  );
  if (published) return "published";

  if (asset.aiGenerated) return "generated";

  return "in_progress";
}

function matchesAssetChannel(
  assetType: string,
  channel: string,
): boolean {
  const map: Record<string, string[]> = {
    hero_image: ["website_announcement"],
    facebook_graphic: ["facebook"],
    instagram_graphic: ["instagram"],
    instagram_story: ["instagram"],
    square_graphic: ["instagram"],
    newsletter_banner: ["newsletter", "email"],
    email_header: ["email", "newsletter"],
    flyer: ["flyer"],
  };
  return map[assetType]?.includes(channel) ?? false;
}

export function planStatusDisplayLabel(status: CreativePlanStatus): string {
  switch (status) {
    case "needed":
      return "Needs Artwork";
    case "in_progress":
      return "In Progress";
    case "generated":
      return "Generating…";
    case "approved":
      return "Approved";
    case "published":
      return "Published";
    default:
      return "Not Started";
  }
}

export function planStatusProgressIcon(status: CreativePlanStatus): "done" | "active" | "pending" {
  if (status === "approved" || status === "published") return "done";
  if (status === "in_progress" || status === "generated") return "active";
  return "pending";
}
