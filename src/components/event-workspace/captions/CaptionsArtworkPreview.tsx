"use client";

import { Wand2 } from "lucide-react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";

interface CaptionsArtworkPreviewProps {
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
  milestoneTitle: string;
  onEditArtwork?: () => void;
}

export function CaptionsArtworkPreview({
  feedArtworkUrl,
  storyArtworkUrl,
  milestoneTitle,
  onEditArtwork,
}: CaptionsArtworkPreviewProps) {
  return (
    <div className="border border-cos-border bg-cos-card p-5 lg:p-6">
      <p className="cos-section-title">AI artwork preview</p>
      <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
        Feed (1:1) and Story (9:16) will use this design.
      </p>

      <div className="mt-5 flex items-end gap-3">
        <ArtworkLightboxThumbnail
          src={feedArtworkUrl}
          alt={`${milestoneTitle} feed artwork`}
          label="Feed (1:1)"
          variant="feed"
          wrapperClassName="min-w-0 flex-[1.4]"
          frameClassName="aspect-square w-full"
          placeholder="Feed (1:1)"
        />
        <ArtworkLightboxThumbnail
          src={storyArtworkUrl}
          alt={`${milestoneTitle} story artwork`}
          label="Story (9:16)"
          variant="story"
          wrapperClassName="w-[34%] shrink-0"
          frameClassName="aspect-[9/16] w-full"
          placeholder="Story (9:16)"
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-5 h-9 px-4"
        onClick={onEditArtwork}
      >
        <Wand2 className="h-3.5 w-3.5" aria-hidden />
        Edit artwork
      </Button>
    </div>
  );
}
