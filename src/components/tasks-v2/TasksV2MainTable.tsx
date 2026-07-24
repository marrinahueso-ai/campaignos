"use client";

import { useMemo, useState } from "react";
import { TasksV2EventGroupSection } from "@/components/tasks-v2/TasksV2EventGroup";
import { TasksV2Toolbar } from "@/components/tasks-v2/TasksV2Toolbar";
import type {
  TaskHubSortMode,
  TaskHubStatusFilter,
} from "@/lib/task-hub/list-filters";
import type { TasksV2EventGroup } from "@/types/tasks-v2";
import type { TaskHubEventOption, TaskHubOrgMember } from "@/types/task-hub";

interface TasksV2MainTableProps {
  eventGroups: TasksV2EventGroup[];
  canEdit: boolean;
  events: TaskHubEventOption[];
  orgMembers: TaskHubOrgMember[];
}

export function TasksV2MainTable({
  eventGroups,
  canEdit,
  orgMembers,
}: TasksV2MainTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<TaskHubSortMode>("default");
  const [statusFilter, setStatusFilter] = useState<TaskHubStatusFilter>("all");
  const [personFilter, setPersonFilter] = useState("");

  const totalTasks = useMemo(
    () => eventGroups.reduce((sum, group) => sum + group.tasks.length, 0),
    [eventGroups],
  );

  const filteredCount = useMemo(() => {
    return eventGroups.reduce((sum, group) => {
      let tasks = group.tasks;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        tasks = tasks.filter((task) =>
          [task.title, task.assigneeName, group.eventTitle]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        );
      }
      if (statusFilter !== "all") {
        tasks = tasks.filter((task) => task.status === statusFilter);
      }
      if (personFilter.trim()) {
        const query = personFilter.trim();
        tasks = tasks.filter((task) => {
          if (task.assigneeUserId && task.assigneeUserId === query) {
            return true;
          }
          return (task.assigneeName ?? "")
            .toLowerCase()
            .includes(query.toLowerCase());
        });
      }
      return sum + tasks.length;
    }, 0);
  }, [eventGroups, searchQuery, statusFilter, personFilter]);

  if (eventGroups.length === 0) {
    return (
      <div className="border border-cos-border bg-cos-card py-16 text-center">
        <p className="font-display text-lg text-cos-text">No tasks yet</p>
        <p className="mt-2 text-sm text-cos-muted">
          Tasks from your campaigns and events will appear here, grouped by event.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-cos-border bg-cos-card">
      <TasksV2Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        personFilter={personFilter}
        onPersonFilterChange={setPersonFilter}
        taskCount={totalTasks}
        filteredCount={filteredCount}
        orgMembers={orgMembers}
      />

      <div className="space-y-0 divide-y divide-cos-border">
        {eventGroups.map((group) => (
          <TasksV2EventGroupSection
            key={group.eventId}
            group={group}
            canEdit={canEdit}
            orgMembers={orgMembers}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortMode={sortMode}
            personFilter={personFilter}
          />
        ))}
      </div>
    </div>
  );
}
