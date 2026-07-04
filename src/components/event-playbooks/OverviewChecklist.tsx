"use client";

import { PlanningProgressRing } from "@/components/event-playbooks/PlanningProgressRing";
import { GroupedTaskChecklist } from "@/components/event-playbooks/GroupedTaskChecklist";
import { computePlanningProgress } from "@/lib/event-playbooks/progress";
import type { EventPlaybookTask, EventPlaybookTaskGroup } from "@/types/event-playbooks";

interface OverviewChecklistProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  taskGroups: EventPlaybookTaskGroup[];
  planningProgressPercent: number;
  tablesAvailable: boolean;
}

export function OverviewChecklist({
  eventId,
  tasks,
  taskGroups,
  tablesAvailable,
}: OverviewChecklistProps) {
  const planningProgressPercent = computePlanningProgress(tasks);
  const openTasks = tasks.filter((task) => task.status !== "done");

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="studio-eyebrow">Planning progress</p>
          <h3 className="font-display mt-2 text-2xl text-cos-text">
            {openTasks.length === 0 && tasks.length > 0
              ? "All tasks complete"
              : `${openTasks.length} task${openTasks.length === 1 ? "" : "s"} remaining`}
          </h3>
          <p className="mt-2 text-sm text-cos-muted">
            {tasks.length} checklist item{tasks.length === 1 ? "" : "s"} tracked for this event.
            Check off items here — no need to switch tabs.
          </p>
        </div>
        <PlanningProgressRing percent={planningProgressPercent} />
      </div>

      {tasks.length > 0 && (
        <div className="mt-8 border-t border-cos-border pt-6">
          <GroupedTaskChecklist
            eventId={eventId}
            tasks={tasks}
            taskGroups={taskGroups}
            tablesAvailable={tablesAvailable}
            variant="overview"
          />
        </div>
      )}
    </>
  );
}
