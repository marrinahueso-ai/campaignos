import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { formatDateTime, formatEventDate, isoToLocalDateOnly } from "@/lib/utils/dates";
import type { ApprovalQueuePreview } from "@/types/event-workspace";

interface ApprovalQueuePreviewPanelProps {
  eventTitle: string;
  preview: ApprovalQueuePreview;
}

export function ApprovalQueuePreviewPanel({
  eventTitle,
  preview,
}: ApprovalQueuePreviewPanelProps) {
  const scheduledLabel = preview.scheduledFor
    ? formatEventDate(isoToLocalDateOnly(preview.scheduledFor))
    : null;

  const hasArtwork = Boolean(preview.artworkThumbnailUrl);
  const hasCaption = Boolean(preview.captionText?.trim());
  const hasStory = Boolean(preview.storyCaptionSnippet?.trim());
  const hasDetails = Boolean(
    preview.milestoneTitle || scheduledLabel || hasCaption || hasStory || hasArtwork,
  );

  if (!hasDetails) {
    return (
      <div className="border border-cos-border bg-cos-card p-4">
        <p className="text-xs text-cos-muted">No preview content available yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-cos-border bg-cos-card p-4">
      <div className="flex gap-4">
        {hasArtwork && (
          <ArtworkLightboxThumbnail
            src={preview.artworkThumbnailUrl}
            alt={`${eventTitle} feed artwork`}
            label="Feed 1:1"
            variant="feed"
            wrapperClassName="w-20 shrink-0"
            frameClassName="aspect-square"
            placeholder="Feed"
          />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-display text-base text-cos-text">{eventTitle}</p>
            {preview.milestoneTitle && (
              <p className="mt-0.5 text-xs text-cos-muted">{preview.milestoneTitle}</p>
            )}
          </div>

          {scheduledLabel && (
            <div>
              <p className="cos-section-title">Scheduled</p>
              <p className="mt-1 text-sm text-cos-text">{scheduledLabel}</p>
              {preview.scheduledFor && (
                <p className="mt-0.5 text-xs text-cos-muted">
                  {formatDateTime(preview.scheduledFor)}
                </p>
              )}
            </div>
          )}

          {hasCaption && (
            <div>
              <p className="cos-section-title">Caption</p>
              <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-cos-text">
                {preview.captionText}
              </p>
            </div>
          )}

          {hasStory && (
            <div>
              <p className="cos-section-title">Story</p>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-cos-text">
                {preview.storyCaptionSnippet}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
