"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  buildArtworkDownloadFilename,
  downloadArtworkImage,
} from "@/lib/artwork-v2/download";
import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import { copyTextToClipboard } from "@/lib/meta-publishing/post-kit";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";

interface StoryPostKitProps {
  bundle: MetaPublishBundle;
  milestone?: MetaSocialCaptionMilestone;
  eventLink?: string | null;
  showManualToggle?: boolean;
  onManualToggle?: (enabled: boolean) => void;
  manualTogglePending?: boolean;
  prominent?: boolean;
}

type CopyField = "feed" | "story" | "link";

export function StoryPostKit({
  bundle,
  milestone,
  eventLink = null,
  showManualToggle = false,
  onManualToggle,
  manualTogglePending = false,
  prominent = false,
}: StoryPostKitProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"feed" | "story" | null>(null);
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);
  const [, startCopyTransition] = useTransition();

  const showFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const showStory = isStorySurfaceEnabled(bundle.metaPublishSurfaces);

  const feedCaption = milestone?.feed.content?.trim() ?? bundle.captionPreview?.trim() ?? "";
  const storyCaption =
    milestone?.story.content?.trim() ?? bundle.storyCaptionPreview?.trim() ?? "";

  async function handleDownload(kind: "feed" | "story", url: string, label: string) {
    setDownloadError(null);
    setDownloading(kind);
    try {
      await downloadArtworkImage(url, buildArtworkDownloadFilename(`${bundle.title} ${label}`));
    } catch {
      setDownloadError("Download failed — try again or open the image in a new tab.");
    } finally {
      setDownloading(null);
    }
  }

  function handleCopy(field: CopyField, text: string) {
    if (!text.trim()) {
      return;
    }

    startCopyTransition(async () => {
      try {
        await copyTextToClipboard(text);
        setCopiedField(field);
        window.setTimeout(() => setCopiedField(null), 2000);
      } catch {
        setDownloadError("Could not copy to clipboard.");
      }
    });
  }

  if (!showFeed && !showStory) {
    return null;
  }

  const isManualStory = bundle.storyManualPublish && showStory;

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4",
        prominent || isManualStory
          ? "border-cos-primary/30 bg-cos-primary/5"
          : "border-cos-border bg-cos-bg",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 cos-section-title">
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Post kit
          </p>
          <p className="mt-1 text-xs leading-relaxed text-cos-muted">
            {isManualStory
              ? "Save the story image and copy captions to post on Instagram manually — add music, link stickers, and tags in the app."
              : "Download images and copy captions for manual posting when you need stickers, music, or links."}
          </p>
        </div>

        {showManualToggle && showStory && onManualToggle && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-cos-border"
              checked={bundle.storyManualPublish}
              disabled={manualTogglePending}
              onChange={(event) => onManualToggle(event.target.checked)}
            />
            <span>I&apos;ll post story manually</span>
          </label>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {showStory && bundle.storyArtworkUrl && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full justify-center"
            disabled={downloading === "story"}
            onClick={() => void handleDownload("story", bundle.storyArtworkUrl!, "Story")}
          >
            <Download className="h-4 w-4" />
            {downloading === "story" ? "Saving…" : "Save story for Instagram"}
          </Button>
        )}

        {showFeed && bundle.feedArtworkUrl && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full justify-center"
            disabled={downloading === "feed"}
            onClick={() => void handleDownload("feed", bundle.feedArtworkUrl!, "Feed")}
          >
            <Download className="h-4 w-4" />
            {downloading === "feed" ? "Saving…" : "Save feed image"}
          </Button>
        )}

        {showStory && storyCaption && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full justify-center"
            onClick={() => handleCopy("story", storyCaption)}
          >
            {copiedField === "story" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedField === "story" ? "Story caption copied" : "Copy story caption"}
          </Button>
        )}

        {showFeed && feedCaption && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full justify-center"
            onClick={() => handleCopy("feed", feedCaption)}
          >
            {copiedField === "feed" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedField === "feed" ? "Feed caption copied" : "Copy feed caption"}
          </Button>
        )}

        {eventLink && (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full justify-center sm:col-span-2"
            onClick={() => handleCopy("link", eventLink)}
          >
            {copiedField === "link" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedField === "link" ? "Event link copied" : "Copy event link"}
          </Button>
        )}
      </div>

      {downloadError && (
        <p className="text-xs text-red-600" role="alert">
          {downloadError}
        </p>
      )}
    </div>
  );
}
