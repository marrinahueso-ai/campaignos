"use client";

import { useEffect, useState } from "react";
import { Eye, ImageIcon } from "lucide-react";
import {
  approvalOutcomeChip,
  approvalTimingListLabel,
  canRetryFailedApproval,
} from "@/lib/approvals-scheduling/outcome-display";
import { displayApprovalPostName } from "@/lib/approvals-scheduling/milestone-display-names";
import {
  getUnifiedApprovalPreview,
  type UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";
import { AppImage } from "@/components/images/AppImage";
import { NewsletterApprovalCardPreview } from "@/components/newsletters/NewsletterApprovalPreview";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";

/** Prefer feed, then story, then list thumbnail — same order as ReviewDrawer. */
export function approvalArtworkUrl(item: UnifiedApprovalItem): string {
  const preview = getUnifiedApprovalPreview(item);
  const url =
    preview.feedArtworkUrl ||
    preview.storyArtworkUrl ||
    item.thumbnailUrl;
  return url?.trim() || "";
}

function artBackground(item: UnifiedApprovalItem): string {
  return approvalArtworkUrl(item);
}

export function platformLabel(item: UnifiedApprovalItem): string {
  if (
    item.channel === "flyer" ||
    item.campaignMilestoneId?.startsWith("flyer-composer:")
  ) {
    return "Flyer";
  }
  if (
    item.channel === "newsletter" ||
    item.campaignMilestoneId?.startsWith("newsletter:")
  ) {
    return "Newsletter";
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
  if (
    item.channel === "flyer" ||
    item.campaignMilestoneId?.startsWith("flyer-composer:") ||
    item.channel === "newsletter" ||
    item.campaignMilestoneId?.startsWith("newsletter:")
  ) {
    return item.scheduleLabel || item.nextActionTime || "Timing TBD";
  }
  return (
    approvalTimingListLabel(item) ||
    item.nextActionTime ||
    "Timing TBD"
  );
}

function ArtTile({
  item,
  className,
  label,
  width,
  priority,
  /**
   * Focus cards: hide entirely when there is no artwork (no huge grey void).
   * Queue thumbs keep a compact placeholder so the table column stays aligned.
   */
  hideWhenEmpty = false,
  onDisplayChange,
}: {
  item: UnifiedApprovalItem;
  className?: string;
  label?: string;
  width: number;
  priority?: boolean;
  hideWhenEmpty?: boolean;
  /** Fires when artwork becomes visible or is hidden (missing / load error). */
  onDisplayChange?: (visible: boolean) => void;
}) {
  const source = artBackground(item);
  const [failed, setFailed] = useState(false);
  const isCompact = width <= 200;
  const showImage = Boolean(source) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [source]);

  useEffect(() => {
    onDisplayChange?.(showImage);
  }, [showImage, onDisplayChange]);

  if (!showImage && hideWhenEmpty) {
    return null;
  }

  return (
    <div
      className={cn(
        // Radius + overflow on the positioning root so the absolute fill
        // <img> clips. Padding-top spacer (not aspect-ratio alone): grid
        // stretch has collapsed focus art frames in production before.
        "relative isolate overflow-hidden rounded-[14px] bg-cos-bg",
        !isCompact && showImage && "w-full self-start",
        className,
      )}
    >
      {!isCompact && showImage ? (
        <span
          aria-hidden
          className="block w-full"
          style={{ paddingTop: "100%" }}
        />
      ) : null}
      {showImage ? (
        <span className="absolute inset-0">
          <AppImage
            src={source}
            alt=""
            fill
            preset={isCompact ? "thumb" : "card"}
            displayWidth={width}
            displayHeight={width}
            // Cover fills the rail so feed art does not leave a cream void;
            // AppImage still falls back to the original URL if transforms fail.
            resize="cover"
            className="rounded-[14px] object-cover object-center"
            style={{ objectFit: "cover" }}
            sizes={width > 200 ? "(max-width: 820px) 100vw, 280px" : "56px"}
            priority={priority}
            onError={() => setFailed(true)}
          />
        </span>
      ) : isCompact ? (
        <span className="flex h-full w-full items-center justify-center text-cos-muted">
          <ImageIcon className="h-4 w-4 opacity-50" aria-hidden />
          <span className="sr-only">No artwork</span>
        </span>
      ) : null}
      {label && showImage ? (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase">
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
  const isNewsletter =
    item.channel === "newsletter" ||
    item.campaignMilestoneId?.startsWith("newsletter:");
  const artworkUrl = artBackground(item);
  const [artVisible, setArtVisible] = useState(Boolean(artworkUrl));

  useEffect(() => {
    setArtVisible(Boolean(artworkUrl));
  }, [artworkUrl, item.id]);

  return (
    <article
      className={cn(
        "grid gap-3 rounded-[22px] border border-cos-border bg-cos-card p-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)] md:gap-4 md:p-3.5",
        isNewsletter
          ? "md:grid-cols-[minmax(160px,200px)_1fr]"
          : artVisible
            ? "md:grid-cols-[minmax(240px,300px)_1fr]"
            : null,
      )}
    >
      {isNewsletter ? (
        <NewsletterApprovalCardPreview
          subject={preview.captionText}
          html={preview.newsletterHtml}
          snapshot={
            (preview.newsletterSnapshot as NewsletterComposerState | null) ??
            null
          }
          className="aspect-[3/4] w-full min-h-[160px] max-h-[260px]"
        />
      ) : (
        <ArtTile
          item={item}
          className="w-full overflow-hidden rounded-[14px]"
          width={800}
          priority
          hideWhenEmpty
          onDisplayChange={setArtVisible}
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
      )}
      <div className="flex flex-col gap-3 p-3 sm:p-4 md:py-3 md:pr-4 md:pl-1">
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
          <h2 className="font-display text-[1.45rem] leading-tight tracking-[-0.02em] text-cos-text sm:text-[1.75rem]">
            {item.campaignName}
          </h2>
          <p className="mt-1 text-sm font-medium text-cos-muted italic">
            {item.milestoneName}
          </p>
          {item.assigneeName?.trim() && item.assigneeName !== "Board" ? (
            <p className="mt-2 text-xs text-cos-muted">
              Assigned to <span className="font-semibold text-cos-text">{item.assigneeName}</span>
            </p>
          ) : null}
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
      <table className="w-full min-w-[680px] table-fixed border-collapse text-left">
        <colgroup>
          {/*
            table-fixed: thumb + action stay rem-sized; middle columns use %
            so Event/Campaign stays dominant without absorbing all leftover
            space. Actions is wide enough for Failed Retry + Eye (~7rem).
          */}
          <col className="w-[4.5rem]" />
          <col className="w-[37%]" />
          <col className="w-[17%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[7rem]" />
        </colgroup>
        <thead>
          <tr className="border-b border-cos-border text-[10px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            <th scope="col" className="px-3 py-3 font-extrabold">
              Thumb
            </th>
            <th scope="col" className="px-2 py-3 font-extrabold">
              Event / Campaign
            </th>
            <th scope="col" className="px-2 py-3 font-extrabold">
              Post name
            </th>
            <th scope="col" className="px-2 py-3 font-extrabold">
              Status
            </th>
            <th scope="col" className="px-2 py-3 font-extrabold">
              Assignee
            </th>
            <th scope="col" className="px-2 py-3 text-right font-extrabold">
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
  const postName = displayApprovalPostName(item.milestoneName);

  const preview = getUnifiedApprovalPreview(item);
  const platformLine =
    preview.storyArtworkUrl && !preview.feedArtworkUrl
      ? `${platformLabel(item)} · Story`
      : platformLabel(item);

  return (
    <tr className="align-middle border-b border-cos-border last:border-b-0">
      <td className="px-3 py-3">
        <ArtTile
          item={item}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px]"
          width={128}
        />
      </td>
      <td className="overflow-hidden px-2 py-3">
        <p className="truncate text-sm font-bold text-cos-text">
          {item.campaignName}
        </p>
        <p className="truncate text-xs font-semibold text-cos-muted">
          {platformLine}
        </p>
      </td>
      <td className="overflow-hidden px-2 py-3">
        <p className="truncate text-sm text-cos-muted italic">{postName}</p>
      </td>
      <td className="px-2 py-3">
        <span
          className={cn(
            "inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] uppercase",
            chip.className,
          )}
        >
          {chip.label}
        </span>
      </td>
      <td className="overflow-hidden px-2 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ebe4d9] text-[10px] font-extrabold text-cos-text"
            aria-hidden
          >
            {initials.slice(0, 2)}
          </span>
          <span className="truncate text-sm font-semibold text-cos-text">
            {assignee}
          </span>
        </div>
      </td>
      <td className="px-2 py-3 text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          {showRetry ? (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => onRetry?.(item)}
              className="rounded-[10px] bg-[#2a2622] px-2.5 py-1.5 text-[11px] font-bold text-[#fffcf7] transition hover:brightness-110 disabled:opacity-50"
            >
              {isRetrying ? "…" : "Retry"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onReview(item)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-cos-border bg-cos-card text-cos-muted transition hover:border-[#6b8171] hover:text-cos-text"
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
