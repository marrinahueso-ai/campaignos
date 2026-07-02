import "server-only";

import { calculateCampaignIntelligence } from "@/lib/campaign-intelligence";
import { calculateCampaignHealth } from "@/lib/campaign-director/campaign-health";
import { resolveCampaignAdvisorMessage } from "@/lib/campaign-director/ai-advisor";
import { buildCampaignDirectorDashboard } from "@/lib/campaign-director/dashboard";
import { generateCampaignRecommendations } from "@/lib/campaign-director/recommendations";
import { analyzeCampaignRisks } from "@/lib/campaign-director/risk-analysis";
import { analyzeCampaignSchedule } from "@/lib/campaign-director/schedule-analysis";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type {
  BuildCampaignDirectorOptions,
  CampaignDirectorContext,
  CampaignDirectorQuickAction,
  CampaignDirectorReport,
  CampaignReadinessSummary,
} from "@/lib/campaign-director/types";
import type { CommunicationChannel } from "@/types/event-workspace";

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

export { calculateCampaignHealth } from "@/lib/campaign-director/campaign-health";
export { buildCampaignDirectorDashboard } from "@/lib/campaign-director/dashboard";
export { generateCampaignRecommendations } from "@/lib/campaign-director/recommendations";
export { buildDeterministicAdvisorMessage } from "@/lib/campaign-director/ai-advisor";

function channelLabel(channel: CommunicationChannel): string {
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

function buildReadinessSummary(
  context: CampaignDirectorContext,
): CampaignReadinessSummary {
  const { input } = context;
  const comms = input.communications.filter((item) => item.latestContent || item.status !== "draft");

  if (comms.length === 0 && input.steps.length > 0) {
    const total = input.steps.filter((step) => step.isRequired).length;
    return {
      ready: 0,
      total: Math.max(total, 1),
      label: `0 of ${Math.max(total, 1)} communications`,
    };
  }

  const total = Math.max(
    comms.length,
    input.steps.filter((step) => step.isRequired).length,
    1,
  );
  const ready = comms.filter(
    (item) => item.status === "approved" || item.status === "published",
  ).length;

  return {
    ready,
    total,
    label: `${ready} of ${total} communications`,
  };
}

function buildQuickActions(
  context: CampaignDirectorContext,
  report: CampaignDirectorReport,
): CampaignDirectorQuickAction[] {
  const eventId = context.input.event.id;
  const base = `/events/${eventId}`;

  const actions: CampaignDirectorQuickAction[] = [
    {
      id: "draft-next",
      label: "Draft next communication",
      href: `${base}#schedule`,
    },
    {
      id: "review-approvals",
      label: "Review draft approvals",
      href: "/approvals",
    },
    {
      id: "artwork",
      label: "Artwork",
      href: `${base}#artwork`,
    },
    {
      id: "publish",
      label: "Review & publish",
      href: `${base}#publish`,
    },
  ];

  if (report.nextAction?.href) {
    actions.unshift({
      id: "next-action",
      label: `${report.nextAction.verb} ${report.nextAction.description}`,
      href: report.nextAction.href,
    });
  }

  return actions.slice(0, 5);
}

function buildRecentProgress(context: CampaignDirectorContext): string[] {
  const { input, intelligence } = context;
  const resolved = intelligence ?? calculateCampaignIntelligence(input);

  const progress = [...resolved.doneItems];

  for (const step of input.steps) {
    if (step.status === "completed") {
      progress.push(`${step.title} marked complete`);
    }
  }

  for (const item of input.communications) {
    if (item.status === "approved") {
      progress.push(`${channelLabel(item.channel)} approved`);
    }
    if (item.isPublished || item.status === "published") {
      progress.push(`${channelLabel(item.channel)} published`);
    }
  }

  return [...new Set(progress)].slice(0, 6);
}

export async function buildCampaignDirectorReport(
  context: CampaignDirectorContext,
  options: BuildCampaignDirectorOptions = {},
): Promise<CampaignDirectorReport> {
  const intelligence =
    context.intelligence ?? calculateCampaignIntelligence(context.input);

  const health = calculateCampaignHealth(context.input, {
    eventDetailsStale: context.eventDetailsStale,
  });

  const risks = analyzeCampaignRisks(context.input, intelligence, {
    eventDetailsStale: context.eventDetailsStale,
  });

  const upcomingRisks = analyzeCampaignSchedule(context.input);

  const recommendations = generateCampaignRecommendations(
    context.input,
    intelligence,
    health,
    risks,
    upcomingRisks,
  );

  const readiness = buildReadinessSummary(context);
  const recentProgress = buildRecentProgress(context);

  const baseReport: CampaignDirectorReport = {
    eventId: context.input.event.id,
    eventTitle: context.input.event.title,
    health,
    healthScore: health.healthScore,
    nextAction: intelligence.nextAction,
    recommendations,
    risks,
    upcomingRisks,
    aiRecommendation: "",
    recentProgress,
    readiness,
    quickActions: [],
    readinessLabel: intelligence.readinessDisplay,
    summary: intelligence.summary,
  };

  baseReport.quickActions = buildQuickActions(context, baseReport);
  baseReport.aiRecommendation = await resolveCampaignAdvisorMessage(
    baseReport,
    context,
    options.useAi ?? false,
  );

  if (
    shouldAssignPlaybook(context.input.event.communicationStrategy) &&
    baseReport.healthScore >= 92 &&
    baseReport.risks.length === 0 &&
    !baseReport.recommendations.some((rec) => rec.priority === "completed")
  ) {
    baseReport.recommendations.unshift({
      id: "ready-green",
      priority: "completed",
      title: "Campaign is fully ready for publishing.",
      href: "/publishing",
    });
  }

  return baseReport;
}

export async function buildCampaignDirectorReports(
  contexts: CampaignDirectorContext[],
  options: BuildCampaignDirectorOptions = {},
): Promise<CampaignDirectorReport[]> {
  return Promise.all(
    contexts.map((context) => buildCampaignDirectorReport(context, options)),
  );
}

export async function buildCampaignDirectorDashboardFromContexts(
  contexts: CampaignDirectorContext[],
  options: BuildCampaignDirectorOptions = {},
) {
  const reports = await buildCampaignDirectorReports(contexts, options);
  return buildCampaignDirectorDashboard(reports);
}
