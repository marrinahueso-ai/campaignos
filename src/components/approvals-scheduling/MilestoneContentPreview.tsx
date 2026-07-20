"use client";

import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import type { UnifiedApprovalPreview } from "@/lib/approvals-scheduling/types";

interface MilestoneContentPreviewProps {
  milestoneName: string;
  preview: UnifiedApprovalPreview;
  scheduleLabel?: string | null;
  platforms?: string[];
  deliveryMethod?: string | null;
  /** Keep story column narrow so the panel stays light. */
  compact?: boolean;
}

/**
 * Read-only artwork + caption block shared by Approvals review and calendar detail.
 */
export function MilestoneContentPreview({
  milestoneName,
  preview,
  scheduleLabel,
  platforms,
  deliveryMethod,
  compact = false,
}: MilestoneContentPreviewProps) {
  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${compact ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        {preview.feedArtworkUrl ? (
          <ArtworkLightboxThumbnail
            src={preview.feedArtworkUrl}
            alt={`${milestoneName} feed artwork`}
            label="Feed 1:1"
            variant="feed"
            wrapperClassName="w-full"
            frameClassName="aspect-square"
            placeholder="Feed"
          />
        ) : null}
        {preview.storyArtworkUrl ? (
          <ArtworkLightboxThumbnail
            src={preview.storyArtworkUrl}
            alt={`${milestoneName} story artwork`}
            label="Story 9:16"
            variant="story"
            wrapperClassName="w-full"
            frameClassName={compact ? "aspect-[9/16] max-h-56" : "aspect-[9/16]"}
            placeholder="Story"
          />
        ) : null}
        {!preview.feedArtworkUrl && !preview.storyArtworkUrl ? (
          <div className="col-span-full rounded-xl border border-dashed border-cos-border bg-cos-bg/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-cos-text">No artwork attached</p>
            <p className="mt-1 text-xs text-cos-muted">
              Artwork appears here once this milestone has feed or story creatives.
            </p>
          </div>
        ) : null}
      </div>

      {preview.captionText ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
            Shared caption
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cos-text">
            {preview.captionText}
          </p>
        </div>
      ) : null}

      {preview.storyCaptionSnippet &&
      preview.storyCaptionSnippet.trim() !==
        (preview.captionText ?? "").trim() ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
            Story caption
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cos-text">
            {preview.storyCaptionSnippet}
          </p>
        </div>
      ) : null}

      {!preview.captionText && !preview.storyCaptionSnippet ? (
        <div className="rounded-xl border border-dashed border-cos-border bg-cos-bg/40 px-4 py-6 text-center">
          <p className="text-sm font-medium text-cos-text">No caption yet</p>
          <p className="mt-1 text-xs text-cos-muted">
            Captions appear here once this milestone has approved copy.
          </p>
        </div>
      ) : null}

      {(platforms && platforms.length > 0) || deliveryMethod || scheduleLabel ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {platforms && platforms.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
                Platforms
              </p>
              <p className="mt-2 text-sm text-cos-text">{platforms.join(", ")}</p>
            </div>
          ) : null}
          {deliveryMethod ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
                Delivery
              </p>
              <p className="mt-2 text-sm text-cos-text">{deliveryMethod}</p>
            </div>
          ) : null}
          {scheduleLabel ? (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
                Schedule
              </p>
              <p className="mt-2 text-sm text-cos-text">{scheduleLabel}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
