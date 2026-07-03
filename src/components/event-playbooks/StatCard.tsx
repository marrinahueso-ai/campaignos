import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border border-cos-border bg-cos-card p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />}
      </div>
      <p className="font-display text-2xl text-cos-text">{value}</p>
      {hint && <p className="text-xs leading-relaxed text-cos-muted">{hint}</p>}
    </div>
  );
}
