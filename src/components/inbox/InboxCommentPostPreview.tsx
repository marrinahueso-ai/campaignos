"use client";

import {
  getInboxPlatform,
  isCommentChannel,
  isInstagramChannel,
} from "@/lib/inbox/constants";
import { hasCommentPostPreview, readCommentPostPreview } from "@/lib/inbox/comment-post-preview";
import type { InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

const CAPTION_PREVIEW_LIMIT = 180;

interface InboxCommentPostPreviewProps {
  thread: InboxThread;
  children: React.ReactNode;
  className?: string;
}

function truncateCaption(caption: string): string {
  if (caption.length <= CAPTION_PREVIEW_LIMIT) {
    return caption;
  }

  return `${caption.slice(0, CAPTION_PREVIEW_LIMIT - 1)}…`;
}

export function InboxCommentPostPreview({
  thread,
  children,
  className,
}: InboxCommentPostPreviewProps) {
  if (!isCommentChannel(thread.channelType) || !hasCommentPostPreview(thread)) {
    return <>{children}</>;
  }

  const preview = readCommentPostPreview(thread)!;
  const platform = getInboxPlatform(thread.channelType);
  const platformLabel = isInstagramChannel(thread.channelType) ? "Instagram" : "Facebook";

  return (
    <div className={cn("group/post-preview relative", className)}>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-64 opacity-0 transition-opacity duration-150 group-hover/post-preview:opacity-100"
      >
        <div className="overflow-hidden border border-cos-border bg-cos-card shadow-md">
          {preview.imageUrl ? (
            <div className="overflow-hidden border-b border-cos-border bg-cos-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.imageUrl}
                alt={`${platformLabel} post preview`}
                className="h-32 w-full object-cover"
              />
            </div>
          ) : null}

          <div className="px-3 py-2.5">
            <p className="text-[10px] font-medium tracking-wide text-cos-muted uppercase">
              Original {platform} post
            </p>

            {preview.caption ? (
              <p className="mt-1 line-clamp-4 text-xs leading-snug whitespace-pre-wrap text-cos-text">
                {truncateCaption(preview.caption)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-cos-muted italic">No caption</p>
            )}

            {!preview.imageUrl ? (
              <p className="mt-1.5 text-[10px] leading-snug text-cos-muted">
                Image unavailable — text-only or link post, or sync again to refresh.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
