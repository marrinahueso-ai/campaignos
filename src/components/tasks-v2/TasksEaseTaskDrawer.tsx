"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Calendar,
  CheckSquare,
  ExternalLink,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { eventTasksHref } from "@/lib/events/event-responsibility";
import { useSpeechToText } from "@/lib/speech/use-speech-to-text";
import {
  deleteTaskHubTaskAction,
  getTaskHubTaskNotesAction,
  updateTaskHubTaskAction,
} from "@/lib/task-hub/actions";
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
  onTaskDeleted?: (taskId: string) => void;
}

const PRIORITY_STYLE: Record<TasksV2Priority, string> = {
  high: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
  medium: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
  low: "bg-[rgba(107,129,113,0.14)] text-[#2f4a3c]",
};

const fieldClass =
  "w-full appearance-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 text-sm font-medium text-[#2a2622] outline-none transition focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)] disabled:opacity-60";

export function TasksEaseTaskDrawer({
  task,
  canEdit,
  orgMembers,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
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
  const [deleting, setDeleting] = useState(false);
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
    setDeleting(false);
    clearVoiceError();
    stopListening();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Org list DTO may omit note bodies — fetch when the indicator says they exist.
    if (!task.notes?.trim() && task.hasNotes) {
      let cancelled = false;
      void getTaskHubTaskNotesAction(task.eventId, task.id).then((result) => {
        if (cancelled || !result.success) return;
        if (taskIdRef.current !== task.id) return;
        const loaded = result.notes ?? "";
        setNotes(loaded);
        lastSavedNotesRef.current = loaded;
      });
      return () => {
        cancelled = true;
      };
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

  function handleDelete() {
    if (!canEdit || deleting) return;
    if (
      !window.confirm(`Delete “${current.title}”? This can’t be undone.`)
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskHubTaskAction(
        current.event.eventId,
        current.id,
        current.title,
      );
      if (!result.success) {
        setDeleting(false);
        setError(result.error ?? "Could not delete task.");
        return;
      }
      stopListening();
      onTaskDeleted?.(current.id);
      onClose();
    });
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        aria-label="Close task details"
        className="absolute inset-0 bg-[#2a2622]/40 backdrop-blur-[4px]"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-ease-detail-title"
        className="relative flex max-h-[min(90dvh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-[#e8e2d9] bg-white shadow-2xl md:flex-row"
      >
        {/* Left context pane — matches Add task modal */}
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#e8e2d9] bg-[#faf8f5] p-8 md:flex">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f3f1] text-[#2f4a3c]">
              <CheckSquare className="h-5 w-5" aria-hidden />
            </div>
            <h3
              className="mb-2 text-xl leading-tight text-[#2a2622] italic"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Keep the team aligned.
            </h3>
            <p className="text-[12px] leading-relaxed text-[#5c5752]">
              Update status, due date, and notes so everyone knows what’s next
              for this event.
            </p>
            <Link
              href={eventHref}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2f4a3c] transition hover:underline"
            >
              {current.event.eventTitle}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
            <p className="mt-4">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter",
                  PRIORITY_STYLE[priority],
                )}
                title="Based on due date and status"
              >
                Priority · {tasksV2PriorityLabel(priority)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8e2d9] bg-white text-[10px] text-[#6e6a64]">
              <Sparkles className="h-3 w-3" aria-hidden />
            </div>
            <p className="text-[10px] font-bold tracking-widest text-[#6e6a64] uppercase leading-tight">
              {canEdit ? "Changes save automatically" : "View only"}
            </p>
          </div>
        </aside>

        {/* Right form pane — same chrome as Add task */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-8 md:p-10">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full text-[#6e6a64] transition hover:bg-[#faf8f5] hover:text-[#2a2622]"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="mb-8 pr-8">
            <p className="mb-1 text-[10px] font-bold tracking-widest text-[#6e6a64] uppercase">
              Task
            </p>
            <h2
              className="mb-1 text-3xl text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Edit task
            </h2>
            <p className="text-sm text-[#5c5752]">
              Tell your team what needs doing.
            </p>
          </div>

          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                Task Title
              </span>
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
                  className={fieldClass}
                />
              ) : (
                <p
                  id="tasks-ease-detail-title"
                  className="rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 text-sm font-medium text-[#2a2622]"
                >
                  {current.title}
                </p>
              )}
            </label>

            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <label
                  htmlFor="tasks-ease-detail-notes"
                  className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase"
                >
                  Description
                </label>
                {canEdit && voiceSupported ? (
                  <button
                    type="button"
                    aria-label={
                      isListening ? "Stop voice input" : "Start voice input"
                    }
                    aria-pressed={isListening}
                    title={isListening ? "Stop voice input" : "Dictate notes"}
                    onClick={toggleVoice}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold transition",
                      isListening
                        ? "bg-[#2a2622] text-white"
                        : "bg-[#f0f3f1] text-[#2f4a3c] hover:bg-[#e1e7e4]",
                    )}
                  >
                    {isListening ? (
                      <MicOff className="h-3 w-3" aria-hidden />
                    ) : (
                      <Mic className="h-3 w-3" aria-hidden />
                    )}
                    {isListening ? "Listening…" : "Dictate"}
                  </button>
                ) : (
                  <span className="sr-only">Notes</span>
                )}
              </div>
              <textarea
                id="tasks-ease-detail-notes"
                value={notes}
                disabled={!canEdit}
                rows={3}
                placeholder="Add some details or a checklist..."
                aria-label="Notes"
                onChange={(event) => {
                  const value = event.target.value;
                  setNotes(value);
                  setSaveState("idle");
                  clearVoiceError();
                  scheduleNotesSave(value);
                }}
                onBlur={flushNotes}
                className="w-full resize-none rounded-2xl border border-[#e8e2d9] bg-[#faf8f5] px-4 py-3 text-sm text-[#2a2622] outline-none transition placeholder:text-[#6e6a64] focus:border-[#2f4a3c] focus:shadow-[0_0_0_4px_rgba(47,74,60,0.05)] disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Tied to Event
                </span>
                <Link
                  href={eventHref}
                  className={cn(
                    fieldClass,
                    "flex items-center justify-between gap-2 hover:border-[#2f4a3c]",
                  )}
                >
                  <span className="truncate">{current.event.eventTitle}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#6e6a64]" aria-hidden />
                </Link>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Assignee
                </span>
                {canEdit ? (
                  <select
                    value={
                      assigneeUserId &&
                      orgMembers.some(
                        (member) => member.userId === assigneeUserId,
                      )
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
                    className={fieldClass}
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
                  <span className={cn(fieldClass, "block")}>
                    {assigneeName ?? "Unassigned"}
                    {assigneeInitials ? (
                      <span className="sr-only"> ({assigneeInitials})</span>
                    ) : null}
                  </span>
                )}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold tracking-widest text-[#6e6a64] uppercase">
                  Due Date
                </span>
                <div className="relative">
                  <input
                    type="date"
                    value={dueDate}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = event.target.value;
                      setDueDate(next);
                      patchTask({ dueDate: next || null });
                    }}
                    className={cn(fieldClass, "pr-10 [color-scheme:light]")}
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
                  disabled={!canEdit}
                  onChange={(event) => {
                    const next = event.target.value as EventPlaybookTaskStatus;
                    setStatus(next);
                    patchTask({ status: next });
                  }}
                  className={fieldClass}
                >
                  {TASKS_V2_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {tasksV2StatusLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p
              className={cn(
                "text-xs font-semibold md:hidden",
                saveState === "error" || voiceError || error
                  ? "text-[#a65a3a]"
                  : "text-[#6e6a64]",
              )}
              aria-live="polite"
            >
              {error && saveState !== "error" ? error : statusHint}
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={deleting}
                className="w-full rounded-2xl bg-[#2f4a3c] py-4 text-lg font-bold text-white shadow-xl shadow-[#2f4a3c]/10 transition hover:bg-[#253a2f] disabled:opacity-60"
              >
                Done
              </button>
              {canEdit ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label={`Delete ${current.title}`}
                  title="Delete task"
                  className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-[#a8a29c] transition hover:bg-[rgba(166,90,58,0.12)] hover:text-[#a65a3a] disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              <p
                className={cn(
                  "hidden text-center text-xs font-semibold md:block",
                  saveState === "error" || voiceError || error
                    ? "text-[#a65a3a]"
                    : "text-[#6e6a64]",
                )}
                aria-live="polite"
              >
                {error && saveState !== "error" ? error : statusHint}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
