"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ReviewDrawer } from "@/components/approvals-scheduling/ReviewDrawer";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import {
  EaseBtnPrimary,
  EaseBtnSecondary,
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
  requestUnifiedChangesAction,
} from "@/lib/approvals-scheduling/actions";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import type {
  UnifiedApprovalItem,
  UnifiedApprovalsPageData,
} from "@/lib/approvals-scheduling/types";

type EaseFilter = "needs" | "scheduled" | "published" | "changes";

function matchesFilter(filter: EaseFilter, item: UnifiedApprovalItem): boolean {
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
  if (
    item.workflowStatus === "assigned_to_me" ||
    item.workflowStatus === "in_queue"
  ) {
    return "needs";
  }
  if (item.workflowStatus === "scheduled") return "sched";
  if (
    item.workflowStatus === "published" ||
    item.workflowStatus === "posted"
  ) {
    return "done";
  }
  return "open";
}

function rowStatus(item: UnifiedApprovalItem): string {
  switch (item.workflowStatus) {
    case "assigned_to_me":
    case "in_queue":
      return "Needs you";
    case "scheduled":
      return "Scheduled";
    case "published":
    case "posted":
      return "Published";
    case "changes_requested":
      return "Changes";
    default:
      return item.statusDetail || "In review";
  }
}

export function EventDetailApprovalsEasePanel({
  items,
  canViewAll,
  lockedEventId,
}: Pick<UnifiedApprovalsPageData, "items" | "canViewAll"> & {
  lockedEventId: string;
}) {
  const refresh = useEventTabMutationRefresh("approvals");
  const [activeFilter, setActiveFilter] = useState<EaseFilter>("needs");
  const [reviewItem, setReviewItem] = useState<UnifiedApprovalItem | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const published = scoped.filter((i) =>
      matchesFilter("published", i),
    ).length;
    const changes = scoped.filter((i) => matchesFilter("changes", i)).length;
    return { needs, scheduled, published, changes };
  }, [scoped]);

  const filtered = useMemo(
    () => scoped.filter((item) => matchesFilter(activeFilter, item)),
    [scoped, activeFilter],
  );

  const focusItem = filtered[0] ?? null;
  const queueItems =
    activeFilter === "needs" && focusItem
      ? filtered.slice(1)
      : filtered.slice(focusItem ? 1 : 0);

  const openReview = (item: UnifiedApprovalItem) => {
    setComment("");
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
        setActionError(result.error ?? "Unable to approve.");
        return;
      }
      setReviewItem(null);
      setComment("");
      if (result.warning) {
        setActionError(result.warning);
      }
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewItem) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await requestUnifiedChangesAction({
        eventId: reviewItem.eventId,
        communicationItemId: reviewItem.communicationItemId,
        schedulingItemId: reviewItem.schedulingItemId,
        comment,
        campaignName: reviewItem.campaignName,
        milestoneName: reviewItem.milestoneName,
      });
      if (!result.success) {
        setActionError(result.error ?? "Unable to request changes.");
        return;
      }
      setReviewItem(null);
      setComment("");
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const caption =
    focusItem?.preview?.captionText?.trim() ||
    focusItem?.preview?.storyCaptionSnippet?.trim() ||
    focusItem?.notes?.trim() ||
    "Open review to see caption and artwork.";

  const focusArt = artUrl(focusItem);

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
          { id: "published", label: "Published", count: counts.published },
          { id: "changes", label: "Changes", count: counts.changes },
        ]}
      />

      <EaseSectionLabel>Needs you next</EaseSectionLabel>

      {filtered.length === 0 ? (
        <p className="rounded-[18px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-5 py-10 text-center text-sm text-cos-muted">
          Nothing in this view for this event yet.
        </p>
      ) : (
        <EaseSplit>
          {focusItem ? (
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
                <EaseChip tone="forest">Needs approval</EaseChip>
                <span>{placementLabel(focusItem)}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-cos-text">
                {focusItem.milestoneName || focusItem.campaignName}
              </h2>
              <p className="m-0 line-clamp-3 text-sm leading-relaxed text-cos-muted">
                {caption}
              </p>
              <EaseSoftActions>
                <EaseBtnPrimary onClick={() => openReview(focusItem)}>
                  Review
                </EaseBtnPrimary>
                <EaseBtnSecondary onClick={() => openReview(focusItem)}>
                  Open Approvals
                </EaseBtnSecondary>
              </EaseSoftActions>
            </EaseFocusCard>
          ) : null}

          <EaseQueue>
            {(queueItems.length > 0 ? queueItems : filtered.slice(1)).map(
              (item) => (
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
              ),
            )}
            {queueItems.length === 0 && filtered.length === 1 ? (
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
        comment={comment}
        onCommentChange={setComment}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        isSubmitting={isSubmitting}
        canAct={
          reviewItem
            ? canActOnUnifiedItem(reviewItem, canViewAll)
            : false
        }
      />
    </section>
  );
}
