import { playbookRelativeDay } from "./campaign-timing.ts";
import { isPlaceholderArtworkUrl, normalizeMilestoneArtwork } from "./platform-utils.ts";
import type {
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestoneArtwork,
  MilestoneArtworkMode,
  MilestonePreviewContent,
} from "./types.ts";

/** @deprecated Prefer filling every empty plan post — kept for callers/tests. */
export const MAIN_EVENT_IMAGE_RELATIVE_DAYS = [-14, -7, -1, 0] as const;

function artworkUrlsEqual(left: MilestoneArtwork, right: MilestoneArtwork): boolean {
  return (
    (left.feedUrl?.trim() || null) === (right.feedUrl?.trim() || null) &&
    (left.storyUrl?.trim() || null) === (right.storyUrl?.trim() || null)
  );
}

export function isReusableArtwork(
  artwork: MilestoneArtwork | null | undefined,
): boolean {
  if (!artwork) return false;
  const feed = artwork.feedUrl?.trim() || null;
  const story = artwork.storyUrl?.trim() || null;
  return (
    (Boolean(feed) && !isPlaceholderArtworkUrl(feed)) ||
    (Boolean(story) && !isPlaceholderArtworkUrl(story))
  );
}

export function cloneArtwork(artwork: MilestoneArtwork): MilestoneArtwork {
  return normalizeMilestoneArtwork({
    feedUrl: artwork.feedUrl,
    storyUrl: artwork.storyUrl,
  });
}

export function milestoneRelativeDayForPreview(
  eventDate: string,
  milestone: CampaignBuilderMilestone,
  preview: MilestonePreviewContent | undefined,
): number {
  const date =
    preview?.scheduleDate?.trim() ||
    milestone.suggestedDate?.trim() ||
    eventDate;
  return playbookRelativeDay(eventDate, date);
}

export function isMainEventImageTargetDay(relativeDay: number): boolean {
  return (MAIN_EVENT_IMAGE_RELATIVE_DAYS as readonly number[]).includes(
    relativeDay,
  );
}

export function usesMainEventImage(
  preview: MilestonePreviewContent | null | undefined,
  mainEventImage: MilestoneArtwork | null | undefined,
): boolean {
  if (!preview || preview.artworkMode === "custom") {
    return false;
  }
  if (preview.artworkMode === "shared") {
    return true;
  }
  if (!isReusableArtwork(mainEventImage) || !isReusableArtwork(preview.artwork)) {
    return false;
  }
  return artworkUrlsEqual(preview.artwork, mainEventImage!);
}

export type ApplyMainEventImageResult = {
  session: CampaignBuilderSession;
  changedMilestoneIds: string[];
};

function patchPreviewArtwork(
  preview: MilestonePreviewContent,
  artwork: MilestoneArtwork,
  mode: MilestoneArtworkMode,
  changedMilestoneIds: string[],
): MilestonePreviewContent {
  const next: MilestonePreviewContent = {
    ...preview,
    artwork: cloneArtwork(artwork),
    artworkMode: mode,
  };
  if (
    !artworkUrlsEqual(preview.artwork, next.artwork) ||
    preview.artworkMode !== mode
  ) {
    changedMilestoneIds.push(preview.milestoneId);
  }
  return next;
}

/**
 * Copy main artwork onto every empty or already-shared post.
 * Custom overrides (Change image) are left alone. Captions never change.
 */
export function seedMainEventImageAcrossPlan(
  session: CampaignBuilderSession,
  artwork: MilestoneArtwork,
): ApplyMainEventImageResult {
  const normalized = cloneArtwork(artwork);
  if (!isReusableArtwork(normalized)) {
    return { session, changedMilestoneIds: [] };
  }

  const changedMilestoneIds: string[] = [];
  const previewContents = session.previewContents.map((preview) => {
    if (
      preview.artworkMode === "custom" &&
      isReusableArtwork(preview.artwork)
    ) {
      return preview;
    }
    if (
      preview.artworkMode === "shared" ||
      !isReusableArtwork(preview.artwork)
    ) {
      return patchPreviewArtwork(
        preview,
        normalized,
        "shared",
        changedMilestoneIds,
      );
    }
    return preview;
  });

  return {
    session: {
      ...session,
      mainEventImage: cloneArtwork(normalized),
      previewContents,
    },
    changedMilestoneIds: [...new Set(changedMilestoneIds)],
  };
}

/**
 * Set / refresh main event image and auto-copy onto empty + shared posts.
 * Captions are never modified.
 */
export function applyArtworkWithMainEventReuse(
  session: CampaignBuilderSession,
  sourceMilestoneId: string,
  artwork: MilestoneArtwork,
  options?: {
    /** Mark only the source post custom (Change image). */
    asCustom?: boolean;
  },
): ApplyMainEventImageResult {
  const normalized = cloneArtwork(artwork);
  if (!isReusableArtwork(normalized)) {
    return { session, changedMilestoneIds: [] };
  }

  const asCustom = Boolean(options?.asCustom);
  const sourcePreview = session.previewContents.find(
    (row) => row.milestoneId === sourceMilestoneId,
  );
  const sourceWasCustom = sourcePreview?.artworkMode === "custom";

  // Independent post: only that row changes.
  if (asCustom || sourceWasCustom) {
    const changedMilestoneIds: string[] = [];
    return {
      session: {
        ...session,
        previewContents: session.previewContents.map((preview) =>
          preview.milestoneId === sourceMilestoneId
            ? patchPreviewArtwork(preview, normalized, "custom", changedMilestoneIds)
            : preview,
        ),
      },
      changedMilestoneIds,
    };
  }

  const withSource: CampaignBuilderSession = {
    ...session,
    previewContents: session.previewContents.map((preview) =>
      preview.milestoneId === sourceMilestoneId
        ? {
            ...preview,
            artwork: cloneArtwork(normalized),
            artworkMode: "shared" as const,
          }
        : preview,
    ),
  };

  return seedMainEventImageAcrossPlan(withSource, normalized);
}

/** Mark a post as independent before the user replaces its image. */
export function detachMainEventImage(
  session: CampaignBuilderSession,
  milestoneId: string,
): CampaignBuilderSession {
  return {
    ...session,
    previewContents: session.previewContents.map((preview) =>
      preview.milestoneId === milestoneId
        ? { ...preview, artworkMode: "custom" as const }
        : preview,
    ),
  };
}

/**
 * After a communication plan rebuild, keep the prior Event Image and fill
 * empty posts on the new timeline (custom overrides stay).
 */
export function reapplyMainEventImageAfterPlanChange(
  nextSession: CampaignBuilderSession,
  previousSession: CampaignBuilderSession,
): ApplyMainEventImageResult {
  const artwork =
    resolveDisplayMainEventImage(previousSession) ??
    resolveDisplayMainEventImage(nextSession);
  if (!artwork) {
    return {
      session: {
        ...nextSession,
        mainEventImage: nextSession.mainEventImage ?? previousSession.mainEventImage ?? null,
      },
      changedMilestoneIds: [],
    };
  }
  return seedMainEventImageAcrossPlan(
    {
      ...nextSession,
      mainEventImage: artwork,
    },
    artwork,
  );
}

export function resolveDisplayMainEventImage(
  session: CampaignBuilderSession,
): MilestoneArtwork | null {
  if (isReusableArtwork(session.mainEventImage)) {
    return cloneArtwork(session.mainEventImage!);
  }
  for (const milestone of [...session.milestones].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )) {
    const preview = session.previewContents.find(
      (row) => row.milestoneId === milestone.id,
    );
    if (preview && isReusableArtwork(preview.artwork)) {
      return cloneArtwork(preview.artwork);
    }
  }
  return null;
}
