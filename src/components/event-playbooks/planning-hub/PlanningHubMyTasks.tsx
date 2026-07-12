"use client";

import { CheckSquare } from "lucide-react";
import { GroupedTaskChecklist } from "@/components/event-playbooks/GroupedTaskChecklist";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type {
  EventPlaybookTask,
  EventPlaybookTaskGroup,
} from "@/types/event-playbooks";

interface PlanningHubMyTasksProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  taskGroups: EventPlaybookTaskGroup[];
  tablesAvailable: boolean;
  taskGroupsAvailable?: boolean;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

export function PlanningHubMyTasks({
  eventId,
  tasks,
  taskGroups,
  tablesAvailable,
  taskGroupsAvailable = true,
  onNavigateTab,
}: PlanningHubMyTasksProps) {
  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle
        icon={CheckSquare}
        title="My Tasks"
        action={
          <PlanningHubActionLink onClick={() => onNavigateTab("tasks")}>
            View all tasks →
          </PlanningHubActionLink>
        }
      />

      <div className="mt-4 max-h-[28rem] flex-1 overflow-y-auto">
        <GroupedTaskChecklist
          eventId={eventId}
          tasks={tasks}
          taskGroups={taskGroups}
          tablesAvailable={tablesAvailable}
          taskGroupsAvailable={taskGroupsAvailable}
          variant="tasks"
        />
      </div>
    </PlanningHubCard>
  );
}
