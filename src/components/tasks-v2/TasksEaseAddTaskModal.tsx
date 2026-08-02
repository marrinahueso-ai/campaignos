"use client";

import { useEffect, useState, useTransition } from "react";
import { Calendar, CheckSquare, Sparkles, X } from "lucide-react";
import { eventTasksHref } from "@/lib/events/event-responsibility";
import {
  createTaskHubTaskAction,
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { deriveInitials } from "@/lib/task-hub/org-members";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type {
  TaskHubEventOption,
  TaskHubOrgMember,
  TaskHubTaskItem,
} from "@/types/task-hub";
import type { TasksV2Viewer } from "@/types/tasks-v2";

interface TasksEaseAddTaskModalProps {
  canEdit: boolean;
  events: TaskHubEventOption[];
  orgMembers: TaskHubOrgMember[];
  viewer: TasksV2Viewer;
  preferredEventId?: string | null;
  /** When set, force creates onto this event and disable the event picker. */
  lockEventId?: string | null;
  initialStatus?: EventPlaybookTaskStatus;
  /** Mine scope: auto-assign new tasks to the viewer. */
  assignToSelf?: boolean;
  onClose: () => void;
  onDraftWithAi: () => void;
  onCreated: (task: TaskHubTaskItem) => void;
}

export function TasksEaseAddTaskModal({
  canEdit,
  events,
  orgMembers,
  viewer,
  preferredEventId = null,
  lockEventId = null,
  initialStatus = "todo",
  assignToSelf = false,
  onClose,
  onDraftWithAi,
  onCreated,
}: TasksEaseAddTaskModalProps) {
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const lockedId =
    lockEventId && events.some((event) => event.eventId === lockEventId)
      ? lockEventId
      : null;
  const [eventId, setEventId] = useState(
    () =>
      lockedId ||
      (preferredEventId &&
        events.some((event) => event.eventId === preferredEventId) &&
        preferredEventId) ||
      events[0]?.eventId ||
      "",
  );
  const [status, setStatus] = useState<EventPlaybookTaskStatus>(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lockedId) {
      setEventId(lockedId);
      return;
    }
    if (
      preferredEventId &&
      events.some((event) => event.eventId === preferredEventId)
    ) {
      setEventId(preferredEventId);
      return;
    }
    if (!eventId && events[0]?.eventId) {
      setEventId(events[0].eventId);
    }
  }, [eventId, events, lockedId, preferredEventId]);

  function handleSubmit() {
    if (!canEdit) {
      setError("You don’t have permission to add tasks.");
      return;
    }
    const targetEventId = lockedId ?? eventId;
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !targetEventId) {
      setError("Pick an event and a task name.");
      return;
    }
    const eventOption = events.find((event) => event.eventId === targetEventId);
    if (!eventOption) {
      setError("Pick a valid event.");
      return;
    }

    const assignSelf =
      (assignToSelf && !assigneeUserId && Boolean(viewer.userId)) ||
      assigneeUserId === viewer.userId;
    const pickedMember = orgMembers.find(
      (member) => member.userId && member.userId === assigneeUserId,
    );
    const selfMember = orgMembers.find(
      (member) => member.userId && member.userId === viewer.userId,
    );
    const assigneeMember =
      pickedMember ?? (assignSelf && !assigneeUserId ? selfMember : null);
    const nextAssigneeUserId =
      assigneeMember?.userId ??
      (assignSelf && !assigneeUserId ? viewer.userId : null);
    const assigneeName = assigneeMember
      ? assigneeMember.displayName
      : assignSelf
        ? (viewer.displayName ?? "You")
        : null;
    const assigneeInitials = assigneeMember
      ? assigneeMember.initials
      : assigneeName
        ? deriveInitials(assigneeName)
        : null;
    const nextDueDate = dueDate.trim() || null;
    const nextNotes = notes.trim() || null;

    setPending(true);
    setError(null);
    startTransition(async () => {
      const result = await createTaskHubTaskAction(targetEventId, {
        title: trimmedTitle,
        dueDate: nextDueDate,
        assigneeUserId: nextAssigneeUserId,
        assigneeName,
        assigneeInitials,
      });
      if (!result.success || !result.taskId) {
        setPending(false);
        setError(result.error ?? "Could not add task.");
        return;
      }

      if (nextNotes) {
        await updateTaskHubTaskAction(
          targetEventId,
          result.taskId,
          { notes: nextNotes },
          trimmedTitle,
        );
      }
      if (status !== "todo") {
        await updateTaskHubTaskStatusAction(
          targetEventId,
          result.taskId,
          status,
          trimmedTitle,
        );
      }

      setPending(false);
      onCreated({
        id: result.taskId,
        eventId: targetEventId,
        title: trimmedTitle,
        status,
        sortOrder: 0,
        dueDate: nextDueDate,
        assigneeName,
        assigneeInitials,
        assigneeUserId: nextAssigneeUserId,
        groupId: null,
        notes: nextNotes,
        hasNotes: Boolean(nextNotes),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        event: {
          eventId: eventOption.eventId,
          eventTitle: eventOption.eventTitle,
          eventDate: eventOption.eventDate,
          eventHref: eventTasksHref(eventOption.eventId),
        },
      });
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        aria-label="Close add task"
        className="absolute inset-0 bg-[#2a2622]/40 backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-ease-add-task-title"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-[#e8e2d9] bg-white shadow-2xl md:flex-row"
      >
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#e8e2d9] bg-[#faf8f5] p-8 md:flex">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f3f1] text-[#2f4a3c]">
              <CheckSquare className="h-5 w-5" aria-hidden />
            </div>
            <h3
              className="mb-2 text-xl leading-tight text-[#2a2622] italic"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              A new task for the team.
            </h3>
            <p className="text-[12px] leading-relaxed text-[#5c5752]">
              Assign people, set a due date, and tie it to an event to keep the
              hub organized.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8e2d9] bg-white text-[10px] text-[#6e6a64]">
              <Sparkles className="h-3 w-3" aria-hidden />
            </div>
            <p className="text-[10px] font-bold tracking-widest text-[#6e6a64] uppercase leading-tight">
              AI can help you draft a checklist
            </p>
          </div>
        </aside>

        <div className="relative flex-1 p-8 md:p-10">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full text-[#6e6a64] transition hover:bg-[#faf8f5] hover:text-[#2a2622]"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="mb-8 pr-8">
            <h2
              id="tasks-ease-add-task-title"
              className="mb-1 text-3xl text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Add a task
            </h2>
            <p className="text-sm text-[#5c5752]">
              Tell your team what needs doing.
            </p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label className="block space-y-2">
              <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                Task Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Call the bounce house rental..."
                autoFocus
                className="w-full rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 text-sm font-medium text-[#2a2622] outline-none transition placeholder:text-[#6e6a64] focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)]"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <label
                  htmlFor="tasks-ease-add-notes"
                  className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase"
                >
                  Description
                </label>
                <button
                  type="button"
                  onClick={onDraftWithAi}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#f0f3f1] px-2 py-1 text-[11px] font-bold text-[#2f4a3c] transition hover:bg-[#e1e7e4] hover:text-[#253a2f]"
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Draft with AI
                </button>
              </div>
              <textarea
                id="tasks-ease-add-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Add some details or a checklist..."
                className="w-full resize-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 text-sm text-[#2a2622] outline-none transition placeholder:text-[#6e6a64] focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Tied to Event
                </span>
                <select
                  value={lockedId ?? eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  disabled={Boolean(lockedId) || events.length === 0}
                  className="w-full appearance-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 pr-10 text-sm font-medium text-[#2a2622] outline-none focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)]"
                >
                  {events.length === 0 ? (
                    <option value="">No events available</option>
                  ) : (
                    events.map((event) => (
                      <option key={event.eventId} value={event.eventId}>
                        {event.eventTitle}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Assignee
                </span>
                <select
                  value={assigneeUserId}
                  onChange={(event) => setAssigneeUserId(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 pr-10 text-sm font-medium text-[#2a2622] outline-none focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)]"
                >
                  <option value="">Unassigned</option>
                  {orgMembers
                    .filter((member) => member.userId)
                    .map((member) => (
                      <option key={member.id} value={member.userId!}>
                        {member.userId === viewer.userId
                          ? `${member.displayName} (You)`
                          : member.displayName}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Due Date
                </span>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 pr-10 text-sm font-medium text-[#2a2622] outline-none focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)]"
                  />
                  <Calendar
                    className="pointer-events-none absolute top-1/2 right-4 h-3.5 w-3.5 -translate-y-1/2 text-[#6e6a64]"
                    aria-hidden
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Board
                </span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as EventPlaybookTaskStatus)
                  }
                  className="w-full appearance-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 pr-10 text-sm font-medium text-[#2a2622] outline-none focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)]"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Needs Review</option>
                </select>
              </label>
            </div>

            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-6">
              <button
                type="submit"
                disabled={pending || !title.trim() || !eventId}
                className="w-full rounded-2xl bg-[#2f4a3c] py-4 text-lg font-bold text-white shadow-xl shadow-[#2f4a3c]/10 transition hover:bg-[#253a2f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add Task"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-[#e8e2d9] py-3 text-center text-sm font-bold text-[#5c5752] transition hover:bg-[#faf8f5] hover:text-[#2a2622]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
