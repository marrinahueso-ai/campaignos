"use client";

import Image from "next/image";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import {
  approvalOutcomeChip,
  canRetryFailedApproval,
} from "@/lib/approvals-scheduling/outcome-display";
import {
  getUnifiedApprovalPreview,
  type UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";
import { toSupabaseThumbnailUrl } from "@/lib/images/supabase-thumbnail";
import { cn } from "@/lib/utils/cn";

function artBackground(item: UnifiedApprovalItem): string {
  const preview = getUnifiedApprovalPreview(item);
  const url =
    preview.feedArtworkUrl ||
    preview.storyArtworkUrl ||
    item.thumbnailUrl;
  return url?.trim() || "";
}

export function platformLabel(item: UnifiedApprovalItem): string {
  if (
    item.channel === "flyer" ||
    item.campaignMilestoneId?.startsWith("flyer-composer:")
  ) {
    return "Flyer";
  }
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

function formatWhen(item: UnifiedApprovalItem): string {
  return item.scheduleLabel || item.nextActionTime || "Timing TBD";
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
    <div className={cn("relative overflow-hidden bg-cos-bg", className)}>
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
        <span className="absolute top-3 left-3 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase">
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
  const preview = getUnifiedApprovalPreview(item);

  return (
    <article className="grid overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] md:grid-cols-[minmax(240px,300px)_1fr]">
      <ArtTile
        item={item}
        className="aspect-square min-h-[220px] w-full self-stretch md:aspect-auto md:min-h-[260px]"
        width={800}
        priority
        label={
          preview.feedArtworkUrl
            ? "Feed"
            : preview.storyArtworkUrl
              ? "Story"
              : item.channel === "flyer" ||
                  item.campaignMilestoneId?.startsWith("flyer-composer:")
                ? "Flyer"
                : undefined
        }
      />
      <div className="flex flex-col gap-3.5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-cos-muted">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] uppercase",
              chip.className,
            )}
          >
            {chip.label}
          </span>
          <span>
            {platformLabel(item)}
            {item.scheduleLabel || item.nextActionTime ? (
              <>
                {" "}
                · {formatWhen(item)}
              </>
            ) : null}
          </span>
        </div>
        <div>
          <h2 className="font-display text-[28px] leading-tight tracking-[-0.02em] text-cos-text sm:text-[32px]">
            {item.campaignName}
          </h2>
          <p className="mt-1.5 text-[15px] font-medium text-cos-muted italic">
            {item.milestoneName}
          </p>
        </div>
        {item.workflowStatus === "failed" && item.publishError ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-cos-muted">
            {item.publishError}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-3">
          {showRetry ? (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetry?.(item)}
              className="rounded-[12px] bg-[#2a2622] px-5 py-2.5 text-[13px] font-bold text-[#fffcf7] transition hover:brightness-110 disabled:opacity-50"
            >
              {isRetrying ? "Retrying…" : "Retry"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onReview(item)}
            className="rounded-[12px] bg-[#2f4a3c] px-5 py-2.5 text-[13px] font-bold text-[#fffcf7] transition hover:brightness-110"
          >
            {item.workflowStatus === "changes_requested"
              ? "Open revision"
              : "Open full view"}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Channel labels that must never appear as the Post name cell. */
const CHANNEL_AS_POST_NAME = new Set([
  "facebook",
  "instagram",
  "email",
  "flyer",
  "social",
  "newsletter",
]);

function queuePostName(item: UnifiedApprovalItem): string {
  const raw = item.milestoneName?.trim() || "";
  if (!raw || CHANNEL_AS_POST_NAME.has(raw.toLowerCase())) {
    return "Social post";
  }
  return raw;
}

export function ApprovalsQueueTable({
  items,
  onReview,
  onRetry,
  retryingId,
}: {
  items: UnifiedApprovalItem[];
  onReview: (item: UnifiedApprovalItem) => void;
  onRetry?: (item: UnifiedApprovalItem) => void;
  retryingId?: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-cos-border text-[10px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            <th scope="col" className="w-14 px-4 py-3 font-extrabold">
              Thumb
            </th>
            <th
              scope="col"
              className="w-[28%] min-w-[9rem] px-2 py-3 font-extrabold"
            >
              Event / Campaign
            </th>
            <th
              scope="col"
              className="w-[22%] min-w-[7.5rem] px-2 py-3 font-extrabold"
            >
              Post name
            </th>
            <th
              scope="col"
              className="w-[8.75rem] whitespace-nowrap px-2 py-3 font-extrabold"
            >
              Status
            </th>
            <th
              scope="col"
              className="w-[18%] min-w-[8rem] px-2 py-3 font-extrabold"
            >
              Assignee
            </th>
            <th
              scope="col"
              className="w-12 px-4 py-3 text-right font-extrabold"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ApprovalsQueueRow
              key={item.id}
              item={item}
              onReview={onReview}
              onRetry={onRetry}
              isRetrying={retryingId === item.id}
            />
          ))}
        </tbody>
      </table>
    </div>
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
  const assignee =
    item.assigneeName?.trim() && item.assigneeName !== "Board"
      ? item.assigneeName
      : "Unassigned";
  const initials = item.assigneeInitials?.trim() || "—";
  const postName = queuePostName(item);

  const preview = getUnifiedApprovalPreview(item);
  const platformLine =
    preview.storyArtworkUrl && !preview.feedArtworkUrl
      ? `${platformLabel(item)} · Story`
      : platformLabel(item);

  return (
    <tr className="align-middle border-b border-cos-border last:border-b-0">
      <td className="px-4 py-3.5">
        <ArtTile
          item={item}
          className="relative h-14 w-14 shrink-0 rounded-xl"
          width={128}
        />
      </td>
      <td className="max-w-0 px-2 py-3.5">
        <p className="truncate text-sm font-bold text-cos-text">
          {item.campaignName}
        </p>
        <p className="truncate text-xs font-semibold text-cos-muted">
          {platformLine}
        </p>
      </td>
      <td className="max-w-0 px-2 py-3.5">
        <p className="truncate text-sm font-semibold text-cos-text">
          {postName}
        </p>
      </td>
      <td className="px-2 py-3.5">
        <span
          className={cn(
            "inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] uppercase",
            chip.className,
          )}
        >
          {chip.label}
        </span>
      </td>
      <td className="max-w-0 px-2 py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ebe4d9] text-[11px] font-extrabold text-cos-text"
            aria-hidden
          >
            {initials.slice(0, 2)}
          </span>
          <span className="truncate text-sm font-semibold text-cos-text">
            {assignee}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          {showRetry ? (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetry?.(item)}
              className="rounded-full bg-[#2a2622] px-3 py-2 text-[12px] font-bold text-[#fffcf7] transition hover:-translate-y-px disabled:opacity-50"
            >
              {isRetrying ? "…" : "Retry"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onReview(item)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-muted transition hover:border-[#6b8171] hover:text-cos-text"
            aria-label={`View ${postName}`}
            title="View"
          >
            <Eye className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </td>
    </tr>
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
