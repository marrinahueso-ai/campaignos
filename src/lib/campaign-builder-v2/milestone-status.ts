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

const STALE_GENERATION_MS = 6 * 60 * 1000;

/**
 * Soft warning before hard stall timeout.
 * Feed + story are generated sequentially (story often uses the feed as reference),
 * so a healthy dual-image run commonly exceeds 2 minutes.
 */
export const GENERATION_STALL_WARNING_MS = 4 * 60 * 1000;

/** Hard stall timeout — matches stale generation recovery. */
export const GENERATION_STALL_TIMEOUT_MS = STALE_GENERATION_MS;

export { STALE_GENERATION_MS };

export const MILESTONE_STATUS_LABELS: Record<MilestoneGenerationStatus, string> = {
  ready_to_generate: "Not started",
  queued: "In progress",
  generating: "In progress",
  generated: "Complete",
  needs_review: "In progress",
  changes_requested: "Changes requested",
  awaiting_approval: "Needs approval",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
};

/**
 * Shared milestone status for timeline rows, preview rail, and edit modal.
 * Always derive from preview content via inferGenerationStatus — never trust
 * the persisted milestone.statusTag field alone (it stays "not-started" until
 * manually edited and does not update when artwork/captions are generated).
 */
export function resolveMilestoneGenerationStatus(
  preview: MilestonePreviewContent | null | undefined,
  fallbackFormats: MilestonePreviewContent["enabledFormats"] = [],
): MilestoneGenerationStatus {
  if (!preview) {
    return "ready_to_generate";
  }
  const formats =
    preview.enabledFormats.length > 0 ? preview.enabledFormats : fallbackFormats;
  return inferGenerationStatus(preview, formats);
}

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

/**
 * Caption platforms required for completeness — derived from enabled formats,
 * not milestone.platforms. Generation must write captions for this set or
 * Preview stays incomplete ("In progress") even when artwork exists.
 */
export function captionPlatformsForFormats(
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): Array<"facebook" | "instagram"> {
  const platforms = new Set<"facebook" | "instagram">();
  for (const format of enabledFormats) {
    if (format.startsWith("facebook")) {
      platforms.add("facebook");
    }
    if (format.startsWith("instagram")) {
      platforms.add("instagram");
    }
  }
  return [...platforms];
}

/** @deprecated Use captionPlatformsForFormats */
function requiredCaptionPlatforms(
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): Array<"facebook" | "instagram"> {
  return captionPlatformsForFormats(enabledFormats);
}

/** True when the milestone has any real artwork or caption (not yet necessarily complete). */
export function milestoneHasPartialContent(
  preview: MilestonePreviewContent,
): boolean {
  if (milestoneHasArtwork(preview)) {
    return true;
  }
  return preview.captions.some((caption) => caption.text.trim().length > 0);
}

/**
 * @deprecated Prefer milestoneHasPartialContent / isMilestoneContentComplete.
 * Kept for callers that mean "any generated content exists".
 */
export function milestoneHasGeneratedContent(
  preview: MilestonePreviewContent,
  _artworkViews: ArtworkView[],
): boolean {
  void _artworkViews;
  return milestoneHasPartialContent(preview);
}

/**
 * Complete only when every enabled artwork view and every required platform
 * caption is present. Partial artwork or captions alone are not complete.
 */
export function isMilestoneContentComplete(
  preview: MilestonePreviewContent,
  enabledFormats: MilestonePreviewContent["enabledFormats"],
): boolean {
  const views = enabledArtworkViews(enabledFormats);
  if (views.length === 0) {
    return false;
  }

  const hasAllArtwork = views.every((view) => {
    const url = preview.artwork[artworkKeyForView(view)];
    return Boolean(url) && !isPlaceholderArtworkUrl(url);
  });
  if (!hasAllArtwork) {
    return false;
  }

  const platforms = requiredCaptionPlatforms(enabledFormats);
  if (platforms.length === 0) {
    return false;
  }

  return platforms.every((platform) =>
    preview.captions.some(
      (caption) => caption.platform === platform && caption.text.trim().length > 0,
    ),
  );
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
  if (isMilestoneContentComplete(preview, enabledFormats)) {
    return "generated";
  }
  if (milestoneHasPartialContent(preview)) {
    return "needs_review";
  }
  return "ready_to_generate";
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
  if (allApproved && preview.status === "ready" && hasContent) {
    return "approved";
  }
  if (pendingApproval && hasContent) {
    return "awaiting_approval";
  }
  if (hasContent) {
    return contentGenerationStatus(preview, enabledFormats);
  }
  if (milestoneHasPartialContent(preview)) {
    return "needs_review";
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
    if (
      status === "ready_to_generate" ||
      status === "needs_review" ||
      status === "failed"
    ) {
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
