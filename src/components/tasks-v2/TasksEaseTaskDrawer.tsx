"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Mic, MicOff, X } from "lucide-react";
import { eventTasksHref } from "@/lib/events/event-responsibility";
import { useSpeechToText } from "@/lib/speech/use-speech-to-text";
import { updateTaskHubTaskAction } from "@/lib/task-hub/actions";
import { deriveTaskPriority } from "@/lib/tasks-v2/derive-priority";
import {
  TASKS_V2_STATUS_OPTIONS,
  tasksV2PriorityLabel,
  tasksV2StatusLabel,
} from "@/lib/tasks-v2/status-labels";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubOrgMember, TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2Priority } from "@/types/tasks-v2";

const NOTES_SAVE_DEBOUNCE_MS = 500;

interface TasksEaseTaskDrawerProps {
  task: TaskHubTaskItem | null;
  canEdit: boolean;
  orgMembers: TaskHubOrgMember[];
  onClose: () => void;
  onTaskUpdated?: (task: TaskHubTaskItem) => void;
}

const PRIORITY_STYLE: Record<TasksV2Priority, string> = {
  high: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
  medium: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
  low: "bg-[rgba(107,129,113,0.14)] text-[#2f4a3c]",
};

const STATUS_STYLE: Record<EventPlaybookTaskStatus, string> = {
  todo: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
  in_progress: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
  blocked: "bg-[rgba(122,113,102,0.16)] text-[#5c554c]",
  done: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
};

export function TasksEaseTaskDrawer({
  task,
  canEdit,
  orgMembers,
  onClose,
  onTaskUpdated,
}: TasksEaseTaskDrawerProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<EventPlaybookTaskStatus>(
    task?.status ?? "todo",
  );
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(
    task?.assigneeUserId ?? null,
  );
  const [assigneeName, setAssigneeName] = useState<string | null>(
    task?.assigneeName ?? null,
  );
  const [assigneeInitials, setAssigneeInitials] = useState<string | null>(
    task?.assigneeInitials ?? null,
  );
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedNotesRef = useRef(task?.notes ?? "");
  const taskIdRef = useRef(task?.id ?? null);
  const notesRef = useRef(notes);
  const scheduleNotesSaveRef = useRef<(next: string) => void>(() => {});

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const {
    voiceSupported,
    isListening,
    error: voiceError,
    toggleVoice,
    stopListening,
    clearError: clearVoiceError,
  } = useSpeechToText({
    getBaseText: () => notesRef.current,
    onTextChange: (text) => {
      setNotes(text);
      setSaveState("idle");
      scheduleNotesSaveRef.current(text);
    },
  });

  useEffect(() => {
    if (!task) return;
    taskIdRef.current = task.id;
    setTitle(task.title);
    setStatus(task.status);
    setDueDate(task.dueDate ?? "");
    setAssigneeUserId(task.assigneeUserId);
    setAssigneeName(task.assigneeName);
    setAssigneeInitials(task.assigneeInitials);
    setNotes(task.notes ?? "");
    lastSavedNotesRef.current = task.notes ?? "";
    setSaveState("idle");
    setError(null);
    clearVoiceError();
    stopListening();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [task, clearVoiceError, stopListening]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!task) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  const current = task;
  const priority = deriveTaskPriority({
    ...current,
    status,
    dueDate: dueDate || null,
  });
  const eventHref = eventTasksHref(current.event.eventId);

  function patchTask(
    patch: Partial<
      Pick<
        TaskHubTaskItem,
        | "title"
        | "status"
        | "dueDate"
        | "assigneeUserId"
        | "assigneeName"
        | "assigneeInitials"
        | "notes"
      >
    >,
  ) {
    const eventId = current.event.eventId;
    const taskId = current.id;
    setSaveState("saving");
    setError(null);

    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        eventId,
        taskId,
        {
          title: patch.title,
          status: patch.status,
          dueDate: patch.dueDate,
          assigneeUserId: patch.assigneeUserId,
          assigneeName: patch.assigneeName,
          assigneeInitials: patch.assigneeInitials,
          notes: patch.notes,
        },
        patch.title ?? current.title,
      );

      if (taskIdRef.current !== taskId) return;

      if (!result.success) {
        setSaveState("error");
        setError(result.error ?? "Could not save.");
        return;
      }

      setSaveState("saved");
      const next: TaskHubTaskItem = {
        ...current,
        title: patch.title ?? current.title,
        status: patch.status ?? current.status,
        dueDate:
          patch.dueDate !== undefined ? patch.dueDate : current.dueDate,
        assigneeUserId:
          patch.assigneeUserId !== undefined
            ? patch.assigneeUserId
            : current.assigneeUserId,
        assigneeName:
          patch.assigneeName !== undefined
            ? patch.assigneeName
            : current.assigneeName,
        assigneeInitials:
          patch.assigneeInitials !== undefined
            ? patch.assigneeInitials
            : current.assigneeInitials,
        notes: patch.notes !== undefined ? patch.notes : current.notes,
      };
      onTaskUpdated?.(next);
    });
  }

  function persistNotes(nextDraft: string) {
    if (!canEdit) return;
    const normalized = nextDraft.trim() || null;
    const previous = lastSavedNotesRef.current.trim() || null;
    if (normalized === previous) {
      setSaveState("idle");
      return;
    }
    lastSavedNotesRef.current = normalized ?? "";
    patchTask({ notes: normalized });
  }

  function scheduleNotesSave(nextDraft: string) {
    if (!canEdit) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      persistNotes(nextDraft);
    }, NOTES_SAVE_DEBOUNCE_MS);
  }
  scheduleNotesSaveRef.current = scheduleNotesSave;

  function flushNotes() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    persistNotes(notes);
  }

  function handleClose() {
    stopListening();
    flushNotes();
    onClose();
  }

  const statusHint =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? (error ?? "Could not save")
          : voiceError
            ? voiceError
            : isListening
              ? "Listening… click the mic again to stop."
              : canEdit
                ? "Changes save automatically"
                : "View only";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(42,38,34,0.28)] backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close task details"
        className="flex-1"
        onClick={handleClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-ease-detail-title"
        className="relative flex h-full w-full max-w-[26rem] flex-col overflow-hidden border-l border-[rgba(42,38,34,0.1)] bg-[#fffcf7] shadow-[0_20px_48px_rgba(42,38,34,0.16)] before:pointer-events-none before:absolute before:top-0 before:right-0 before:h-48 before:w-48 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:bottom-20 after:left-0 after:h-40 after:w-40 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']"
      >
        <div className="relative flex items-start justify-between gap-3 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.1em] text-[#7a7166] uppercase">
              Task
            </p>
            {canEdit ? (
              <input
                id="tasks-ease-detail-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  const next = title.trim();
                    if (!next) {
                    setTitle(current.title);
                    return;
                  }
                  if (next !== current.title) {
                    patchTask({ title: next });
                  }
                }}
                className="mt-1.5 w-full border-0 bg-transparent font-display text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-[#2a2622] outline-none placeholder:text-[#7a7166]"
              />
            ) : (
              <h2
                id="tasks-ease-detail-title"
                className="mt-1.5 font-display text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-[#2a2622]"
              >
                {current.title}
              </h2>
            )}
            <Link
              href={eventHref}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5c554c] transition hover:text-[#2a2622]"
            >
              {current.event.eventTitle}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(42,38,34,0.1)] bg-white text-[#5c554c] transition hover:text-[#2a2622]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
                Status
              </span>
              <select
                value={status}
                disabled={!canEdit}
                onChange={(event) => {
                  const next = event.target.value as EventPlaybookTaskStatus;
                  setStatus(next);
                  patchTask({ status: next });
                }}
                className={cn(
                  "w-full appearance-none rounded-full border-0 px-3 py-2 text-xs font-bold outline-none disabled:opacity-60",
                  STATUS_STYLE[status],
                )}
              >
                {TASKS_V2_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {tasksV2StatusLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
                Priority
              </span>
              <span
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-full px-3 py-2 text-xs font-bold",
                  PRIORITY_STYLE[priority],
                )}
                title="Based on due date and status"
              >
                {tasksV2PriorityLabel(priority)}
              </span>
            </label>

            <label className="col-span-2 block space-y-1.5 sm:col-span-1">
              <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
                Due date
              </span>
              <input
                type="date"
                value={dueDate}
                disabled={!canEdit}
                onChange={(event) => {
                  const next = event.target.value;
                  setDueDate(next);
                  patchTask({ dueDate: next || null });
                }}
                className={cn(
                  "w-full appearance-none rounded-full border-0 px-3 py-2 text-xs font-bold outline-none disabled:opacity-60",
                  "[color-scheme:light]",
                  dueDate
                    ? "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]"
                    : "bg-[rgba(122,113,102,0.12)] text-[#5c554c]",
                )}
              />
            </label>

            <label className="col-span-2 block space-y-1.5 sm:col-span-1">
              <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
                Assigned to
              </span>
              {canEdit ? (
                <select
                  value={
                    assigneeUserId &&
                    orgMembers.some((member) => member.userId === assigneeUserId)
                      ? assigneeUserId
                      : ""
                  }
                  aria-label="Assign task"
                  onChange={(event) => {
                    const userId = event.target.value || null;
                    if (!userId) {
                      setAssigneeUserId(null);
                      setAssigneeName(null);
                      setAssigneeInitials(null);
                      patchTask({
                        assigneeUserId: null,
                        assigneeName: null,
                        assigneeInitials: null,
                      });
                      return;
                    }
                    const member = orgMembers.find(
                      (entry) => entry.userId === userId,
                    );
                    const next = {
                      assigneeUserId: userId,
                      assigneeName: member?.displayName ?? null,
                      assigneeInitials: member?.initials ?? null,
                    };
                    setAssigneeUserId(next.assigneeUserId);
                    setAssigneeName(next.assigneeName);
                    setAssigneeInitials(next.assigneeInitials);
                    patchTask(next);
                  }}
                  className={cn(
                    "w-full appearance-none rounded-full border-0 px-3 py-2 text-xs font-bold outline-none disabled:opacity-60",
                    assigneeUserId
                      ? "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]"
                      : "bg-[rgba(122,113,102,0.12)] text-[#5c554c]",
                  )}
                >
                  <option value="">Unassigned</option>
                  {orgMembers
                    .filter((member) => member.userId)
                    .map((member) => (
                      <option key={member.id} value={member.userId!}>
                        {member.displayName}
                      </option>
                    ))}
                </select>
              ) : (
                <span
                  className={cn(
                    "inline-flex w-full items-center rounded-full px-3 py-2 text-xs font-bold",
                    assigneeUserId
                      ? "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]"
                      : "bg-[rgba(122,113,102,0.12)] text-[#5c554c]",
                  )}
                >
                  {assigneeName ?? "Unassigned"}
                </span>
              )}
            </label>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="tasks-ease-detail-notes"
              className="block text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase"
            >
              Notes
            </label>
            <div className="flex gap-2">
              <textarea
                id="tasks-ease-detail-notes"
                value={notes}
                disabled={!canEdit}
                rows={8}
                placeholder="Add notes for this task…"
                onChange={(event) => {
                  const value = event.target.value;
                  setNotes(value);
                  setSaveState("idle");
                  clearVoiceError();
                  scheduleNotesSave(value);
                }}
                onBlur={flushNotes}
                className="min-h-40 w-full flex-1 resize-y rounded-[18px] border border-[rgba(42,38,34,0.1)] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#2a2622] outline-none placeholder:text-[#7a7166] focus:border-[#6b8171] disabled:opacity-60"
              />
              {canEdit && voiceSupported ? (
                <button
                  type="button"
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  aria-pressed={isListening}
                  title={isListening ? "Stop voice input" : "Dictate notes"}
                  onClick={toggleVoice}
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
                    isListening
                      ? "border-[#2a2622] bg-[#2a2622] text-[#f6f2eb]"
                      : "border-[rgba(42,38,34,0.1)] bg-white text-[#5c554c] hover:text-[#2a2622]",
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Mic className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              ) : null}
            </div>
          </div>

          <p
            className={cn(
              "text-xs font-semibold",
              saveState === "error" || voiceError
                ? "text-[#a65a3a]"
                : "text-[#7a7166]",
            )}
            aria-live="polite"
          >
            {statusHint}
          </p>
        </div>
      </aside>
    </div>
  );
}
