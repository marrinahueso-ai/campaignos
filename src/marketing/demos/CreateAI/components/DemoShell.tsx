"use client";

import type { ReactNode } from "react";
import { CREATE_AI_DEMO } from "../demoData";

interface DemoShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Simplified product window chrome for the Create with AI marketing demo.
 * Static marketing recreation — does not import dashboard components.
 */
export function DemoShell({ children, className }: DemoShellProps) {
  return (
    <div
      className={
        className ??
        "flex h-full min-h-[22rem] w-full flex-col overflow-hidden rounded-2xl border border-[var(--cos-border)] bg-[var(--cos-bg)] shadow-sm sm:min-h-[26rem] md:aspect-[16/10] md:min-h-0"
      }
      data-create-ai-demo-shell
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--cos-border)] bg-[var(--cos-card)] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--cos-muted)] sm:text-xs">
            {CREATE_AI_DEMO.labels.workspace}
          </p>
          <p className="truncate font-serif text-base text-[var(--cos-text)] sm:text-lg">
            {CREATE_AI_DEMO.event.title}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[var(--cos-border)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--cos-border)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--cos-accent-soft)]" />
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
