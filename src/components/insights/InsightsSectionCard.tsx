import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface InsightsSectionCardProps {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function InsightsSectionCard({
  title,
  action,
  children,
  className,
}: InsightsSectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-cos-border bg-cos-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-cos-text">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
