import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence/types";
import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import type { CampaignRisk } from "@/lib/campaign-director/types";
import type { CommunicationChannel } from "@/types/event-workspace";

function channelLabel(channel: CommunicationChannel): string {
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

export function analyzeCampaignRisks(
  input: CampaignIntelligenceInput,
  intelligence: CampaignIntelligence,
  options?: { eventDetailsStale?: boolean },
): CampaignRisk[] {
  const risks: CampaignRisk[] = [];

  if (
    input.event.communicationStrategy === "calendar_only" ||
    !shouldAssignPlaybook(input.event.communicationStrategy)
  ) {
    return risks;
  }

  for (const stepTitle of intelligence.overdueItems) {
    risks.push({
      id: `overdue-${stepTitle}`,
      label: `${stepTitle} is past due`,
      severity: "critical",
    });
  }

  for (const waiting of intelligence.waitingItems) {
    risks.push({
      id: `approval-${waiting}`,
      label: waiting.replace(" waiting on approval", " awaiting approval"),
      severity: "high",
    });
  }

  if (!intelligence.doneItems.some((item) => item.includes("uploaded"))) {
    const hasArtwork = input.assets.some(
      (asset) => asset.status === "uploaded" && !!(asset.filename || asset.storagePath),
    );
    if (!hasArtwork && input.event.communicationStrategy === "full_campaign") {
      risks.push({
        id: "missing-artwork",
        label: "No artwork uploaded",
        severity: "medium",
      });
    }
  }

  if (options?.eventDetailsStale) {
    risks.push({
      id: "stale-drafts",
      label: "Drafts may be stale after event edits",
      severity: "high",
    });
  }

  for (const piece of intelligence.missingPieces) {
    if (piece === "Event artwork") continue;
    risks.push({
      id: `missing-${piece}`,
      label: `${piece} still needs a draft or approval`,
      severity: "medium",
    });
  }

  for (const item of input.communications) {
    if (item.status === "changes_requested") {
      risks.push({
        id: `changes-${item.id}`,
        label: `${channelLabel(item.channel)} has changes requested`,
        severity: "high",
      });
    }
  }

  const description = input.event.description?.trim() ?? "";
  if (description.length > 0 && description.length < 40) {
    risks.push({
      id: "short-description",
      label: "Event description is very short",
      severity: "medium",
    });
  }

  if (!input.event.location?.trim()) {
    risks.push({
      id: "missing-location",
      label: "Event location is missing",
      severity: "low",
    });
  }

  const upcomingWithoutDraft = input.steps
    .filter(
      (step) =>
        step.status === "upcoming" &&
        step.isRequired &&
        step.dueDate <= input.today,
    )
    .filter((step) => {
      const comm = input.communications.find(
        (item) => item.eventCommunicationStepId === step.id,
      );
      return !comm?.latestContent && comm?.status !== "generated";
    });

  for (const step of upcomingWithoutDraft) {
    if (!intelligence.overdueItems.includes(step.title)) {
      risks.push({
        id: `nodraft-${step.id}`,
        label: `Draft the ${step.title} ${channelLabel(step.channel)} message`,
        severity: "critical",
      });
    }
  }

  return risks;
}
