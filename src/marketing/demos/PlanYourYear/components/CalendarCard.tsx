"use client";

import { DemoGrip } from "@/marketing/demos/_shared/DemoGrip";

export type DemoCardKind = "event" | "post";
export type DemoCardStatus = "Draft" | "Scheduled" | "Published";
export type DemoPlatform = "fb" | "ig";

interface CalendarCardProps {
  kind: DemoCardKind;
  category: string;
  title: string;
  status: DemoCardStatus;
  platforms?: readonly DemoPlatform[];
  showGrip?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  className?: string;
}

const STATUS_CLASS: Record<DemoCardStatus, string> = {
  Scheduled:
    "border-[var(--cos-border)] bg-[var(--cos-bg)] text-[var(--cos-muted)]",
  Draft:
    "border-[color-mix(in_srgb,var(--cos-accent)_40%,var(--cos-border))] bg-[var(--cos-accent-soft)] text-[var(--cos-warning-text)]",
  Published:
    "border-[var(--cos-brand-sage)]/45 bg-[var(--cos-brand-sage-soft)] text-[var(--cos-brand-sage)]",
};

export function CalendarCard({
  kind,
  category,
  title,
  status,
  platforms,
  showGrip = false,
  highlighted = false,
  dimmed = false,
  className,
}: CalendarCardProps) {
  return (
    <div
      className={
        className ??
        [
          "flex gap-1 rounded-md border bg-[var(--cos-card)] px-1 py-1 shadow-sm",
          highlighted
            ? "border-[var(--cos-accent)] ring-1 ring-[var(--cos-accent)]/30"
            : kind === "event"
              ? "border-[var(--cos-border)] border-l-[3px] border-l-[var(--cos-accent)]/65"
              : "border-[var(--cos-border)]",
          dimmed ? "opacity-35" : "",
        ].join(" ")
      }
    >
      {showGrip ? (
        <DemoGrip className="grid shrink-0 grid-cols-2 gap-0.5 self-center p-0.5 text-[var(--cos-accent)]" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[8px] font-medium tracking-wide text-[var(--cos-muted)] uppercase sm:text-[9px]">
          {category}
        </p>
        <p className="truncate text-[10px] font-medium leading-tight text-[var(--cos-text)] sm:text-[11px]">
          {title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {platforms?.length ? <PlatformCues platforms={platforms} /> : null}
          <span
            className={`inline-flex rounded px-1 py-px text-[8px] leading-none font-medium sm:text-[9px] ${STATUS_CLASS[status]}`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlatformCues({ platforms }: { platforms: readonly DemoPlatform[] }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {platforms.includes("fb") ? (
        <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#1877F2] text-[6px] font-bold text-white">
          f
        </span>
      ) : null}
      {platforms.includes("ig") ? (
        <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#E4405F] text-[6px] font-bold text-white">
          ig
        </span>
      ) : null}
    </span>
  );
}
