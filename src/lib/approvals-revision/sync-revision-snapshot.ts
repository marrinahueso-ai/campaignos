import {
  ensureSharedCaptionsForPlatforms,
  syncCaptionsToPlatforms,
} from "@/lib/campaign-builder-v2/caption-utils";
import type {
  MilestoneArtwork,
  MilestonePreviewContent,
  PlatformCaption,
} from "@/lib/campaign-builder-v2/types";
import {
  combineLocalDateAndTimeToIso,
  isoToLocalDateOnly,
  readLocalTimeFromIso,
} from "@/lib/utils/dates";

/** Lean snapshot shared between scheduling rows, session preview, and resubmit email. */
export interface RevisionContentSnapshot {
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
  captionText: string | null;
  storyCaption: string | null;
  scheduleAt: string | null;
}

export function mergeRevisionResubmitFields(
  row: RevisionContentSnapshot,
  overrides: Partial<RevisionContentSnapshot>,
): RevisionContentSnapshot {
  return {
    feedArtworkUrl:
      overrides.feedArtworkUrl !== undefined
        ? overrides.feedArtworkUrl
        : row.feedArtworkUrl,
    storyArtworkUrl:
      overrides.storyArtworkUrl !== undefined
        ? overrides.storyArtworkUrl
        : row.storyArtworkUrl,
    captionText:
      overrides.captionText !== undefined
        ? overrides.captionText
        : row.captionText,
    storyCaption:
      overrides.storyCaption !== undefined
        ? overrides.storyCaption
        : row.storyCaption,
    scheduleAt:
      overrides.scheduleAt !== undefined
        ? overrides.scheduleAt
        : row.scheduleAt,
  };
}

export function snapshotFromSchedulingRow(row: {
  feed_artwork_url?: string | null;
  story_artwork_url?: string | null;
  caption_text?: string | null;
  story_caption?: string | null;
  schedule_at?: string | null;
}): RevisionContentSnapshot {
  return {
    feedArtworkUrl: row.feed_artwork_url ?? null,
    storyArtworkUrl: row.story_artwork_url ?? null,
    captionText: row.caption_text ?? null,
    storyCaption: row.story_caption ?? null,
    scheduleAt: row.schedule_at ?? null,
  };
}

export function artworkFromSnapshot(
  existing: MilestoneArtwork,
  snapshot: Pick<
    RevisionContentSnapshot,
    "feedArtworkUrl" | "storyArtworkUrl"
  >,
): MilestoneArtwork {
  return {
    feedUrl: snapshot.feedArtworkUrl ?? existing.feedUrl,
    storyUrl: snapshot.storyArtworkUrl ?? existing.storyUrl,
  };
}

export function captionsFromSnapshot(
  existing: PlatformCaption[],
  snapshot: Pick<RevisionContentSnapshot, "captionText" | "storyCaption">,
  platforms: Array<"facebook" | "instagram">,
): PlatformCaption[] {
  const shared = snapshot.captionText?.trim();
  if (shared) {
    return syncCaptionsToPlatforms(shared, platforms);
  }
  return ensureSharedCaptionsForPlatforms(existing, platforms);
}

export function patchPreviewFromRevision(input: {
  preview: MilestonePreviewContent;
  snapshot: Partial<RevisionContentSnapshot>;
  scheduleDate?: string;
  scheduleTime?: string;
}): MilestonePreviewContent {
  const platforms = (["facebook", "instagram"] as const).filter((platform) =>
    input.preview.enabledFormats.some((format) => format.includes(platform)),
  );
  const captionPlatforms =
    platforms.length > 0 ? platforms : (["facebook"] as const);

  let scheduleDate = input.scheduleDate ?? input.preview.scheduleDate;
  let scheduleTime = input.scheduleTime ?? input.preview.scheduleTime;

  if (input.snapshot.scheduleAt && !input.scheduleDate && !input.scheduleTime) {
    scheduleDate = isoToLocalDateOnly(input.snapshot.scheduleAt);
    scheduleTime = readLocalTimeFromIso(input.snapshot.scheduleAt);
  }

  const artwork = artworkFromSnapshot(input.preview.artwork, {
    feedArtworkUrl: input.snapshot.feedArtworkUrl ?? null,
    storyArtworkUrl: input.snapshot.storyArtworkUrl ?? null,
  });

  const captions = captionsFromSnapshot(
    input.preview.captions,
    {
      captionText: input.snapshot.captionText ?? null,
      storyCaption: input.snapshot.storyCaption ?? null,
    },
    [...captionPlatforms],
  );

  return {
    ...input.preview,
    artwork,
    captions,
    scheduleDate,
    scheduleTime,
    emailSendDate: scheduleDate,
    emailSendTime: scheduleTime,
  };
}

export function scheduleAtFromPreview(
  preview: MilestonePreviewContent,
): string | null {
  return combineLocalDateAndTimeToIso(
    preview.scheduleDate,
    preview.scheduleTime,
  );
}
