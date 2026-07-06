"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Share2 } from "lucide-react";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { repostTaggedPostAction } from "@/lib/inbox/actions";
import type { InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

interface InboxTaggedPanelProps {
  thread: InboxThread;
}

function readMediaUrl(thread: InboxThread): string | null {
  const mediaUrl = thread.metadata?.mediaUrl;
  return typeof mediaUrl === "string" && mediaUrl.trim() ? mediaUrl : null;
}

function readPermalink(thread: InboxThread): string | null {
  const permalink = thread.metadata?.permalink;
  return typeof permalink === "string" && permalink.trim() ? permalink : null;
}

export function InboxTaggedPanel({ thread }: InboxTaggedPanelProps) {
  const router = useRouter();
  const mediaUrl = readMediaUrl(thread);
  const permalink = readPermalink(thread);
  const repostedAt =
    typeof thread.metadata.repostedAt === "string" ? thread.metadata.repostedAt : null;

  const [caption, setCaption] = useState(thread.lastMessageSnippet ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isReposted = thread.status === "sent" || Boolean(repostedAt);

  function handleRepost() {
    startTransition(async () => {
      setActionError(null);
      const result = await repostTaggedPostAction({
        threadId: thread.id,
        caption,
      });

      if (!result.success) {
        setActionError(result.error ?? "Repost failed.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-4 rounded-md border border-cos-border bg-cos-card/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-text">
          <InboxPlatformIcon channelType={thread.channelType} size="xs" />
          Tagged in
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isReposted ? "bg-emerald-100 text-emerald-800" : "bg-cos-bg text-cos-muted",
          )}
        >
          {isReposted ? "Reposted" : "New tag"}
        </span>
      </div>

      {mediaUrl ? (
        <div className="mt-3 overflow-hidden rounded-md border border-cos-border bg-cos-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt="Tagged post preview"
            className="max-h-64 w-full object-contain"
          />
        </div>
      ) : null}

      {permalink ? (
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cos-accent hover:text-cos-muted"
        >
          View original post
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}

      {!isReposted ? (
        <div className="mt-3 space-y-2">
          <Textarea
            label="Caption for your repost"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            disabled={isPending}
          />
          {actionError ? (
            <p className="text-xs text-red-600" role="alert">
              {actionError}
            </p>
          ) : null}
          <Button size="sm" disabled={isPending || !mediaUrl} onClick={handleRepost}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            Repost to our {thread.channelType === "instagram_tag" ? "Instagram" : "Facebook"}
          </Button>
          {!mediaUrl ? (
            <p className="text-[11px] text-cos-muted">
              Media URL missing — sync from Meta settings to refresh tagged posts.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
