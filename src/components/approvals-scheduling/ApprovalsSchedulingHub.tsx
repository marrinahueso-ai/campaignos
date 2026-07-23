"use client";

import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ApprovalFlowGuide,
  ReviewDrawer,
} from "@/components/approvals-scheduling/ReviewDrawer";
import { ApprovalsTable } from "@/components/approvals-scheduling/ApprovalsTable";
import { SummaryCards } from "@/components/approvals-scheduling/SummaryCards";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { Button } from "@/components/ui/Button";
import {
  approveUnifiedItemAction,
  enrichUnifiedApprovalItemPreviewAction,
  requestUnifiedChangesAction,
} from "@/lib/approvals-scheduling/actions";
import { filterItemsByViewScope, canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import {
  searchMatchesItem,
  summarizeCounts,
  tabMatchesItem,
  unifiedItemNeedsPreviewEnrichment,
} from "@/lib/approvals-scheduling/status";
import type {
  UnifiedApprovalsPageData,
  UnifiedApprovalItem,
  UnifiedTabId,
  UnifiedViewScope,
} from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

interface ApprovalsSchedulingHubProps extends UnifiedApprovalsPageData {
  initialEventFilter?: string | null;
  /** When set, locks the hub to one event and hides the campaign filter. */
  lockedEventId?: string | null;
  /** Compact chrome for embedding inside Event Detail. */
  embedded?: boolean;
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
}: ApprovalsSchedulingHubProps) {
  const refreshApprovalsTab = useEventTabMutationRefresh("approvals");
  const lockedId = lockedEventId?.trim() || null;
  const [activeTab, setActiveTab] = useState<UnifiedTabId>("all");
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

  const scopedItems = useMemo(() => {
    let next = viewScopedItems;

    if (!lockedId && eventFilter !== "all") {
      next = next.filter((item) => item.eventId === eventFilter);
    }

    if (searchQuery.trim()) {
      next = next.filter((item) => searchMatchesItem(item, searchQuery));
    }

    if (activeTab !== "all") {
      next = next.filter((item) => tabMatchesItem(activeTab, item));
    }

    return next;
  }, [viewScopedItems, eventFilter, searchQuery, activeTab, lockedId]);

  const scopedSummary = useMemo(() => {
    const counts = summarizeCounts(viewScopedItems);
    return {
      inQueue: counts.in_queue,
      assignedToMe: counts.assigned_to_me,
      scheduled: counts.scheduled,
      posted: counts.posted,
      published: counts.published,
      changesRequested: counts.changes_requested,
    };
  }, [viewScopedItems]);

  const canActOnReviewItem = reviewItem
    ? canActOnUnifiedItem(reviewItem, canViewAll)
    : false;

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

  const searchField = (
    <label className="relative block w-full max-w-sm shrink-0 lg:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search approvals..."
        className="w-full border border-cos-border bg-cos-card py-2 pr-3 pl-10 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
      />
    </label>
  );

  return (
    <div className={cn(embedded ? "space-y-4" : "studio-page space-y-8 pb-12")}>
      <CalendarActionToast
        message={actionError}
        onDismiss={() => setActionError(null)}
      />

      {!embedded ? (
        <header className="space-y-6 border-b border-cos-border pb-8">
          <div>
            <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
              Approvals & Scheduling
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-cos-muted">
              Review, approve, and schedule campaigns. Track status, request changes,
              and see what&apos;s published.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {!lockedId ? (
                <>
                  <label className="sr-only" htmlFor="campaign-filter">
                    Campaign filter
                  </label>
                  <select
                    id="campaign-filter"
                    value={eventFilter}
                    onChange={(event) => setEventFilter(event.target.value)}
                    className="min-w-[180px] border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
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
                  className="min-w-[160px] border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
                  aria-label="View scope"
                >
                  <option value="assigned_to_me">Assigned to Me</option>
                  <option value="all">All</option>
                </select>
              ) : null}

              <Button type="button" variant="secondary" size="sm">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {searchField}
          </div>
        </header>
      ) : null}

      {!embedded ? (
        <SummaryCards
          summary={scopedSummary}
          activeFilter={activeTab}
          onFilterChange={setActiveTab}
        />
      ) : null}

      <ApprovalsTable
        items={scopedItems}
        canApproveComms={canViewAll}
        onReview={(item) => {
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
        }}
      />

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
