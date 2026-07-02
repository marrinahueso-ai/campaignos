/** Client-safe exports: types and display helpers only. */
export type {
  BuildCampaignDirectorOptions,
  CampaignDirectorContext,
  CampaignDirectorDashboardSummary,
  CampaignDirectorQuickAction,
  CampaignDirectorReport,
  CampaignHealthBreakdown,
  CampaignRecommendation,
  CampaignRisk,
  RecommendationPriority,
  ScheduleInsight,
} from "@/lib/campaign-director/types";

export { priorityEmoji } from "@/lib/campaign-director/display";
