"use client";

import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovalFlowGuide,
  ReviewDrawer,
} from "@/components/approvals-scheduling/ReviewDrawer";
import {
  ApprovalsTable,
  ApprovalTabs,
} from "@/components/approvals-scheduling/ApprovalsTable";
import { SummaryCards } from "@/components/approvals-scheduling/SummaryCards";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { Button } from "@/components/ui/Button";
import {
  approveUnifiedItemAction,
  requestUnifiedChangesAction,
} from "@/lib/approvals-scheduling/actions";
import { filterItemsByViewScope, canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import {
  searchMatchesItem,
  summarizeCounts,
  tabMatchesItem,
} from "@/lib/approvals-scheduling/status";
import type {
  UnifiedApprovalsPageData,
  UnifiedApprovalItem,
  UnifiedTabId,
  UnifiedViewScope,
} from "@/lib/approvals-scheduling/types";

interface ApprovalsSchedulingHubProps extends UnifiedApprovalsPageData {
  initialEventFilter?: string | null;
}

export function ApprovalsSchedulingHub({
  items,
  summary,
  campaigns,
  actorEmail,
  role,
  canViewAll,
  initialEventFilter = null,
}: ApprovalsSchedulingHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<UnifiedTabId>("all");
  const [viewScope, setViewScope] = useState<UnifiedViewScope>("assigned_to_me");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState(initialEventFilter ?? "all");
  const [reviewItem, setReviewItem] = useState<UnifiedApprovalItem | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const scopedItems = useMemo(() => {
    let next = filterItemsByViewScope(items, viewScope, canViewAll);

    if (eventFilter !== "all") {
      next = next.filter((item) => item.eventId === eventFilter);
    }

    if (searchQuery.trim()) {
      next = next.filter((item) => searchMatchesItem(item, searchQuery));
    }

    if (activeTab !== "all") {
      next = next.filter((item) => tabMatchesItem(activeTab, item));
    }

    return next;
  }, [items, viewScope, canViewAll, eventFilter, searchQuery, activeTab]);

  const tabCounts = useMemo(() => summarizeCounts(items), [items]);

  const canActOnReviewItem = reviewItem
    ? canActOnUnifiedItem(reviewItem, role)
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
        router.refresh();
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
        creatorEmail: reviewItem.submittedByMe ? actorEmail ?? undefined : undefined,
        campaignName: reviewItem.campaignName,
        milestoneName: reviewItem.milestoneName,
      });

      if (result.success) {
        setReviewItem(null);
        setComment("");
        router.refresh();
        return;
      }

      setActionError(result.error ?? "Unable to request changes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="studio-page space-y-8 pb-12">
      <CalendarActionToast
        message={actionError}
        onDismiss={() => setActionError(null)}
      />

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

          <label className="relative block w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search approvals..."
              className="w-full border border-cos-border bg-cos-card py-2 pr-3 pl-10 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
            />
          </label>
        </div>
      </header>

      <SummaryCards summary={summary} />

      <div className="space-y-4">
        <ApprovalTabs
          activeTab={activeTab}
          counts={tabCounts}
          onChange={(tab) => setActiveTab(tab as UnifiedTabId)}
        />

        <ApprovalsTable
          items={scopedItems}
          role={role}
          actorEmail={actorEmail}
          onReview={(item) => {
            setReviewItem(item);
            setComment("");
          }}
          onActionError={setActionError}
        />
      </div>

      <ApprovalFlowGuide />

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
