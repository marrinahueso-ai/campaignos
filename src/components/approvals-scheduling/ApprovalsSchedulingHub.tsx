"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { revisionPath } from "@/components/approvals-revision/map-item";
import { ApprovalFlowGuide } from "@/components/approvals-scheduling/ApprovalFlowGuide";
import {
  ApprovalsEmptyEase,
  ApprovalsFocusCard,
  ApprovalsQueueTable,
} from "@/components/approvals-scheduling/ApprovalsEaseList";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  approveUnifiedItemAction,
  enrichUnifiedApprovalItemPreviewAction,
  loadApprovalsDeferredPulseItemsAction,
  retryFailedUnifiedApprovalAction,
} from "@/lib/approvals-scheduling/actions";
import {
  APPROVALS_EASE_EMPTY_COPY,
  APPROVALS_EASE_PULSE_OPTIONS,
  DEFAULT_APPROVALS_EASE_PULSE,
  approvalMatchesEasePulse,
  approvalsEaseSectionLabel,
  type ApprovalsEasePulse,
  type ApprovalsEasePulseCounts,
} from "@/lib/approvals-scheduling/approvals-ease-pulse";
import { dedupeUnifiedApprovalItems } from "@/lib/approvals-scheduling/approval-visibility";
import {
  filterApprovalsBySearch,
  shouldApplyApprovalsEasePulseFilter,
} from "@/lib/approvals-scheduling/approvals-home-search";
import {
  canActOnUnifiedItem,
  filterItemsByViewScope,
} from "@/lib/approvals-scheduling/permissions";
import { unifiedItemNeedsPreviewEnrichment } from "@/lib/approvals-scheduling/status";
import type { ApprovalsLayout } from "@/lib/approvals-scheduling/approvals-layout";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
  UnifiedViewScope,
} from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

const ReviewDrawer = dynamic(
  () =>
    import("@/components/approvals-scheduling/ReviewDrawer").then(
      (module) => module.ReviewDrawer,
    ),
  { ssr: false },
);

const RequestChangesModal = dynamic(
  () =>
    import("@/components/approvals-scheduling/RequestChangesModal").then(
      (module) => module.RequestChangesModal,
    ),
  { ssr: false },
);

const ApprovalClearedCelebration = dynamic(
  () =>
    import("@/components/motion/ApprovalClearedCelebration").then(
      (module) => module.ApprovalClearedCelebration,
    ),
  { ssr: false },
);

interface ApprovalsSchedulingHubProps extends UnifiedApprovalsPageData {
  /** Pre-fills search when deep-linking from `/approvals?event=`. */
  initialEventFilter?: string | null;
  /** When set, locks the hub to one event. */
  lockedEventId?: string | null;
  /** Compact chrome for embedding inside Event Detail. */
  embedded?: boolean;
  initialSummaryLayout?: ApprovalsLayout;
}

function initialSearchFromEventFilter(
  eventId: string | null | undefined,
  campaigns: UnifiedApprovalsPageData["campaigns"],
  lockedId: string | null,
): string {
  if (lockedId || !eventId?.trim()) {
    return "";
  }
  return (
    campaigns.find((campaign) => campaign.id === eventId.trim())?.title ?? ""
  );
}

export function ApprovalsSchedulingHub({
  items: initialItems,
  pulseCounts: initialPulseCounts,
  defersTerminalDetailRows = false,
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
  const searchParams = useSearchParams();
  const refreshApprovalsTab = useEventTabMutationRefresh("approvals");
  const lockedId = lockedEventId?.trim() || null;
  const [activeFilter, setActiveFilter] = useState<ApprovalsEasePulse>(
    DEFAULT_APPROVALS_EASE_PULSE,
  );
  const [viewScope, setViewScope] = useState<UnifiedViewScope>(() => {
    // Event deep-links (e.g. after Create with AI Send for approval) should
    // surface the campaign immediately — not hide it behind Assigned-to-me.
    if (initialEventFilter?.trim() && canViewAll) {
      return "all";
    }
    return (lockedId || embedded) && canViewAll ? "all" : "assigned_to_me";
  });
  const [searchQuery, setSearchQuery] = useState(() =>
    initialSearchFromEventFilter(initialEventFilter, campaigns, lockedId),
  );
  const [reviewItem, setReviewItem] = useState<UnifiedApprovalItem | null>(null);
  const [requestItem, setRequestItem] = useState<UnifiedApprovalItem | null>(
    null,
  );
  const [deferredItems, setDeferredItems] = useState<UnifiedApprovalItem[]>([]);
  const [deferredLoading, setDeferredLoading] = useState(false);
  const deferredLoadedRef = useRef(!defersTerminalDetailRows);
  const deferredInFlightRef = useRef(false);
  const openedReviewFromQuery = useRef<string | null>(null);
  const pulseCounts: ApprovalsEasePulseCounts = initialPulseCounts;

  // Prefetch open-review + request-changes pop-outs so focus-card CTA feels instant.
  useEffect(() => {
    void import("@/components/approvals-scheduling/ReviewDrawer");
    void import("@/components/approvals-scheduling/RequestChangesModal");
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    scheduleLabel: string | null;
    scheduleSubline: string | null;
    pendingWarning?: string | null;
  } | null>(null);

  const items = useMemo(
    () =>
      deferredItems.length === 0
        ? initialItems
        : dedupeUnifiedApprovalItems([...initialItems, ...deferredItems]),
    [initialItems, deferredItems],
  );

  const ensureDeferredItemsLoaded = useMemo(() => {
    return async () => {
      if (!defersTerminalDetailRows || deferredLoadedRef.current) {
        return;
      }
      if (deferredInFlightRef.current) {
        return;
      }
      deferredInFlightRef.current = true;
      setDeferredLoading(true);
      try {
        const loaded = await loadApprovalsDeferredPulseItemsAction();
        setDeferredItems(loaded);
        deferredLoadedRef.current = true;
      } finally {
        deferredInFlightRef.current = false;
        setDeferredLoading(false);
      }
    };
  }, [defersTerminalDetailRows]);

  // Lazy-load terminal rows when opening Scheduled/Posted or searching the full queue.
  useEffect(() => {
    if (!defersTerminalDetailRows || deferredLoadedRef.current) {
      return;
    }
    const needsDeferred =
      activeFilter === "scheduled" ||
      activeFilter === "posted" ||
      !shouldApplyApprovalsEasePulseFilter(searchQuery);
    if (!needsDeferred) {
      return;
    }
    void ensureDeferredItemsLoaded();
  }, [
    activeFilter,
    searchQuery,
    defersTerminalDetailRows,
    ensureDeferredItemsLoaded,
  ]);

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

  const applyPulseFilter = shouldApplyApprovalsEasePulseFilter(searchQuery);

  const searchedItems = useMemo(
    () => filterApprovalsBySearch(viewScopedItems, searchQuery),
    [viewScopedItems, searchQuery],
  );

  const scopedItems = useMemo(
    () =>
      applyPulseFilter
        ? searchedItems.filter((item) =>
            approvalMatchesEasePulse(item, activeFilter),
          )
        : searchedItems,
    [searchedItems, activeFilter, applyPulseFilter],
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

  /** Changes-requested → Revision shell (creator). */
  function openRevisionCreator(item: UnifiedApprovalItem) {
    router.push(revisionPath(item.id, "creator"));
  }

  function openRequestChanges(item: UnifiedApprovalItem) {
    setReviewItem(null);
    setRequestItem(item);
  }

  function openReview(item: UnifiedApprovalItem) {
    if (item.workflowStatus === "changes_requested") {
      openRevisionCreator(item);
      return;
    }
    setRequestItem(null);
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

  // Deep link from Request changes “Back to review” / email invite → open view.
  useEffect(() => {
    const reviewId = searchParams.get("review")?.trim();
    if (!reviewId || openedReviewFromQuery.current === reviewId) {
      return;
    }
    const match = items.find((item) => item.id === reviewId);
    if (!match) {
      // Terminal rows may still be deferred — fetch them before giving up.
      if (defersTerminalDetailRows && !deferredLoadedRef.current) {
        void ensureDeferredItemsLoaded();
      }
      return;
    }
    openedReviewFromQuery.current = reviewId;
    openReview(match);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("review");
    const qs = next.toString();
    router.replace(qs ? `/approvals?${qs}` : "/approvals", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per review id
  }, [items, searchParams, router, defersTerminalDetailRows, ensureDeferredItemsLoaded]);

  async function handleApprove() {
    if (!reviewItem) {
      return;
    }

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
        recipientEmail: actorEmail ?? undefined,
      });

      if (result.success) {
        setReviewItem(null);
        // Celebrate immediately — Meta/email run after the server returns.
        // Hold any follow-up warnings until celebration dismisses.
        setCelebration({
          scheduleLabel: approvedItem.scheduleLabel,
          scheduleSubline: approvedItem.scheduleLabel
            ? `Ready to post · ${approvedItem.scheduleLabel}`
            : "Approved and ready to post",
          pendingWarning: result.warning?.trim() || null,
        });
        void refreshApprovalsTab();
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
      await refreshApprovalsTab();
    } finally {
      setRetryingId(null);
    }
  }

  const pulseTabs = APPROVALS_EASE_PULSE_OPTIONS.map((option) => ({
    ...option,
    count: pulseCounts[option.id],
  }));

  return (
    <div
      className={cn(
        embedded
          ? "space-y-4"
          : "studio-page relative space-y-8 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']",
      )}
    >
      <CalendarActionToast
        message={actionError ?? actionWarning}
        variant={actionError ? "error" : "warning"}
        onDismiss={() => {
          setActionError(null);
          setActionWarning(null);
        }}
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
              className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto"
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
                      "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition",
                      active
                        ? "bg-[#2f4a3c] text-[#fffcf7] shadow-[0_8px_20px_rgba(47,74,60,0.22)]"
                        : "border border-transparent bg-[rgba(255,252,247,0.65)] text-cos-muted hover:border-cos-border hover:text-cos-text",
                    )}
                  >
                    {tab.label}{" "}
                    <span className="tabular-nums opacity-90">
                      ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {canViewAll ? (
                <select
                  value={viewScope}
                  onChange={(event) =>
                    setViewScope(event.target.value as UnifiedViewScope)
                  }
                  className="min-w-[150px] rounded-full border border-cos-border bg-cos-card px-3.5 py-2 text-[13px] font-semibold text-cos-text"
                  aria-label="Show"
                >
                  <option value="assigned_to_me">Assigned to me</option>
                  <option value="all">Everyone</option>
                </select>
              ) : null}

              <label className="relative block w-full max-w-md shrink-0 sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search events, people, dates…"
                  aria-label="Search events, people, and dates"
                  className="w-full rounded-full border border-cos-border bg-cos-card py-2 pr-3 pl-9 text-[13px] text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
                />
              </label>
            </div>
          </div>
        </header>
      ) : (
        <div
          className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto"
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
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition",
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
          {approvalsEaseSectionLabel(activeFilter)}
        </p>

        {scopedItems.length === 0 ? (
          <div className="rounded-[22px] border border-cos-border/70 bg-[rgba(255,252,247,0.55)]">
            <ApprovalsEmptyEase
              title={
                deferredLoading
                  ? "Loading posts…"
                  : searchQuery.trim()
                    ? "No matches"
                    : APPROVALS_EASE_EMPTY_COPY[activeFilter].title
              }
              body={
                deferredLoading
                  ? "Pulling in scheduled and posted items for this view."
                  : searchQuery.trim()
                    ? "Try a different search — event names, people, dates, captions, or status labels."
                    : APPROVALS_EASE_EMPTY_COPY[activeFilter].body
              }
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
              <div className="space-y-3 pt-2">
                {activeFilter === "needs" && focusItem ? (
                  <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also waiting
                  </p>
                ) : null}
                {activeFilter === "failed" && focusItem ? (
                  <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also failed
                  </p>
                ) : null}
                {activeFilter === "changes" && focusItem ? (
                  <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also needs edits
                  </p>
                ) : null}
                <ApprovalsQueueTable
                  items={queueItems}
                  onReview={
                    activeFilter === "changes" ? openRevisionCreator : openReview
                  }
                  onRetry={handleRetry}
                  retryingId={retryingId}
                />
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
          openRequestChanges(reviewItem);
        }}
        onRetry={
          reviewItem ? () => void handleRetry(reviewItem) : undefined
        }
        isSubmitting={isSubmitting || retryingId === reviewItem?.id}
        canAct={canActOnReviewItem}
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
          void refreshApprovalsTab();
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
    </div>
  );
}
