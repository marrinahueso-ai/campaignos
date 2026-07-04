"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  createEventPlaybookTaskAction,
  createEventPlaybookTaskGroupAction,
  deleteEventPlaybookTaskAction,
  deleteEventPlaybookTaskGroupAction,
  reorderEventPlaybookTasksAction,
  toggleEventPlaybookTaskGroupCollapsedAction,
  updateEventPlaybookTaskStatusAction,
} from "@/lib/event-playbooks/actions";
import {
  buildTaskChecklistSections,
  flattenTaskSections,
  moveTaskInSections,
  reorderGroupSections,
  sectionsToPersistedOrder,
  type TaskChecklistSection,
} from "@/lib/event-playbooks/grouping";
import { formatEventDate } from "@/lib/utils/dates";
import type {
  EventPlaybookTask,
  EventPlaybookTaskGroup,
  EventPlaybookTaskStatus,
} from "@/types/event-playbooks";
import { cn } from "@/lib/utils/cn";
import { EVENT_PLAYBOOK_TASK_GROUPS_MIGRATION } from "@/lib/event-playbooks/constants";
import {
  readChecklistDragPayload,
  setGroupDragData,
  setTaskDragData,
} from "@/components/event-playbooks/task-checklist-dnd";

const STATUS_CYCLE: EventPlaybookTaskStatus[] = ["todo", "in_progress", "done"];

function nextStatus(current: EventPlaybookTaskStatus): EventPlaybookTaskStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length] ?? "todo";
}

interface GroupedTaskChecklistProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  taskGroups: EventPlaybookTaskGroup[];
  tablesAvailable: boolean;
  taskGroupsAvailable?: boolean;
  variant: "tasks" | "overview";
}

export function GroupedTaskChecklist({
  eventId,
  tasks: tasksFromServer,
  taskGroups: groupsFromServer,
  tablesAvailable,
  taskGroupsAvailable = true,
  variant,
}: GroupedTaskChecklistProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sections, setSections] = useState<TaskChecklistSection[]>(() =>
    buildTaskChecklistSections(groupsFromServer, tasksFromServer),
  );
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newTaskBySection, setNewTaskBySection] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragOverSectionKey, setDragOverSectionKey] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSections(buildTaskChecklistSections(groupsFromServer, tasksFromServer));
  }, [groupsFromServer, tasksFromServer]);

  const allTasks = useMemo(() => flattenTaskSections(sections), [sections]);

  function persistSections(nextSections: TaskChecklistSection[], previous: TaskChecklistSection[]) {
    setSections(nextSections);
    startTransition(async () => {
      const result = await reorderEventPlaybookTasksAction(
        eventId,
        sectionsToPersistedOrder(nextSections),
      );
      if (!result.success) {
        setSections(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleToggleGroupCollapsed(section: TaskChecklistSection) {
    if (!section.group) {
      setUngroupedCollapsed((value) => !value);
      return;
    }

    const nextCollapsed = !section.group.collapsed;
    setSections((current) =>
      current.map((item) =>
        item.key === section.key && item.group
          ? { ...item, group: { ...item.group, collapsed: nextCollapsed } }
          : item,
      ),
    );

    startTransition(async () => {
      const result = await toggleEventPlaybookTaskGroupCollapsedAction(
        eventId,
        section.group!.id,
        nextCollapsed,
      );
      if (!result.success) {
        router.refresh();
      }
    });
  }

  function isSectionCollapsed(section: TaskChecklistSection): boolean {
    if (section.group) {
      return section.group.collapsed;
    }
    return ungroupedCollapsed;
  }

  function handleTaskDrop(
    taskId: string,
    targetSectionKey: string,
    targetIndex: number,
  ) {
    const previous = sections;
    const next = moveTaskInSections(previous, taskId, targetSectionKey, targetIndex);
    persistSections(next, previous);
    setDragOverSectionKey(null);
    setDragOverTaskId(null);
  }

  function handleGroupDrop(groupId: string, targetIndex: number) {
    const previous = sections;
    const next = reorderGroupSections(previous, groupId, targetIndex);
    persistSections(next, previous);
  }

  function handleToggleStatus(task: EventPlaybookTask) {
    if (!tablesAvailable || pendingTaskIds.has(task.id)) {
      return;
    }

    const status =
      variant === "overview"
        ? task.status === "done"
          ? "todo"
          : "done"
        : nextStatus(task.status);

    const previousTasks = allTasks;
    setSections((current) =>
      current.map((section) => ({
        ...section,
        tasks: section.tasks.map((item) =>
          item.id === task.id ? { ...item, status } : item,
        ),
      })),
    );
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateEventPlaybookTaskStatusAction(
        eventId,
        task.id,
        status,
        task.title,
      );

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });

      if (!result.success) {
        setSections(buildTaskChecklistSections(groupsFromServer, previousTasks));
        return;
      }

      router.refresh();
    });
  }

  function handleDeleteTask(task: EventPlaybookTask) {
    startTransition(async () => {
      await deleteEventPlaybookTaskAction(eventId, task.id, task.title);
      router.refresh();
    });
  }

  function handleCreateGroup() {
    if (!taskGroupsAvailable) {
      setError(EVENT_PLAYBOOK_TASK_GROUPS_MIGRATION);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createEventPlaybookTaskGroupAction(eventId, newGroupName);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNewGroupName("");
      router.refresh();
    });
  }

  function handleDeleteGroup(section: TaskChecklistSection) {
    if (!section.group) {
      return;
    }

    startTransition(async () => {
      await deleteEventPlaybookTaskGroupAction(eventId, section.group!.id, section.group!.name);
      router.refresh();
    });
  }

  function handleAddTask(sectionKey: string, groupId: string | null) {
    const title = (newTaskBySection[sectionKey] ?? "").trim();
    if (!title) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createEventPlaybookTaskAction(eventId, title, groupId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNewTaskBySection((current) => ({ ...current, [sectionKey]: "" }));
      router.refresh();
    });
  }

  const enableDrag = variant === "tasks" && tablesAvailable;

  return (
    <div>
      <div>
        {sections.map((section) => {
          const collapsed = isSectionCollapsed(section);
          const sectionTitle = section.group?.name ?? "Ungrouped tasks";
          const doneCount = section.tasks.filter((task) => task.status === "done").length;

          return (
            <section
              key={section.key}
              className={cn("mb-4", enableDrag && dragOverSectionKey === section.key && "ring-1 ring-cos-dark")}
              onDragOver={
                enableDrag
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverSectionKey(section.key);
                    }
                  : undefined
              }
              onDragLeave={
                enableDrag
                  ? () => {
                      if (dragOverSectionKey === section.key) {
                        setDragOverSectionKey(null);
                      }
                    }
                  : undefined
              }
              onDrop={
                enableDrag
                  ? (event) => {
                      event.preventDefault();
                      const payload = readChecklistDragPayload(event);
                      if (!payload) {
                        return;
                      }
                      if (payload.type === "task") {
                        handleTaskDrop(payload.taskId, section.key, section.tasks.length);
                        return;
                      }
                      if (payload.type === "group" && section.group) {
                        const groupedSections = sections.filter((item) => item.group !== null);
                        const targetIndex = groupedSections.findIndex(
                          (item) => item.key === section.key,
                        );
                        if (targetIndex >= 0) {
                          handleGroupDrop(payload.groupId, targetIndex);
                        }
                      }
                    }
                  : undefined
              }
            >
              <div
                className={cn(
                  "flex items-center gap-2 border border-cos-border bg-cos-bg-alt px-3 py-2",
                  enableDrag && section.group && "cursor-grab active:cursor-grabbing",
                )}
                draggable={enableDrag && Boolean(section.group)}
                onDragStart={
                  enableDrag && section.group
                    ? (event) => {
                        setGroupDragData(event, {
                          type: "group",
                          groupId: section.group!.id,
                        });
                      }
                    : undefined
                }
                onDragOver={
                  enableDrag && section.group
                    ? (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const payload = readChecklistDragPayload(event);
                        if (payload?.type === "group") {
                          event.dataTransfer.dropEffect = "move";
                        }
                      }
                    : undefined
                }
                onDrop={
                  enableDrag && section.group
                    ? (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const payload = readChecklistDragPayload(event);
                        if (payload?.type === "group") {
                          const groupedSections = sections.filter((item) => item.group !== null);
                          const targetIndex = groupedSections.findIndex(
                            (item) => item.key === section.key,
                          );
                          if (targetIndex >= 0) {
                            handleGroupDrop(payload.groupId, targetIndex);
                          }
                        }
                      }
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => handleToggleGroupCollapsed(section)}
                  className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
                  )}
                  <span className="truncate text-sm font-medium text-cos-text">{sectionTitle}</span>
                  <span className="text-xs text-cos-muted">
                    {doneCount}/{section.tasks.length}
                  </span>
                </button>
                {enableDrag && section.group && (
                  <GripVertical className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
                )}
                {variant === "tasks" && section.group && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(section)}
                    disabled={pending}
                    className="shrink-0 p-1 text-cos-muted hover:text-red-600 disabled:opacity-50"
                    aria-label={`Delete group ${sectionTitle}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!collapsed && (
                <ul className="mt-1 space-y-1 border border-t-0 border-cos-border bg-cos-bg p-2">
                  {section.tasks.map((task, taskIndex) => {
                    const isPending = pendingTaskIds.has(task.id);

                    return (
                      <li
                        key={task.id}
                        draggable={enableDrag}
                        onDragStart={
                          enableDrag
                            ? (event) => {
                                setTaskDragData(event, {
                                  type: "task",
                                  taskId: task.id,
                                  sectionKey: section.key,
                                });
                              }
                            : undefined
                        }
                        onDragOver={
                          enableDrag
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                event.dataTransfer.dropEffect = "move";
                                setDragOverTaskId(task.id);
                              }
                            : undefined
                        }
                        onDragLeave={
                          enableDrag
                            ? () => {
                                if (dragOverTaskId === task.id) {
                                  setDragOverTaskId(null);
                                }
                              }
                            : undefined
                        }
                        onDrop={
                          enableDrag
                            ? (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                const payload = readChecklistDragPayload(event);
                                if (payload?.type === "task") {
                                  handleTaskDrop(payload.taskId, section.key, taskIndex);
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          "flex items-center gap-3 px-2 py-2",
                          variant === "tasks" && "border border-transparent bg-cos-card",
                          enableDrag && dragOverTaskId === task.id && "border-cos-dark",
                        )}
                      >
                        {enableDrag && (
                          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-cos-muted active:cursor-grabbing" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(task)}
                          disabled={!tablesAvailable || isPending || pending}
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
                          {variant === "tasks" && task.dueDate && (
                            <p className="text-xs text-cos-muted">
                              Due {formatEventDate(task.dueDate)}
                            </p>
                          )}
                        </div>
                        {variant === "overview" && task.status === "in_progress" && (
                          <Badge variant="info">In progress</Badge>
                        )}
                        {variant === "tasks" && task.assigneeInitials && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-cos-dark text-[10px] font-medium text-[#f6f2eb]">
                            {task.assigneeInitials}
                          </span>
                        )}
                        {(isPending || pending) && variant === "overview" && (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cos-muted" />
                        )}
                        {variant === "tasks" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task)}
                            disabled={pending}
                            className="shrink-0 p-1 text-cos-muted hover:text-red-600 disabled:opacity-50"
                            aria-label={`Delete ${task.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}

                  {section.tasks.length === 0 && (
                    <li className="px-2 py-4 text-center text-sm text-cos-muted">
                      {enableDrag ? "Drop tasks here or add one below." : "No tasks in this group."}
                    </li>
                  )}

                  {variant === "tasks" && (
                    <li className="flex flex-col gap-2 px-2 py-2 sm:flex-row">
                      <input
                        type="text"
                        value={newTaskBySection[section.key] ?? ""}
                        onChange={(event) =>
                          setNewTaskBySection((current) => ({
                            ...current,
                            [section.key]: event.target.value,
                          }))
                        }
                        placeholder="Add a task…"
                        className="flex-1 border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleAddTask(section.key, section.group?.id ?? null);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddTask(section.key, section.group?.id ?? null)}
                        disabled={pending || !(newTaskBySection[section.key] ?? "").trim()}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add task
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </section>
          );
        })}

        {sections.length === 0 && (
          <p className="border border-dashed border-cos-border px-4 py-8 text-center text-sm text-cos-muted">
            No tasks yet. Create a group or add your first checklist item below.
          </p>
        )}
      </div>

      {variant === "tasks" && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="New group name…"
            className="flex-1 border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCreateGroup();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleCreateGroup}
            disabled={pending || !newGroupName.trim() || !taskGroupsAvailable}
            size="sm"
            variant="secondary"
          >
            <Plus className="h-4 w-4" />
            Add group
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
