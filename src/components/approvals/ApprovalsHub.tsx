"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, RotateCcw } from "lucide-react";
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
  approveCommunicationAction,
  requestCommunicationChangesAction,
} from "@/lib/event-workspace/actions";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { ApprovalQueueItem } from "@/types/event-workspace";

interface ApprovalsHubProps {
  assignedToMe: ApprovalQueueItem[];
  allPending: ApprovalQueueItem[];
  changesRequested: ApprovalQueueItem[];
  recentlyApproved: ApprovalQueueItem[];
}

function ApprovalQueueList({
  items,
  showActions = false,
  expandedId,
  onToggleExpand,
  onActionError,
}: {
  items: ApprovalQueueItem[];
  showActions?: boolean;
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
                  <p className="pl-5 text-xs text-cos-muted">{item.notes}</p>
                )}
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
}: ApprovalsHubProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const otherPending = allPending.filter((item) => !item.assignedToMe);

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
        <Card padding="none" className="overflow-hidden scroll-mt-8" id="needs-approval">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Assigned to you</CardTitle>
            <CardDescription>
              Drafts waiting on your org role from the matrix.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList
            items={assignedToMe}
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

        <Card padding="none" className="overflow-hidden scroll-mt-8" id="changes-requested">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Changes requested</CardTitle>
            <CardDescription>
              Drafts sent back for edits before they can be approved.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList
            items={changesRequested}
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
            items={recentlyApproved}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onActionError={setActionError}
          />
        </Card>
      </div>
    </div>
  );
}
