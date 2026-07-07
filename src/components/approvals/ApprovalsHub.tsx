"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { ApprovalQueuePreviewPanel } from "@/components/approvals/ApprovalQueuePreviewPanel";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { channelLabel } from "@/lib/ai/content";
import {
  appendChangeRequestCommentAction,
  approveCommunicationAction,
  requestCommunicationChangesAction,
} from "@/lib/event-workspace/actions";
import { CHANGE_REQUEST_NOTE_SEPARATOR } from "@/lib/event-workspace/approval-notes";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { ApprovalQueueItem } from "@/types/event-workspace";

interface ApprovalsHubProps {
  assignedToMe: ApprovalQueueItem[];
  allPending: ApprovalQueueItem[];
  changesRequested: ApprovalQueueItem[];
  recentlyApproved: ApprovalQueueItem[];
  eventIdFilter?: string | null;
}

function filterByEvent(items: ApprovalQueueItem[], eventId: string | null | undefined) {
  if (!eventId) {
    return items;
  }

  return items.filter((item) => item.eventId === eventId);
}

function ChangeRequestNotes({ notes }: { notes: string }) {
  const segments = notes.split(CHANGE_REQUEST_NOTE_SEPARATOR);

  return (
    <div className="space-y-2 pl-5">
      {segments.map((segment, index) => (
        <p
          key={`${index}-${segment.slice(0, 24)}`}
          className="rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-xs leading-relaxed text-cos-text"
        >
          {segment.trim()}
        </p>
      ))}
    </div>
  );
}

function ChangeRequestCommentDialog({
  item,
  onActionError,
}: {
  item: ApprovalQueueItem;
  onActionError: (message: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleClose() {
    if (isSaving) {
      return;
    }

    setOpen(false);
    setComment("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = comment.trim();
    if (!trimmed) {
      onActionError("Enter a comment before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await appendChangeRequestCommentAction(
        item.eventId,
        item.id,
        item.communicationItemId,
        trimmed,
      );

      if (result.success) {
        setOpen(false);
        setComment("");
        router.refresh();
        return;
      }

      onActionError(result.error ?? "Unable to add comment.");
    } catch {
      onActionError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0 p-0"
        aria-label="Add follow-up comment"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`change-request-comment-title-${item.id}`}
            className="w-full max-w-md rounded-xl border border-cos-border bg-cos-card shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-cos-border px-5 py-4">
              <div>
                <h2
                  id={`change-request-comment-title-${item.id}`}
                  className="text-sm font-semibold text-cos-text"
                >
                  Add follow-up comment
                </h2>
                <p className="mt-1 text-xs text-cos-muted">
                  {channelLabel(item.channel)} · {item.eventTitle}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 p-0"
                aria-label="Close comment dialog"
                disabled={isSaving}
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              <label className="block text-xs font-medium text-cos-muted">
                Comment before resubmitting
              </label>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                autoFocus
                placeholder="Explain what you changed or ask a clarifying question…"
                className="w-full resize-y rounded-md border border-cos-border bg-cos-bg px-3 py-2 text-xs text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
                disabled={isSaving}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="secondary" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add comment
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ApprovalQueueList({
  items,
  showActions = false,
  showCommentForm = false,
  expandedId,
  onToggleExpand,
  onActionError,
}: {
  items: ApprovalQueueItem[];
  showActions?: boolean;
  showCommentForm?: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onActionError: (message: string) => void;
}) {
  const router = useRouter();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  async function runApprovalAction(
    item: ApprovalQueueItem,
    action: () => Promise<{ error: string | null; success: boolean }>,
  ) {
    setPendingItemId(item.id);

    try {
      const result = await action();
      if (result.success) {
        router.refresh();
        return;
      }

      onActionError(result.error ?? "Unable to complete that action.");
    } catch {
      onActionError("Something went wrong. Please try again.");
    } finally {
      setPendingItemId(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing here"
        description="No drafts in this section right now."
        className="border-0 bg-transparent py-6 shadow-none"
      />
    );
  }

  return (
    <ul className="divide-y divide-cos-border">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const isItemPending = pendingItemId === item.id;

        return (
          <li key={item.id} className="px-6 py-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <button
                  type="button"
                  onClick={() => onToggleExpand(item.id)}
                  className="group inline-flex max-w-full items-start gap-1.5 text-left"
                  aria-expanded={isExpanded}
                >
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-cos-muted transition-transform",
                      isExpanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-cos-text transition-colors group-hover:text-cos-primary">
                    {channelLabel(item.channel)} · {item.eventTitle}
                  </span>
                </button>
                <p className="pl-5 text-xs text-cos-muted">
                  Requested {formatDateTime(item.requestedAt)}
                  {item.assigneeDisplayName
                    ? ` · Assigned to ${item.assigneeDisplayName}`
                    : null}
                </p>
                {item.notes && item.communicationStatus === "changes_requested" && (
                  <ChangeRequestNotes notes={item.notes} />
                )}
                {showCommentForm && item.submittedByMe ? (
                  <div className="mt-2 flex items-center gap-2 pl-5">
                    <p className="text-xs text-cos-muted">
                      Add a follow-up comment before resubmitting
                    </p>
                    <ChangeRequestCommentDialog
                      key={item.id}
                      item={item}
                      onActionError={onActionError}
                    />
                  </div>
                ) : null}
              </div>

              {isExpanded && (
                <div className="w-full shrink-0 sm:w-72">
                  <ApprovalQueuePreviewPanel
                    eventTitle={item.eventTitle}
                    preview={item.preview}
                  />
                </div>
              )}

              {showActions && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pendingItemId !== null}
                    onClick={() =>
                      runApprovalAction(item, () =>
                        approveCommunicationAction(
                          item.eventId,
                          item.communicationItemId,
                        ),
                      )
                    }
                  >
                    {isItemPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pendingItemId !== null}
                    onClick={() => {
                      const notes = window.prompt(
                        "What should change before approval?",
                      );
                      if (notes === null) {
                        return;
                      }

                      void runApprovalAction(item, () =>
                        requestCommunicationChangesAction(
                          item.eventId,
                          item.communicationItemId,
                          notes,
                        ),
                      );
                    }}
                  >
                    {isItemPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Request changes
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ApprovalsHub({
  assignedToMe,
  allPending,
  changesRequested,
  recentlyApproved,
  eventIdFilter = null,
}: ApprovalsHubProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const scopedAssignedToMe = filterByEvent(assignedToMe, eventIdFilter);
  const scopedAllPending = filterByEvent(allPending, eventIdFilter);
  const scopedChangesRequested = filterByEvent(changesRequested, eventIdFilter);
  const scopedRecentlyApproved = filterByEvent(recentlyApproved, eventIdFilter);
  const otherPending = scopedAllPending.filter((item) => !item.assignedToMe);

  function handleToggleExpand(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="studio-page space-y-10">
      <CalendarActionToast
        message={actionError}
        onDismiss={() => setActionError(null)}
      />
      <header className="border-b border-cos-border pb-8">
        <div className="flex items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-cos-border bg-cos-card">
            <CheckCircle2 className="h-5 w-5 text-cos-accent" strokeWidth={1.5} />
          </div>
          <div>
            <p className="studio-eyebrow">Workspace</p>
            <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">Approvals</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
              Review drafts routed from your responsibility matrix — assigned
              approvers see their queue first.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          padding="none"
          className="overflow-hidden border-l-4 border-l-red-500 scroll-mt-8"
          id="needs-approval"
        >
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Assigned to you</CardTitle>
            <CardDescription>
              Drafts waiting on your org role from the matrix.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList
            items={scopedAssignedToMe}
            showActions
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onActionError={setActionError}
          />
        </Card>

        <Card padding="none" className="overflow-hidden scroll-mt-8" id="other-pending">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Other pending</CardTitle>
            <CardDescription>
              Drafts waiting on someone else in your organization.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList
            items={otherPending}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onActionError={setActionError}
          />
        </Card>

        <Card
          padding="none"
          className="overflow-hidden border-l-4 border-l-cos-change-request scroll-mt-8"
          id="changes-requested"
        >
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Changes requested</CardTitle>
            <CardDescription>
              Drafts sent back for edits before they can be approved.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList
            items={scopedChangesRequested}
            showCommentForm
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onActionError={setActionError}
          />
        </Card>

        <Card padding="none" className="overflow-hidden scroll-mt-8" id="approved">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Recently approved</CardTitle>
            <CardDescription>
              Communications cleared and ready to publish.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList
            items={scopedRecentlyApproved}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onActionError={setActionError}
          />
        </Card>
      </div>
    </div>
  );
}
