import {
  artworkKeyForView,
  enabledArtworkViews,
  isPlaceholderArtworkUrl,
} from "./platform-utils.ts";
import type {
  ArtworkView,
  CampaignBuilderMilestone,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
} from "./types.ts";

const STALE_GENERATION_MS = 5 * 60 * 1000;

export const MILESTONE_STATUS_LABELS: Record<MilestoneGenerationStatus, string> = {
  ready_to_generate: "Ready to generate",
  queued: "Queued",
  generating: "Generating",
  generated: "Generated",
  needs_review: "Needs review",
  changes_requested: "Changes requested",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

export function sortedMilestones(
  milestones: CampaignBuilderMilestone[],
): CampaignBuilderMilestone[] {
  return [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function milestoneHasGeneratedContent(
  preview: MilestonePreviewContent,
  artworkViews: ArtworkView[],
): boolean {
  const hasArtwork = artworkViews.some((view) => {
    const url = preview.artwork[artworkKeyForView(view)];
    return Boolean(url) && !isPlaceholderArtworkUrl(url);
  });
  const hasCaptions = preview.captions.some((caption) => caption.text.trim());
  return hasArtwork || hasCaptions;
}

export function isMilestoneContentComplete(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): boolean {
  const views = enabledArtworkViews(enabledFormats);
  return milestoneHasGeneratedContent(preview, views);
}

export function inferGenerationStatus(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): MilestoneGenerationStatus {
  if (preview.generationStatus && preview.generationStatus !== "ready_to_generate") {
    if (preview.generationStatus === "generating") {
      if (isStaleGeneration(preview.generationStartedAt)) {
        return isMilestoneContentComplete(preview, enabledFormats)
          ? preview.status === "ready"
            ? "generated"
            : "needs_review"
          : "failed";
      }
      return "generating";
    }
    return preview.generationStatus;
  }

  const pendingApproval = preview.approvalStatuses.some(
    (entry) => entry.status === "pending",
  );
  const allApproved = preview.approvalStatuses.every(
    (entry) => entry.status === "approved",
  );

  if (preview.deliveryMethod === "schedule" && allApproved) {
    return "scheduled";
  }
  if (allApproved && preview.status === "ready") {
    return "approved";
  }
  if (pendingApproval) {
    return "awaiting_approval";
  }
  if (preview.status === "ready") {
    return "generated";
  }
  if (preview.status === "needs-review") {
    return "needs_review";
  }
  if (isMilestoneContentComplete(preview, enabledFormats)) {
    return "needs_review";
  }
  return "ready_to_generate";
}

export function isStaleGeneration(startedAt: string | null | undefined): boolean {
  if (!startedAt) {
    return true;
  }
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) {
    return true;
  }
  return Date.now() - started > STALE_GENERATION_MS;
}

export function countCompleteMilestones(
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
): { complete: number; total: number } {
  const previewById = new Map(
    previewContents.map((content) => [content.milestoneId, content]),
  );
  let complete = 0;

  for (const milestone of sortedMilestones(milestones)) {
    const preview = previewById.get(milestone.id);
    if (!preview) {
      continue;
    }
    const status = inferGenerationStatus(preview, preview.enabledFormats);
    if (
      status === "generated" ||
      status === "needs_review" ||
      status === "awaiting_approval" ||
      status === "approved" ||
      status === "scheduled" ||
      status === "published"
    ) {
      complete += 1;
    }
  }

  return { complete, total: milestones.length };
}

export function findNextMilestoneToGenerate(
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
): CampaignBuilderMilestone | null {
  const previewById = new Map(
    previewContents.map((content) => [content.milestoneId, content]),
  );

  for (const milestone of sortedMilestones(milestones)) {
    const preview = previewById.get(milestone.id);
    if (!preview) {
      return milestone;
    }
    const status = inferGenerationStatus(preview, preview.enabledFormats);
    if (status === "ready_to_generate" || status === "failed") {
      return milestone;
    }
  }

  return null;
}

export function findMilestoneAfter(
  milestones: CampaignBuilderMilestone[],
  milestoneId: string,
): CampaignBuilderMilestone | null {
  const ordered = sortedMilestones(milestones);
  const index = ordered.findIndex((milestone) => milestone.id === milestoneId);
  if (index < 0 || index >= ordered.length - 1) {
    return null;
  }
  return ordered[index + 1] ?? null;
}

export function allMilestonesGenerated(
  milestones: CampaignBuilderMilestone[],
  previewContents: MilestonePreviewContent[],
): boolean {
  return findNextMilestoneToGenerate(milestones, previewContents) === null;
}

export function generationStatusAfterContent(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): MilestoneGenerationStatus {
  return isMilestoneContentComplete(preview, enabledFormats)
    ? "needs_review"
    : "ready_to_generate";
}
