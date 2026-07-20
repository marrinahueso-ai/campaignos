/**
 * Merge successful Create with AI generation into the stored builder session.
 * Kept pure so server actions can persist results even if the browser navigates
 * away (Safari/Next often abort the client fetch while the action still finishes).
 */

import { mergeInspirationAfterGeneration } from "@/lib/campaign-builder-v2/inspiration-preserve";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderSession,
  MilestoneGenerationStatus,
  MilestoneArtwork,
  MilestonePreviewContent,
  PlatformCaption,
} from "@/lib/campaign-builder-v2/types";

export type GenerationSessionResult = {
  milestoneId: string;
  artwork: MilestoneArtwork;
  captions: PlatformCaption[];
  status: MilestonePreviewContent["status"];
  generationStatus: MilestoneGenerationStatus;
};

export function applyGenerationResultsToSession(
  session: CampaignBuilderSession,
  results: GenerationSessionResult[],
  updatedInspiration?: CampaignBuilderInspiration | null,
): CampaignBuilderSession {
  if (results.length === 0) {
    return session;
  }

  const byMilestoneId = new Map(
    results.map((result) => [result.milestoneId, result]),
  );

  return {
    ...session,
    inspiration: mergeInspirationAfterGeneration(
      session.inspiration,
      updatedInspiration,
    ),
    previewContents: session.previewContents.map((content) => {
      const generated = byMilestoneId.get(content.milestoneId);
      if (!generated) {
        return content;
      }
      return {
        ...content,
        artwork: generated.artwork,
        captions: generated.captions,
        status: generated.status,
        generationStatus: generated.generationStatus,
        generationStartedAt: null,
      };
    }),
  };
}
