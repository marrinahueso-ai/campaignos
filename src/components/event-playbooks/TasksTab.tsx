"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  createEventPlaybookTaskAction,
  deleteEventPlaybookTaskAction,
  updateEventPlaybookTaskStatusAction,
} from "@/lib/event-playbooks/actions";
import { formatEventDate } from "@/lib/utils/dates";
import type { EventPlaybookTask, EventPlaybookTaskStatus } from "@/types/event-playbooks";
import { cn } from "@/lib/utils/cn";

interface TasksTabProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  tablesAvailable: boolean;
}

const STATUS_CYCLE: EventPlaybookTaskStatus[] = ["todo", "in_progress", "done"];

function nextStatus(current: EventPlaybookTaskStatus): EventPlaybookTaskStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length] ?? "todo";
}

export function TasksTab({ eventId, tasks, tablesAvailable }: TasksTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAddTask() {
    setError(null);
    startTransition(async () => {
      const result = await createEventPlaybookTaskAction(eventId, newTitle);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNewTitle("");
      router.refresh();
    });
  }

  function handleToggleStatus(task: EventPlaybookTask) {
    const status = nextStatus(task.status);
    startTransition(async () => {
      await updateEventPlaybookTaskStatusAction(eventId, task.id, status, task.title);
      router.refresh();
    });
  }

  function handleDelete(task: EventPlaybookTask) {
    startTransition(async () => {
      await deleteEventPlaybookTaskAction(eventId, task.id, task.title);
      router.refresh();
    });
  }

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
            Track venue, budget, volunteers, and day-of tasks for this event.
          </CardDescription>
        </CardHeader>

        <ul className="mt-6 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 border border-cos-border bg-cos-bg px-4 py-3"
            >
              <button
                type="button"
                onClick={() => handleToggleStatus(task)}
                disabled={pending}
                className="shrink-0 text-cos-muted hover:text-cos-text disabled:opacity-50"
                aria-label={`Toggle ${task.title}`}
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-cos-success-text" />
                ) : task.status === "in_progress" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-cos-info-text" />
                ) : (
                  <Circle className="h-5 w-5" strokeWidth={1.5} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm text-cos-text",
                    task.status === "done" && "text-cos-muted line-through",
                  )}
                >
                  {task.title}
                </p>
                {task.dueDate && (
                  <p className="text-xs text-cos-muted">
                    Due {formatEventDate(task.dueDate)}
                  </p>
                )}
              </div>
              {task.assigneeInitials && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-cos-dark text-[10px] font-medium text-[#f6f2eb]">
                  {task.assigneeInitials}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(task)}
                disabled={pending}
                className="shrink-0 p-1 text-cos-muted hover:text-red-600 disabled:opacity-50"
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="border border-dashed border-cos-border px-4 py-8 text-center text-sm text-cos-muted">
              No tasks yet. Add your first checklist item below.
            </li>
          )}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTask();
            }}
          />
          <Button
            type="button"
            onClick={handleAddTask}
            disabled={pending || !newTitle.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
