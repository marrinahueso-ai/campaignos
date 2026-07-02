import {
  getReadinessDisplay,
  scoreCampaign,
} from "@/lib/campaign-intelligence/score";
import { getNextBestAction } from "@/lib/campaign-intelligence/next-action";
import { buildCampaignSummary } from "@/lib/campaign-intelligence/summaries";
import type {
  CampaignIntelligence,
  CampaignIntelligenceInput,
} from "@/lib/campaign-intelligence/types";

export type {
  CampaignActionVerb,
  CampaignIntelligence,
  CampaignIntelligenceInput,
  CampaignNextAction,
  CampaignReadinessLabel,
} from "@/lib/campaign-intelligence/types";

export { getReadinessDisplay, scoreCampaign } from "@/lib/campaign-intelligence/score";
export { getNextBestAction } from "@/lib/campaign-intelligence/next-action";
export { buildCampaignSummary } from "@/lib/campaign-intelligence/summaries";
export {
  getCampaignIntelligenceForEvent,
  getCampaignIntelligenceForEvents,
  fetchCampaignIntelligenceInputsForEvents,
} from "@/lib/campaign-intelligence/queries";

export function calculateCampaignIntelligence(
  input: CampaignIntelligenceInput,
): CampaignIntelligence {
  const score = scoreCampaign(input);
  const nextAction = getNextBestAction(input, score);
  const summary = buildCampaignSummary(input, score, nextAction);

  return {
    eventId: input.event.id,
    communicationStrategy: input.event.communicationStrategy,
    completionPercent: score.completionPercent,
    readinessLabel: score.readinessLabel,
    readinessDisplay: getReadinessDisplay(score.readinessLabel),
    summary,
    nextAction,
    doneItems: score.doneItems,
    needsAttention: score.needsAttention,
    missingPieces: score.missingPieces,
    overdueItems: score.overdueItems,
    waitingItems: score.waitingItems,
    blockedItems: score.blockedItems,
  };
}
