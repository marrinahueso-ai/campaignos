import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface InsightsSectionCardProps {
  title: string;
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
    <section className={cn("cos-card space-y-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="cos-section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
