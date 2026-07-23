"use client";

import {
  INBOX_CHANNEL_LABELS,
  isInstagramChannel,
} from "@/lib/inbox/constants";
import {
  hasCommentPostPreview,
  readCommentPostPreview,
  readThreadPostPermalink,
} from "@/lib/inbox/comment-post-preview";
import type { InboxThread } from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const CAPTION_LIMIT = 220;

function truncateCaption(caption: string): string {
  if (caption.length <= CAPTION_LIMIT) {
    return caption;
  }
  return `${caption.slice(0, CAPTION_LIMIT - 1)}…`;
}

interface CommunicationsParentPostCardProps {
  thread: InboxThread;
  pageName?: string | null;
  className?: string;
}

export function CommunicationsParentPostCard({
  thread,
  pageName = null,
  className,
}: CommunicationsParentPostCardProps) {
  if (!hasCommentPostPreview(thread)) {
    return null;
  }

  const preview = readCommentPostPreview(thread);
  if (!preview) {
    return null;
  }

  const platformLabel = isInstagramChannel(thread.channelType) ? "Instagram" : "Facebook";
  const displayPageName = pageName?.trim() || platformLabel;
  const permalink = readThreadPostPermalink(thread) ?? preview.permalink;
  const initials = displayPageName.slice(0, 2).toUpperCase();

  const content = (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-cos-border bg-white",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cos-bg text-[10px] font-semibold text-cos-text">
          {thread.pageAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thread.pageAvatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cos-text">{displayPageName}</p>
          <p className="mt-0.5 text-[11px] text-cos-muted">
            {preview.publishedAt ? (
              <time dateTime={preview.publishedAt}>
                {formatMessageTime(preview.publishedAt)}
              </time>
            ) : (
              <span>Original {platformLabel} post</span>
            )}
            <span aria-hidden> · </span>
            <span>{INBOX_CHANNEL_LABELS[thread.channelType]}</span>
          </p>
        </div>
      </div>

      {preview.caption ? (
        <p className="mt-2 px-3 text-sm leading-relaxed whitespace-pre-wrap text-cos-text">
          {truncateCaption(preview.caption)}
        </p>
      ) : (
        <p className="mt-2 px-3 text-sm text-cos-muted italic">No caption</p>
      )}

      {preview.imageUrl ? (
        <div className="mt-2.5 border-t border-cos-border bg-cos-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.imageUrl}
            alt={`${platformLabel} post artwork`}
            className="max-h-56 w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <p className="mt-2 px-3 pb-3 text-[11px] text-cos-muted">
          Image unavailable — text-only post, or Sync Now to refresh media.
        </p>
      )}

    </article>
  );

  if (!permalink) {
    return content;
  }

  return (
    <a
      href={permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#1a6b4a]/30"
      aria-label={`Open original ${platformLabel} post`}
    >
      {content}
    </a>
  );
}
