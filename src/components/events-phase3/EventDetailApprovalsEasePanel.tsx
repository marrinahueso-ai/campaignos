"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { revisionPath } from "@/components/approvals-revision/map-item";
import { ReviewDrawer } from "@/components/approvals-scheduling/ReviewDrawer";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import {
  EaseBtnPrimary,
  EaseChip,
  EaseFocusCard,
  EasePulseMini,
  EaseQueue,
  EaseRow,
  EaseSectionLabel,
  EaseSoftActions,
  EaseSplit,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  approveUnifiedItemAction,
  retryFailedUnifiedApprovalAction,
} from "@/lib/approvals-scheduling/actions";
import {
  approvalOutcomeChip,
  canRetryFailedApproval,
  isDraftOutcome,
  isFailedOutcome,
  isPostedOutcome,
} from "@/lib/approvals-scheduling/outcome-display";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
} from "@/lib/approvals-scheduling/types";

type EaseFilter =
  | "needs"
  | "scheduled"
  | "drafts"
  | "posted"
  | "failed"
  | "changes";

function matchesFilter(filter: EaseFilter, item: UnifiedApprovalItem): boolean {
  switch (filter) {
    case "needs":
      return (
        item.workflowStatus === "assigned_to_me" ||
        item.workflowStatus === "in_queue"
      );
    case "scheduled":
      return item.workflowStatus === "scheduled" && !isDraftOutcome(item);
    case "drafts":
      return isDraftOutcome(item);
    case "posted":
      return isPostedOutcome(item);
    case "failed":
      return isFailedOutcome(item);
    case "changes":
      return item.workflowStatus === "changes_requested";
    default:
      return true;
  }
}

function platformLabel(item: UnifiedApprovalItem): string {
  const platforms = item.platforms ?? [];
  if (platforms.length === 0) return "Social";
  return platforms
    .map((p) =>
      p === "facebook" ? "Facebook" : p === "instagram" ? "Instagram" : "Email",
    )
    .join(" · ");
}

function placementLabel(item: UnifiedApprovalItem): string {
  const preview = item.preview;
  const parts: string[] = [];
  if (preview?.feedArtworkUrl) parts.push("Feed");
  if (preview?.storyArtworkUrl) parts.push("Story");
  if (parts.length === 0) return platformLabel(item);
  return parts.join(" · ");
}

function artUrl(item: UnifiedApprovalItem | null): string {
  if (!item) return "";
  return (
    item.preview?.feedArtworkUrl ||
    item.preview?.storyArtworkUrl ||
    item.thumbnailUrl ||
    ""
  ).trim();
}

function rowTone(
  item: UnifiedApprovalItem,
): "needs" | "open" | "done" | "sched" {
  if (item.workflowStatus === "failed") return "needs";
  if (
    item.workflowStatus === "assigned_to_me" ||
    item.workflowStatus === "in_queue"
  ) {
    return "needs";
  }
  if (item.workflowStatus === "scheduled") return "sched";
  if (isPostedOutcome(item)) {
    return "done";
  }
  return "open";
}

function rowStatus(item: UnifiedApprovalItem): string {
  return approvalOutcomeChip(item).label;
}

export function EventDetailApprovalsEasePanel({
  items,
  canViewAll,
  lockedEventId,
}: Pick<UnifiedApprovalsPageData, "items" | "canViewAll"> & {
  lockedEventId: string;
}) {
  const router = useRouter();
  const refresh = useEventTabMutationRefresh("approvals");
  const [activeFilter, setActiveFilter] = useState<EaseFilter>("needs");
  const [reviewItem, setReviewItem] = useState<UnifiedApprovalItem | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const scoped = useMemo(
    () => items.filter((item) => item.eventId === lockedEventId),
    [items, lockedEventId],
  );

  const counts = useMemo(() => {
    const needs = scoped.filter((i) => matchesFilter("needs", i)).length;
    const scheduled = scoped.filter((i) =>
      matchesFilter("scheduled", i),
    ).length;
    const drafts = scoped.filter((i) => matchesFilter("drafts", i)).length;
    const posted = scoped.filter((i) => matchesFilter("posted", i)).length;
    const failed = scoped.filter((i) => matchesFilter("failed", i)).length;
    const changes = scoped.filter((i) => matchesFilter("changes", i)).length;
    return { needs, scheduled, drafts, posted, failed, changes };
  }, [scoped]);

  const filtered = useMemo(
    () => scoped.filter((item) => matchesFilter(activeFilter, item)),
    [scoped, activeFilter],
  );

  const focusItem = filtered[0] ?? null;
  const queueItems =
    (activeFilter === "needs" || activeFilter === "failed") && focusItem
      ? filtered.slice(1)
      : filtered.slice(focusItem && activeFilter === "needs" ? 1 : 0);

  const openReview = (item: UnifiedApprovalItem) => {
    if (item.workflowStatus === "changes_requested") {
      router.push(revisionPath(item.id, "creator"));
      return;
    }
    setReviewItem(item);
  };

  const handleApprove = async () => {
    if (!reviewItem) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await approveUnifiedItemAction({
        eventId: reviewItem.eventId,
        communicationItemId: reviewItem.communicationItemId,
        schedulingItemId: reviewItem.schedulingItemId,
        campaignName: reviewItem.campaignName,
        milestoneName: reviewItem.milestoneName,
      });
      if (!result.success) {
        setActionError(result.error ?? "Couldn’t approve that. Try again.");
        return;
      }
      setReviewItem(null);
      if (result.warning) {
        setActionError(result.warning);
      }
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (item: UnifiedApprovalItem) => {
    setRetryingId(item.id);
    setActionError(null);
    try {
      const result = await retryFailedUnifiedApprovalAction({
        eventId: item.eventId,
        schedulingItemId: item.schedulingItemId,
        milestoneName: item.milestoneName,
        campaignMilestoneId: item.campaignMilestoneId,
        communicationItemId: item.communicationItemId,
        metaRelativeDay: item.metaRelativeDay,
      });
      if (!result.success) {
        setActionError(result.error ?? "Couldn’t post to your Page. Try again.");
        return;
      }
      if (reviewItem?.id === item.id) {
        setReviewItem(null);
      }
      await refresh();
    } finally {
      setRetryingId(null);
    }
  };

  const caption =
    focusItem?.workflowStatus === "failed"
      ? focusItem.publishError ||
        focusItem.preview?.captionText?.trim() ||
        null
      : focusItem?.preview?.captionText?.trim() ||
        focusItem?.preview?.storyCaptionSnippet?.trim() ||
        null;

  const focusArt = artUrl(focusItem);
  const focusChip = focusItem ? approvalOutcomeChip(focusItem) : null;
  const focusRetry =
    focusItem != null && canRetryFailedApproval(focusItem);

  return (
    <section>
      <CalendarActionToast
        message={actionError}
        onDismiss={() => setActionError(null)}
      />

      <EasePulseMini
        activeId={activeFilter}
        onChange={(id) => setActiveFilter(id as EaseFilter)}
        tabs={[
          { id: "needs", label: "Needs you", count: counts.needs },
          { id: "scheduled", label: "Scheduled", count: counts.scheduled },
          { id: "drafts", label: "Drafts", count: counts.drafts },
          { id: "posted", label: "Posted", count: counts.posted },
          { id: "failed", label: "Failed", count: counts.failed },
          { id: "changes", label: "Changes", count: counts.changes },
        ]}
      />

      <EaseSectionLabel>
        {activeFilter === "failed"
          ? "Needs a retry"
          : activeFilter === "posted"
            ? "Already live"
            : activeFilter === "drafts"
              ? "Saved as drafts"
              : activeFilter === "scheduled"
                ? "On the calendar"
                : activeFilter === "changes"
                  ? "Needs edits"
                  : "Needs you next"}
      </EaseSectionLabel>

      {filtered.length === 0 ? (
        <p className="rounded-[18px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-5 py-10 text-center text-sm text-cos-muted">
          {activeFilter === "drafts"
            ? "No drafts for this event yet. Saved drafts stay here so your team can copy or post them later."
            : activeFilter === "scheduled"
              ? "Nothing scheduled for this event yet."
              : activeFilter === "posted"
                ? "Nothing posted for this event yet."
                : activeFilter === "failed"
                  ? "Nothing failed to post for this event."
                  : activeFilter === "changes"
                    ? "Nothing waiting for edits on this event."
                    : "Nothing waiting on you for this event."}
        </p>
      ) : (
        <EaseSplit>
          {focusItem &&
          (activeFilter === "needs" || activeFilter === "failed") ? (
            <EaseFocusCard
              art={
                focusArt ? (
                  <Image
                    src={focusArt}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="140px"
                    unoptimized
                  />
                ) : null
              }
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
                <EaseChip
                  tone={
                    focusItem.workflowStatus === "failed" ? "warn" : "forest"
                  }
                >
                  {focusChip?.label ?? "Needs approval"}
                </EaseChip>
                <span>{placementLabel(focusItem)}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-cos-text">
                {focusItem.milestoneName || focusItem.campaignName}
              </h2>
              {caption ? (
                <p className="m-0 line-clamp-3 text-sm leading-relaxed text-cos-muted">
                  {caption}
                </p>
              ) : null}
              <EaseSoftActions>
                {focusRetry ? (
                  <EaseBtnPrimary
                    onClick={() => void handleRetry(focusItem)}
                    disabled={retryingId === focusItem.id}
                  >
                    {retryingId === focusItem.id ? "Retrying…" : "Retry"}
                  </EaseBtnPrimary>
                ) : (
                  <EaseBtnPrimary onClick={() => openReview(focusItem)}>
                    Open full view
                  </EaseBtnPrimary>
                )}
              </EaseSoftActions>
            </EaseFocusCard>
          ) : null}

          <EaseQueue>
            {(activeFilter === "needs" || activeFilter === "failed"
              ? queueItems
              : filtered
            ).map((item) => (
              <EaseRow
                key={item.id}
                title={item.milestoneName || item.campaignName}
                meta={`${platformLabel(item)}${
                  item.scheduleLabel ? ` · ${item.scheduleLabel}` : ""
                }`}
                status={rowStatus(item)}
                statusTone={rowTone(item)}
                onClick={() => openReview(item)}
              />
            ))}
            {queueItems.length === 0 &&
            filtered.length === 1 &&
            (activeFilter === "needs" || activeFilter === "failed") ? (
              <p className="px-1 text-xs text-cos-muted">
                That’s the only item in this view.
              </p>
            ) : null}
          </EaseQueue>
        </EaseSplit>
      )}

      <ReviewDrawer
        item={reviewItem}
        open={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        onApprove={handleApprove}
        onRequestChanges={() => {
          if (!reviewItem) return;
          router.push(revisionPath(reviewItem.id, "approver"));
          setReviewItem(null);
        }}
        onRetry={
          reviewItem ? () => void handleRetry(reviewItem) : undefined
        }
        isSubmitting={isSubmitting || retryingId === reviewItem?.id}
        canAct={
          reviewItem
            ? canActOnUnifiedItem(reviewItem, canViewAll)
            : false
        }
      />
    </section>
  );
}
