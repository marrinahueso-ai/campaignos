"use client";

import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
import type { ReviewPublishPost } from "@/components/event-workspace/review-publish/build-review-posts";
import { cn } from "@/lib/utils/cn";

interface ReviewPublishPostCardProps {
  post: ReviewPublishPost;
}

export function ReviewPublishPostCard({ post }: ReviewPublishPostCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const placementLabel = post.placement === "feed" ? "Feed" : "Story";
  const previewLabel = post.placement === "feed" ? "Preview post" : "Preview story";

  return (
    <>
      <article className="flex items-center gap-3 border-b border-cos-border px-4 py-3.5 last:border-b-0 sm:px-5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-cos-border bg-[#f7f6f3]">
          {post.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.artworkUrl}
              alt=""
              className={cn(
                "h-full w-full object-cover",
                post.placement === "story" && "object-top",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-cos-muted">
              {placementLabel}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-cos-text">{post.milestoneTitle}</h3>
            <span className="rounded-full border border-cos-border bg-cos-bg px-2 py-0.5 text-[10px] font-medium tracking-wide text-cos-muted uppercase">
              {placementLabel}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cos-muted">
            {post.captionPreview}
          </p>
          <button
            type="button"
            onClick={() => post.artworkUrl && setPreviewOpen(true)}
            disabled={!post.artworkUrl}
            aria-label={post.artworkUrl ? previewLabel : `${previewLabel} unavailable`}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-cos-success-text transition-colors hover:text-cos-success disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewLabel}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </button>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-cos-border" aria-hidden />
      </article>

      {previewOpen && post.artworkUrl && (
        <ArtworkV2ReviewLightbox
          src={post.artworkUrl}
          alt={`${post.milestoneTitle} ${placementLabel.toLowerCase()} artwork`}
          variant={post.placement}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}
