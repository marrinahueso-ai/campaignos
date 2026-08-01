"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Sparkles } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { TasksEaseAskAi } from "@/components/tasks-v2/TasksEaseAskAi";
import { TasksEaseBoard } from "@/components/tasks-v2/TasksEaseBoard";
import { TasksEaseCustomBoard } from "@/components/tasks-v2/TasksEaseCustomBoard";
import { TasksEaseList } from "@/components/tasks-v2/TasksEaseList";
import { TasksEaseTaskDrawer } from "@/components/tasks-v2/TasksEaseTaskDrawer";
import { eventTasksHref } from "@/lib/events/event-responsibility";
import {
  createTaskHubTaskAction,
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { deriveInitials } from "@/lib/task-hub/org-members";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import { flattenEventGroups } from "@/lib/tasks-v2/group-by-event";
import {
  filterEventGroupsByTasks,
  filterEventGroupsForMyView,
} from "@/lib/tasks-v2/my-tasks-filter";
import {
  loadTasksEaseColors,
  saveEventColor,
} from "@/lib/tasks-v2/tasks-ease-colors";
import {
  TASKS_EASE_PULSE_OPTIONS,
  computeTasksEasePulseCounts,
  parseTasksEasePulse,
  taskMatchesTasksEasePulse,
  type TasksEasePulse,
} from "@/lib/tasks-v2/tasks-ease-pulse";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { TaskHubEventOption, TaskHubTaskItem } from "@/types/task-hub";
import type {
  TasksV2EventGroup,
  TasksV2PageData,
  TasksV2Priority,
} from "@/types/tasks-v2";

export type TasksEaseScope = "team" | "mine";
export type TasksEaseView = "list" | "board" | "focus" | "custom";

const VIEW_TABS: { id: TasksEaseView; label: string }[] = [
  { id: "list", label: "List" },
  { id: "board", label: "Status" },
  { id: "focus", label: "Focus" },
  { id: "custom", label: "Custom" },
];

function parseScope(value: string | null): TasksEaseScope {
  return value === "mine" ? "mine" : "team";
}

function parseView(value: string | null): TasksEaseView {
  if (value === "board" || value === "focus" || value === "custom") return value;
  return "list";
}

function buildEmptyEventGroup(
  eventId: string,
  eventTitle: string,
  eventDate: string,
): TasksV2EventGroup {
  return {
    eventId,
    eventTitle,
    eventDate,
    eventHref: eventTasksHref(eventId),
    accentColor: "#6b8171",
    tasks: [],
    doneCount: 0,
    totalCount: 0,
  };
}

interface TasksEaseShellProps {
  data: TasksV2PageData;
  initialEventFilter?: string | null;
}

function applyTaskPatches(
  groups: TasksV2EventGroup[],
  patches: Record<string, TaskHubTaskItem>,
): TasksV2EventGroup[] {
  if (Object.keys(patches).length === 0) return groups;
  return groups.map((group) => {
    let changed = false;
    const tasks = group.tasks.map((task) => {
      const patch = patches[task.id];
      if (!patch) return task;
      changed = true;
      return patch;
    });
    if (!changed) return group;
    return {
      ...group,
      tasks,
      totalCount: tasks.length,
      doneCount: tasks.filter((task) => task.status === "done").length,
    };
  });
}

export function TasksEaseShell({
  data,
  initialEventFilter = null,
}: TasksEaseShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Local chrome state for instant clicks — URL synced via history.replaceState
  // (router.replace would refetch the whole RSC Tasks page and feel laggy).
  const [scope, setScope] = useState<TasksEaseScope>(() =>
    parseScope(searchParams.get("scope")),
  );
  const [view, setView] = useState<TasksEaseView>(() =>
    parseView(searchParams.get("view")),
  );
  const [pulse, setPulse] = useState<TasksEasePulse | null>(() =>
    parseTasksEasePulse(searchParams.get("pulse")),
  );
  const [eventFilter, setEventFilter] = useState<string | null>(
    () => searchParams.get("event") ?? initialEventFilter?.trim() ?? null,
  );

  const [eventColors, setEventColors] = useState<Record<string, string>>({});
  const [activeTask, setActiveTask] = useState<TaskHubTaskItem | null>(null);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskEventId, setAddTaskEventId] = useState("");
  const [addTaskTitle, setAddTaskTitle] = useState("");
  const [addTaskNotes, setAddTaskNotes] = useState("");
  const [addTaskDueDate, setAddTaskDueDate] = useState("");
  const [addTaskAssigneeUserId, setAddTaskAssigneeUserId] = useState("");
  const [addTaskStatus, setAddTaskStatus] =
    useState<EventPlaybookTaskStatus>("todo");
  const [addTaskPriority, setAddTaskPriority] =
    useState<TasksV2Priority>("medium");
  const [addTaskPending, setAddTaskPending] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [addTaskSuccess, setAddTaskSuccess] = useState<string | null>(null);
  /** Optimistic tasks until SSR payload includes them. */
  const [pendingCreated, setPendingCreated] = useState<TaskHubTaskItem[]>([]);
  /** Local patches from drawer / list edits — avoid router.refresh on every save. */
  const [taskPatches, setTaskPatches] = useState<Record<string, TaskHubTaskItem>>(
    {},
  );

  useEffect(() => {
    setEventColors(loadTasksEaseColors().events);
  }, []);

  const syncUrl = useCallback(
    (next: {
      scope: TasksEaseScope;
      view: TasksEaseView;
      pulse: TasksEasePulse | null;
      event: string | null;
    }) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (next.scope === "team") params.delete("scope");
      else params.set("scope", next.scope);
      if (next.view === "list") params.delete("view");
      else params.set("view", next.view);
      if (!next.pulse) params.delete("pulse");
      else params.set("pulse", next.pulse);
      if (!next.event) params.delete("event");
      else params.set("event", next.event);
      const query = params.toString();
      const href = query ? `/tasks?${query}` : "/tasks";
      window.history.replaceState(window.history.state, "", href);
    },
    [],
  );

  function handleScopeChange(next: TasksEaseScope) {
    setScope(next);
    syncUrl({ scope: next, view, pulse, event: eventFilter });
  }

  function handleViewChange(next: TasksEaseView) {
    setView(next);
    syncUrl({ scope, view: next, pulse, event: eventFilter });
  }

  function handlePulseChange(next: TasksEasePulse) {
    const resolved = pulse === next ? null : next;
    setPulse(resolved);
    syncUrl({ scope, view, pulse: resolved, event: eventFilter });
  }

  function handleEventChipChange(next: string | null) {
    setEventFilter(next);
    syncUrl({ scope, view, pulse, event: next });
  }

  function rememberTaskPatch(next: TaskHubTaskItem) {
    setActiveTask((current) => (current?.id === next.id ? next : current));
    setPendingCreated((current) =>
      current.map((task) => (task.id === next.id ? next : task)),
    );
    setTaskPatches((current) => ({ ...current, [next.id]: next }));
  }

  function handleEventColorChange(eventId: string, color: string | null) {
    saveEventColor(eventId, color);
    setEventColors((current) => {
      const next = { ...current };
      if (color) {
        next[eventId] = color;
      } else {
        delete next[eventId];
      }
      return next;
    });
  }

  const scopedGroups = useMemo(() => {
    if (scope === "mine") {
      return filterEventGroupsForMyView(data.eventGroups, data.viewer, "my_tasks", {
        includeDone: view !== "list",
      });
    }
    return data.eventGroups;
  }, [data.eventGroups, data.viewer, scope, view]);

  const eventScopedGroups = useMemo(() => {
    if (!eventFilter) {
      return scopedGroups;
    }
    const matched = scopedGroups.filter((group) => group.eventId === eventFilter);
    if (matched.length > 0) {
      return matched;
    }
    const option = data.events.find((event) => event.eventId === eventFilter);
    if (!option) {
      return [];
    }
    return [buildEmptyEventGroup(option.eventId, option.eventTitle, option.eventDate)];
  }, [data.events, eventFilter, scopedGroups]);

  const pulseCounts = useMemo(
    () => computeTasksEasePulseCounts(flattenEventGroups(scopedGroups), data.viewer),
    [scopedGroups, data.viewer],
  );

  const displayGroups = useMemo(() => {
    let groups = applyTaskPatches(eventScopedGroups, taskPatches);
    if (pendingCreated.length > 0) {
      const known = new Set(flattenEventGroups(groups).map((task) => task.id));
      const extras = pendingCreated.filter((task) => !known.has(task.id));
      if (extras.length > 0) {
        const byEvent = new Map<string, TaskHubTaskItem[]>();
        for (const task of extras) {
          const list = byEvent.get(task.event.eventId) ?? [];
          list.push(task);
          byEvent.set(task.event.eventId, list);
        }
        groups = groups.map((group) => {
          const add = byEvent.get(group.eventId);
          if (!add?.length) return group;
          byEvent.delete(group.eventId);
          const tasks = [...add, ...group.tasks];
          return {
            ...group,
            tasks,
            totalCount: tasks.length,
            doneCount: tasks.filter((t) => t.status === "done").length,
          };
        });
        for (const [, tasks] of byEvent) {
          const sample = tasks[0]!;
          groups = [
            {
              eventId: sample.event.eventId,
              eventTitle: sample.event.eventTitle,
              eventDate: sample.event.eventDate,
              eventHref: sample.event.eventHref,
              accentColor: "#6b8171",
              tasks,
              doneCount: 0,
              totalCount: tasks.length,
            },
            ...groups,
          ];
        }
      }
    }
    if (!pulse) return groups;
    return filterEventGroupsByTasks(groups, (task) =>
      taskMatchesTasksEasePulse(task, pulse, data.viewer),
    );
  }, [data.viewer, eventScopedGroups, pendingCreated, pulse, taskPatches]);

  const chipEvents = useMemo(
    () =>
      [...scopedGroups].sort((a, b) =>
        a.eventTitle.localeCompare(b.eventTitle, undefined, { sensitivity: "base" }),
      ),
    [scopedGroups],
  );

  const addTaskEventOptions = useMemo(() => {
    const byId = new Map<string, TaskHubEventOption>();
    for (const event of data.events) {
      byId.set(event.eventId, event);
    }
    for (const group of data.eventGroups) {
      if (!byId.has(group.eventId)) {
        byId.set(group.eventId, {
          eventId: group.eventId,
          eventTitle: group.eventTitle,
          eventDate: group.eventDate,
        });
      }
    }
    return [...byId.values()].sort((a, b) =>
      a.eventTitle.localeCompare(b.eventTitle, undefined, { sensitivity: "base" }),
    );
  }, [data.eventGroups, data.events]);

  useEffect(() => {
    if (addTaskOpen && !addTaskEventId) {
      const preferred =
        (eventFilter &&
          addTaskEventOptions.some((event) => event.eventId === eventFilter) &&
          eventFilter) ||
        addTaskEventOptions[0]?.eventId ||
        "";
      setAddTaskEventId(preferred);
    }
  }, [addTaskEventId, addTaskEventOptions, addTaskOpen, eventFilter]);

  // Drop optimistic rows once the server payload includes them.
  useEffect(() => {
    if (pendingCreated.length === 0) return;
    const known = new Set(flattenEventGroups(data.eventGroups).map((task) => task.id));
    setPendingCreated((current) => current.filter((task) => !known.has(task.id)));
  }, [data.eventGroups, pendingCreated.length]);

  function resetAddTaskForm() {
    setAddTaskTitle("");
    setAddTaskNotes("");
    setAddTaskDueDate("");
    setAddTaskAssigneeUserId("");
    setAddTaskStatus("todo");
    setAddTaskPriority("medium");
    setAddTaskError(null);
  }

  /** When no due date is set, priority suggests one so the list Priority column stays meaningful. */
  function dueDateFromPriority(
    due: string,
    priority: TasksV2Priority,
  ): string | null {
    const trimmed = due.trim();
    if (trimmed) return trimmed;
    const today = getTodayDateString();
    if (priority === "high") return today;
    if (priority === "medium") return addDaysToDateOnly(today, 7);
    return addDaysToDateOnly(today, 21);
  }

  function handleAddTaskSubmit() {
    if (!data.canEdit) {
      setAddTaskError("You don’t have permission to add tasks.");
      return;
    }
    const title = addTaskTitle.trim();
    if (!title || !addTaskEventId) {
      setAddTaskError("Pick an event and a task name.");
      return;
    }
    const eventOption = addTaskEventOptions.find(
      (event) => event.eventId === addTaskEventId,
    );
    if (!eventOption) {
      setAddTaskError("Pick a valid event.");
      return;
    }

    // Mine scope only shows assigned tasks — assign to self so the new row is visible.
    const assignToSelf =
      (scope === "mine" && !addTaskAssigneeUserId && Boolean(data.viewer.userId)) ||
      addTaskAssigneeUserId === data.viewer.userId;
    const pickedMember = data.orgMembers.find(
      (member) => member.userId && member.userId === addTaskAssigneeUserId,
    );
    const selfMember = data.orgMembers.find(
      (member) => member.userId && member.userId === data.viewer.userId,
    );
    const assigneeMember =
      pickedMember ?? (assignToSelf && !addTaskAssigneeUserId ? selfMember : null);
    const assigneeUserId =
      assigneeMember?.userId ??
      (assignToSelf && !addTaskAssigneeUserId ? data.viewer.userId : null);
    const assigneeName = assigneeMember
      ? assigneeMember.displayName
      : assignToSelf
        ? (data.viewer.displayName ?? "You")
        : null;
    const assigneeInitials = assigneeMember
      ? assigneeMember.initials
      : assigneeName
        ? deriveInitials(assigneeName)
        : null;
    const dueDate = dueDateFromPriority(addTaskDueDate, addTaskPriority);
    const notes = addTaskNotes.trim() || null;
    const status = addTaskStatus;

    setAddTaskPending(true);
    setAddTaskError(null);
    setAddTaskSuccess(null);
    startTransition(async () => {
      const result = await createTaskHubTaskAction(addTaskEventId, {
        title,
        dueDate,
        assigneeUserId,
        assigneeName,
        assigneeInitials,
      });
      if (!result.success || !result.taskId) {
        setAddTaskPending(false);
        setAddTaskError(result.error ?? "Could not add task.");
        return;
      }

      if (notes) {
        await updateTaskHubTaskAction(
          addTaskEventId,
          result.taskId,
          { notes },
          title,
        );
      }
      if (status !== "todo") {
        await updateTaskHubTaskStatusAction(
          addTaskEventId,
          result.taskId,
          status,
          title,
        );
      }

      setAddTaskPending(false);

      const optimistic: TaskHubTaskItem = {
        id: result.taskId,
        eventId: addTaskEventId,
        title,
        status,
        sortOrder: 0,
        dueDate,
        assigneeName,
        assigneeInitials,
        assigneeUserId,
        groupId: null,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        event: {
          eventId: eventOption.eventId,
          eventTitle: eventOption.eventTitle,
          eventDate: eventOption.eventDate,
          eventHref: eventTasksHref(eventOption.eventId),
        },
      };

      setPendingCreated((current) => [optimistic, ...current]);
      setTaskPatches((current) => ({ ...current, [optimistic.id]: optimistic }));
      resetAddTaskForm();
      setAddTaskOpen(false);
      setAddTaskSuccess(`Added “${title}” to ${eventOption.eventTitle}.`);
      // Clear pulse so a Needs you / Done filter doesn’t hide the new task.
      setPulse(null);
      syncUrl({ scope, view, pulse: null, event: eventFilter });
    });
  }

  const subtitle =
    scope === "mine"
      ? "Only tasks assigned to you — still tied to the events they belong to."
      : "Your team’s work across all events — coordinated in one place.";

  if (!data.tablesAvailable) {
    return (
      <div className="rounded-[22px] border border-cos-border bg-cos-card p-8 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <h1 className="font-display text-2xl text-cos-text">Tasks unavailable</h1>
        <p className="mt-2 text-sm text-cos-muted">
          Tasks aren’t ready for your organization yet. Try again later, or ask
          whoever manages your account.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <h1
              className="text-[44px] leading-tight text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Tasks
            </h1>
            <p className="mt-2 text-lg text-[#5c5752]">{subtitle}</p>
            {data.tasksCapped ? (
              <p className="mt-1.5 text-sm text-[#5c5752]" role="status">
                Showing the first {data.tasksCap?.toLocaleString() ?? "1,000"}{" "}
                tasks. Open an event’s Tasks tab for the full list on that event.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAddTaskSuccess(null);
                setAddTaskError(null);
                setAddTaskOpen(true);
              }}
              disabled={!data.canEdit}
              className="rounded-xl border border-[#e8e2d9] bg-white px-5 py-2.5 text-[14px] font-bold text-[#2a2622] transition hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add task
            </button>
            <div className="group relative">
              <button
                type="button"
                onClick={() => setAskAiOpen(true)}
                className="relative inline-flex items-center gap-2 rounded-xl bg-[#2a2622] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-[#253a2f]"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Ask AI for tasks
                <span className="absolute -top-2 -right-2 rounded-full border border-white bg-[#c4922e] px-1.5 py-0.5 text-[9px] tracking-tighter text-white uppercase">
                  Beta
                </span>
              </button>
              <div className="pointer-events-none absolute top-full right-0 z-[60] mt-2 hidden w-64 rounded-xl border border-[#e8e2d9] bg-white p-3 shadow-xl group-hover:block">
                <p className="text-[11px] leading-relaxed text-[#5c5752] italic">
                  <Shield
                    className="mr-1 inline h-3 w-3 text-[#c4922e]"
                    aria-hidden
                  />
                  Generated tasks will enter a{" "}
                  <strong className="not-italic">Review &amp; Approve</strong>{" "}
                  queue before appearing in your official list.
                </p>
              </div>
            </div>
          </div>
        </header>

        {addTaskSuccess ? (
          <p
            className="rounded-2xl border border-[rgba(47,74,60,0.18)] bg-[rgba(47,74,60,0.08)] px-4 py-3 text-sm font-semibold text-[#2f4a3c]"
            role="status"
          >
            {addTaskSuccess}
          </p>
        ) : null}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 border-b border-[#e8e2d9] xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-6">
              <div
                className="mb-[-1px] flex rounded-xl border border-[#e8e2d9] bg-[#faf8f5] p-1"
                role="group"
                aria-label="Who’s tasks"
              >
                {(["team", "mine"] as TasksEaseScope[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleScopeChange(option)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm transition",
                      scope === option
                        ? "bg-white font-bold text-[#2a2622] shadow-sm"
                        : "font-medium text-[#5c5752] hover:text-[#2a2622]",
                    )}
                  >
                    {option === "team" ? "Team" : "Mine"}
                  </button>
                ))}
              </div>

              <nav
                className="flex h-full items-center gap-6"
                role="tablist"
                aria-label="Task views"
              >
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.id}
                    onClick={() => handleViewChange(tab.id)}
                    className={cn(
                      "border-b-2 px-1 py-4 text-sm transition",
                      view === tab.id
                        ? "border-[#2f4a3c] font-bold text-[#2a2622]"
                        : "border-transparent font-medium text-[#5c5752] hover:text-[#2a2622]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="hidden items-center gap-6 pb-3 xl:flex">
              {TASKS_EASE_PULSE_OPTIONS.filter((option) => option.id !== "done").map(
                (option, index) => {
                  const active = pulse === option.id;
                  const isOverdue = option.id === "overdue";
                  return (
                    <div key={option.id} className="flex items-center gap-6">
                      {index > 0 ? (
                        <div className="h-6 w-px bg-[#e8e2d9]" aria-hidden />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handlePulseChange(option.id)}
                        className={cn(
                          "flex flex-col items-end transition",
                          active && "opacity-100",
                        )}
                      >
                        <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                          {option.label}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            isOverdue ? "text-[#a67b27]" : "text-[#2a2622]",
                            active && "underline decoration-[1.5px] underline-offset-4",
                          )}
                        >
                          {pulseCounts[option.id]}
                        </span>
                      </button>
                    </div>
                  );
                },
              )}
              {/* Keep Done pulse available for filters / contracts */}
              <div className="flex items-center gap-6">
                <div className="h-6 w-px bg-[#e8e2d9]" aria-hidden />
                <button
                  type="button"
                  onClick={() => handlePulseChange("done")}
                  className="flex flex-col items-end"
                >
                  <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                    Done
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold text-[#2a2622]",
                      pulse === "done" &&
                        "underline decoration-[1.5px] underline-offset-4",
                    )}
                  >
                    {pulseCounts.done}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile / smaller screens: pulse as text links */}
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 xl:hidden">
            {TASKS_EASE_PULSE_OPTIONS.map((option) => {
              const active = pulse === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePulseChange(option.id)}
                  className={cn(
                    "text-[13px] font-semibold text-[#5c5752] transition hover:text-[#2a2622]",
                    active &&
                      "font-extrabold text-[#2a2622] underline decoration-[1.5px] underline-offset-4",
                  )}
                >
                  {option.label}
                  <em
                    className={cn(
                      "ml-[3px] font-bold text-[#5c5752] not-italic",
                      option.id === "overdue" && "text-[#a67b27]",
                      active && "text-[#2a2622]",
                    )}
                  >
                    {pulseCounts[option.id]}
                  </em>
                </button>
              );
            })}
          </div>

          {chipEvents.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="mr-2 shrink-0 text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                Events:
              </span>
              <button
                type="button"
                onClick={() => handleEventChipChange(null)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold transition",
                  !eventFilter
                    ? "bg-[#2f4a3c] text-white shadow-sm"
                    : "border border-[#e8e2d9] bg-white font-medium text-[#5c5752] hover:bg-[#faf8f5]",
                )}
              >
                All events
              </button>
              {chipEvents.map((group) => {
                const active = eventFilter === group.eventId;
                const color = eventColors[group.eventId] ?? group.accentColor;
                return (
                  <div
                    key={group.eventId}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition",
                      active
                        ? "bg-[#2f4a3c] font-bold text-white shadow-sm"
                        : "border border-[#e8e2d9] bg-white font-medium text-[#5c5752] hover:bg-[#faf8f5]",
                    )}
                  >
                    <DashboardWidgetColorPicker
                      label={group.eventTitle}
                      value={eventColors[group.eventId] ?? null}
                      swatchColor={group.accentColor}
                      variant="dot"
                      onChange={(nextColor) =>
                        handleEventColorChange(group.eventId, nextColor)
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleEventChipChange(active ? null : group.eventId)
                      }
                      className="font-inherit"
                      style={active ? undefined : { color }}
                    >
                      {group.eventTitle}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div>
          {view === "list" ? (
            <TasksEaseList
              eventGroups={displayGroups}
              canEdit={data.canEdit}
              orgMembers={data.orgMembers}
              eventColors={eventColors}
              onEventColorChange={handleEventColorChange}
              onOpenTask={setActiveTask}
              viewerUserId={data.viewer.userId}
              emptyTitle={
                scope === "mine" ? "Nothing assigned to you" : "No tasks yet"
              }
              emptyBody={
                scope === "mine"
                  ? "When a teammate puts your name on an event task, it shows up here. Switch to Team to see everyone’s list."
                  : eventFilter
                    ? "Add a task or ask AI for suggestions for this event."
                    : "When your team adds tasks to events, they show up here."
              }
            />
          ) : null}

          {view === "board" || view === "focus" ? (
            <TasksEaseBoard
              mode={view === "board" ? "status" : "focus"}
              eventGroups={displayGroups}
              canEdit={data.canEdit}
              eventColors={eventColors}
              onOpenTask={setActiveTask}
            />
          ) : null}

          {view === "custom" ? (
            <TasksEaseCustomBoard
              eventGroups={displayGroups}
              canEdit={data.canEdit}
              eventColors={eventColors}
              onOpenTask={setActiveTask}
            />
          ) : null}
        </div>
      </div>

      {addTaskOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close add task"
            className="absolute inset-0 bg-[#2a2622]/40 backdrop-blur-sm"
            onClick={() => {
              setAddTaskOpen(false);
              setAddTaskError(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tasks-ease-add-task-title"
            className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-[#e8e2d9] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-10 pt-10 pb-6">
              <h2
                id="tasks-ease-add-task-title"
                className="text-[28px] text-[#2a2622] italic"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Add a task
              </h2>
              <button
                type="button"
                onClick={() => {
                  setAddTaskOpen(false);
                  setAddTaskError(null);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#5c5752] transition hover:bg-[#faf8f5]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-8 px-10 pb-10">
              <label className="block space-y-2">
                <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                  Task Title
                </span>
                <input
                  value={addTaskTitle}
                  onChange={(event) => setAddTaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddTaskSubmit();
                    }
                  }}
                  placeholder="e.g. Call the rental company..."
                  autoFocus
                  className="w-full rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-5 py-4 text-sm font-medium text-[#2a2622] outline-none transition focus:border-[#2f4a3c] focus:ring-2 focus:ring-[#2f4a3c]/10"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                  Context/Notes
                </span>
                <textarea
                  value={addTaskNotes}
                  onChange={(event) => setAddTaskNotes(event.target.value)}
                  rows={3}
                  placeholder="Provide links, specific requirements, or background context to help the assignee..."
                  className="w-full resize-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-5 py-4 text-sm text-[#2a2622] outline-none transition focus:border-[#2f4a3c] focus:ring-2 focus:ring-[#2f4a3c]/10"
                />
              </label>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                    Tied to Event
                  </span>
                  <select
                    value={addTaskEventId}
                    onChange={(event) => setAddTaskEventId(event.target.value)}
                    disabled={addTaskEventOptions.length === 0}
                    className="w-full appearance-none rounded-xl border border-[#e8e2d9] bg-[#faf8f5] py-3.5 pr-10 pl-5 text-sm font-medium text-[#2a2622] outline-none focus:ring-2 focus:ring-[#2f4a3c]/10"
                  >
                    {addTaskEventOptions.length === 0 ? (
                      <option value="">No events available</option>
                    ) : (
                      addTaskEventOptions.map((event) => (
                        <option key={event.eventId} value={event.eventId}>
                          {event.eventTitle}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                    Priority
                  </span>
                  <select
                    value={addTaskPriority}
                    onChange={(event) =>
                      setAddTaskPriority(event.target.value as TasksV2Priority)
                    }
                    className="w-full appearance-none rounded-xl border border-[#e8e2d9] bg-[#faf8f5] py-3.5 pr-10 pl-5 text-sm font-medium text-[#2a2622] outline-none focus:ring-2 focus:ring-[#2f4a3c]/10"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                    Assignee
                  </span>
                  <select
                    value={addTaskAssigneeUserId}
                    onChange={(event) =>
                      setAddTaskAssigneeUserId(event.target.value)
                    }
                    className="w-full appearance-none rounded-xl border border-[#e8e2d9] bg-[#faf8f5] py-3.5 pr-10 pl-5 text-sm font-medium text-[#2a2622] outline-none focus:ring-2 focus:ring-[#2f4a3c]/10"
                  >
                    <option value="">Unassigned</option>
                    {data.orgMembers
                      .filter((member) => member.userId)
                      .map((member) => (
                        <option key={member.id} value={member.userId!}>
                          {member.userId === data.viewer.userId
                            ? `${member.displayName} (You)`
                            : member.displayName}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                    Due Date
                  </span>
                  <input
                    type="date"
                    value={addTaskDueDate}
                    onChange={(event) => setAddTaskDueDate(event.target.value)}
                    className="w-full rounded-xl border border-[#e8e2d9] bg-[#faf8f5] py-3.5 pr-4 pl-5 text-sm font-medium text-[#2a2622] outline-none focus:ring-2 focus:ring-[#2f4a3c]/10"
                  />
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-[10px] font-bold tracking-widest text-[#a8a29c] uppercase">
                    Board Status
                  </span>
                  <select
                    value={addTaskStatus}
                    onChange={(event) =>
                      setAddTaskStatus(
                        event.target.value as EventPlaybookTaskStatus,
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-[#e8e2d9] bg-[#faf8f5] py-3.5 pr-10 pl-5 text-sm font-medium text-[#2a2622] outline-none focus:ring-2 focus:ring-[#2f4a3c]/10"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Needs Review</option>
                  </select>
                </label>
              </div>

              {addTaskError ? (
                <p className="text-sm text-red-700" role="alert">
                  {addTaskError}
                </p>
              ) : null}

              <div className="flex flex-col gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleAddTaskSubmit}
                  disabled={
                    addTaskPending || !addTaskTitle.trim() || !addTaskEventId
                  }
                  className="w-full rounded-2xl bg-[#2f4a3c] py-4 text-lg font-bold text-white shadow-xl shadow-[#2f4a3c]/10 transition hover:bg-[#253a2f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addTaskPending ? "Adding…" : "Add Task"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddTaskOpen(false);
                    setAddTaskError(null);
                  }}
                  className="text-sm font-bold text-[#5c5752] transition hover:text-[#2a2622]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <TasksEaseTaskDrawer
        task={activeTask}
        canEdit={data.canEdit}
        orgMembers={data.orgMembers}
        onClose={() => setActiveTask(null)}
        onTaskUpdated={rememberTaskPatch}
      />

      {askAiOpen ? (
        <TasksEaseAskAi
          events={data.events}
          canEdit={data.canEdit}
          aiAvailable={data.aiAvailable}
          aiUnavailableReason={data.aiUnavailableReason}
          preferredEventId={eventFilter}
          onClose={() => setAskAiOpen(false)}
          onTasksAdded={() => {
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
