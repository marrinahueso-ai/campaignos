"use client";

import { Pencil, Plus } from "lucide-react";
import type { DashboardLayout } from "@/lib/today/dashboard-widgets";
import { cn } from "@/lib/utils/cn";

interface DashboardOverviewProps {
  layout: DashboardLayout;
  main: React.ReactNode;
  rail: React.ReactNode;
  className?: string;
}

/**
 * Phase 1 shell: mockup chrome with Add/Edit controls.
 * Phase 2 wires real picker + reorder to saved layout.
 */
export function DashboardOverview({
  layout: _layout,
  main,
  rail,
  className,
}: DashboardOverviewProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-cos-text">Your overview</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Widget customization coming in Phase 2"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-card px-3 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add
          </button>
          <button
            type="button"
            title="Widget customization coming in Phase 2"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cos-border bg-cos-card px-3 text-sm font-medium text-cos-text transition-colors hover:bg-cos-bg"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-x-6">
        <div className="min-w-0 flex-1">
          <div className="grid gap-4 sm:grid-cols-2">{main}</div>
        </div>
        <aside className="flex w-full flex-col gap-4 lg:max-w-sm lg:flex-none lg:basis-[min(100%,20rem)]">
          {rail}
        </aside>
      </div>
    </section>
  );
}
