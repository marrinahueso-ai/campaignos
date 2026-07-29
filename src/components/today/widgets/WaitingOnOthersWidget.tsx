"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock3 } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { DashboardWidgetLensToggle } from "@/components/today/widgets/DashboardWidgetLensToggle";
import type {
  DashboardLibraryWidgetData,
  DashboardWaitingOnOthersItem,
  DashboardWidgetLens,
} from "@/lib/today/dashboard-library-widget-filters";
import { cn } from "@/lib/utils/cn";

interface WaitingOnOthersWidgetProps {
  data: DashboardLibraryWidgetData["waitingOthers"];
}

export function WaitingOnOthersWidget({ data }: WaitingOnOthersWidgetProps) {
  const [lens, setLens] = useState<DashboardWidgetLens>("mine");
  const mineCount = data.mine.length;
  const everyone = data.everyone;
  const everyoneTotal =
    everyone.blockedApprovals + everyone.blockedTasks + everyone.overThreeDays;

  return (
    <DashboardWidgetCard icon={Clock3} title="Waiting on others">
      <DashboardWidgetLensToggle
        value={lens}
        onChange={setLens}
        label="Waiting lens"
        className="mb-3"
      />

      {lens === "mine" ? (
        mineCount === 0 ? (
          <p className="flex items-center gap-2 text-sm text-cos-muted">
            <Check className="h-4 w-4 text-cos-success" aria-hidden />
            Nothing is waiting on teammates for you.
          </p>
        ) : (
          <div className="flex h-full flex-col">
            <ul className="space-y-2.5">
              {data.mine.slice(0, 3).map((item) => (
                <WaitingRow key={item.id} item={item} />
              ))}
            </ul>
            <Link
              href="/approvals?scope=mine"
              className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
            >
              View all ({mineCount}) →
            </Link>
          </div>
        )
      ) : everyoneTotal === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          No bottlenecks on the board right now.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="divide-y divide-cos-border/60">
            <MetricRow
              href="/approvals?scope=all&tab=in_queue"
              label="Blocked on approvals"
              count={everyone.blockedApprovals}
            />
            <MetricRow
              href="/tasks?scope=all"
              label="Blocked on tasks"
              count={everyone.blockedTasks}
            />
            <MetricRow
              href="/approvals?scope=all&tab=in_queue"
              label="Over 3 days old"
              count={everyone.overThreeDays}
              highlight={everyone.overThreeDays > 0}
            />
          </ul>
          <Link
            href="/approvals"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            See who&apos;s stuck →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function WaitingRow({ item }: { item: DashboardWaitingOnOthersItem }) {
  const who = item.waitingOnRole
    ? `${item.waitingOnName} (${item.waitingOnRole})`
    : item.waitingOnName;

  return (
    <li>
      <Link
        href={item.href}
        className="flex items-start justify-between gap-3 rounded-xl bg-cos-card/55 px-3 py-2.5 transition-colors hover:bg-cos-card/80"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-cos-text">
            {item.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-cos-muted">
            Waiting on <span className="font-medium text-cos-text">{who}</span>
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-cos-muted">
          {formatWaitingDays(item.waitingDays)}
        </span>
      </Link>
    </li>
  );
}

function MetricRow({
  href,
  label,
  count,
  highlight = false,
}: {
  href: string;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2.5">
      <Link
        href={href}
        className="text-sm font-medium text-cos-text transition-colors hover:text-cos-brand-sage"
      >
        {label}
      </Link>
      <span
        className={cn(
          "font-display text-xl font-semibold tabular-nums",
          highlight ? "text-cos-error-text" : "text-cos-text",
        )}
      >
        {count}
      </span>
    </li>
  );
}

function formatWaitingDays(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
