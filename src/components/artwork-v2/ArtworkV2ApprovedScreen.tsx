"use client";

import { CheckCircle2, Download } from "lucide-react";
import { useState } from "react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { GeneratedArtworkFrame } from "@/components/artwork/GeneratedArtworkFrame";
import { Button } from "@/components/ui/Button";
import { downloadArtworkImage } from "@/lib/artwork-v2/download";

export interface ArtworkV2ApprovedFormat {
  label: string;
  imageUrl: string | null;
  downloadFilename: string;
}

interface ArtworkV2ApprovedScreenProps {
  itemLabel: string;
  imageUrl: string | null;
  downloadFilename: string;
  /** When both feed and story are approved for a milestone. */
  milestoneFormats?: ArtworkV2ApprovedFormat[];
  hasNextItem: boolean;
  onContinueNext: () => void;
  onReturnToEvent: () => void;
  onBackToArtworkList: () => void;
  onCreateNew: () => void;
  showCreateStory?: boolean;
  isCreatingStory?: boolean;
  onCreateStory?: () => void;
}

export function ArtworkV2ApprovedScreen({
  itemLabel,
  imageUrl,
  downloadFilename,
  milestoneFormats,
  hasNextItem,
  onContinueNext,
  onReturnToEvent,
  onBackToArtworkList,
  onCreateNew,
  showCreateStory = false,
  isCreatingStory = false,
  onCreateStory,
}: ArtworkV2ApprovedScreenProps) {
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const milestoneComplete = Boolean(milestoneFormats && milestoneFormats.length > 0);

  async function handleDownload(url: string, filename: string, key: string) {
    setDownloadError(null);
    setIsDownloading(key);

    try {
      await downloadArtworkImage(url, filename);
    } catch {
      setDownloadError("Unable to download artwork. Try again.");
    } finally {
      setIsDownloading(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center">
      <button
        type="button"
        onClick={onBackToArtworkList}
        className="mb-4 self-start text-sm text-cos-muted hover:text-cos-text"
      >
        ← Back to artwork list
      </button>

      <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold text-cos-text">
        {milestoneComplete ? "Milestone artwork complete." : "Artwork approved."}
      </h2>
      <p className="mt-2 text-sm text-cos-muted">
        {milestoneComplete
          ? `${itemLabel} is ready with feed and story formats.`
          : `${itemLabel} is ready for this campaign.`}
      </p>

      {milestoneComplete && milestoneFormats ? (
        <div className="mt-6 flex w-full justify-center gap-4">
          {milestoneFormats.map((format) =>
            format.imageUrl ? (
              <ArtworkLightboxThumbnail
                key={format.label}
                src={format.imageUrl}
                alt={`${itemLabel} ${format.label}`}
                label={format.label}
                wrapperClassName="w-28"
                frameClassName={
                  format.label.toLowerCase().includes("story") ? "aspect-[9/16]" : "aspect-square"
                }
              />
            ) : null,
          )}
        </div>
      ) : (
        imageUrl && (
          <div className="mt-6 w-full overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
            <GeneratedArtworkFrame
              src={imageUrl}
              alt={`Approved ${itemLabel} artwork`}
              className="aspect-[4/5] max-h-[360px] w-full sm:aspect-video"
            />
          </div>
        )
      )}

      <div className="mt-8 flex w-full flex-col gap-3">
        {milestoneComplete && milestoneFormats ? (
          milestoneFormats.map((format) =>
            format.imageUrl ? (
              <Button
                key={format.label}
                type="button"
                size="lg"
                variant="secondary"
                className="w-full"
                disabled={isDownloading === format.label}
                onClick={() => handleDownload(format.imageUrl!, format.downloadFilename, format.label)}
              >
                <Download className="h-4 w-4" />
                {isDownloading === format.label ? "Downloading…" : `Download ${format.label}`}
              </Button>
            ) : null,
          )
        ) : imageUrl ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={isDownloading === "single"}
            onClick={() => handleDownload(imageUrl, downloadFilename, "single")}
          >
            <Download className="h-4 w-4" />
            {isDownloading === "single" ? "Downloading…" : "Download artwork"}
          </Button>
        ) : (
          <p className="text-sm text-cos-muted">
            Download is also available from the artwork list once this page refreshes.
          </p>
        )}

        {downloadError && (
          <p className="text-sm text-red-600" role="alert">
            {downloadError}
          </p>
        )}

        {showCreateStory && onCreateStory && (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={isCreatingStory}
            onClick={onCreateStory}
          >
            {isCreatingStory ? "Creating story version…" : "Create story version from this design"}
          </Button>
        )}

        {hasNextItem && (
          <Button type="button" size="lg" variant="secondary" className="w-full" onClick={onContinueNext}>
            Continue to next milestone
          </Button>
        )}
        <Button type="button" size="lg" variant="secondary" className="w-full" onClick={onCreateNew}>
          Create new version
        </Button>
        <Button type="button" size="lg" variant="secondary" className="w-full" onClick={onReturnToEvent}>
          Return to Event
        </Button>
      </div>
    </div>
  );
}
