"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { revisionPath } from "@/components/approvals-revision/map-item";
import {
  ApprovalFlowGuide,
  ReviewDrawer,
} from "@/components/approvals-scheduling/ReviewDrawer";
import {
  ApprovalsEmptyEase,
  ApprovalsFocusCard,
  ApprovalsQueueRow,
} from "@/components/approvals-scheduling/ApprovalsEaseList";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  approveUnifiedItemAction,
  enrichUnifiedApprovalItemPreviewAction,
  retryFailedUnifiedApprovalAction,
} from "@/lib/approvals-scheduling/actions";
import {
  isDraftOutcome,
  isFailedOutcome,
  isPostedOutcome,
} from "@/lib/approvals-scheduling/outcome-display";
import {
  canActOnUnifiedItem,
  filterItemsByViewScope,
} from "@/lib/approvals-scheduling/permissions";
import {
  searchMatchesItem,
  summarizeCounts,
  unifiedItemNeedsPreviewEnrichment,
} from "@/lib/approvals-scheduling/status";
import type { ApprovalsLayout } from "@/lib/approvals-scheduling/approvals-layout";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
  UnifiedViewScope,
} from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

type EaseFilter =
  | "needs"
  | "scheduled"
  | "drafts"
  | "posted"
  | "failed"
  | "changes";

interface ApprovalsSchedulingHubProps extends UnifiedApprovalsPageData {
  initialEventFilter?: string | null;
  /** When set, locks the hub to one event and hides the campaign filter. */
  lockedEventId?: string | null;
  /** Compact chrome for embedding inside Event Detail. */
  embedded?: boolean;
  initialSummaryLayout?: ApprovalsLayout;
}

function matchesEaseFilter(filter: EaseFilter, item: UnifiedApprovalItem): boolean {
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

export function ApprovalsSchedulingHub({
  items,
  campaigns,
  actorEmail,
  role: _role,
  canViewAll,
  initialEventFilter = null,
  lockedEventId = null,
  embedded = false,
  initialSummaryLayout: _initialSummaryLayout,
}: ApprovalsSchedulingHubProps) {
  const router = useRouter();
  const refreshApprovalsTab = useEventTabMutationRefresh("approvals");
  const lockedId = lockedEventId?.trim() || null;
  const [activeFilter, setActiveFilter] = useState<EaseFilter>("needs");
  const [viewScope, setViewScope] = useState<UnifiedViewScope>(
    (lockedId || embedded) && canViewAll ? "all" : "assigned_to_me",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState(
    lockedId ?? initialEventFilter ?? "all",
  );
  const [reviewItem, setReviewItem] = useState<UnifiedApprovalItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const eventScopedItems = useMemo(() => {
    if (!lockedId) {
      return items;
    }
    return items.filter((item) => item.eventId === lockedId);
  }, [items, lockedId]);

  const viewScopedItems = useMemo(
    () => filterItemsByViewScope(eventScopedItems, viewScope, canViewAll),
    [eventScopedItems, viewScope, canViewAll],
  );

  const baseFiltered = useMemo(() => {
    let next = viewScopedItems;

    if (!lockedId && eventFilter !== "all") {
      next = next.filter((item) => item.eventId === eventFilter);
    }

    if (searchQuery.trim()) {
      next = next.filter((item) => searchMatchesItem(item, searchQuery));
    }

    return next;
  }, [viewScopedItems, eventFilter, searchQuery, lockedId]);

  const pulseCounts = useMemo(() => {
    const counts = summarizeCounts(baseFiltered);
    const drafts = baseFiltered.filter(isDraftOutcome).length;
    const posted = baseFiltered.filter(isPostedOutcome).length;
    const failed = counts.failed;
    const scheduled = baseFiltered.filter(
      (item) => item.workflowStatus === "scheduled" && !isDraftOutcome(item),
    ).length;
    return {
      needs: counts.assigned_to_me + counts.in_queue,
      scheduled,
      drafts,
      posted,
      failed,
      changes: counts.changes_requested,
    };
  }, [baseFiltered]);

  const scopedItems = useMemo(
    () => baseFiltered.filter((item) => matchesEaseFilter(activeFilter, item)),
    [baseFiltered, activeFilter],
  );

  const focusItem = scopedItems[0] ?? null;
  const usesFocusCard =
    activeFilter === "needs" ||
    activeFilter === "failed" ||
    activeFilter === "changes";
  const queueItems =
    usesFocusCard && focusItem
      ? scopedItems.slice(1)
      : usesFocusCard
        ? []
        : scopedItems;

  const canActOnReviewItem = reviewItem
    ? canActOnUnifiedItem(reviewItem, canViewAll)
    : false;

  /** Changes-requested → new Revision shell (creator). Do not use legacy drawer. */
  function openRevisionCreator(item: UnifiedApprovalItem) {
    router.push(revisionPath(item.id, "creator"));
  }

  /** Request changes → new Revision shell (approver). Do not merge into drawer. */
  function openRevisionApprover(item: UnifiedApprovalItem) {
    router.push(revisionPath(item.id, "approver"));
  }

  function openReview(item: UnifiedApprovalItem) {
    if (item.workflowStatus === "changes_requested") {
      openRevisionCreator(item);
      return;
    }
    setReviewItem(item);
    if (!unifiedItemNeedsPreviewEnrichment(item)) {
      return;
    }
    void enrichUnifiedApprovalItemPreviewAction(item).then((enriched) => {
      setReviewItem((current) =>
        current?.id === enriched.id ? enriched : current,
      );
    });
  }

  async function handleApprove() {
    if (!reviewItem) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await approveUnifiedItemAction({
        eventId: reviewItem.eventId,
        communicationItemId: reviewItem.communicationItemId,
        schedulingItemId: reviewItem.schedulingItemId,
        campaignName: reviewItem.campaignName,
        milestoneName: reviewItem.milestoneName,
        recipientEmail: actorEmail ?? undefined,
      });

      if (result.success) {
        setReviewItem(null);
        if (result.warning) {
          setActionError(result.warning);
        }
        await refreshApprovalsTab();
        return;
      }

      setActionError(result.error ?? "Couldn’t approve that. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetry(item: UnifiedApprovalItem) {
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
      await refreshApprovalsTab();
    } finally {
      setRetryingId(null);
    }
  }

  const pulseTabs: Array<{ id: EaseFilter; label: string; count: number }> = [
    { id: "needs", label: "Needs you", count: pulseCounts.needs },
    { id: "scheduled", label: "Scheduled", count: pulseCounts.scheduled },
    { id: "drafts", label: "Drafts", count: pulseCounts.drafts },
    { id: "posted", label: "Posted", count: pulseCounts.posted },
    { id: "failed", label: "Failed", count: pulseCounts.failed },
    { id: "changes", label: "Changes", count: pulseCounts.changes },
  ];

  const emptyCopy: Record<EaseFilter, { title: string; body: string }> = {
    needs: {
      title: "Nothing waiting on you",
      body: "When a campaign needs your approval, it shows up here with the artwork ready to review.",
    },
    scheduled: {
      title: "Nothing scheduled yet",
      body: "Approved posts land here with their publish time until they go live on your Page.",
    },
    drafts: {
      title: "No drafts saved",
      body: "Posts you saved as drafts stay here so your team can copy or post them later — they won’t go live on their own.",
    },
    posted: {
      title: "Nothing posted yet",
      body: "Posts that went live on your Page show up here.",
    },
    failed: {
      title: "Nothing failed to post",
      body: "If a post doesn’t go through, it lands here so you can retry.",
    },
    changes: {
      title: "Nothing to fix right now",
      body: "When someone on your team sends something back, it lands here with their note.",
    },
  };

  return (
    <div
      className={cn(
        embedded
          ? "space-y-4"
          : "studio-page relative space-y-8 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']",
      )}
    >
      <CalendarActionToast
        message={actionError}
        onDismiss={() => setActionError(null)}
      />

      {!embedded ? (
        <header className="relative space-y-6">
          <div>
            <h1 className="font-display text-4xl tracking-[-0.02em] text-cos-text sm:text-5xl">
              Approvals
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-cos-muted">
              One place to say yes, ask for a tweak, or see what&apos;s already
              on its way out.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Approval filters"
            >
              {pulseTabs.map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveFilter(tab.id)}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-[13px] font-bold transition",
                      active
                        ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)] ring-1 ring-cos-border"
                        : "text-cos-muted hover:bg-[rgba(255,252,247,0.7)] hover:text-cos-text",
                      active && tab.id === "needs"
                        ? "shadow-[0_0_0_3px_rgba(47,74,60,0.12)]"
                        : null,
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "ml-1.5 inline-block min-w-[1.25em] tabular-nums",
                        active ? "text-[#2f4a3c]" : "text-cos-muted",
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {!lockedId ? (
                <>
                  <label className="sr-only" htmlFor="campaign-filter">
                    Campaign filter
                  </label>
                  <select
                    id="campaign-filter"
                    value={eventFilter}
                    onChange={(event) => setEventFilter(event.target.value)}
                    className="min-w-[150px] rounded-full border border-cos-border bg-cos-card px-3.5 py-2 text-[13px] text-cos-text"
                  >
                    <option value="all">All campaigns</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              {canViewAll ? (
                <select
                  value={viewScope}
                  onChange={(event) =>
                    setViewScope(event.target.value as UnifiedViewScope)
                  }
                  className="min-w-[150px] rounded-full border border-cos-border bg-cos-card px-3.5 py-2 text-[13px] text-cos-text"
                  aria-label="Show"
                >
                  <option value="assigned_to_me">Assigned to me</option>
                  <option value="all">Everyone</option>
                </select>
              ) : null}

              <label className="relative block w-full max-w-xs shrink-0 sm:w-52">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search…"
                  aria-label="Search approvals"
                  className="w-full rounded-full border border-cos-border bg-cos-card py-2 pr-3 pl-9 text-[13px] text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
                />
              </label>
            </div>
          </div>
        </header>
      ) : (
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Approval filters"
        >
          {pulseTabs.map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition",
                  active
                    ? "bg-cos-card text-cos-text shadow-sm ring-1 ring-cos-border"
                    : "text-cos-muted hover:bg-cos-bg-alt hover:text-cos-text",
                )}
              >
                {tab.label}
                <span className="ml-1 tabular-nums">{tab.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <section className="relative space-y-3">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          {activeFilter === "needs"
            ? "Waiting on your review"
            : activeFilter === "scheduled"
              ? "On the calendar"
              : activeFilter === "drafts"
                ? "Saved as drafts"
                : activeFilter === "posted"
                  ? "Already live"
                  : activeFilter === "failed"
                    ? "Needs a retry"
                    : "Needs edits"}
        </p>

        {scopedItems.length === 0 ? (
          <div className="rounded-[22px] border border-cos-border/70 bg-[rgba(255,252,247,0.55)]">
            <ApprovalsEmptyEase
              title={emptyCopy[activeFilter].title}
              body={emptyCopy[activeFilter].body}
            />
          </div>
        ) : (
          <>
            {activeFilter === "needs" && focusItem ? (
              <ApprovalsFocusCard
                item={focusItem}
                onReview={openReview}
                onRetry={handleRetry}
                isRetrying={retryingId === focusItem.id}
              />
            ) : null}

            {activeFilter === "failed" && focusItem ? (
              <ApprovalsFocusCard
                item={focusItem}
                onReview={openReview}
                onRetry={handleRetry}
                isRetrying={retryingId === focusItem.id}
              />
            ) : null}

            {activeFilter === "changes" && focusItem ? (
              <ApprovalsFocusCard
                item={focusItem}
                onReview={openRevisionCreator}
                onRetry={handleRetry}
                isRetrying={retryingId === focusItem.id}
              />
            ) : null}

            {queueItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeFilter === "needs" && focusItem ? (
                  <p className="pt-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also waiting
                  </p>
                ) : null}
                {activeFilter === "failed" && focusItem ? (
                  <p className="pt-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also failed
                  </p>
                ) : null}
                {activeFilter === "changes" && focusItem ? (
                  <p className="pt-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also needs edits
                  </p>
                ) : null}
                {queueItems.map((item) => (
                  <ApprovalsQueueRow
                    key={item.id}
                    item={item}
                    onReview={openReview}
                    onRetry={handleRetry}
                    isRetrying={retryingId === item.id}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {!embedded ? <ApprovalFlowGuide /> : null}

      <ReviewDrawer
        item={reviewItem}
        open={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        onApprove={handleApprove}
        onRequestChanges={() => {
          if (!reviewItem) return;
          // Change-request UX lives only on the Revision shell — not the open view.
          openRevisionApprover(reviewItem);
          setReviewItem(null);
        }}
        onRetry={
          reviewItem ? () => void handleRetry(reviewItem) : undefined
        }
        isSubmitting={isSubmitting || retryingId === reviewItem?.id}
        canAct={canActOnReviewItem}
      />
    </div>
  );
}
