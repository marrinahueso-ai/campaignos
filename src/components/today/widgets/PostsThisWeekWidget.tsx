"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Share2 } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { DashboardWidgetLensToggle } from "@/components/today/widgets/DashboardWidgetLensToggle";
import type {
  DashboardLibraryWidgetData,
  DashboardPostWeekItem,
  DashboardPostWeekStatus,
  DashboardWidgetLens,
} from "@/lib/today/dashboard-library-widget-filters";
import { cn } from "@/lib/utils/cn";

interface PostsThisWeekWidgetProps {
  data: DashboardLibraryWidgetData["postsWeek"];
}

export function PostsThisWeekWidget({ data }: PostsThisWeekWidgetProps) {
  const [lens, setLens] = useState<DashboardWidgetLens>("mine");
  const mineCount = data.mine.length;
  const everyone = data.everyone;
  const everyoneTotal =
    everyone.scheduledThisWeek +
    everyone.needsApprovalFirst +
    everyone.goingOutToday;

  return (
    <DashboardWidgetCard icon={Share2} title="Posts this week">
      <DashboardWidgetLensToggle
        value={lens}
        onChange={setLens}
        label="Posts lens"
        className="mb-3"
      />

      {lens === "mine" ? (
        mineCount === 0 ? (
          <p className="flex items-center gap-2 text-sm text-cos-muted">
            <Check className="h-4 w-4 text-cos-success" aria-hidden />
            No posts on your queue this week.
          </p>
        ) : (
          <div className="flex h-full flex-col">
            <ul className="space-y-2.5">
              {data.mine.slice(0, 3).map((item) => (
                <PostRow key={item.id} item={item} />
              ))}
            </ul>
            <Link
              href="/approvals?scope=mine"
              className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
            >
              View my queue ({mineCount}) →
            </Link>
          </div>
        )
      ) : everyoneTotal === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          Nothing scheduled for the board this week.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="divide-y divide-cos-border/60">
            <MetricRow
              href="/approvals?scope=all&tab=scheduled"
              label="Scheduled this week"
              count={everyone.scheduledThisWeek}
            />
            <MetricRow
              href="/approvals?scope=all&tab=in_queue"
              label="Need approval first"
              count={everyone.needsApprovalFirst}
            />
            <MetricRow
              href="/approvals?scope=all&tab=scheduled"
              label="Going out today"
              count={everyone.goingOutToday}
              highlight={everyone.goingOutToday > 0}
            />
          </ul>
          <Link
            href="/approvals"
            className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
          >
            Open publishing queue →
          </Link>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function PostRow({ item }: { item: DashboardPostWeekItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-start justify-between gap-3 rounded-xl bg-cos-card/55 px-3 py-2.5 transition-colors hover:bg-cos-card/80"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-cos-text">
            {item.eventTitle} — {item.postTitle}
          </span>
          <span className="mt-0.5 block truncate text-xs text-cos-muted">
            {item.channelLabel} · {item.scheduleLabel}
          </span>
        </span>
        <StatusPill status={item.status} />
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

function StatusPill({ status }: { status: DashboardPostWeekStatus }) {
  const label =
    status === "scheduled"
      ? "Ready"
      : status === "needs_approval"
        ? "Needs approval"
        : "Draft";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
        status === "scheduled" &&
          "bg-teal-100 text-teal-800 group-data-[card-tone=dark]/card:bg-teal-900/40 group-data-[card-tone=dark]/card:text-teal-100",
        status === "draft" &&
          "bg-amber-100 text-amber-900 group-data-[card-tone=dark]/card:bg-amber-900/35 group-data-[card-tone=dark]/card:text-amber-100",
        status === "needs_approval" &&
          "bg-orange-100 text-orange-900 group-data-[card-tone=dark]/card:bg-orange-900/35 group-data-[card-tone=dark]/card:text-orange-100",
      )}
    >
      {label}
    </span>
  );
}
