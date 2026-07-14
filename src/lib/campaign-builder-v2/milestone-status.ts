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
  MilestonePreviewStatus,
} from "./types.ts";

const STALE_GENERATION_MS = 5 * 60 * 1000;

/** Soft warning before hard stall timeout (Create with AI generation). */
export const GENERATION_STALL_WARNING_MS = 2 * 60 * 1000;

/** Hard stall timeout — matches stale generation recovery. */
export const GENERATION_STALL_TIMEOUT_MS = STALE_GENERATION_MS;

export { STALE_GENERATION_MS };

export const MILESTONE_STATUS_LABELS: Record<MilestoneGenerationStatus, string> = {
  ready_to_generate: "Ready to generate",
  queued: "Queued",
  generating: "Generating",
  generated: "Complete",
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

export function milestoneHasArtwork(preview: MilestonePreviewContent): boolean {
  const { feedUrl, storyUrl } = preview.artwork;
  return (
    (Boolean(feedUrl) && !isPlaceholderArtworkUrl(feedUrl)) ||
    (Boolean(storyUrl) && !isPlaceholderArtworkUrl(storyUrl))
  );
}

export function milestoneHasGeneratedContent(
  preview: MilestonePreviewContent,
  artworkViews: ArtworkView[],
): boolean {
  const hasEnabledArtwork = artworkViews.some((view) => {
    const url = preview.artwork[artworkKeyForView(view)];
    return Boolean(url) && !isPlaceholderArtworkUrl(url);
  });
  const hasCaptions = preview.captions.some((caption) => caption.text.trim());
  return milestoneHasArtwork(preview) || hasEnabledArtwork || hasCaptions;
}

export function isMilestoneContentComplete(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): boolean {
  const views = enabledArtworkViews(enabledFormats);
  return milestoneHasGeneratedContent(preview, views);
}

const PRESERVED_GENERATION_STATUSES = new Set<MilestoneGenerationStatus>([
  "queued",
  "changes_requested",
  "awaiting_approval",
  "approved",
  "scheduled",
  "published",
]);

function contentGenerationStatus(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): MilestoneGenerationStatus {
  if (!isMilestoneContentComplete(preview, enabledFormats)) {
    return "ready_to_generate";
  }
  if (milestoneHasArtwork(preview)) {
    return "generated";
  }
  return "needs_review";
}

export function inferGenerationStatus(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): MilestoneGenerationStatus {
  const hasContent = isMilestoneContentComplete(preview, enabledFormats);

  if (preview.generationStatus === "generating") {
    if (isStaleGeneration(preview.generationStartedAt)) {
      return hasContent ? contentGenerationStatus(preview, enabledFormats) : "failed";
    }
    return "generating";
  }

  if (
    preview.generationStatus &&
    PRESERVED_GENERATION_STATUSES.has(preview.generationStatus)
  ) {
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
  if (pendingApproval && hasContent) {
    return "awaiting_approval";
  }
  if (preview.status === "ready" && hasContent) {
    return "generated";
  }
  if (preview.status === "needs-review" && hasContent) {
    return milestoneHasArtwork(preview) ? "generated" : "needs_review";
  }
  if (hasContent) {
    return contentGenerationStatus(preview, enabledFormats);
  }
  if (preview.generationStatus === "failed") {
    return "failed";
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
  return contentGenerationStatus(preview, enabledFormats);
}

/**
 * Single source of truth for the "ready / needs-review / draft" tri-state used
 * across the top stepper, health gauge, Review & Approve, and per-milestone
 * badges. Derives the state directly from actual generated content instead of
 * trusting the persisted `preview.status` field, which handlers like the
 * artwork/caption edit modals can set to "needs-review" even after complete
 * content exists — that mismatch is what caused the rail/progress-count/banner
 * to disagree with the top banner and Review & Approve readiness.
 */
export function derivedPreviewStatus(
  preview: MilestonePreviewContent,
): MilestonePreviewStatus {
  const contentStatus = generationStatusAfterContent(preview, preview.enabledFormats);
  if (contentStatus === "generated") {
    return "ready";
  }
  if (contentStatus === "needs_review") {
    return "needs-review";
  }
  return "draft";
}
