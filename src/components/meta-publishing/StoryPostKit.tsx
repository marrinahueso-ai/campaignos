"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Download } from "lucide-react";
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

interface StoryPostKitProps {
  bundle: MetaPublishBundle;
  milestone?: MetaSocialCaptionMilestone;
  eventLink?: string | null;
  /** When true, the kit starts expanded (e.g. manual story mode). */
  defaultExpanded?: boolean;
}

type CopyField = "feed" | "story" | "link";

export function StoryPostKit({
  bundle,
  milestone,
  eventLink = null,
  defaultExpanded = false,
}: StoryPostKitProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"feed" | "story" | null>(null);
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);
  const [, startCopyTransition] = useTransition();

  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true);
    }
  }, [defaultExpanded]);

  const showFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const showStory = isStorySurfaceEnabled(bundle.metaPublishSurfaces);

  const feedCaption = milestone?.feed.content?.trim() ?? bundle.captionPreview?.trim() ?? "";
  const storyCaption =
    milestone?.story.content?.trim() ?? bundle.storyCaptionPreview?.trim() ?? "";

  const hasStoryAsset = showStory && Boolean(bundle.storyArtworkUrl);
  const hasFeedAsset = showFeed && Boolean(bundle.feedArtworkUrl);
  const hasStoryCaption = showStory && Boolean(storyCaption);
  const hasFeedCaption = showFeed && Boolean(feedCaption);
  const hasLink = Boolean(eventLink);

  const actionCount =
    Number(hasStoryAsset) +
    Number(hasFeedAsset) +
    Number(hasStoryCaption) +
    Number(hasFeedCaption) +
    Number(hasLink);

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
  const collapsedHint = isManualStory
    ? "Save story image and copy captions for Instagram"
    : "Stickers, music, or link in the app?";

  return (
    <div className="border-t border-cos-border pt-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-cos-text">
            {isManualStory ? "Manual story post kit" : "Post from your phone"}
          </span>
          {!expanded && (
            <span className="mt-0.5 block text-xs text-cos-muted">{collapsedHint}</span>
          )}
        </span>
        {!expanded && actionCount > 0 && (
          <span className="shrink-0 text-xs text-cos-muted">{actionCount} actions</span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 pl-6">
          <p className="text-xs leading-relaxed text-cos-muted">
            {isManualStory
              ? "Save the story image and copy captions, then post in Instagram — add music, link stickers, and tags in the app."
              : "Download artwork and copy captions when you need stickers, music, or links in the native app."}
          </p>

          <div className="flex flex-wrap gap-2">
            {hasStoryAsset && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={downloading === "story"}
                onClick={() => void handleDownload("story", bundle.storyArtworkUrl!, "Story")}
              >
                <Download className="h-3.5 w-3.5" />
                {downloading === "story" ? "Saving…" : "Save story"}
              </Button>
            )}

            {hasFeedAsset && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={downloading === "feed"}
                onClick={() => void handleDownload("feed", bundle.feedArtworkUrl!, "Feed")}
              >
                <Download className="h-3.5 w-3.5" />
                {downloading === "feed" ? "Saving…" : "Save feed"}
              </Button>
            )}

            {hasStoryCaption && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy("story", storyCaption)}
              >
                {copiedField === "story" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedField === "story" ? "Copied" : "Copy story caption"}
              </Button>
            )}

            {hasFeedCaption && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy("feed", feedCaption)}
              >
                {copiedField === "feed" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedField === "feed" ? "Copied" : "Copy feed caption"}
              </Button>
            )}

            {hasLink && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy("link", eventLink!)}
              >
                {copiedField === "link" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedField === "link" ? "Copied" : "Copy event link"}
              </Button>
            )}
          </div>

          {downloadError && (
            <p className="text-xs text-red-600" role="alert">
              {downloadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
