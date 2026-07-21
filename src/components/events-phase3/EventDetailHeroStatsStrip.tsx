import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  ListChecks,
  Milestone,
} from "lucide-react";
import {
  createWithAiHref,
  eventDetailApprovalsHref,
  eventFilesHref,
  eventTasksHref,
} from "@/lib/events/event-responsibility";
import { cn } from "@/lib/utils/cn";

export type EventDetailHeroStats = {
  milestones: number;
  pendingApprovals: number;
  scheduledPosts: number;
  tasks: number;
  files: number;
};

export type EventDetailHeroStatTab = "approvals" | "tasks" | "files";

const STATS: Array<{
  key: keyof EventDetailHeroStats;
  label: string;
  icon: typeof ListChecks;
  href: (eventId: string) => string;
  /** In-page event tab; omit for route handoffs (e.g. Create with AI). */
  tab?: EventDetailHeroStatTab;
  /** Hard navigate for heavy Create with AI handoff (matches EventDetailShell). */
  hardNavigate?: boolean;
}> = [
  {
    key: "milestones",
    label: "Milestones",
    icon: Milestone,
    href: createWithAiHref,
    hardNavigate: true,
  },
  {
    key: "pendingApprovals",
    label: "Pending Approvals",
    icon: CheckCircle2,
    href: eventDetailApprovalsHref,
    tab: "approvals",
  },
  {
    key: "scheduledPosts",
    label: "Scheduled Posts",
    icon: ClipboardList,
    href: eventDetailApprovalsHref,
    tab: "approvals",
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: ListChecks,
    href: eventTasksHref,
    tab: "tasks",
  },
  {
    key: "files",
    label: "Files",
    icon: FileText,
    href: eventFilesHref,
    tab: "files",
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
        const Icon = stat.icon;
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
              "group flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-cos-border bg-cos-bg px-2.5 py-2",
              "outline-none transition-colors",
              "hover:border-cos-accent hover:bg-cos-card",
              "focus-visible:ring-2 focus-visible:ring-cos-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cos-card",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cos-border bg-cos-card text-cos-muted",
                "transition-colors group-hover:border-cos-accent group-hover:text-cos-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-none text-cos-text tabular-nums">
                {stats[stat.key]}
              </p>
              <p
                className={cn(
                  "mt-0.5 inline-flex max-w-full items-center gap-0.5 text-[11px] leading-snug text-cos-muted",
                  "transition-colors group-hover:text-cos-text group-hover:underline group-hover:decoration-cos-accent/50 group-hover:underline-offset-2",
                )}
              >
                <span className="truncate">{stat.label}</span>
                <ChevronRight
                  className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  strokeWidth={2}
                  aria-hidden
                />
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
