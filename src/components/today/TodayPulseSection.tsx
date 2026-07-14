import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDot } from "lucide-react";
import { channelLabel } from "@/lib/ai/content";
import type { ApprovalQueueItem } from "@/types/event-workspace";
import type { GoodNewsItem } from "@/types/today";

interface TodayPulseSectionProps {
  pendingApprovals: ApprovalQueueItem[];
  totalPendingCount: number;
  recentPublished: GoodNewsItem[];
}

const PREVIEW_LIMIT = 2;

export function TodayPulseSection({
  pendingApprovals,
  totalPendingCount,
  recentPublished,
}: TodayPulseSectionProps) {
  const approvalPreview = pendingApprovals.slice(0, PREVIEW_LIMIT);
  const publishedPreview = recentPublished.slice(0, PREVIEW_LIMIT);
  const teamPendingCount = Math.max(totalPendingCount - pendingApprovals.length, 0);

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <PulseCard
        title="Needs your review"
        viewAllHref="/approvals"
        viewAllLabel={
          pendingApprovals.length > PREVIEW_LIMIT
            ? `View all ${pendingApprovals.length} for you`
            : totalPendingCount > 0
              ? "View approvals"
              : "Open approvals"
        }
      >
        {approvalPreview.length > 0 ? (
          <ul className="space-y-3">
            {approvalPreview.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/events/${item.eventId}#schedule`}
                  className="group block space-y-0.5 transition-colors"
                >
                  <p className="text-sm font-medium text-cos-text group-hover:text-cos-primary">
                    {channelLabel(item.channel)} · {item.eventTitle}
                  </p>
                  <p className="text-xs text-cos-muted">Waiting on your sign-off</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-cos-muted">Nothing needs your sign-off right now.</p>
            {teamPendingCount > 0 && (
              <p className="text-xs text-cos-muted">
                {teamPendingCount === 1
                  ? "1 item is with someone else on your team."
                  : `${teamPendingCount} items are with your team.`}
              </p>
            )}
          </div>
        )}
      </PulseCard>

      <PulseCard
        title="Recently published"
        viewAllHref="/approvals"
        viewAllLabel="View publishing"
      >
        {publishedPreview.length > 0 ? (
          <ul className="space-y-3">
            {publishedPreview.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="group flex gap-2.5 transition-colors"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-cos-success"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="min-w-0 space-y-0.5">
                      <p className="text-sm text-cos-text group-hover:text-cos-primary">
                        {item.message}
                      </p>
                      <p className="text-xs text-cos-muted">{item.timestampLabel}</p>
                    </span>
                  </Link>
                ) : (
                  <div className="flex gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-cos-success"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="min-w-0 space-y-0.5">
                      <p className="text-sm text-cos-text">{item.message}</p>
                      <p className="text-xs text-cos-muted">{item.timestampLabel}</p>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex gap-2.5">
            <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted/50" aria-hidden />
            <p className="text-sm text-cos-muted">Nothing published in the last couple of weeks.</p>
          </div>
        )}
      </PulseCard>
    </section>
  );
}

interface PulseCardProps {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  children: React.ReactNode;
}

function PulseCard({ title, viewAllHref, viewAllLabel, children }: PulseCardProps) {
  return (
    <article className="cos-card flex flex-col">
      <p className="cos-section-title">{title}</p>
      <div className="mt-4 flex-1">{children}</div>
      <Link
        href={viewAllHref}
        className="mt-5 inline-flex items-center gap-1 text-xs font-medium tracking-wide text-cos-text transition-colors hover:text-cos-primary"
      >
        {viewAllLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </article>
  );
}
