import {
  isPlaceholderArtworkUrl,
  emptyMilestoneArtwork,
} from "../campaign-builder-v2/platform-utils.ts";
import {
  inferGenerationStatus,
} from "../campaign-builder-v2/milestone-status.ts";
import type {
  CampaignBuilderSession,
  MilestonePreviewContent,
} from "../campaign-builder-v2/types.ts";
import { STALE_CONTENT_NOTE } from "./constants.ts";

export function withStaleContentNote(notes: string | null | undefined): string {
  const current = notes?.trim() ?? "";
  if (current.includes(STALE_CONTENT_NOTE)) {
    return current;
  }
  return current ? `${current}\n${STALE_CONTENT_NOTE}` : STALE_CONTENT_NOTE;
}

export function hasStaleContentNote(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes(STALE_CONTENT_NOTE));
}

/** Human-facing change-request comment with the stale-content marker removed. */
export function changeRequestDisplayComment(
  notes: string | null | undefined,
): string | null {
  if (!notes?.trim()) {
    return null;
  }

  const stripped = notes
    .split("\n")
    .map((line) => line.replaceAll(STALE_CONTENT_NOTE, "").trimEnd())
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim();

  return stripped || null;
}

export function countArtworkUrls(preview: MilestonePreviewContent): number {
  let count = 0;
  if (preview.artwork.feedUrl?.trim() && !isPlaceholderArtworkUrl(preview.artwork.feedUrl)) {
    count += 1;
  }
  if (
    preview.artwork.storyUrl?.trim() &&
    !isPlaceholderArtworkUrl(preview.artwork.storyUrl)
  ) {
    count += 1;
  }
  return count;
}

export function countCaptions(preview: MilestonePreviewContent): number {
  return preview.captions.filter((caption) => caption.text.trim().length > 0)
    .length;
}

/** Clear generated artwork + captions on one preview; preserve settings. */
export function clearMilestonePreviewContent(
  preview: MilestonePreviewContent,
): {
  next: MilestonePreviewContent;
  artworkCleared: number;
  captionsCleared: number;
} {
  const artworkCleared = countArtworkUrls(preview);
  const captionsCleared = countCaptions(preview);

  const nextBase: MilestonePreviewContent = {
    ...preview,
    artwork: emptyMilestoneArtwork(),
    captions: preview.captions.map((caption) => ({
      ...caption,
      text: "",
    })),
    generationStartedAt: null,
    status: "draft",
    generationStatus: "ready_to_generate",
  };

  const next: MilestonePreviewContent = {
    ...nextBase,
    generationStatus: inferGenerationStatus(nextBase, nextBase.enabledFormats),
  };

  return { next, artworkCleared, captionsCleared };
}

export function clearSessionGeneratedContent(
  session: CampaignBuilderSession,
  milestoneIds: string[] | "all",
): {
  next: CampaignBuilderSession;
  artworkCleared: number;
  captionsCleared: number;
  clearedMilestoneIds: string[];
} {
  const targetIds =
    milestoneIds === "all"
      ? session.previewContents.map((preview) => preview.milestoneId)
      : milestoneIds;

  const targetSet = new Set(targetIds);
  let artworkCleared = 0;
  let captionsCleared = 0;
  const clearedMilestoneIds: string[] = [];

  const previewContents = session.previewContents.map((preview) => {
    if (!targetSet.has(preview.milestoneId)) {
      return preview;
    }
    const result = clearMilestonePreviewContent(preview);
    if (result.artworkCleared > 0 || result.captionsCleared > 0) {
      clearedMilestoneIds.push(preview.milestoneId);
    }
    artworkCleared += result.artworkCleared;
    captionsCleared += result.captionsCleared;
    return result.next;
  });

  return {
    next: { ...session, previewContents },
    artworkCleared,
    captionsCleared,
    clearedMilestoneIds,
  };
}

/** Storage/path matcher — milestoneId exact path segment, never name. */
export function isGeneratedPathForMilestone(
  storagePathOrUrl: string | null | undefined,
  eventId: string,
  milestoneId: string,
): boolean {
  if (!storagePathOrUrl?.trim()) {
    return false;
  }
  const needle = `${eventId}/campaign-builder-v2/generated/${milestoneId}/`;
  return storagePathOrUrl.includes(needle);
}

export function isGeneratedPathForEvent(
  storagePathOrUrl: string | null | undefined,
  eventId: string,
): boolean {
  if (!storagePathOrUrl?.trim()) {
    return false;
  }
  const needle = `${eventId}/campaign-builder-v2/generated/`;
  return storagePathOrUrl.includes(needle);
}
