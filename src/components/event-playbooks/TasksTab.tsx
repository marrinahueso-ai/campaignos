"use client";

import { GroupedTaskChecklist } from "@/components/event-playbooks/GroupedTaskChecklist";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { EventPlaybookTask, EventPlaybookTaskGroup } from "@/types/event-playbooks";

interface TasksTabProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  taskGroups: EventPlaybookTaskGroup[];
  tablesAvailable: boolean;
}

export function TasksTab({ eventId, tasks, taskGroups, tablesAvailable }: TasksTabProps) {
  if (!tablesAvailable) {
    return (
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Planning checklist</CardTitle>
          <CardDescription>
            Run migration 031_event_playbook_tables.sql to enable task tracking.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Planning checklist</CardTitle>
          <CardDescription>
            Track venue, budget, volunteers, and day-of tasks for this event. Group tasks and drag
            to reorder.
          </CardDescription>
        </CardHeader>

        <div className="mt-6">
          <GroupedTaskChecklist
            eventId={eventId}
            tasks={tasks}
            taskGroups={taskGroups}
            tablesAvailable={tablesAvailable}
            variant="tasks"
          />
        </div>
      </Card>
    </div>
  );
}
