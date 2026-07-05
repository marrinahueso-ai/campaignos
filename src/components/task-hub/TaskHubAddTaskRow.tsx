"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { TaskHubEventOption, TaskHubOrgMember } from "@/types/task-hub";

interface TaskHubAddTaskRowProps {
  events: TaskHubEventOption[];
  orgMembers: TaskHubOrgMember[];
  disabled?: boolean;
  isPending?: boolean;
  onAdd: (input: {
    eventId: string;
    title: string;
    dueDate?: string | null;
    assigneeName?: string | null;
  }) => void;
}

export function TaskHubAddTaskRow({
  events,
  orgMembers,
  disabled,
  isPending,
  onAdd,
}: TaskHubAddTaskRowProps) {
  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState(events[0]?.eventId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [assigneeName, setAssigneeName] = useState("");

  if (events.length === 0) {
    return null;
  }

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || !eventId || disabled || isPending) {
      return;
    }

    onAdd({
      eventId,
      title: trimmed,
      dueDate: dueDate || null,
      assigneeName: assigneeName.trim() || null,
    });
    setTitle("");
    setDueDate("");
    setAssigneeName("");
  }

  return (
    <tr className="border-t border-dashed border-cos-border bg-cos-bg/30">
      <td className="w-8 px-2 py-2 align-middle">
        <Plus className="h-4 w-4 text-cos-muted" aria-hidden />
      </td>
      <td className="px-3 py-2 align-middle">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Add task…"
          disabled={disabled || isPending}
          className="w-full min-w-[8rem] rounded-sm border border-transparent bg-transparent px-1 py-1 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-border focus:bg-cos-card focus:outline-none disabled:opacity-50"
        />
      </td>
      <td className="hidden px-3 py-2 align-middle md:table-cell" />
      <td className="px-3 py-2 align-middle">
        {events.length === 1 ? (
          <span className="truncate text-xs text-cos-muted">{events[0]?.eventTitle}</span>
        ) : (
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            disabled={disabled || isPending}
            className="max-w-full rounded-sm border border-cos-border bg-cos-card px-2 py-1 text-xs text-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20 disabled:opacity-50"
          >
            {events.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.eventTitle}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="hidden px-3 py-2 align-middle lg:table-cell">
        <input
          type="text"
          list="task-hub-assignees"
          value={assigneeName}
          onChange={(event) => setAssigneeName(event.target.value)}
          placeholder="Owner"
          disabled={disabled || isPending}
          className="w-full min-w-[6rem] rounded-sm border border-transparent bg-transparent px-1 py-1 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-border focus:bg-cos-card focus:outline-none disabled:opacity-50"
        />
      </td>
      <td className="px-3 py-2 align-middle" />
      <td className="hidden px-3 py-2 align-middle sm:table-cell">
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          disabled={disabled || isPending}
          className="rounded-sm border border-transparent bg-transparent px-1 py-1 text-sm text-cos-text focus:border-cos-border focus:bg-cos-card focus:outline-none disabled:opacity-50"
        />
      </td>
      <td className="px-3 py-2 align-middle" />
      <td className="px-2 py-2 align-middle">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isPending || !title.trim()}
          className="rounded-sm px-2 py-1 text-xs font-medium text-cos-accent hover:bg-cos-bg disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Adding task" />
          ) : (
            "Add"
          )}
        </button>
      </td>
      {orgMembers.length > 0 && (
        <datalist id="task-hub-assignees">
          {orgMembers.map((member) => (
            <option key={member.id} value={member.displayName} />
          ))}
        </datalist>
      )}
    </tr>
  );
}
