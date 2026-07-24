import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DashboardWidgetCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Decorative ··· affordance; Edit mode handles remove/reorder. */
  showMenu?: boolean;
}

export function DashboardWidgetCard({
  icon: Icon,
  title,
  children,
  className,
  showMenu = true,
}: DashboardWidgetCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-2xl bg-cos-bg-alt p-5 shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
          <h2 className="truncate text-sm font-semibold text-cos-text">{title}</h2>
        </div>
        {showMenu ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-cos-muted"
            aria-hidden
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
