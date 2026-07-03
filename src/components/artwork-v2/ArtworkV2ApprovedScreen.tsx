"use client";

import { CheckCircle2, Download } from "lucide-react";
import { useState } from "react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { GeneratedArtworkFrame } from "@/components/artwork/GeneratedArtworkFrame";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
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
  onContinueToCaptions?: () => void;
  onReturnToEvent: () => void;
  onBackToArtworkList: () => void;
  onCreateNew: () => void;
  onCreateNewFeed?: () => void;
  onCreateNewStory?: () => void;
  onDelete?: () => void;
  isResetting?: boolean;
  resetError?: string | null;
  showCreateStory?: boolean;
  isCreatingStory?: boolean;
  onCreateStory?: () => void;
  showGenerateRemaining?: boolean;
  onGenerateRemaining?: () => void;
}

export function ArtworkV2ApprovedScreen({
  itemLabel,
  imageUrl,
  downloadFilename,
  milestoneFormats,
  hasNextItem,
  onContinueNext,
  onContinueToCaptions,
  onReturnToEvent,
  onBackToArtworkList,
  onCreateNew,
  onCreateNewFeed,
  onCreateNewStory,
  onDelete,
  isResetting = false,
  resetError = null,
  showCreateStory = false,
  isCreatingStory = false,
  onCreateStory,
  showGenerateRemaining = false,
  onGenerateRemaining,
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
    <div className="space-y-6">
      <header>
        <button
          type="button"
          onClick={onBackToArtworkList}
          className="mb-3 text-sm text-cos-muted hover:text-cos-text"
        >
          ← Back to artwork list
        </button>
        <p className="studio-eyebrow">Approved</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">
          {milestoneComplete ? "Milestone artwork complete" : "Artwork approved"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
          {milestoneComplete
            ? `${itemLabel} is ready with feed and story formats.`
            : `${itemLabel} is ready for this campaign.`}
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <CardTitle>{itemLabel}</CardTitle>
              <CardDescription>
                {milestoneComplete
                  ? "Feed and story formats are approved for this milestone."
                  : "This artwork is approved and ready to use."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pb-6">
          {milestoneComplete && milestoneFormats ? (
            <>
              <div className="flex justify-start gap-4">
                {milestoneFormats.map((format) =>
                  format.imageUrl ? (
                    <div key={format.label} className="relative">
                      <ArtworkLightboxThumbnail
                        src={format.imageUrl}
                        alt={`${itemLabel} ${format.label}`}
                        label={format.label}
                        variant={
                          format.label.toLowerCase().includes("story") ? "story" : "feed"
                        }
                        wrapperClassName="w-28"
                        frameClassName={
                          format.label.toLowerCase().includes("story")
                            ? "aspect-[9/16]"
                            : "aspect-square"
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="absolute -right-1 -top-1 h-7 w-7 p-0"
                        disabled={isDownloading === format.label}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDownload(
                            format.imageUrl!,
                            format.downloadFilename,
                            format.label,
                          );
                        }}
                        aria-label={`Download ${format.label}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null,
                )}
              </div>
              {downloadError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {downloadError}
                </p>
              )}
            </>
          ) : (
            imageUrl && (
              <div className="max-w-md overflow-hidden border border-cos-border bg-cos-card">
                <GeneratedArtworkFrame
                  src={imageUrl}
                  alt={`Approved ${itemLabel} artwork`}
                  className="aspect-[4/5] max-h-[360px] w-full sm:aspect-video"
                />
              </div>
            )
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {!milestoneComplete && imageUrl ? (
              <Button
                type="button"
                size="lg"
                disabled={isDownloading === "single"}
                onClick={() => handleDownload(imageUrl, downloadFilename, "single")}
              >
                <Download className="h-4 w-4" />
                {isDownloading === "single" ? "Downloading…" : "Download artwork"}
              </Button>
            ) : !milestoneComplete ? (
              <p className="text-sm text-cos-muted">
                Download is also available from the artwork list once this page refreshes.
              </p>
            ) : null}

            {!milestoneComplete && downloadError && (
              <p className="w-full text-sm text-red-600" role="alert">
                {downloadError}
              </p>
            )}

            {showCreateStory && onCreateStory && (
              <Button
                type="button"
                size="lg"
                disabled={isCreatingStory}
                onClick={onCreateStory}
              >
                {isCreatingStory ? "Creating story version…" : "Create story version from this design"}
              </Button>
            )}

            {showGenerateRemaining && onGenerateRemaining && (
              <Button type="button" size="lg" onClick={onGenerateRemaining}>
                Generate remaining artwork
              </Button>
            )}

            {milestoneComplete && onContinueToCaptions && (
              <Button type="button" size="lg" onClick={onContinueToCaptions}>
                Continue to captions
              </Button>
            )}

            {hasNextItem && (
              <Button type="button" size="lg" variant="secondary" onClick={onContinueNext}>
                Continue to next milestone
              </Button>
            )}
            {milestoneComplete && onCreateNewFeed && onCreateNewStory ? (
              <>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  disabled={isResetting}
                  onClick={onCreateNewFeed}
                >
                  {isResetting ? "Preparing…" : "New feed version"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  disabled={isResetting}
                  onClick={onCreateNewStory}
                >
                  {isResetting ? "Preparing…" : "New story version"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={isResetting}
                onClick={onCreateNew}
              >
                {isResetting ? "Preparing…" : "Create new version"}
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={isResetting}
                onClick={onDelete}
              >
                {isResetting
                  ? "Working…"
                  : milestoneComplete
                    ? "Delete milestone artwork"
                    : "Delete artwork"}
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={milestoneComplete ? onBackToArtworkList : onReturnToEvent}
            >
              {milestoneComplete ? "Return to artwork list" : "Return to Event"}
            </Button>
            {resetError && (
              <p className="w-full text-sm text-red-600" role="alert">
                {resetError}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
