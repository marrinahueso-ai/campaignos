import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CalendarReviewStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accentClassName?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function CalendarReviewStatCard({
  label,
  value,
  icon: Icon,
  accentClassName = "bg-cos-accent-soft text-cos-accent",
  isActive = false,
  onClick,
}: CalendarReviewStatCardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      className={cn(
        "w-full rounded-xl border bg-white p-5 text-left shadow-sm transition-colors",
        isActive
          ? "border-cos-border ring-2 ring-cos-border"
          : "border-cos-border",
        isInteractive &&
          "cursor-pointer hover:border-cos-border hover:bg-cos-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-primary",
        !isInteractive && "cursor-default",
      )}
      aria-pressed={isInteractive ? isActive : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-cos-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-cos-text">
            {value}
          </p>
          {isInteractive && (
            <p className="mt-1 text-xs text-cos-dark-muted">Click to review</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}
