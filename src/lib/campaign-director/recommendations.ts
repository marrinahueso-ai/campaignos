import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence/types";
import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import type {
  CampaignHealthBreakdown,
  CampaignRecommendation,
  CampaignRisk,
  ScheduleInsight,
} from "@/lib/campaign-director/types";
import type { CommunicationChannel } from "@/types/event-workspace";

function channelLabel(channel: CommunicationChannel): string {
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

function workspaceHref(eventId: string, hash = "timeline"): string {
  return `/events/${eventId}#${hash}`;
}

function severityToPriority(
  severity: CampaignRisk["severity"] | ScheduleInsight["severity"],
): CampaignRecommendation["priority"] {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

export function generateCampaignRecommendations(
  input: CampaignIntelligenceInput,
  intelligence: CampaignIntelligence,
  health: CampaignHealthBreakdown,
  risks: CampaignRisk[],
  scheduleInsights: ScheduleInsight[],
): CampaignRecommendation[] {
  const recommendations: CampaignRecommendation[] = [];
  const eventId = input.event.id;

  if (
    input.event.communicationStrategy === "calendar_only" ||
    !shouldAssignPlaybook(input.event.communicationStrategy)
  ) {
    return [
      {
        id: "calendar-only",
        priority: "completed",
        title: "This event is on the calendar only — no campaign work needed.",
        href: workspaceHref(eventId, "overview"),
      },
    ];
  }

  if (health.healthScore >= 90 && risks.length === 0) {
    recommendations.push({
      id: "campaign-ready",
      priority: "completed",
      title: "Campaign is fully ready for publishing.",
      href: "/publishing",
    });
  }

  for (const risk of risks) {
    recommendations.push({
      id: `rec-${risk.id}`,
      priority: severityToPriority(risk.severity),
      title: risk.label.endsWith(".") ? risk.label : `${risk.label}.`,
      href: risk.id.includes("approval")
        ? workspaceHref(eventId, "approvals")
        : risk.id.includes("artwork")
          ? workspaceHref(eventId, "creative")
          : workspaceHref(eventId, "timeline"),
    });
  }

  for (const insight of scheduleInsights) {
    if (recommendations.some((rec) => rec.title.includes(insight.label))) {
      continue;
    }
    recommendations.push({
      id: `rec-${insight.id}`,
      priority: severityToPriority(insight.severity),
      title: insight.label.endsWith(".") ? insight.label : `${insight.label}.`,
      href: workspaceHref(eventId, "timeline"),
    });
  }

  const nextUndraftedStep = input.steps
    .filter((step) => step.status === "upcoming" && step.isRequired)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .find((step) => {
      const comm = input.communications.find(
        (item) => item.eventCommunicationStepId === step.id,
      );
      return (
        !comm?.latestContent &&
        comm?.status !== "generated" &&
        comm?.status !== "pending_approval" &&
        comm?.status !== "approved"
      );
    });

  if (nextUndraftedStep) {
    const title = `Draft the ${nextUndraftedStep.title} ${channelLabel(nextUndraftedStep.channel)} message.`;
    if (!recommendations.some((rec) => rec.title === title)) {
      recommendations.push({
        id: `rec-draft-${nextUndraftedStep.id}`,
        priority: nextUndraftedStep.dueDate <= input.today ? "critical" : "high",
        title,
        href: workspaceHref(eventId, "timeline"),
      });
    }
  }

  const pendingApproval = input.communications.find(
    (item) => item.status === "pending_approval",
  );
  if (pendingApproval) {
    const title = `${channelLabel(pendingApproval.channel)} draft still needs approval.`;
    if (!recommendations.some((rec) => rec.title === title)) {
      recommendations.push({
        id: `rec-approve-${pendingApproval.id}`,
        priority: "critical",
        title,
        href: workspaceHref(eventId, "approvals"),
      });
    }
  }

  if (
    !input.assets.some((asset) => asset.status === "uploaded") &&
    input.event.communicationStrategy === "full_campaign"
  ) {
    const title = "Creative artwork has not been uploaded.";
    if (!recommendations.some((rec) => rec.title === title)) {
      recommendations.push({
        id: "rec-artwork",
        priority: "medium",
        title,
        href: workspaceHref(eventId, "artwork"),
      });
    }
  }

  const description = input.event.description?.trim() ?? "";
  if (description.length > 0 && description.length < 40) {
    const title = "Event description is very short.";
    if (!recommendations.some((rec) => rec.title === title)) {
      recommendations.push({
        id: "rec-description",
        priority: "medium",
        title,
        href: workspaceHref(eventId, "overview"),
      });
    }
  }

  if (intelligence.nextAction && recommendations.length === 0) {
    recommendations.push({
      id: "rec-next-action",
      priority: health.healthScore >= 75 ? "medium" : "high",
      title: `${intelligence.nextAction.verb} ${intelligence.nextAction.description}.`,
      href: intelligence.nextAction.href,
    });
  }

  const priorityOrder: CampaignRecommendation["priority"][] = [
    "critical",
    "high",
    "medium",
    "low",
    "completed",
  ];

  return recommendations
    .sort(
      (a, b) =>
        priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
    )
    .slice(0, 8);
}
