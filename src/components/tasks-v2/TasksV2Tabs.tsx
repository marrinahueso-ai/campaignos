"use client";

import {
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
}[] = [
  { id: "main_table", label: "Main Table", icon: Table2 },
  { id: "my_tasks", label: "My Tasks", icon: User },
  { id: "kanban", label: "Board", icon: Kanban },
  { id: "files", label: "Files", icon: FolderOpen },
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
