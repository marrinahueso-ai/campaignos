"use client";

import {
  CalendarDays,
  Clock,
  Columns3,
  FolderOpen,
  Kanban,
  Table2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TasksV2ViewTab } from "@/types/tasks-v2";

const TABS: {
  id: TasksV2ViewTab;
  label: string;
  icon: typeof Table2;
  ready: boolean;
}[] = [
  { id: "main_table", label: "Main Table", icon: Table2, ready: true },
  { id: "my_tasks", label: "My Tasks", icon: User, ready: false },
  { id: "calendar", label: "Calendar", icon: CalendarDays, ready: false },
  { id: "kanban", label: "Kanban", icon: Kanban, ready: false },
  { id: "timeline", label: "Timeline", icon: Clock, ready: false },
  { id: "workload", label: "Workload", icon: Columns3, ready: false },
  { id: "files", label: "Files", icon: FolderOpen, ready: false },
];

interface TasksV2TabsProps {
  activeTab: TasksV2ViewTab;
  onTabChange: (tab: TasksV2ViewTab) => void;
}

export function TasksV2Tabs({ activeTab, onTabChange }: TasksV2TabsProps) {
  return (
    <div
      className="flex gap-0 overflow-x-auto border-b border-cos-border"
      role="tablist"
      aria-label="Task views"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-cos-dark text-cos-text"
                : "border-transparent text-cos-muted hover:text-cos-text",
              !tab.ready && !isActive && "opacity-70",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function parseTasksV2Tab(value: string | null): TasksV2ViewTab {
  const valid = TABS.map((tab) => tab.id);
  if (value && valid.includes(value as TasksV2ViewTab)) {
    return value as TasksV2ViewTab;
  }
  return "main_table";
}
