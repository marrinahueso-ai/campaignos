import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Send,
  UserRound,
} from "lucide-react";
import { CommunicationChannelIcon } from "@/components/event-playbooks/CommunicationChannelIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { TIMELINE_STEPS } from "@/lib/event-workspace/constants";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlanningOverviewData } from "@/types/planning-overview";
import type { ApprovalQueueItem, ActivityLogEntry } from "@/types/event-workspace";

interface PlanningOverviewPanelProps {
  eventId: string;
  overview: EventPlanningOverviewData;
}

function resolveItemTitle(item: ApprovalQueueItem): string {
  return (
    item.preview.milestoneTitle?.trim() ||
    item.preview.captionText?.trim()?.slice(0, 120) ||
    `${item.eventTitle} draft`
  );
}

function resolveDraftHref(
  eventId: string,
  section: "changes" | "pending" | "approved",
): string {
  const step = section === "changes" ? "schedule" : "publish";

  return `/events/${eventId}#${step}`;
}

function resolveApprovedBy(item: ApprovalQueueItem): string {
  if (item.status === "approved" && item.assigneeDisplayName) {
    return item.assigneeDisplayName;
  }

  return "Board";
}

function OverviewStatusCard({
  accent,
  icon: Icon,
  iconClassName,
  count,
  label,
  actionLabel,
  href,
  actionClassName,
  borderAccent = false,
}: {
  accent: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClassName: string;
  count: number;
  label: string;
  actionLabel: string;
  href: string;
  actionClassName: string;
  borderAccent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col border border-cos-border bg-cos-card p-5 shadow-sm",
        borderAccent && "border-l-4 border-l-[#e54d2e]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            accent,
          )}
        >
          <Icon className={cn("h-4 w-4", iconClassName)} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-3xl leading-none text-cos-text">{count}</p>
          <p className="mt-1.5 text-sm text-cos-muted">{label}</p>
        </div>
      </div>
      <Link
        href={href}
        className={cn(
          "mt-5 inline-flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium transition-colors",
          actionClassName,
        )}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function OverviewQueueList({
  eventId,
  items,
  emptyTitle,
  emptyDescription,
  section,
  showApprovedCheck = false,
  timestampPrefix,
}: {
  eventId: string;
  items: ApprovalQueueItem[];
  emptyTitle: string;
  emptyDescription: string;
  section: "changes" | "pending" | "approved";
  showApprovedCheck?: boolean;
  timestampPrefix: "Requested" | "Approved";
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={emptyTitle}
        description={emptyDescription}
        className="border-0 bg-transparent px-0 py-8 shadow-none"
      />
    );
  }

  return (
    <ul className="divide-y divide-cos-border border-t border-cos-border">
      {items.slice(0, 4).map((item) => {
        const timestamp = item.resolvedAt ?? item.requestedAt;
        const metaSuffix =
          timestampPrefix === "Approved"
            ? `Approved by ${resolveApprovedBy(item)}`
            : item.assigneeDisplayName
              ? `Assigned to ${item.assigneeDisplayName}`
              : null;

        return (
          <li key={item.id}>
            <Link
              href={resolveDraftHref(eventId, section)}
              className="group flex items-start gap-3 px-1 py-4 transition-colors hover:bg-cos-bg/50"
            >
              <CommunicationChannelIcon channel={item.channel} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-cos-text group-hover:text-cos-primary">
                  {resolveItemTitle(item)}
                </p>
                <p className="mt-1 text-xs text-cos-muted">
                  {timestampPrefix} {formatDateTime(timestamp)}
                  {metaSuffix ? ` · ${metaSuffix}` : null}
                </p>
              </div>
              {showApprovedCheck ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-cos-success"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function resolveActivityDescription(entry: ActivityLogEntry): string | null {
  const preset = TIMELINE_STEPS.find(
    (step) => step.activityType === entry.activityType,
  );

  return entry.description ?? preset?.description ?? null;
}

function ActivityTimeline({ timeline }: { timeline: ActivityLogEntry[] }) {
  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No activity yet"
        description="Campaign setup, approvals, and publishing updates will appear here."
        className="border-0 bg-transparent px-0 py-8 shadow-none"
      />
    );
  }

  return (
    <ul className="space-y-0 border-t border-cos-border">
      {timeline.slice(0, 6).map((entry, index) => {
        const isPublished = entry.activityType === "published";
        const description = resolveActivityDescription(entry);

        return (
          <li
            key={entry.id}
            className={cn(
              "flex gap-3 py-4",
              index > 0 && "border-t border-cos-border",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                isPublished ? "bg-cos-success-bg text-cos-success" : "bg-cos-bg-alt text-cos-muted",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-cos-text">
                <span className="font-semibold">{entry.title}</span>{" "}
                <span className="text-cos-muted">{formatDateTime(entry.occurredAt)}</span>
              </p>
              {description ? (
                <p className="mt-1 text-xs leading-relaxed text-cos-muted">
                  {description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PlanningOverviewPanel({
  eventId,
  overview,
}: PlanningOverviewPanelProps) {
  const scheduledHref = `/events/${eventId}#scheduled-milestones`;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStatusCard
          borderAccent
          accent="bg-[#fde8e4]"
          icon={UserRound}
          iconClassName="text-[#e54d2e]"
          count={overview.assignedToMeCount}
          label="Drafts to review"
          actionLabel="View my queue →"
          href={`/approvals?event=${eventId}#needs-approval`}
          actionClassName="bg-[#e54d2e] text-white hover:bg-[#cf4528]"
        />
        <OverviewStatusCard
          accent="bg-cos-status-progress-bg"
          icon={Clock3}
          iconClassName="text-cos-status-progress"
          count={overview.otherPendingCount}
          label="Drafts pending"
          actionLabel="View pending →"
          href={`/approvals?event=${eventId}#other-pending`}
          actionClassName="border border-cos-border bg-cos-bg text-cos-text hover:bg-cos-bg-alt"
        />
        <OverviewStatusCard
          accent="bg-cos-success-bg"
          icon={CheckCircle2}
          iconClassName="text-cos-success"
          count={overview.approvedThisWeekCount}
          label="This week"
          actionLabel="View all approved →"
          href={`/approvals?event=${eventId}#approved`}
          actionClassName="border border-cos-success/20 bg-cos-success-bg text-cos-success-text hover:bg-cos-success-bg/80"
        />
        <OverviewStatusCard
          accent="bg-cos-status-todo-bg"
          icon={Send}
          iconClassName="text-cos-status-todo"
          count={overview.scheduledCount}
          label="Scheduled"
          actionLabel="View scheduled →"
          href={scheduledHref}
          actionClassName="border border-cos-border bg-cos-card text-cos-text hover:bg-cos-bg-alt"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-cos-border bg-cos-card shadow-sm">
          <div className="border-b border-cos-border px-6 py-5">
            <h2 className="font-display text-xl text-cos-text">Changes requested</h2>
            <p className="mt-1 text-sm text-cos-muted">
              Drafts sent back for edits before they can be approved.
            </p>
          </div>
          <div className="px-5 pb-2">
            <OverviewQueueList
              eventId={eventId}
              items={overview.changesRequested}
              emptyTitle="No change requests"
              emptyDescription="Drafts sent back for edits will show up here."
              section="changes"
              timestampPrefix="Requested"
            />
          </div>
          <div className="border-t border-cos-border px-6 py-4">
            <Link
              href={`/approvals?event=${eventId}#changes-requested`}
              className="text-sm font-semibold text-cos-text hover:text-cos-primary"
            >
              View all changes requested →
            </Link>
          </div>
        </section>

        <section className="border border-cos-border bg-cos-card shadow-sm">
          <div className="border-b border-cos-border px-6 py-5">
            <h2 className="font-display text-xl text-cos-text">Recently approved</h2>
            <p className="mt-1 text-sm text-cos-muted">
              Communications cleared and ready to publish.
            </p>
          </div>
          <div className="px-5 pb-2">
            <OverviewQueueList
              eventId={eventId}
              items={overview.recentlyApproved}
              emptyTitle="Nothing approved yet"
              emptyDescription="Approved communications will appear here once cleared."
              section="approved"
              showApprovedCheck
              timestampPrefix="Approved"
            />
          </div>
          <div className="border-t border-cos-border px-6 py-4">
            <Link
              href={`/approvals?event=${eventId}#approved`}
              className="text-sm font-semibold text-cos-text hover:text-cos-primary"
            >
              View all approved →
            </Link>
          </div>
        </section>
      </div>

      <section className="border border-cos-border bg-cos-card shadow-sm">
        <div className="border-b border-cos-border px-6 py-5">
          <h2 className="font-display text-xl text-cos-text">Activity</h2>
          <p className="mt-1 text-sm text-cos-muted">
            Recent campaign activity from setup through approval and publication.
          </p>
        </div>
        <div className="px-6 pb-2">
          <ActivityTimeline timeline={overview.timeline} />
        </div>
      </section>
    </div>
  );
}
