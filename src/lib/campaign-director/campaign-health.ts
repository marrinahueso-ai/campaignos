import { scoreCampaign } from "@/lib/campaign-intelligence/score";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import type { CampaignHealthBreakdown } from "@/lib/campaign-director/types";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function scoreTimelineCompletion(input: CampaignIntelligenceInput): number {
  const required = input.steps.filter((step) => step.isRequired);
  if (required.length === 0) return 100;

  const completed = required.filter((step) => step.status === "completed").length;
  const overdue = required.filter(
    (step) => step.status === "upcoming" && step.dueDate < input.today,
  ).length;

  const base = (completed / required.length) * 100;
  const penalty = overdue * 12;
  return clampPercent(base - penalty);
}

function scoreDraftCompletion(input: CampaignIntelligenceInput): number {
  const playbookSteps = input.steps.filter((step) => step.isRequired);
  if (playbookSteps.length === 0) {
    const withDraft = input.communications.filter(
      (item) =>
        item.latestContent ||
        item.status === "generated" ||
        item.status === "pending_approval" ||
        item.status === "approved" ||
        item.status === "published",
    );
    const total = Math.max(input.communications.length, 1);
    return clampPercent((withDraft.length / total) * 100);
  }

  const stepIds = new Set(playbookSteps.map((step) => step.id));
  const linked = input.communications.filter(
    (item) =>
      item.eventCommunicationStepId && stepIds.has(item.eventCommunicationStepId),
  );

  const drafted = linked.filter(
    (item) =>
      item.latestContent ||
      item.status === "generated" ||
      item.status === "pending_approval" ||
      item.status === "approved" ||
      item.status === "published" ||
      item.status === "changes_requested",
  );

  const total = Math.max(linked.length, playbookSteps.length);
  return clampPercent((drafted.length / total) * 100);
}

function scoreApprovalHealth(input: CampaignIntelligenceInput): number {
  const pending = input.communications.filter(
    (item) => item.status === "pending_approval",
  ).length;
  const changesRequested = input.communications.filter(
    (item) => item.status === "changes_requested",
  ).length;
  const approved = input.communications.filter(
    (item) => item.status === "approved" || item.status === "published",
  ).length;
  const total = Math.max(input.communications.length, 1);

  const approvedRatio = (approved / total) * 100;
  const pendingPenalty = pending * 15;
  const changesPenalty = changesRequested * 8;

  return clampPercent(approvedRatio - pendingPenalty - changesPenalty);
}

function scorePublishingReadiness(input: CampaignIntelligenceInput): number {
  const score = scoreCampaign(input);
  if (score.hasReadyToPublish) return 90;
  const published = input.communications.filter((item) => item.isPublished).length;
  const approved = input.communications.filter(
    (item) => item.status === "approved" && !item.isPublished,
  ).length;
  const total = Math.max(input.communications.length, 1);
  return clampPercent(((published + approved * 0.75) / total) * 100);
}

function scoreArtwork(input: CampaignIntelligenceInput): number {
  const score = scoreCampaign(input);
  if (input.event.communicationStrategy === "reminder_only") {
    return score.hasArtwork ? 100 : 60;
  }
  return score.hasArtwork ? 100 : 0;
}

function scoreCommunicationCoverage(input: CampaignIntelligenceInput): number {
  const score = scoreCampaign(input);
  const missing = score.missingPieces.length;
  if (missing === 0) return 100;
  return clampPercent(100 - missing * 18);
}

function scoreEventInformation(input: CampaignIntelligenceInput): number {
  const { event } = input;
  let points = 0;
  const total = 5;

  if (event.title?.trim()) points += 1;
  if (event.date) points += 1;
  if (event.description?.trim() && event.description.trim().length >= 40) points += 1;
  else if (event.description?.trim()) points += 0.4;
  if (event.location?.trim()) points += 1;
  if (event.audience?.trim()) points += 1;

  return clampPercent((points / total) * 100);
}

function scoreAiConfidence(
  input: CampaignIntelligenceInput,
  options?: { eventDetailsStale?: boolean },
): number {
  let confidence = 70;

  if (input.steps.length > 0) confidence += 8;
  if (input.communications.some((item) => item.latestContent)) confidence += 8;
  if (input.assets.some((asset) => asset.status === "uploaded")) confidence += 5;
  if (input.event.description?.trim()) confidence += 5;
  if (options?.eventDetailsStale) confidence -= 15;

  return clampPercent(confidence);
}

export function calculateCampaignHealth(
  input: CampaignIntelligenceInput,
  options?: { eventDetailsStale?: boolean },
): CampaignHealthBreakdown {
  if (
    input.event.communicationStrategy === "calendar_only" ||
    !shouldAssignPlaybook(input.event.communicationStrategy)
  ) {
    return {
      healthScore: 100,
      timelineCompletion: 100,
      draftCompletion: 100,
      approvalScore: 100,
      publishingReadiness: 100,
      artworkScore: 100,
      communicationCoverage: 100,
      eventInformationScore: scoreEventInformation(input),
      aiConfidence: scoreAiConfidence(input, options),
    };
  }

  const timelineCompletion = scoreTimelineCompletion(input);
  const draftCompletion = scoreDraftCompletion(input);
  const approvalScore = scoreApprovalHealth(input);
  const publishingReadiness = scorePublishingReadiness(input);
  const artworkScore = scoreArtwork(input);
  const communicationCoverage = scoreCommunicationCoverage(input);
  const eventInformationScore = scoreEventInformation(input);
  const aiConfidence = scoreAiConfidence(input, options);

  let healthScore = clampPercent(
    timelineCompletion * 0.18 +
      draftCompletion * 0.2 +
      approvalScore * 0.15 +
      publishingReadiness * 0.12 +
      artworkScore * 0.1 +
      communicationCoverage * 0.12 +
      eventInformationScore * 0.05 +
      aiConfidence * 0.08,
  );

  const score = scoreCampaign(input);
  if (score.overdueItems.length > 0) {
    healthScore = clampPercent(healthScore - score.overdueItems.length * 8);
  }
  if (options?.eventDetailsStale) {
    healthScore = clampPercent(healthScore - 10);
  }
  if (score.hasPendingApprovals) {
    healthScore = clampPercent(healthScore - 5);
  }

  return {
    healthScore,
    timelineCompletion,
    draftCompletion,
    approvalScore,
    publishingReadiness,
    artworkScore,
    communicationCoverage,
    eventInformationScore,
    aiConfidence,
  };
}
