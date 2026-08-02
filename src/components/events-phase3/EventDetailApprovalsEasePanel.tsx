"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { revisionPath } from "@/components/approvals-revision/map-item";
import { RequestChangesModal } from "@/components/approvals-scheduling/RequestChangesModal";
import { ReviewDrawer } from "@/components/approvals-scheduling/ReviewDrawer";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import {
  EaseListRail,
  EaseQueue,
  EaseRow,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { ApprovalClearedCelebration } from "@/components/motion/ApprovalClearedCelebration";
import {
  approveUnifiedItemAction,
  retryFailedUnifiedApprovalAction,
} from "@/lib/approvals-scheduling/actions";
import {
  DEFAULT_EVENT_APPROVALS_EASE_SORT,
  EVENT_APPROVALS_EASE_SORT_OPTIONS,
  sortEventApprovalsEaseItems,
  type EventApprovalsEaseSortId,
} from "@/lib/approvals-scheduling/event-approvals-ease-sort";
import {
  approvalOutcomeChip,
  canRetryFailedApproval,
  isPostedOutcome,
} from "@/lib/approvals-scheduling/outcome-display";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
} from "@/lib/approvals-scheduling/types";

function platformLabel(item: UnifiedApprovalItem): string {
  const platforms = item.platforms ?? [];
  if (platforms.length === 0) return "Social";
  return platforms
    .map((p) =>
      p === "facebook" ? "Facebook" : p === "instagram" ? "Instagram" : "Email",
    )
    .join(" · ");
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
  const [sort, setSort] = useState<EventApprovalsEaseSortId>(
    DEFAULT_EVENT_APPROVALS_EASE_SORT,
  );
  const [reviewItem, setReviewItem] = useState<UnifiedApprovalItem | null>(
    null,
  );
  const [requestItem, setRequestItem] = useState<UnifiedApprovalItem | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    scheduleLabel: string | null;
    scheduleSubline: string | null;
    pendingWarning?: string | null;
  } | null>(null);

  // Clear drawers / toasts when navigating School A → School B.
  useEffect(() => {
    setReviewItem(null);
    setRequestItem(null);
    setCelebration(null);
    setActionError(null);
    setActionWarning(null);
    setRetryingId(null);
    setIsSubmitting(false);
  }, [lockedEventId]);

  const scoped = useMemo(
    () => items.filter((item) => item.eventId === lockedEventId),
    [items, lockedEventId],
  );

  const sorted = useMemo(
    () => sortEventApprovalsEaseItems(scoped, sort),
    [scoped, sort],
  );

  const countLabel =
    scoped.length === 0
      ? undefined
      : `${scoped.length} ${scoped.length === 1 ? "post" : "posts"}`;

  const openReview = (item: UnifiedApprovalItem) => {
    if (item.workflowStatus === "changes_requested") {
      router.push(revisionPath(item.id, "creator"));
      return;
    }
    setRequestItem(null);
    setReviewItem(item);
  };

  const handleApprove = async () => {
    if (!reviewItem) return;
    setIsSubmitting(true);
    setActionError(null);
    setActionWarning(null);
    try {
      const approvedItem = reviewItem;
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
      setCelebration({
        scheduleLabel: approvedItem.scheduleLabel,
        scheduleSubline: approvedItem.scheduleLabel
          ? `Ready to post · ${approvedItem.scheduleLabel}`
          : "Approved and ready to post",
        pendingWarning: result.warning?.trim() || null,
      });
      void refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (item: UnifiedApprovalItem) => {
    setRetryingId(item.id);
    setActionError(null);
    setActionWarning(null);
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

  return (
    <section>
      <CalendarActionToast
        message={actionError ?? actionWarning}
        variant={actionError ? "error" : "warning"}
        onDismiss={() => {
          setActionError(null);
          setActionWarning(null);
        }}
      />

      <EaseListRail
        countLabel={countLabel}
        sort={sort}
        onSortChange={(value) => setSort(value as EventApprovalsEaseSortId)}
        sortOptions={EVENT_APPROVALS_EASE_SORT_OPTIONS}
      />

      {sorted.length === 0 ? (
        <p className="rounded-[18px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-5 py-10 text-center text-sm text-cos-muted">
          No approval posts for this event yet.
        </p>
      ) : (
        <EaseQueue>
          {sorted.map((item) => (
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
        </EaseQueue>
      )}

      <ReviewDrawer
        item={reviewItem}
        open={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        onApprove={handleApprove}
        onRequestChanges={() => {
          if (!reviewItem) return;
          setRequestItem(reviewItem);
          setReviewItem(null);
        }}
        onRetry={
          reviewItem && canRetryFailedApproval(reviewItem)
            ? () => void handleRetry(reviewItem)
            : undefined
        }
        isSubmitting={isSubmitting || retryingId === reviewItem?.id}
        canAct={
          reviewItem
            ? canActOnUnifiedItem(reviewItem, canViewAll)
            : false
        }
      />

      <RequestChangesModal
        item={requestItem}
        open={Boolean(requestItem)}
        onClose={() => setRequestItem(null)}
        onBackToReview={() => {
          if (!requestItem) return;
          const item = requestItem;
          setRequestItem(null);
          setReviewItem(item);
        }}
        onSuccess={() => {
          setRequestItem(null);
          setReviewItem(null);
          void refresh();
        }}
      />

      <ApprovalClearedCelebration
        open={Boolean(celebration)}
        scheduleLabel={celebration?.scheduleLabel}
        scheduleSubline={celebration?.scheduleSubline}
        onDismiss={() => {
          const warning = celebration?.pendingWarning?.trim() || null;
          setCelebration(null);
          if (warning) {
            setActionWarning(warning);
          }
        }}
      />
    </section>
  );
}
