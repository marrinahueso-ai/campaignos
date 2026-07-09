"use client";

import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

const MY_VIEWS = [
  { id: "my_tasks", label: "My Tasks" },
  { id: "assigned", label: "Assigned to Me" },
  { id: "this_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

const AI_INSIGHTS = [
  "Consider creating a volunteer training guide",
  "3 tasks share the same due date — batch them",
  "Back to School Fair needs 2 more owners assigned",
];

interface TasksV2SidebarProps {
  eventGroups: TasksV2EventGroup[];
  onViewSelect?: (viewId: string) => void;
}

export function TasksV2Sidebar({ eventGroups, onViewSelect }: TasksV2SidebarProps) {
  const defaultEvent = eventGroups[0];

  return (
    <aside className="flex flex-col gap-4">
      <section className="border border-cos-border bg-cos-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cos-accent" />
          <h2 className="font-display text-base text-cos-text">AI Task Generator</h2>
          <span className="rounded bg-[#dce8dc] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#3f5240] uppercase">
            New
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-cos-muted">
          Generate tasks from campaign context, playbooks, or event details.
        </p>
        <label className="mt-3 block text-xs text-cos-muted">
          Select source
          <select
            className="mt-1 w-full rounded-md border border-cos-border bg-cos-bg px-2 py-1.5 text-sm text-cos-text"
            defaultValue={defaultEvent?.eventId ?? ""}
          >
            {eventGroups.map((group) => (
              <option key={group.eventId} value={group.eventId}>
                {group.eventTitle}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="mt-3 w-full rounded-md bg-[#2a2622] px-3 py-2 text-xs font-medium text-[#f6f2eb] transition-opacity hover:opacity-90"
        >
          Generate tasks
        </button>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cos-accent hover:text-cos-text"
        >
          View suggestions (8)
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </section>

      <section className="border border-cos-border bg-cos-card p-4">
        <h2 className="font-display text-base text-cos-text">AI Insights</h2>
        <ul className="mt-3 space-y-3">
          {AI_INSIGHTS.map((insight) => (
            <li
              key={insight}
              className="flex items-start justify-between gap-2 text-xs leading-relaxed text-cos-muted"
            >
              <span>{insight}</span>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#2a2622] px-2 py-1 text-[10px] font-medium text-[#f6f2eb]"
              >
                <Plus className="h-3 w-3" />
                Add to tasks
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-cos-border bg-cos-card p-4">
        <h2 className="font-display text-base text-cos-text">My Views</h2>
        <ul className="mt-3 space-y-1">
          {MY_VIEWS.map((view) => (
            <li key={view.id}>
              <button
                type="button"
                onClick={() => onViewSelect?.(view.id)}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                )}
              >
                {view.label}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm text-cos-accent hover:bg-cos-bg"
            >
              <Plus className="h-3.5 w-3.5" />
              Create new view
            </button>
          </li>
        </ul>
      </section>
    </aside>
  );
}
