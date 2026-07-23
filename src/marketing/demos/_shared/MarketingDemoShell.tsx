"use client";

import type { ReactNode } from "react";

interface MarketingDemoShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
  /** Optional right-side header meta (e.g. filter label). */
  meta?: ReactNode;
}

/**
 * Shared product-window chrome for public marketing demos.
 * Fixed height keeps Features half-column mounts consistent and uncropped.
 */
export function MarketingDemoShell({
  eyebrow,
  title,
  children,
  className,
  meta,
}: MarketingDemoShellProps) {
  return (
    <div
      className={
        className ??
        "flex h-[28rem] w-full flex-col overflow-hidden rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg)] shadow-sm sm:h-[30rem] lg:h-[32rem]"
      }
      data-marketing-demo-shell
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--cos-muted)] uppercase sm:text-xs">
            {eyebrow}
          </p>
          <p className="truncate font-serif text-base text-[var(--cos-text)] sm:text-lg">
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {meta}
          <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-[var(--cos-border)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--cos-border)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--cos-accent-soft)]" />
          </div>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
