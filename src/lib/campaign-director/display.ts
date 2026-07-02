import type { CampaignRecommendation } from "@/lib/campaign-director/types";

export function priorityEmoji(priority: CampaignRecommendation["priority"]): string {
  switch (priority) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    case "low":
      return "🔵";
    case "completed":
      return "🟢";
    default:
      return "•";
  }
}
