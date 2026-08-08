"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ImageIcon, MousePointerClick } from "lucide-react";
import { revisionPath } from "@/components/approvals-revision/map-item";
import { RequestChangesModal } from "@/components/approvals-scheduling/RequestChangesModal";
import { ReviewDrawer } from "@/components/approvals-scheduling/ReviewDrawer";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { ew } from "@/components/events-phase3/event-workspace-tokens";
import { ApprovalClearedCelebration } from "@/components/motion/ApprovalClearedCelebration";
import {
  approveUnifiedItemAction,
  retryFailedUnifiedApprovalAction,
} from "@/lib/approvals-scheduling/actions";
import { canRetryFailedApproval } from "@/lib/approvals-scheduling/outcome-display";
import { displayApprovalPostName } from "@/lib/approvals-scheduling/milestone-display-names";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
} from "@/lib/approvals-scheduling/types";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import { isFlyerComposerMilestoneId } from "@/lib/flyer-composer/approval";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

function isFlyerItem(item: UnifiedApprovalItem): boolean {
  return (
    item.channel === "flyer" ||
    isFlyerComposerMilestoneId(item.campaignMilestoneId)
  );
}

function platformLabel(item: UnifiedApprovalItem): string {
  if (isFlyerItem(item)) return "Print + Digital";
  const platforms = item.platforms ?? [];
  if (platforms.length === 0) {
    if (item.channel === "email") return "Email";
    return "Social";
  }
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

/** Timing pill on artwork — maps Meta relative day to Pilot labels. */
function timingBadge(item: UnifiedApprovalItem): string | null {
  const day = item.metaRelativeDay;
  if (typeof day !== "number" || !Number.isFinite(day)) return null;
  if (day === 0) return "Day Of";
  if (day === -1) return "Day Before";
  if (day === 1) return "Thank You";
  if (day < 0) return `${Math.abs(day)} Days Out`;
  return `${day} Days After`;
}

function cardSubtitle(item: UnifiedApprovalItem): string {
  if (isFlyerItem(item)) return "Flyer";
  return item.scheduleLabel?.trim() || "Schedule TBD";
}

/** Pilot-style status text (uppercase tracking, not pill chips). */
function pilotStatus(item: UnifiedApprovalItem): {
  label: string;
  className: string;
} {
  if (item.workflowStatus === "failed") {
    return { label: "Failed", className: "text-[#a65a3a]" };
  }
  if (item.deliveryMethod === "draft-only") {
    return { label: "Draft", className: "text-[#5e6b65]" };
  }
  switch (item.workflowStatus) {
    case "assigned_to_me":
    case "in_queue":
      return { label: "Needs Approval", className: "text-[#c5a880]" };
    case "changes_requested":
      return { label: "Changes Requested", className: "text-[#c5a880]" };
    case "scheduled":
      return isFlyerItem(item)
        ? { label: "Approved", className: "text-[#5a7568]" }
        : { label: "Scheduled", className: "text-[#5e6b65]" };
    case "posted":
    case "published":
      return isFlyerItem(item)
        ? { label: "Approved", className: "text-[#5a7568]" }
        : { label: "Published", className: "text-[#5e6b65] opacity-60" };
    default:
      return {
        label: item.statusDetail || "In Review",
        className: "text-[#5e6b65]",
      };
  }
}

function SectionRule({
  title,
  tone = "inksoft",
}: {
  title: string;
  tone?: "gold" | "inksoft";
}) {
  return (
    <div className="flex items-center gap-3">
      <h3
        className={cn(
          "text-[10px] font-bold tracking-[0.2em] uppercase",
          tone === "gold" ? "text-[#c5a880]" : ew.inksoft,
        )}
      >
        {title}
      </h3>
      <span className="h-px flex-1 bg-[#e6dfd5]/50" aria-hidden />
    </div>
  );
}

function CreateContentButton({
  href,
  children,
  variant = "filled",
}: {
  href: string;
  children: ReactNode;
  variant?: "filled" | "outline";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-xs font-bold tracking-widest uppercase transition",
        variant === "filled"
          ? "bg-[#1c352d] text-white hover:bg-[#5e6b65]"
          : "border border-[#e6dfd5] bg-white text-[#1c352d] hover:bg-[#faf8f5]",
      )}
    >
      {children}
    </a>
  );
}

function ContentCard({
  item,
  highlight,
  muted,
  onClick,
}: {
  item: UnifiedApprovalItem;
  highlight?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  const status = pilotStatus(item);
  const art = thumbUrl(item);
  const badge = timingBadge(item);
  const published =
    item.workflowStatus === "published" || item.workflowStatus === "posted";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white text-left transition",
        highlight
          ? "border-2 border-[#c5a880]/30 shadow-sm"
          : "border-[#e6dfd5]",
        muted && "opacity-90",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-[#e6dfd5] bg-[#faf8f5]">
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
              (muted || published) && "opacity-80 grayscale-[0.35]",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#8ea89d]">
            <ImageIcon className="h-10 w-10 opacity-50" aria-hidden />
          </div>
        )}
        {badge ? (
          <div className="absolute top-3 left-3 rounded bg-white/90 px-2 py-1 text-[9px] font-bold tracking-wider text-[#1c352d] uppercase backdrop-blur">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h4 className={cn("font-display text-xl leading-tight", ew.ink)}>
            {displayApprovalPostName(item.milestoneName)}
          </h4>
          <p className={cn("text-[11px] font-medium", ew.inksoft)}>
            {cardSubtitle(item)}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold tracking-wider text-[#5e6b65] uppercase">
            {platformLabel(item)}
          </span>
          <span
            className={cn(
              "text-[9px] font-black tracking-widest uppercase",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
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
  const everythingReviewed = scoped.length > 0 && needsYourReview.length === 0;

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

  const drawers = (
    <>
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
    </>
  );

  if (scoped.length === 0) {
    return (
      <section className="flex flex-col gap-10">
        <header className="flex flex-col justify-between gap-4 border-b border-[#e6dfd5] pb-8 sm:flex-row sm:items-end">
          <div>
            <h2
              className={cn("font-display text-4xl", ew.ink)}
              data-testid="event-detail-tab-approvals"
            >
              Approvals
            </h2>
            <p className={cn("mt-1 max-w-lg text-sm italic", ew.inksoft)}>
              The page always shows your event communication plan, even when
              everything is reviewed.
            </p>
          </div>
          <CreateContentButton href={createHref}>
            Create Content
          </CreateContentButton>
        </header>

        <div className="border-t border-dashed border-[#e6dfd5]/50 py-24">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f4f0ea] text-[#c5a880]">
              <MousePointerClick className="h-8 w-8" aria-hidden />
            </div>
            <h3 className={cn("font-display text-2xl", ew.ink)}>
              No content yet
            </h3>
            <p className={cn("mt-2 mb-8 text-sm leading-relaxed", ew.inksoft)}>
              Flyers and posts created for this event will appear here once they
              are drafted.
            </p>
            <CreateContentButton href={createHref} variant="outline">
              Create First Item
            </CreateContentButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-16">
      <CalendarActionToast
        message={actionError ?? actionWarning}
        variant={actionError ? "error" : "warning"}
        onDismiss={() => {
          setActionError(null);
          setActionWarning(null);
        }}
      />

      <header className="flex flex-col gap-6 border-b border-[#e6dfd5] pb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2
              className={cn("mb-1 font-display text-4xl", ew.ink)}
              data-testid="event-detail-tab-approvals"
            >
              Approvals
            </h2>
            {everythingReviewed ? (
              <p className={cn("max-w-lg text-sm italic", ew.inksoft)}>
                The page always shows your event communication plan, even when
                everything is reviewed.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={cn("font-semibold", ew.ink)}>
                  {scoped.length} communication
                  {scoped.length === 1 ? "" : "s"}
                </span>
                <span
                  className="h-1 w-1 rounded-full bg-[#e6dfd5]"
                  aria-hidden
                />
                <span className="flex items-center gap-1.5 font-bold text-[#c5a880]">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  {needsYourReview.length} need
                  {needsYourReview.length === 1 ? "s" : ""} your review
                </span>
              </div>
            )}
          </div>
          <CreateContentButton href={createHref}>
            Create Content
          </CreateContentButton>
        </div>
      </header>

      {needsYourReview.length > 0 ? (
        <div className="flex flex-col gap-8">
          <SectionRule
            title={`Needs Your Review · ${needsYourReview.length}`}
            tone="gold"
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      ) : null}

      <div className="flex flex-col gap-8">
        <SectionRule
          title={
            everythingReviewed ? "Communication Overview" : "All Event Content"
          }
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scoped.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              muted={everythingReviewed}
              onClick={() => openReview(item)}
            />
          ))}
        </div>
      </div>

      {/* Keep phrase for UI contracts / empty-adjacent copy */}
      <span className="sr-only">Everything reviewed</span>

      {drawers}
    </section>
  );
}
