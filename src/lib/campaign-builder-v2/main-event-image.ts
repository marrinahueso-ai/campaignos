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

/** Feed slot is what Preview treats as the shared Event Image. */
export function hasReusableFeedArtwork(
  artwork: MilestoneArtwork | null | undefined,
): boolean {
  if (!artwork) return false;
  const feed = artwork.feedUrl?.trim() || null;
  return Boolean(feed) && !isPlaceholderArtworkUrl(feed);
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
 * Copy main artwork onto every non-custom post (empty, shared, or incomplete).
 * Custom overrides are left alone. Captions never change.
 *
 * Story-only leftovers must not block a feed fill — Preview still shows
 * "Missing feed image" until feedUrl is set.
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
    if (preview.artworkMode === "custom") {
      return preview;
    }
    return patchPreviewArtwork(
      preview,
      normalized,
      "shared",
      changedMilestoneIds,
    );
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
 * Set / refresh artwork for one post. First fill of an empty plan still
 * waterfalls onto empty posts. Regenerating a post after others already have
 * feed art updates **only that post** (marks it custom) so Edit Post → Apply
 * never overwrites the rest of the timeline.
 */
export function applyArtworkWithMainEventReuse(
  session: CampaignBuilderSession,
  sourceMilestoneId: string,
  artwork: MilestoneArtwork,
  options?: {
    /** Mark only the source post custom (Change image / Edit Apply). */
    asCustom?: boolean;
  },
): ApplyMainEventImageResult {
  const normalized = cloneArtwork(artwork);
  if (!isReusableArtwork(normalized)) {
    return { session, changedMilestoneIds: [] };
  }

  const asCustom = Boolean(options?.asCustom);
  // Story-only leftovers must not block first-fill waterfall (feed is what
  // clears "Missing feed image" on the campaign list).
  const othersAlreadyHaveArt = session.previewContents.some(
    (row) =>
      row.milestoneId !== sourceMilestoneId &&
      hasReusableFeedArtwork(row.artwork),
  );

  // Explicit custom apply, or regeneration after other posts already have feed
  // art: only that row changes. Do not block on source artworkMode alone — a
  // stuck "custom" Announcement with empty siblings must still be able to
  // waterfall on the next Generate/Apply.
  if (asCustom || othersAlreadyHaveArt) {
    const changedMilestoneIds: string[] = [];
    return {
      session: {
        ...session,
        previewContents: session.previewContents.map((preview) =>
          preview.milestoneId === sourceMilestoneId
            ? patchPreviewArtwork(
                preview,
                normalized,
                "custom",
                changedMilestoneIds,
              )
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

/**
 * If one post already has feed art but siblings still show "Missing feed image",
 * copy the donor feed onto every non-custom empty/incomplete post.
 * Safe to run on hydrate — no-ops when the plan is already consistent.
 */
export function healSharedFeedArtworkGaps(
  session: CampaignBuilderSession,
): ApplyMainEventImageResult {
  const donorFromMain = hasReusableFeedArtwork(session.mainEventImage)
    ? cloneArtwork(session.mainEventImage!)
    : null;
  const donorFromPosts = [...session.milestones]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((milestone) =>
      session.previewContents.find((row) => row.milestoneId === milestone.id),
    )
    .find((preview) => hasReusableFeedArtwork(preview?.artwork));
  const donor =
    donorFromMain ??
    (donorFromPosts ? cloneArtwork(donorFromPosts.artwork) : null);
  if (!donor) {
    return { session, changedMilestoneIds: [] };
  }

  const needsHeal = session.previewContents.some(
    (preview) =>
      preview.artworkMode !== "custom" &&
      !hasReusableFeedArtwork(preview.artwork),
  );
  if (!needsHeal) {
    return { session, changedMilestoneIds: [] };
  }

  return seedMainEventImageAcrossPlan(session, donor);
}
