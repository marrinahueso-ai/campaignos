import Link from "next/link";
import {
  createWithAiHref,
  eventDetailApprovalsHref,
  eventTasksHref,
  eventVolunteersHref,
} from "@/lib/events/event-responsibility";
import { cn } from "@/lib/utils/cn";

export type EventDetailHeroStats = {
  milestones: number;
  pendingApprovals: number;
  scheduledPosts: number;
  tasks: number;
  filledSpots: number;
};

export type EventDetailHeroStatTab = "approvals" | "tasks" | "volunteers";

const STATS: Array<{
  key: keyof EventDetailHeroStats;
  label: string;
  href: (eventId: string) => string;
  /** In-page event tab; omit for route handoffs (e.g. Create with AI). */
  tab?: EventDetailHeroStatTab;
  /** Hard navigate for heavy Create with AI handoff (matches EventDetailShell). */
  hardNavigate?: boolean;
}> = [
  {
    key: "milestones",
    label: "Milestones",
    href: createWithAiHref,
    hardNavigate: true,
  },
  {
    key: "pendingApprovals",
    label: "Pending Approvals",
    href: eventDetailApprovalsHref,
    tab: "approvals",
  },
  {
    key: "scheduledPosts",
    label: "Scheduled Posts",
    href: eventDetailApprovalsHref,
    tab: "approvals",
  },
  {
    key: "tasks",
    label: "Tasks",
    href: eventTasksHref,
    tab: "tasks",
  },
  {
    key: "filledSpots",
    label: "Filled",
    href: eventVolunteersHref,
    tab: "volunteers",
  },
];

interface EventDetailHeroStatsStripProps {
  eventId: string;
  stats: EventDetailHeroStats;
  className?: string;
  /** Switch Event Detail tab without full reload (same-page deep links). */
  onSelectTab?: (tab: EventDetailHeroStatTab) => void;
}

export function EventDetailHeroStatsStrip({
  eventId,
  stats,
  className,
  onSelectTab,
}: EventDetailHeroStatsStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2.5 border-t border-cos-border pt-3 sm:grid-cols-3 xl:grid-cols-5",
        className,
      )}
    >
      {STATS.map((stat) => {
        const href = stat.href(eventId);
        return (
          <Link
            key={stat.key}
            href={href}
            prefetch={false}
            onClick={(event) => {
              if (stat.hardNavigate) {
                event.preventDefault();
                window.location.assign(href);
                return;
              }
              if (stat.tab && onSelectTab) {
                event.preventDefault();
                onSelectTab(stat.tab);
              }
            }}
            className={cn(
              "group flex min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg px-2.5 py-2 text-center",
              "border border-cos-border/80 bg-cos-brand-navy-soft/35",
              "outline-none transition-colors",
              "hover:border-cos-brand-mustard/50 hover:bg-cos-brand-mustard-soft/50",
              "focus-visible:ring-2 focus-visible:ring-cos-brand-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-cos-card",
            )}
          >
            <p className="font-display text-lg leading-none text-cos-brand-navy tabular-nums">
              {stats[stat.key]}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11px] leading-snug text-cos-muted",
                "transition-colors group-hover:text-cos-brand-navy group-hover:underline group-hover:decoration-cos-brand-mustard/60 group-hover:underline-offset-2",
              )}
            >
              {stat.label}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
