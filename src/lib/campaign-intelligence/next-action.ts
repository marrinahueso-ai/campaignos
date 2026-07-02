import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type { CampaignIntelligenceInput, CampaignNextAction } from "@/lib/campaign-intelligence/types";
import type { CampaignScoreBreakdown } from "@/lib/campaign-intelligence/score";
import type { CommunicationChannel } from "@/types/event-workspace";

function channelLabel(channel: CommunicationChannel): string {
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

function workspaceHref(eventId: string): string {
  return `/events/${eventId}`;
}

export function getNextBestAction(
  input: CampaignIntelligenceInput,
  score: CampaignScoreBreakdown,
): CampaignNextAction | null {
  const { event } = input;
  const href = workspaceHref(event.id);

  if (event.communicationStrategy === "calendar_only" || !shouldAssignPlaybook(event.communicationStrategy)) {
    return {
      verb: "Open",
      description: "Event workspace",
      href,
    };
  }

  const overdueStep = input.steps.find(
    (step) =>
      step.isRequired &&
      step.status === "upcoming" &&
      step.dueDate < input.today,
  );
  if (overdueStep) {
    return {
      verb: "Continue",
      description: overdueStep.title,
      href,
    };
  }

  if (score.hasPendingApprovals) {
    const pendingComm = input.communications.find(
      (item) =>
        item.status === "pending_approval" ||
        input.approvalRequests.some(
          (entry) =>
            entry.communicationItemId === item.id && entry.status === "pending",
        ),
    );
    return {
      verb: "Review",
      description: pendingComm
        ? `${channelLabel(pendingComm.channel)} approval`
        : "Approval request",
      href: "/approvals",
    };
  }

  if (!score.hasArtwork && event.communicationStrategy === "full_campaign") {
    return {
      verb: "Upload",
      description: "Event artwork",
      href: `${href}#artwork`,
    };
  }

  const draftNeeded = input.communications.find(
    (item) => item.status === "draft" || !item.latestContent,
  );
  if (draftNeeded) {
    return {
      verb: "Draft",
      description: channelLabel(draftNeeded.channel),
      href: `${href}#schedule`,
    };
  }

  const generatedNeedsReview = input.communications.find(
    (item) => item.status === "generated" || item.status === "changes_requested",
  );
  if (generatedNeedsReview) {
    return {
      verb: "Review",
      description: channelLabel(generatedNeedsReview.channel),
      href: `${href}#schedule`,
    };
  }

  if (score.hasReadyToPublish) {
    const readyItem = input.communications.find(
      (item) => item.status === "approved" && !item.isPublished,
    );
    return {
      verb: "Schedule",
      description: readyItem
        ? channelLabel(readyItem.channel)
        : "Ready communications",
      href: `${href}#schedule`,
    };
  }

  const nextStep = input.steps
    .filter((step) => step.status === "upcoming")
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0];

  if (nextStep) {
    const verb =
      nextStep.title.toLowerCase().includes("schedule") ||
      nextStep.channel === "instagram" ||
      nextStep.channel === "facebook"
        ? "Schedule"
        : "Continue";
    return {
      verb,
      description: nextStep.title,
      href,
    };
  }

  if (score.completionPercent >= 85) {
    return {
      verb: "Open",
      description: "Nothing needed right now",
      href,
    };
  }

  return {
    verb: "Open",
    description: "Event workspace",
    href,
  };
}
