"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { TasksEaseAskAi } from "@/components/tasks-v2/TasksEaseAskAi";
import { TasksEaseBoard } from "@/components/tasks-v2/TasksEaseBoard";
import { TasksEaseCustomBoard } from "@/components/tasks-v2/TasksEaseCustomBoard";
import { TasksEaseList } from "@/components/tasks-v2/TasksEaseList";
import { TasksEaseTaskDrawer } from "@/components/tasks-v2/TasksEaseTaskDrawer";
import { eventTasksHref } from "@/lib/events/event-responsibility";
import { createTaskHubTaskAction } from "@/lib/task-hub/actions";
import { deriveInitials } from "@/lib/task-hub/org-members";
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
import { cn } from "@/lib/utils/cn";
import type { TaskHubEventOption, TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup, TasksV2PageData } from "@/types/tasks-v2";

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
    const assignToSelf = scope === "mine" && Boolean(data.viewer.userId);
    const selfMember = data.orgMembers.find(
      (member) => member.userId && member.userId === data.viewer.userId,
    );
    const assigneeUserId = assignToSelf ? data.viewer.userId : null;
    const assigneeName = assignToSelf
      ? (selfMember?.displayName ?? data.viewer.displayName ?? "You")
      : null;
    const assigneeInitials = assignToSelf
      ? (selfMember?.initials ??
        (assigneeName ? deriveInitials(assigneeName) : "YO"))
      : null;

    setAddTaskPending(true);
    setAddTaskError(null);
    setAddTaskSuccess(null);
    startTransition(async () => {
      const result = await createTaskHubTaskAction(addTaskEventId, {
        title,
        assigneeUserId,
        assigneeName,
        assigneeInitials,
      });
      setAddTaskPending(false);
      if (!result.success || !result.taskId) {
        setAddTaskError(result.error ?? "Could not add task.");
        return;
      }

      const optimistic: TaskHubTaskItem = {
        id: result.taskId,
        eventId: addTaskEventId,
        title,
        status: "todo",
        sortOrder: 0,
        dueDate: null,
        assigneeName,
        assigneeInitials,
        assigneeUserId,
        groupId: null,
        notes: null,
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
      setAddTaskTitle("");
      setAddTaskOpen(false);
      setAddTaskSuccess(`Added “${title}” to ${eventOption.eventTitle}.`);
      // Clear pulse so a Needs you / Done filter doesn’t hide the new task.
      setPulse(null);
      syncUrl({ scope, view, pulse: null, event: eventFilter });
    });
  }

  const subtitle =
    scope === "mine"
      ? "Only tasks assigned to you — still grouped by the event they belong to."
      : "Your team’s tasks across events — the same list each event’s Tasks tab uses.";

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
    <div className="relative overflow-hidden rounded-[22px] before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <div className="relative space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3.5">
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] tracking-[-0.02em] text-cos-text">
              Tasks
            </h1>
            <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-cos-muted">
              {subtitle}
            </p>
            {data.tasksCapped ? (
              <p className="mt-1.5 text-sm text-cos-muted" role="status">
                Showing the first {data.tasksCap?.toLocaleString() ?? "1,000"} tasks.
                Open an event’s Tasks tab for the full list on that event.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setAddTaskSuccess(null);
                setAddTaskError(null);
                setAddTaskOpen((open) => !open);
              }}
              disabled={!data.canEdit}
              className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add task
            </button>
            <button
              type="button"
              onClick={() => setAskAiOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Ask AI for tasks
            </button>
          </div>
        </header>

        {addTaskOpen ? (
          <div className="rounded-2xl border border-cos-border bg-cos-card p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="min-w-[10rem] flex-1 text-xs font-semibold tracking-[0.08em] text-cos-muted uppercase">
                Event
                <select
                  value={addTaskEventId}
                  onChange={(event) => setAddTaskEventId(event.target.value)}
                  disabled={addTaskEventOptions.length === 0}
                  className="mt-1.5 block w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text shadow-sm"
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
              <label className="min-w-[14rem] flex-[2] text-xs font-semibold tracking-[0.08em] text-cos-muted uppercase">
                Task name
                <input
                  value={addTaskTitle}
                  onChange={(event) => setAddTaskTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddTaskSubmit();
                    }
                  }}
                  placeholder="e.g. Confirm venue setup with the venue contact"
                  autoFocus
                  className="mt-1.5 block w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text shadow-sm placeholder:text-cos-muted"
                />
              </label>
              <button
                type="button"
                onClick={handleAddTaskSubmit}
                disabled={addTaskPending || !addTaskTitle.trim() || !addTaskEventId}
                className="inline-flex items-center rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addTaskPending ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setAddTaskOpen(false)}
                className="rounded-full px-3 py-2.5 text-[13px] font-bold text-cos-muted hover:text-cos-text"
              >
                Cancel
              </button>
            </div>
            {addTaskError ? (
              <p className="mt-2 text-xs text-cos-error" role="alert">
                {addTaskError}
              </p>
            ) : null}
          </div>
        ) : null}

        {addTaskSuccess ? (
          <p
            className="rounded-2xl border border-[rgba(47,74,60,0.18)] bg-[rgba(47,74,60,0.08)] px-4 py-3 text-sm font-semibold text-[#2f4a3c]"
            role="status"
          >
            {addTaskSuccess}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2.5">
          <div
            className="inline-flex gap-0.5 rounded-full border border-cos-border bg-[rgba(255,252,247,0.55)] p-[3px]"
            role="group"
            aria-label="Who’s tasks"
          >
            {(["team", "mine"] as TasksEaseScope[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleScopeChange(option)}
                className={cn(
                  "rounded-full px-3.5 py-[7px] text-[13px] font-bold transition",
                  scope === option
                    ? "bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {option === "team" ? "Team" : "Mine"}
              </button>
            ))}
          </div>

          <nav className="flex flex-wrap gap-0.5" role="tablist" aria-label="Task views">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => handleViewChange(tab.id)}
                className={cn(
                  "rounded-full px-3 py-[7px] text-[13px] font-semibold transition",
                  view === tab.id
                    ? "bg-[rgba(255,252,247,0.85)] text-cos-text"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 px-0.5">
          <span className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Focus
          </span>
          {TASKS_EASE_PULSE_OPTIONS.map((option) => {
            const active = pulse === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePulseChange(option.id)}
                className={cn(
                  "text-[13px] font-semibold text-cos-muted transition hover:text-cos-text",
                  active && "font-extrabold text-cos-text underline decoration-[1.5px] underline-offset-4",
                )}
              >
                {option.label}
                <em
                  className={cn(
                    "ml-[3px] not-italic font-bold text-cos-muted",
                    active && "text-cos-text",
                  )}
                >
                  {pulseCounts[option.id]}
                </em>
              </button>
            );
          })}
        </div>

        {chipEvents.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
              Events
            </span>
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1",
                !eventFilter && "border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
              )}
            >
              <button
                type="button"
                onClick={() => handleEventChipChange(null)}
                className={cn(
                  "text-xs font-bold",
                  !eventFilter ? "text-cos-text" : "text-cos-muted hover:text-cos-text",
                )}
              >
                All events
              </button>
            </div>
            {chipEvents.map((group) => {
              const active = eventFilter === group.eventId;
              const color = eventColors[group.eventId] ?? group.accentColor;
              return (
                <div
                  key={group.eventId}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full py-1 pr-2 pl-1",
                    active && "border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
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
                    onClick={() => handleEventChipChange(active ? null : group.eventId)}
                    className={cn(
                      "text-xs font-bold",
                      active ? "text-cos-text" : "text-cos-muted hover:text-cos-text",
                    )}
                    style={active ? undefined : { color }}
                  >
                    {group.eventTitle}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="pt-1">
          {view === "list" ? (
            <TasksEaseList
              eventGroups={displayGroups}
              canEdit={data.canEdit}
              orgMembers={data.orgMembers}
              eventColors={eventColors}
              onEventColorChange={handleEventColorChange}
              onOpenTask={setActiveTask}
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
            // AI add is rare — one soft refresh is fine so new rows appear.
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
