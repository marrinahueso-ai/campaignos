"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2, X } from "lucide-react";
import { MilestoneContentPreview } from "@/components/approvals-scheduling/MilestoneContentPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPlanningItemForPanel } from "@/components/communications-planning-calendar/PlanningCalendarFilters";
import { getCalendarItemPreviewAction } from "@/lib/communications-calendar/calendar-item-preview-actions";
import type { CalendarItemPreview } from "@/lib/communications-calendar/calendar-item-preview";
import { getChannelStyles } from "@/lib/communications-calendar/channel-styles";
import {
  archiveEventAction,
  deleteEventAction,
} from "@/lib/events/actions";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

const DELETE_CONFIRM_TEXT = "DELETE";

type ConfirmAction = "archive" | "delete" | null;

interface PlanningCalendarDetailPanelProps {
  item: (PlanningCalendarItem & { isOverdue?: boolean; isToday?: boolean }) | null;
  onClose: () => void;
}

function isReviewableCommunication(
  item: PlanningCalendarItem,
): boolean {
  return (
    item.communicationType === "meta_milestone" ||
    item.communicationType === "scheduled_post" ||
    item.sourceType === "meta_milestone" ||
    item.sourceType === "scheduled_post"
  );
}

function isSchoolEventItem(item: PlanningCalendarItem): boolean {
  return item.sourceType === "event" || item.communicationType === "event";
}

export function PlanningCalendarDetailPanel({
  item,
  onClose,
}: PlanningCalendarDetailPanelProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<CalendarItemPreview | null>(null);
  const [isPending, startTransition] = useTransition();
  const [managePending, startManageTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [manageError, setManageError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(null);
    setConfirmAction(null);
    setDeleteConfirmText("");
    setManageError(null);
    if (!item || !isReviewableCommunication(item)) {
      return;
    }

    let cancelled = false;
    startTransition(async () => {
      const result = await getCalendarItemPreviewAction({
        eventId: item.eventId,
        sourceId: item.sourceId,
        milestoneTitle: item.timelineStepTitle ?? item.title,
        scheduledAt: item.scheduledAt ?? null,
      });
      if (!cancelled) {
        setPreview(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;

  const { typeLabel, channelLabel } = formatPlanningItemForPanel(item);
  const styles = getChannelStyles(item.channel);
  const milestoneName = item.timelineStepTitle ?? item.title;
  const showMilestoneReview = isReviewableCommunication(item);
  const canManageEvent = isSchoolEventItem(item);
  const deleteConfirmed = deleteConfirmText === DELETE_CONFIRM_TEXT;

  function openConfirm(action: ConfirmAction) {
    setConfirmAction(action);
    setDeleteConfirmText("");
    setManageError(null);
  }

  function closeConfirm() {
    if (!managePending) {
      setConfirmAction(null);
      setDeleteConfirmText("");
      setManageError(null);
    }
  }

  function handleConfirm() {
    if (!confirmAction || !item) return;
    if (confirmAction === "delete" && deleteConfirmText !== DELETE_CONFIRM_TEXT) {
      return;
    }

    setManageError(null);
    const eventId = item.eventId;

    startManageTransition(async () => {
      if (confirmAction === "archive") {
        const result = await archiveEventAction(eventId);
        if (!result.success) {
          setManageError(result.error ?? "Unable to archive event.");
          return;
        }
      } else if (confirmAction === "delete") {
        const result = await deleteEventAction(eventId);
        if (!result.success) {
          setManageError(
            result.error ?? "Unable to delete event. It may still be linked to other records.",
          );
          return;
        }
      }

      setConfirmAction(null);
      setDeleteConfirmText("");
      onClose();
      router.refresh();
    });
  }

  const confirmCopy =
    confirmAction === "archive"
      ? {
          title: "Archive this event?",
          message:
            "Recommended when you’re done with active work. The event stays available by direct link and can be restored anytime. It will be hidden from Dashboard, Campaigns, Calendar, and Campaign Director.",
          confirmLabel: "Archive event",
          variant: "primary" as const,
        }
      : confirmAction === "delete"
        ? {
            title: "Delete this event permanently?",
            message:
              "This removes the event and all workspace data (drafts, versions, timeline steps, assets, approvals, schedules, and activity). This cannot be undone. Prefer archive unless you need permanent removal.",
            confirmLabel: "Delete permanently",
            variant: "danger" as const,
          }
        : null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-cos-border bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-cos-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cos-accent">
            {showMilestoneReview ? "Review" : "Communication Detail"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-cos-text">
            {showMilestoneReview ? milestoneName : item.title}
          </h2>
          {showMilestoneReview ? (
            <p className="mt-1 text-sm text-cos-muted">
              {item.eventTitle} · Campaign
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-cos-dark-muted hover:bg-cos-bg hover:text-cos-muted"
          aria-label="Close detail panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {showMilestoneReview ? (
          <>
            {isPending && !preview ? (
              <div className="rounded-xl border border-dashed border-cos-border bg-cos-bg/40 px-4 py-10 text-center text-sm text-cos-muted">
                Loading artwork and captions…
              </div>
            ) : preview ? (
              <MilestoneContentPreview
                milestoneName={milestoneName}
                preview={preview.preview}
                scheduleLabel={preview.scheduleLabel}
                platforms={preview.platforms}
                deliveryMethod={preview.deliveryMethod}
                compact
              />
            ) : null}

            <div className="grid gap-4 border-t border-cos-border pt-6 sm:grid-cols-2">
              <DetailRow
                label="Due date"
                value={
                  <span className={cn(item.isOverdue && "font-semibold text-red-600")}>
                    {formatDisplayDate(item.scheduledDate)}
                    {item.isToday && (
                      <Badge variant="info" className="ml-2">
                        Today
                      </Badge>
                    )}
                    {item.isOverdue && (
                      <Badge
                        variant="warning"
                        className="ml-2 bg-red-50 text-red-700"
                      >
                        Overdue
                      </Badge>
                    )}
                  </span>
                }
              />
              <DetailRow
                label="Publish status"
                value={item.publishStatus ?? item.status}
              />
            </div>
          </>
        ) : (
          <>
            <DetailRow label="Event" value={item.eventTitle} />
            <DetailRow
              label="Timeline step"
              value={item.timelineStepTitle ?? "Not linked to a step"}
            />
            <DetailRow label="Type" value={typeLabel} />
            <DetailRow
              label="Channel"
              value={
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    styles.bg,
                    styles.border,
                    styles.text,
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                  {channelLabel}
                </span>
              }
            />
            <DetailRow
              label="Due date"
              value={
                <span className={cn(item.isOverdue && "font-semibold text-red-600")}>
                  {formatDisplayDate(item.scheduledDate)}
                  {item.isToday && (
                    <Badge variant="info" className="ml-2">
                      Today
                    </Badge>
                  )}
                  {item.isOverdue && (
                    <Badge
                      variant="warning"
                      className="ml-2 bg-red-50 text-red-700"
                    >
                      Overdue
                    </Badge>
                  )}
                </span>
              }
            />
            <DetailRow
              label="Assigned user"
              value={item.assignedUser ?? "Unassigned"}
            />
            <DetailRow label="Draft status" value={item.draftStatus ?? "—"} />
            <DetailRow
              label="Artwork status"
              value={item.artworkStatus ?? "—"}
            />
            <DetailRow
              label="Approval status"
              value={item.approvalStatus ?? "—"}
            />
            <DetailRow
              label="Publish status"
              value={item.publishStatus ?? item.status}
            />

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
                Generated draft preview
              </p>
              <div className="rounded-xl border border-cos-border bg-cos-bg p-4">
                {item.draftContent ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
                    {item.draftContent}
                  </p>
                ) : (
                  <p className="text-sm text-cos-dark-muted">
                    No draft yet. AI-generated drafts will appear here.
                  </p>
                )}
                {item.versionNumber && (
                  <p className="mt-3 text-xs text-cos-dark-muted">
                    Version {item.versionNumber}
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-cos-border p-5">
        <Button href={`/events/${item.eventId}`} className="w-full">
          Open planning hub
        </Button>
        {canManageEvent ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={managePending}
              onClick={() => openConfirm("archive")}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1 text-cos-error-text hover:text-cos-error-text"
              disabled={managePending}
              onClick={() => openConfirm("delete")}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      {confirmAction && confirmCopy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-manage-confirm-title"
            className="w-full max-w-md rounded-2xl border border-cos-border bg-cos-card p-6 shadow-xl"
          >
            <h2
              id="calendar-event-manage-confirm-title"
              className="text-lg font-semibold text-cos-text"
            >
              {confirmCopy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
              {confirmCopy.message}
            </p>

            {confirmAction === "delete" ? (
              <div className="mt-4">
                <Input
                  label={`Type ${DELETE_CONFIRM_TEXT} to confirm`}
                  value={deleteConfirmText}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={managePending}
                  placeholder={DELETE_CONFIRM_TEXT}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                />
              </div>
            ) : null}

            {manageError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {manageError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={managePending}
                onClick={closeConfirm}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmCopy.variant}
                disabled={
                  managePending || (confirmAction === "delete" && !deleteConfirmed)
                }
                onClick={handleConfirm}
              >
                {managePending ? "Working…" : confirmCopy.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
        {label}
      </p>
      <div className="mt-1 text-sm text-cos-text">{value}</div>
    </div>
  );
}

function formatDisplayDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
