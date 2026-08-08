"use client";

import type { ReactNode } from "react";
import { ClipboardList, FileText, StickyNote } from "lucide-react";
import {
  ew,
  ewPlanningActive,
  ewPlanningIdle,
} from "@/components/events-phase3/event-workspace-tokens";
import { cn } from "@/lib/utils/cn";

export type PlanningSubTab = "tasks" | "notes" | "files";

type Props = {
  active: PlanningSubTab;
  taskCount?: number | null;
  noteCount?: number | null;
  fileCount?: number | null;
  onSelect: (tab: PlanningSubTab) => void;
  children: ReactNode;
};

const SUB_TABS: {
  id: PlanningSubTab;
  label: string;
  icon: typeof ClipboardList;
}[] = [
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "files", label: "Files", icon: FileText },
];

export function EventPlanningShell({
  active,
  taskCount = null,
  noteCount = null,
  fileCount = null,
  onSelect,
  children,
}: Props) {
  const counts: Record<PlanningSubTab, number | null> = {
    tasks: taskCount,
    notes: noteCount,
    files: fileCount,
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={cn("font-display text-2xl", ew.ink)}>Planning</h2>
          <p className={cn("mt-1 text-sm", ew.inksoft)}>
            Tasks, notes, and files for this event
          </p>
        </div>
      </div>

      <nav
        className="flex flex-wrap gap-1 border-b border-[#e6dfd5]"
        aria-label="Planning sections"
        role="tablist"
      >
        {SUB_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const count = counts[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`event-detail-tab-${id}`}
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 pb-3 text-sm font-semibold transition",
                isActive ? ewPlanningActive : ewPlanningIdle,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {count !== null && count !== undefined ? (
                <span className="tabular-nums text-[#5e6b65]">{count}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div>{children}</div>
    </section>
  );
}
