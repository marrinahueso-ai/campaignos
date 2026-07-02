import type { CampaignIntelligence, CampaignNextAction } from "@/lib/campaign-intelligence/types";
import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import type { StepCommunicationDraft } from "@/types/event-workspace";

export type RecommendationPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "completed";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export interface CampaignHealthBreakdown {
  healthScore: number;
  timelineCompletion: number;
  draftCompletion: number;
  approvalScore: number;
  publishingReadiness: number;
  artworkScore: number;
  communicationCoverage: number;
  eventInformationScore: number;
  aiConfidence: number;
}

export interface CampaignRecommendation {
  id: string;
  priority: RecommendationPriority;
  title: string;
  description?: string;
  href?: string;
}

export interface CampaignRisk {
  id: string;
  label: string;
  severity: RiskSeverity;
}

export interface ScheduleInsight {
  id: string;
  label: string;
  dueDate?: string;
  severity: RiskSeverity;
}

export interface CampaignDirectorQuickAction {
  id: string;
  label: string;
  href: string;
}

export interface CampaignReadinessSummary {
  ready: number;
  total: number;
  label: string;
}

export interface CampaignDirectorReport {
  eventId: string;
  eventTitle: string;
  health: CampaignHealthBreakdown;
  healthScore: number;
  nextAction: CampaignNextAction | null;
  recommendations: CampaignRecommendation[];
  risks: CampaignRisk[];
  upcomingRisks: ScheduleInsight[];
  aiRecommendation: string;
  recentProgress: string[];
  readiness: CampaignReadinessSummary;
  quickActions: CampaignDirectorQuickAction[];
  readinessLabel: string;
  summary: string;
}

export interface CampaignDirectorContext {
  input: CampaignIntelligenceInput;
  intelligence?: CampaignIntelligence;
  stepDrafts?: StepCommunicationDraft[];
  eventDetailsStale?: boolean;
}

export interface CampaignDirectorDashboardSummary {
  campaignHealth: number;
  focusEventId: string | null;
  focusEventTitle: string | null;
  nextRecommendedAction: string;
  nextActionHref: string | null;
  risks: string[];
  readyToPublishLabel: string;
  reports: CampaignDirectorReport[];
}

export interface BuildCampaignDirectorOptions {
  useAi?: boolean;
}
