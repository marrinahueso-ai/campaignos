import {
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Milestone,
} from "lucide-react";
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
}> = [
  { key: "milestones", label: "Milestones", icon: Milestone },
  { key: "pendingApprovals", label: "Pending Approvals", icon: CheckCircle2 },
  { key: "scheduledPosts", label: "Scheduled Posts", icon: ClipboardList },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "files", label: "Files", icon: FileText },
];

interface EventDetailHeroStatsStripProps {
  stats: EventDetailHeroStats;
  className?: string;
}

export function EventDetailHeroStatsStrip({
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
        return (
          <div key={stat.key} className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cos-bg text-cos-muted">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg leading-none text-cos-text tabular-nums">
                {stats[stat.key]}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-cos-muted">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
