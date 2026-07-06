"use client";

import { ExternalLink } from "lucide-react";
import { readThreadPostPermalink } from "@/lib/inbox/comment-post-preview";
import type { InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

interface InboxDirectPostLinkButtonProps {
  thread: InboxThread;
  className?: string;
}

export function InboxDirectPostLinkButton({
  thread,
  className,
}: InboxDirectPostLinkButtonProps) {
  const permalink = readThreadPostPermalink(thread);
  if (!permalink) {
    return null;
  }

  return (
    <div className={cn("group/direct-post relative shrink-0", className)}>
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 whitespace-nowrap border border-cos-border bg-cos-card px-2 py-1 text-[11px] text-cos-text opacity-0 shadow-md transition-opacity duration-150 group-hover/direct-post:opacity-100"
      >
        Go to the direct post
      </div>
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Go to the direct post"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cos-border text-cos-muted transition-colors hover:border-cos-muted hover:text-cos-text"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
