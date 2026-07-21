import Link from "next/link";
import {
  CheckCircle2,
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

const STATS: Array<{
  key: keyof EventDetailHeroStats;
  label: string;
  icon: typeof ListChecks;
  href: (eventId: string) => string;
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
  },
  {
    key: "scheduledPosts",
    label: "Scheduled Posts",
    icon: ClipboardList,
    href: eventDetailApprovalsHref,
  },
  { key: "tasks", label: "Tasks", icon: ListChecks, href: eventTasksHref },
  { key: "files", label: "Files", icon: FileText, href: eventFilesHref },
];

interface EventDetailHeroStatsStripProps {
  eventId: string;
  stats: EventDetailHeroStats;
  className?: string;
}

export function EventDetailHeroStatsStrip({
  eventId,
  stats,
  className,
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
            onClick={
              stat.hardNavigate
                ? (event) => {
                    event.preventDefault();
                    window.location.assign(href);
                  }
                : undefined
            }
            className="group flex min-w-0 items-start gap-2 rounded-md outline-none transition-colors hover:bg-cos-bg/70 focus-visible:ring-2 focus-visible:ring-cos-border"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cos-bg text-cos-muted transition-colors group-hover:bg-cos-border/60 group-hover:text-cos-text">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg leading-none text-cos-text tabular-nums transition-colors group-hover:text-cos-text">
                {stats[stat.key]}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-cos-muted transition-colors group-hover:text-cos-text">
                {stat.label}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
