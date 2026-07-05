import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";

function resolveStoryCaptionDisplay(
  feedCaption: string,
  storyCaption: string,
): string {
  if (!storyCaption) {
    return "Syncs from feed";
  }
  const feedPrefix = feedCaption.slice(0, storyCaption.length);
  return storyCaption === feedPrefix || storyCaption === feedCaption
    ? "Syncs from feed"
    : storyCaption;
}

interface MilestoneCaptionPreviewProps {
  bundle: MetaPublishBundle;
  className?: string;
}

export function MilestoneCaptionPreview({
  bundle,
  className,
}: MilestoneCaptionPreviewProps) {
  const showFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const showStory = isStorySurfaceEnabled(bundle.metaPublishSurfaces);
  const feedCaption = bundle.captionPreview?.trim() ?? "";
  const storyCaption = bundle.storyCaptionPreview?.trim() ?? "";
  const storyCaptionDisplay = resolveStoryCaptionDisplay(feedCaption, storyCaption);

  if (!(showFeed || showStory) || !(feedCaption || showStory)) {
    return null;
  }

  return (
    <div className={cn("space-y-3 px-4 py-4", className)}>
      {showFeed && (
        <div>
          <p className="cos-section-title">Feed caption</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-cos-text">
            {feedCaption || "No feed caption yet."}
          </p>
        </div>
      )}
      {showStory && (
        <div>
          <p className="cos-section-title">Story caption</p>
          <p
            className={cn(
              "mt-1 text-sm whitespace-pre-wrap",
              storyCaptionDisplay === "Syncs from feed"
                ? "text-cos-muted italic"
                : "text-cos-text",
            )}
          >
            {storyCaptionDisplay}
          </p>
        </div>
      )}
    </div>
  );
}
