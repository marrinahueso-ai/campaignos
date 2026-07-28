"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SettingsBox({
  title,
  description,
  actions,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
        compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-2",
          compact ? "mb-3" : "mb-4",
        )}
      >
        <div>
          <h3
            className={cn(
              "font-display text-cos-text",
              compact ? "text-lg" : "text-xl",
            )}
          >
            {title}
          </h3>
          {description ? (
            <p
              className={cn(
                "text-cos-muted",
                compact
                  ? "mt-0.5 text-xs leading-snug sm:text-sm"
                  : "mt-1 text-sm",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
