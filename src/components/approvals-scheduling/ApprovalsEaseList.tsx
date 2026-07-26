"use client";

import Image from "next/image";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
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

function statusChip(item: UnifiedApprovalItem): {
  label: string;
  className: string;
} {
  switch (item.workflowStatus) {
    case "assigned_to_me":
    case "in_queue":
      return {
        label: "Needs approval",
        className: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
      };
    case "changes_requested":
      return {
        label: "Changes requested",
        className: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        className: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
      };
    case "posted":
    case "published":
      return {
        label: "Published",
        className: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
      };
    default:
      return {
        label: item.statusDetail || "In review",
        className: "bg-cos-bg-alt text-cos-muted",
      };
  }
}

function ArtTile({
  item,
  className,
  label,
}: {
  item: UnifiedApprovalItem;
  className?: string;
  label?: string;
}) {
  const url = artBackground(item);
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-[#1e4a3a] via-[#6b8171] to-[#c4922e]",
        className,
      )}
    >
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 820px) 100vw, 280px"
          unoptimized
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
  canViewAll,
  onReview,
}: {
  item: UnifiedApprovalItem;
  canViewAll: boolean;
  onReview: (item: UnifiedApprovalItem) => void;
}) {
  const chip = statusChip(item);
  const canAct = canActOnUnifiedItem(item, canViewAll);
  const caption =
    item.preview.captionText?.trim() ||
    item.preview.storyCaptionSnippet?.trim() ||
    item.notes?.trim() ||
    "Open the full review to see caption and artwork details.";

  return (
    <article className="grid overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] md:grid-cols-[minmax(200px,280px)_1fr]">
      <ArtTile
        item={item}
        className="min-h-[200px] md:min-h-[260px]"
        label={item.preview.feedArtworkUrl ? "Feed" : item.preview.storyArtworkUrl ? "Story" : undefined}
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
        <p className="line-clamp-3 text-sm leading-relaxed text-cos-muted">
          {caption}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {canAct ? (
            <>
              <button
                type="button"
                onClick={() => onReview(item)}
                className="rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714]"
              >
                Approve &amp; schedule
              </button>
              <button
                type="button"
                onClick={() => onReview(item)}
                className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
              >
                Request changes
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => onReview(item)}
            className="rounded-full px-3 py-2.5 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
          >
            Open full review
          </button>
        </div>
      </div>
    </article>
  );
}

export function ApprovalsQueueRow({
  item,
  onReview,
}: {
  item: UnifiedApprovalItem;
  onReview: (item: UnifiedApprovalItem) => void;
}) {
  const chip = statusChip(item);
  return (
    <button
      type="button"
      onClick={() => onReview(item)}
      className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3.5 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.55)] px-3.5 py-3 text-left transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:grid-cols-[56px_1fr_auto_auto]"
    >
      <ArtTile item={item} className="h-12 w-12 rounded-xl sm:h-14 sm:w-14" />
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
      <div className="text-right text-xs font-bold whitespace-nowrap text-cos-muted">
        {item.scheduleLabel || item.nextActionTime || "—"}
        {item.nextAction ? (
          <span className="mt-0.5 block font-semibold text-cos-muted/80">
            {item.nextAction}
          </span>
        ) : null}
      </div>
    </button>
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
