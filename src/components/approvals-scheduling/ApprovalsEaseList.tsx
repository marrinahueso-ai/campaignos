"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  approvalOutcomeChip,
  canRetryFailedApproval,
} from "@/lib/approvals-scheduling/outcome-display";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { toSupabaseThumbnailUrl } from "@/lib/images/supabase-thumbnail";
import { cn } from "@/lib/utils/cn";

function artBackground(item: UnifiedApprovalItem): string {
  const url =
    item.preview.feedArtworkUrl ||
    item.preview.storyArtworkUrl ||
    item.thumbnailUrl;
  return url?.trim() || "";
}

function platformLabel(item: UnifiedApprovalItem): string {
  if (item.platforms.length === 0) {
    return "Social";
  }
  return item.platforms
    .map((platform) =>
      platform === "facebook"
        ? "Facebook"
        : platform === "instagram"
          ? "Instagram"
          : "Email",
    )
    .join(" · ");
}

function ArtTile({
  item,
  className,
  label,
  width,
  priority,
}: {
  item: UnifiedApprovalItem;
  className?: string;
  label?: string;
  width: number;
  priority?: boolean;
}) {
  const source = artBackground(item);
  const isCompact = width <= 200;
  const imageUrl = toSupabaseThumbnailUrl(source, {
    width,
    height: isCompact ? width : Math.round(width * 1.25),
    resize: "cover",
  });
  const [imageSrc, setImageSrc] = useState(imageUrl);
  useEffect(() => {
    setImageSrc(imageUrl);
  }, [imageUrl]);
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-cos-bg",
        className,
      )}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          fill
          className="object-cover object-center"
          sizes={width > 200 ? "(max-width: 820px) 100vw, 280px" : "56px"}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          onError={() => setImageSrc("")}
        />
      ) : null}
      {label ? (
        <span className="absolute top-3 left-3 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold text-cos-text">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function ApprovalsFocusCard({
  item,
  onReview,
  onRetry,
  isRetrying = false,
}: {
  item: UnifiedApprovalItem;
  onReview: (item: UnifiedApprovalItem) => void;
  onRetry?: (item: UnifiedApprovalItem) => void;
  isRetrying?: boolean;
}) {
  const chip = approvalOutcomeChip(item);
  const showRetry = canRetryFailedApproval(item) && Boolean(onRetry);
  const caption =
    item.preview.captionText?.trim() ||
    item.preview.storyCaptionSnippet?.trim() ||
    null;

  return (
    <article className="grid overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] md:grid-cols-[minmax(220px,280px)_1fr]">
      <ArtTile
        item={item}
        className="min-h-[240px] w-full self-stretch"
        width={800}
        priority
        label={
          item.preview.feedArtworkUrl
            ? "Feed"
            : item.preview.storyArtworkUrl
              ? "Story"
              : undefined
        }
      />
      <div className="flex flex-col gap-3.5 p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
              chip.className,
            )}
          >
            {chip.label}
          </span>
          <span>{platformLabel(item)}</span>
          {item.scheduleLabel ? (
            <>
              <span aria-hidden>·</span>
              <span>{item.scheduleLabel}</span>
            </>
          ) : null}
        </div>
        <div>
          <h2 className="font-display text-2xl tracking-[-0.02em] text-cos-text sm:text-[28px]">
            {item.campaignName}
          </h2>
          <p className="mt-1 text-sm font-semibold text-cos-muted">
            {item.milestoneName}
          </p>
        </div>
        {item.workflowStatus === "failed" && item.publishError ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-cos-muted">
            {item.publishError}
          </p>
        ) : caption ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-cos-muted">
            {caption}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {showRetry ? (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetry?.(item)}
              className="rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714] disabled:opacity-50"
            >
              {isRetrying ? "Retrying…" : "Retry"}
            </button>
          ) : null}
          {item.workflowStatus === "changes_requested" ? (
            <button
              type="button"
              onClick={() => onReview(item)}
              className="rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714]"
            >
              Open revision
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReview(item)}
              className="rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714]"
            >
              Open full view
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ApprovalsQueueRow({
  item,
  onReview,
  onRetry,
  isRetrying = false,
}: {
  item: UnifiedApprovalItem;
  onReview: (item: UnifiedApprovalItem) => void;
  onRetry?: (item: UnifiedApprovalItem) => void;
  isRetrying?: boolean;
}) {
  const chip = approvalOutcomeChip(item);
  const showRetry = canRetryFailedApproval(item) && Boolean(onRetry);

  return (
    <div
      className={cn(
        "grid w-full items-center gap-3.5 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.55)] px-3.5 py-3 transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
        showRetry
          ? "grid-cols-[56px_1fr_auto] sm:grid-cols-[56px_1fr_auto_auto_auto]"
          : "grid-cols-[56px_1fr_auto] sm:grid-cols-[56px_1fr_auto_auto]",
      )}
    >
      <button
        type="button"
        onClick={() => onReview(item)}
        className="col-span-2 grid min-w-0 grid-cols-[56px_1fr] items-center gap-3.5 text-left sm:col-span-3 sm:grid-cols-[56px_1fr_auto_auto] sm:gap-3.5"
      >
        <ArtTile
          item={item}
          className="relative h-14 w-14 shrink-0 rounded-xl"
          width={128}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-cos-text">
            {item.campaignName}
          </p>
          <p className="truncate text-xs text-cos-muted">
            {item.milestoneName}
            {item.platforms.length > 0 ? ` · ${platformLabel(item)}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "hidden rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase sm:inline-flex",
            chip.className,
          )}
        >
          {chip.label}
        </span>
        <div className="hidden text-right text-xs font-bold whitespace-nowrap text-cos-muted sm:block">
          {item.scheduleLabel || item.nextActionTime || "—"}
          {item.nextAction ? (
            <span className="mt-0.5 block font-semibold text-cos-muted/80">
              {item.nextAction}
            </span>
          ) : null}
        </div>
      </button>
      {showRetry ? (
        <button
          type="button"
          disabled={isRetrying}
          onClick={() => onRetry?.(item)}
          className="rounded-full bg-cos-text px-3 py-2 text-[12px] font-bold text-cos-card transition hover:-translate-y-px disabled:opacity-50"
        >
          {isRetrying ? "…" : "Retry"}
        </button>
      ) : null}
    </div>
  );
}

export function ApprovalsEmptyEase({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-display text-[22px] font-semibold text-cos-text">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cos-muted">
        {body}
      </p>
    </div>
  );
}
