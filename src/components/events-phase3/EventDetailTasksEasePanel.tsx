"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import {
  TasksEaseAskAi,
  type TasksEaseAskAiAddedPayload,
} from "@/components/tasks-v2/TasksEaseAskAi";
import { TasksEaseAddTaskModal } from "@/components/tasks-v2/TasksEaseAddTaskModal";
import { TasksEaseList } from "@/components/tasks-v2/TasksEaseList";
import { TasksEaseTaskDrawer } from "@/components/tasks-v2/TasksEaseTaskDrawer";
import { deriveInitials } from "@/lib/task-hub/org-members";
import { eventTasksHref } from "@/lib/events/event-responsibility";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubEventOption, TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2PageData } from "@/types/tasks-v2";

function collectTasks(data: TasksV2PageData): TaskHubTaskItem[] {
  if (data.eventGroups?.length) {
    return data.eventGroups.flatMap((group) => group.tasks);
  }
  return data.committees.flatMap((committee) => committee.tasks);
}

export function EventDetailTasksEasePanel({
  data,
}: {
  data: TasksV2PageData;
}) {
  const refresh = useEventTabMutationRefresh("tasks");
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStatus, setAddStatus] =
    useState<EventPlaybookTaskStatus>("todo");
  const [activeTask, setActiveTask] = useState<TaskHubTaskItem | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useState<TaskHubTaskItem[]>(
    [],
  );

  const eventId =
    data.eventGroups[0]?.eventId ??
    collectTasks(data)[0]?.eventId ??
    data.events[0]?.eventId ??
    null;

  const eventOption: TaskHubEventOption | null = useMemo(() => {
    if (!eventId) return null;
    const fromData = data.events.find((event) => event.eventId === eventId);
    if (fromData) return fromData;
    const group = data.eventGroups[0];
    if (group) {
      return {
        eventId: group.eventId,
        eventTitle: group.eventTitle,
        eventDate: group.eventDate,
      };
    }
    return null;
  }, [data.events, data.eventGroups, eventId]);

  const eventOptions = useMemo(
    () => (eventOption ? [eventOption] : data.events),
    [data.events, eventOption],
  );

  const listGroups = useMemo(() => {
    const base =
      data.eventGroups.length > 0
        ? data.eventGroups
        : eventOption
          ? [
              {
                eventId: eventOption.eventId,
                eventTitle: eventOption.eventTitle,
                eventDate: eventOption.eventDate,
                eventHref: eventTasksHref(eventOption.eventId),
                accentColor: "#2f4a3c",
                tasks: [] as TaskHubTaskItem[],
                doneCount: 0,
                totalCount: 0,
              },
            ]
          : [];

    if (optimisticTasks.length === 0) return base;

    return base.map((group) => {
      const extras = optimisticTasks.filter(
        (task) => task.eventId === group.eventId,
      );
      if (extras.length === 0) return group;
      const existingIds = new Set(group.tasks.map((task) => task.id));
      const merged = [
        ...extras.filter((task) => !existingIds.has(task.id)),
        ...group.tasks,
      ];
      return {
        ...group,
        tasks: merged,
        totalCount: merged.length,
        doneCount: merged.filter((task) => task.status === "done").length,
      };
    });
  }, [data.eventGroups, eventOption, optimisticTasks]);

  const taskCount = useMemo(
    () => listGroups.reduce((sum, group) => sum + group.tasks.length, 0),
    [listGroups],
  );

  const assignTo = useMemo(() => {
    if (!data.viewer.userId) return null;
    const name = data.viewer.displayName?.trim() || "You";
    return {
      userId: data.viewer.userId,
      name,
      initials: deriveInitials(name),
    };
  }, [data.viewer.displayName, data.viewer.userId]);

  const openAddTask = useCallback((status: EventPlaybookTaskStatus = "todo") => {
    setAddStatus(status);
    setAddOpen(true);
  }, []);

  const handleCreated = useCallback(
    (task: TaskHubTaskItem) => {
      setOptimisticTasks((current) => [task, ...current]);
      setAddOpen(false);
      void refresh();
    },
    [refresh],
  );

  const handleAskAiAdded = useCallback(
    (payload: TasksEaseAskAiAddedPayload) => {
      const now = new Date().toISOString();
      const created = payload.created.map((row) => {
        const stub: TaskHubTaskItem = {
          id: row.id,
          eventId: payload.eventId,
          title: row.title,
          status: "todo",
          dueDate: row.dueDate,
          notes: null,
          hasNotes: false,
          assigneeUserId: assignTo?.userId ?? null,
          assigneeName: assignTo?.name ?? null,
          assigneeInitials: assignTo?.initials ?? null,
          groupId: null,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
          event: {
            eventId: payload.eventId,
            eventTitle: eventOption?.eventTitle ?? "Event",
            eventDate: eventOption?.eventDate ?? "",
            eventHref: eventTasksHref(payload.eventId),
          },
          monday: null,
        };
        return stub;
      });
      setOptimisticTasks((current) => [...created, ...current]);
      setAskAiOpen(false);
      void refresh();
    },
    [assignTo, eventOption, refresh],
  );

  const createWithAiTabHref = eventId
    ? `/events/${encodeURIComponent(eventId)}?tab=create-with-ai`
    : "/create-with-ai";

  return (
    <section data-testid="event-detail-tasks-ease-panel">
      <div className="overflow-hidden rounded-2xl border border-[#e8e3da] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e3da] px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-[#2f4a3c]">Task List</h3>
            <span
              className="rounded-full border border-[#e8e3da] bg-[#f6f2eb] px-2.5 py-0.5 text-xs font-medium text-[#6b8171]"
              data-testid="event-tasks-count"
            >
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data.canEdit ? (
              <button
                type="button"
                onClick={() => setAskAiOpen(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#6b8171] transition hover:text-[#2f4a3c]"
              >
                Ask AI for tasks
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
            {data.canEdit ? (
              <button
                type="button"
                onClick={() => openAddTask("todo")}
                className="rounded-xl bg-[#2f4a3c] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#6b8171]"
              >
                + New Task
              </button>
            ) : null}
          </div>
        </div>

        {taskCount === 0 ? (
          <div
            className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center"
            data-testid="event-tasks-empty"
          >
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f6f2eb] text-[#c4922e]">
              <Sparkles className="h-7 w-7" aria-hidden />
            </div>
            <h4 className="font-display mb-2 text-lg font-medium text-[#2f4a3c]">
              No tasks yet
            </h4>
            <p className="mb-8 max-w-sm text-sm text-[#6b8171]">
              Ask AI to help you build a plan for your event or create your
              first task manually.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {data.canEdit ? (
                <button
                  type="button"
                  onClick={() => setAskAiOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c4922e] px-6 py-2.5 font-bold text-white shadow-lg transition hover:bg-[#a87a22]"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Create with AI
                </button>
              ) : (
                <Link
                  href={createWithAiTabHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c4922e] px-6 py-2.5 font-bold text-white shadow-lg transition hover:bg-[#a87a22]"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Create with AI
                </Link>
              )}
              {data.canEdit ? (
                <button
                  type="button"
                  onClick={() => openAddTask("todo")}
                  className="rounded-xl border border-[#e8e3da] px-6 py-2.5 font-bold text-[#2f4a3c] transition hover:bg-[#f6f2eb]"
                >
                  Add task manually
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="min-h-[500px] overflow-x-auto overflow-y-visible pb-8">
            <TasksEaseList
              eventGroups={listGroups}
              canEdit={data.canEdit}
              orgMembers={data.orgMembers}
              eventColors={{}}
              onEventColorChange={() => {}}
              onOpenTask={setActiveTask}
              emptyTitle="No tasks yet"
              emptyBody="Ask AI or add a task manually."
              viewerUserId={data.viewer.userId}
              hideEventColumn
            />
          </div>
        )}
      </div>

      {askAiOpen ? (
        <TasksEaseAskAi
          events={eventOptions}
          canEdit={data.canEdit}
          aiAvailable={data.aiAvailable}
          aiUnavailableReason={data.aiUnavailableReason}
          preferredEventId={eventId}
          assignTo={assignTo}
          onClose={() => setAskAiOpen(false)}
          onTasksAdded={handleAskAiAdded}
        />
      ) : null}

      {addOpen ? (
        <TasksEaseAddTaskModal
          canEdit={data.canEdit}
          events={eventOptions}
          orgMembers={data.orgMembers}
          viewer={data.viewer}
          preferredEventId={eventId}
          initialStatus={addStatus}
          onClose={() => setAddOpen(false)}
          onDraftWithAi={() => {
            setAddOpen(false);
            setAskAiOpen(true);
          }}
          onCreated={handleCreated}
        />
      ) : null}

      <TasksEaseTaskDrawer
        task={activeTask}
        canEdit={data.canEdit}
        orgMembers={data.orgMembers}
        onClose={() => setActiveTask(null)}
        onTaskUpdated={(task) => {
          setActiveTask(task);
          setOptimisticTasks((current) =>
            current.map((row) => (row.id === task.id ? task : row)),
          );
          void refresh();
        }}
      />
    </section>
  );
}
