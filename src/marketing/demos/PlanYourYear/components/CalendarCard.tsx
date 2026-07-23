"use client";

import { DemoGrip } from "@/marketing/demos/_shared/DemoGrip";

interface CalendarCardProps {
  category: string;
  title: string;
  status: string;
  dimmed?: boolean;
  highlighted?: boolean;
  className?: string;
}

const STATUS_CLASS: Record<string, string> = {
  Scheduled:
    "border-[var(--cos-border)] text-[var(--cos-muted)]",
  Draft: "border-[var(--cos-border)] text-[var(--cos-muted)]",
  Published:
    "border-[var(--cos-brand-sage)]/50 text-[var(--cos-brand-sage)]",
  Overdue: "border-[var(--cos-error)]/40 text-[var(--cos-error)]",
};

export function CalendarCard({
  category,
  title,
  status,
  dimmed = false,
  highlighted = false,
  className,
}: CalendarCardProps) {
  return (
    <div
      className={
        className ??
        [
          "flex gap-1.5 rounded-lg border bg-[var(--cos-card)] px-1.5 py-1.5 shadow-sm",
          highlighted
            ? "border-[var(--cos-accent)] ring-1 ring-[var(--cos-accent)]/30"
            : "border-[var(--cos-border)]",
          dimmed ? "opacity-35" : "",
        ].join(" ")
      }
    >
      <DemoGrip />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] tracking-wide text-[var(--cos-muted)] uppercase">
          {category}
        </p>
        <p className="truncate text-[11px] font-medium leading-tight text-[var(--cos-text)] sm:text-xs">
          {title}
        </p>
        <span
          className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] leading-none ${STATUS_CLASS[status] ?? STATUS_CLASS.Scheduled}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
