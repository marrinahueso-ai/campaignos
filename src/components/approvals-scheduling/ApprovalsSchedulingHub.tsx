"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
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
  requestUnifiedChangesAction,
} from "@/lib/approvals-scheduling/actions";
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

type EaseFilter = "needs" | "scheduled" | "published" | "changes";

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
      return item.workflowStatus === "scheduled";
    case "published":
      return (
        item.workflowStatus === "published" || item.workflowStatus === "posted"
      );
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
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    return {
      needs: counts.assigned_to_me + counts.in_queue,
      scheduled: counts.scheduled,
      published: counts.published + counts.posted,
      changes: counts.changes_requested,
    };
  }, [baseFiltered]);

  const scopedItems = useMemo(
    () => baseFiltered.filter((item) => matchesEaseFilter(activeFilter, item)),
    [baseFiltered, activeFilter],
  );

  const focusItem = scopedItems[0] ?? null;
  const queueItems =
    activeFilter === "needs" && focusItem
      ? scopedItems.slice(1)
      : activeFilter === "needs"
        ? []
        : scopedItems;

  const canActOnReviewItem = reviewItem
    ? canActOnUnifiedItem(reviewItem, canViewAll)
    : false;

  function openReview(item: UnifiedApprovalItem) {
    setReviewItem(item);
    setComment("");
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
        setComment("");
        if (result.warning) {
          setActionError(result.warning);
        }
        await refreshApprovalsTab();
        return;
      }

      setActionError(result.error ?? "Unable to approve.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    if (!reviewItem) {
      return;
    }

    if (!comment.trim()) {
      setActionError("Enter a comment before requesting changes.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestUnifiedChangesAction({
        eventId: reviewItem.eventId,
        communicationItemId: reviewItem.communicationItemId,
        schedulingItemId: reviewItem.schedulingItemId,
        comment,
        creatorEmail: undefined,
        campaignName: reviewItem.campaignName,
        milestoneName: reviewItem.milestoneName,
      });

      if (result.success) {
        setReviewItem(null);
        setComment("");
        await refreshApprovalsTab();
        return;
      }

      setActionError(result.error ?? "Unable to request changes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pulseTabs: Array<{ id: EaseFilter; label: string; count: number }> = [
    { id: "needs", label: "Needs you", count: pulseCounts.needs },
    { id: "scheduled", label: "Scheduled", count: pulseCounts.scheduled },
    { id: "published", label: "Published", count: pulseCounts.published },
    { id: "changes", label: "Changes", count: pulseCounts.changes },
  ];

  const emptyCopy: Record<EaseFilter, { title: string; body: string }> = {
    needs: {
      title: "Nothing waiting on you",
      body: "When a campaign needs your approval, it shows up here with the artwork ready to review.",
    },
    scheduled: {
      title: "Nothing scheduled yet",
      body: "Approved posts land here with their publish time until they go live.",
    },
    published: {
      title: "Nothing published in this view",
      body: "Live posts appear here after they go out.",
    },
    changes: {
      title: "Nothing to fix right now",
      body: "When an approver sends something back, it lands here with their note.",
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
                  aria-label="View scope"
                >
                  <option value="assigned_to_me">Assigned to me</option>
                  <option value="all">All</option>
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
              : activeFilter === "published"
                ? "Already live"
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
                canViewAll={canViewAll}
                onReview={openReview}
              />
            ) : null}

            {queueItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeFilter === "needs" && focusItem ? (
                  <p className="pt-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Also waiting
                  </p>
                ) : null}
                {queueItems.map((item) => (
                  <ApprovalsQueueRow
                    key={item.id}
                    item={item}
                    onReview={openReview}
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
        comment={comment}
        onCommentChange={setComment}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        isSubmitting={isSubmitting}
        canAct={canActOnReviewItem}
      />
    </div>
  );
}
