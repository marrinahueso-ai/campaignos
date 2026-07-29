import Link from "next/link";
import { Bell, CheckSquare, ClipboardList, Users } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import type { TodayAttentionCounts } from "@/types/today";

interface AttentionWidgetProps {
  counts: TodayAttentionCounts;
}

export function AttentionWidget({ counts }: AttentionWidgetProps) {
  const rows = [
    {
      href: "/approvals",
      icon: ClipboardList,
      count: counts.reviewCount,
      label: counts.reviewCount === 1 ? "to review" : "to review",
    },
    {
      href: "/volunteers",
      icon: Users,
      count: counts.volunteerCount,
      label: counts.volunteerCount === 1 ? "needs volunteers" : "need volunteers",
    },
    {
      href: "/tasks?scope=mine&pulse=week",
      icon: CheckSquare,
      count: counts.tasksThisWeekCount,
      label: counts.tasksThisWeekCount === 1 ? "task this week" : "tasks this week",
    },
  ];

  return (
    <DashboardWidgetCard icon={Bell} title="Attention">
      <ul className="space-y-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.href}>
              <Link
                href={row.href}
                className="flex items-center gap-3 rounded-xl transition-colors hover:bg-cos-card/70"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cos-card text-cos-muted ring-1 ring-black/[0.04]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-2xl leading-none text-cos-text tabular-nums">
                    {row.count}
                  </span>
                  <span className="text-sm text-cos-muted">{row.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </DashboardWidgetCard>
  );
}
