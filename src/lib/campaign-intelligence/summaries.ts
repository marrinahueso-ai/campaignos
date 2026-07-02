import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import type { CampaignScoreBreakdown } from "@/lib/campaign-intelligence/score";
import type { CampaignNextAction } from "@/lib/campaign-intelligence/types";

export function buildCampaignSummary(
  input: CampaignIntelligenceInput,
  score: CampaignScoreBreakdown,
  nextAction: CampaignNextAction | null,
): string {
  if (input.event.communicationStrategy === "calendar_only") {
    return "This event can stay on the calendar. No campaign needed.";
  }

  if (score.hasPendingApprovals) {
    return "Waiting on approval before scheduling.";
  }

  if (score.overdueItems.length > 0) {
    const first = score.overdueItems[0]!;
    return `${first} needs your attention.`;
  }

  if (score.hasReadyToPublish && score.completionPercent >= 60) {
    return "Some communications are ready when you are.";
  }

  if (score.completionPercent >= 85 && score.needsAttention.length === 0) {
    return "Everything is on schedule.";
  }

  if (score.hasArtwork && score.missingPieces.length > 0) {
    const nextPiece = score.missingPieces[0]!;
    return `Artwork is ready. ${nextPiece} still needs a draft.`;
  }

  if (nextAction?.verb === "Draft" || nextAction?.verb === "Review") {
    return `${nextAction.description} is the next thing to finish.`;
  }

  if (nextAction?.verb === "Upload") {
    return "Upload artwork when you're ready — everything else can follow.";
  }

  if (nextAction?.verb === "Schedule") {
    return `${nextAction.description} is ready to schedule.`;
  }

  if (score.missingPieces.length > 0) {
    return `${score.missingPieces[0]} is the next thing to finish.`;
  }

  if (score.completionPercent >= 65) {
    return "You're making good progress.";
  }

  return "Take it one step at a time — you've got this.";
}
