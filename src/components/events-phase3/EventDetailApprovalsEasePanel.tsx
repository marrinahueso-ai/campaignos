"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FilePlus2, ImageIcon } from "lucide-react";
import { revisionPath } from "@/components/approvals-revision/map-item";
import { RequestChangesModal } from "@/components/approvals-scheduling/RequestChangesModal";
import { ReviewDrawer } from "@/components/approvals-scheduling/ReviewDrawer";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  ew,
  ewCard,
} from "@/components/events-phase3/event-workspace-tokens";
import { ApprovalClearedCelebration } from "@/components/motion/ApprovalClearedCelebration";
import {
  approveUnifiedItemAction,
  retryFailedUnifiedApprovalAction,
} from "@/lib/approvals-scheduling/actions";
import {
  approvalOutcomeChip,
  canRetryFailedApproval,
} from "@/lib/approvals-scheduling/outcome-display";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
} from "@/lib/approvals-scheduling/types";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import { cn } from "@/lib/utils/cn";

function platformLabel(item: UnifiedApprovalItem): string {
  const platforms = item.platforms ?? [];
  if (platforms.length === 0) return "Social";
  return platforms
    .map((p) =>
      p === "facebook" ? "Facebook" : p === "instagram" ? "Instagram" : "Email",
    )
    .join(" · ");
}

function needsReview(item: UnifiedApprovalItem): boolean {
  return (
    item.workflowStatus === "assigned_to_me" ||
    item.workflowStatus === "in_queue" ||
    item.workflowStatus === "failed"
  );
}

function thumbUrl(item: UnifiedApprovalItem): string | null {
  return (
    item.thumbnailUrl ||
    item.preview?.feedArtworkUrl ||
    item.preview?.storyArtworkUrl ||
    null
  );
}

function ContentCard({
  item,
  highlight,
  onClick,
}: {
  item: UnifiedApprovalItem;
  highlight?: boolean;
  onClick: () => void;
}) {
  const chip = approvalOutcomeChip(item);
  const art = thumbUrl(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        ewCard,
        "group flex cursor-pointer flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md",
        highlight && "border-2 border-[#c5a880]/50",
      )}
    >
      <div className="relative aspect-[4/3] bg-[#f4f0ea]">
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#8ea89d]">
            <ImageIcon className="h-10 w-10 opacity-50" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className={cn("text-xs font-semibold uppercase", ew.inksoft)}>
          {item.milestoneName || "Content"}
        </p>
        <h3 className={cn("font-display text-lg leading-snug", ew.ink)}>
          {item.campaignName || item.eventTitle}
        </h3>
        <p className={cn("text-sm", ew.inksoft)}>
          {item.scheduleLabel || "Schedule TBD"}
          {" · "}
          {platformLabel(item)}
        </p>
        <span
          className={cn(
            "mt-auto inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold",
            chip.className,
          )}
        >
          {chip.label}
        </span>
      </div>
    </button>
  );
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

  const needsYourReview = useMemo(
    () => scoped.filter(needsReview),
    [scoped],
  );

  const createHref = createWithAiHref(lockedEventId);

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

  if (scoped.length === 0) {
    return (
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={cn("font-display text-2xl", ew.ink)} data-testid="event-detail-tab-approvals">
              Approvals
            </h2>
            <p className={cn("mt-1 text-sm", ew.inksoft)}>
              Flyers and posts for this event will appear here once they are
              drafted.
            </p>
          </div>
          <a
            href={createHref}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white",
              ew.fillInk,
            )}
          >
            <FilePlus2 className="h-4 w-4" />
            Create First Item
          </a>
        </header>
        <div
          className={cn(
            ewCard,
            "px-6 py-14 text-center",
            ew.bgIvory,
          )}
        >
          <p className={cn("font-display text-xl", ew.ink)}>No content yet</p>
          <p className={cn("mx-auto mt-2 max-w-md text-sm", ew.inksoft)}>
            Generate an event plan or create communications to build this
            overview.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <CalendarActionToast
        message={actionError ?? actionWarning}
        variant={actionError ? "error" : "warning"}
        onDismiss={() => {
          setActionError(null);
          setActionWarning(null);
        }}
      />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={cn("font-display text-2xl", ew.ink)} data-testid="event-detail-tab-approvals">
            Approvals
          </h2>
          <p className={cn("mt-1 text-sm", ew.inksoft)}>
            {scoped.length} communication{scoped.length === 1 ? "" : "s"}
            {" · "}
            {needsYourReview.length === 0
              ? "Everything reviewed"
              : `${needsYourReview.length} need${
                  needsYourReview.length === 1 ? "s" : ""
                } your review`}
          </p>
        </div>
        <a
          href={createHref}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-[#e6dfd5] bg-white px-4 py-2.5 text-sm font-medium",
            ew.ink,
          )}
        >
          <FilePlus2 className="h-4 w-4" />
          Create Content
        </a>
      </header>

      {needsYourReview.length > 0 ? (
        <div className="space-y-4">
          <h3 className={cn("font-display text-xl", ew.ink)}>
            Needs Your Review · {needsYourReview.length}
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {needsYourReview.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                highlight
                onClick={() => openReview(item)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            ewCard,
            "flex items-center gap-3 px-5 py-4",
            ew.bgSageSoft,
          )}
        >
          <p className={cn("text-sm font-medium", ew.sageDeep)}>
            Everything reviewed — your communication plan is still listed below.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className={cn("font-display text-xl", ew.ink)}>All Event Content</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scoped.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onClick={() => openReview(item)}
            />
          ))}
        </div>
      </div>

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
          reviewItem ? canActOnUnifiedItem(reviewItem, canViewAll) : false
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
