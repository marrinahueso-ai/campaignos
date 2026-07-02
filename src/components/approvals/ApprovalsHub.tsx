"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
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
}: {
  items: ApprovalQueueItem[];
  showActions?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
      {items.map((item) => (
        <li key={item.id} className="px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <Link
                href={`/events/${item.eventId}#schedule`}
                className="text-sm font-medium text-cos-text transition-colors hover:text-cos-primary"
              >
                {channelLabel(item.channel)} · {item.eventTitle}
              </Link>
              <p className="text-xs text-cos-muted">
                Requested {formatDateTime(item.requestedAt)}
                {item.assigneeDisplayName
                  ? ` · Assigned to ${item.assigneeDisplayName}`
                  : null}
              </p>
              {item.notes && item.communicationStatus === "changes_requested" && (
                <p className="text-xs text-cos-muted">{item.notes}</p>
              )}
            </div>

            {showActions && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await approveCommunicationAction(
                        item.eventId,
                        item.communicationItemId,
                      );
                      if (result.success) {
                        router.refresh();
                      }
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => {
                    const notes = window.prompt(
                      "What should change before approval?",
                    );
                    if (notes === null) {
                      return;
                    }

                    startTransition(async () => {
                      const result = await requestCommunicationChangesAction(
                        item.eventId,
                        item.communicationItemId,
                        notes,
                      );
                      if (result.success) {
                        router.refresh();
                      }
                    });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Request changes
                </Button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ApprovalsHub({
  assignedToMe,
  allPending,
  changesRequested,
  recentlyApproved,
}: ApprovalsHubProps) {
  const otherPending = allPending.filter((item) => !item.assignedToMe);

  return (
    <div className="studio-page space-y-10">
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
          <ApprovalQueueList items={assignedToMe} showActions />
        </Card>

        <Card padding="none" className="overflow-hidden scroll-mt-8" id="other-pending">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Other pending</CardTitle>
            <CardDescription>
              Drafts waiting on someone else in your organization.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList items={otherPending} />
        </Card>

        <Card padding="none" className="overflow-hidden scroll-mt-8" id="changes-requested">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Changes requested</CardTitle>
            <CardDescription>
              Drafts sent back for edits before they can be approved.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList items={changesRequested} />
        </Card>

        <Card padding="none" className="overflow-hidden scroll-mt-8" id="approved">
          <CardHeader className="border-b border-cos-border px-6 py-5">
            <CardTitle className="text-base">Recently approved</CardTitle>
            <CardDescription>
              Communications cleared and ready to publish.
            </CardDescription>
          </CardHeader>
          <ApprovalQueueList items={recentlyApproved} />
        </Card>
      </div>
    </div>
  );
}
