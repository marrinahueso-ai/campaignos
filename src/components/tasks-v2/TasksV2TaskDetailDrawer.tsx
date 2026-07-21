"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useSpeechToText } from "@/lib/speech/use-speech-to-text";
import { updateTaskHubTaskAction } from "@/lib/task-hub/actions";
import { cn } from "@/lib/utils/cn";
import type { TaskHubTaskItem } from "@/types/task-hub";

const NOTES_SAVE_DEBOUNCE_MS = 500;

interface TasksV2TaskDetailDrawerProps {
  task: TaskHubTaskItem | null;
  canEdit: boolean;
  onClose: () => void;
  onNotesSaved?: (taskId: string, notes: string | null) => void;
}

export function TasksV2TaskDetailDrawer({
  task,
  canEdit,
  onClose,
  onNotesSaved,
}: TasksV2TaskDetailDrawerProps) {
  const [draft, setDraft] = useState(task?.notes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(task?.notes ?? "");
  const taskIdRef = useRef(task?.id ?? null);
  const draftRef = useRef(draft);
  const scheduleSaveRef = useRef<(nextDraft: string) => void>(() => {});

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const {
    voiceSupported,
    isListening,
    error: voiceError,
    toggleVoice,
    stopListening,
    clearError: clearVoiceError,
  } = useSpeechToText({
    getBaseText: () => draftRef.current,
    onTextChange: (text) => {
      setDraft(text);
      setSaveState("idle");
      scheduleSaveRef.current(text);
    },
  });

  useEffect(() => {
    taskIdRef.current = task?.id ?? null;
    const notes = task?.notes ?? "";
    setDraft(notes);
    lastSavedRef.current = notes;
    setSaveState("idle");
    setError(null);
    clearVoiceError();
    stopListening();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [task?.id, task?.notes, clearVoiceError, stopListening]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!task) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [task, onClose]);

  function persistNotes(nextDraft: string) {
    if (!task || !canEdit) return;

    const normalized = nextDraft.trim() || null;
    const previous = lastSavedRef.current.trim() || null;
    if (normalized === previous) {
      setSaveState("idle");
      return;
    }

    const eventId = task.event.eventId;
    const taskId = task.id;
    const title = task.title;

    setSaveState("saving");
    setError(null);

    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        eventId,
        taskId,
        { notes: normalized },
        title,
      );

      if (taskIdRef.current !== taskId) {
        return;
      }

      if (!result.success) {
        setSaveState("error");
        setError(result.error ?? "Unable to save notes.");
        return;
      }

      lastSavedRef.current = normalized ?? "";
      setSaveState("saved");
      onNotesSaved?.(taskId, normalized);
    });
  }

  function scheduleSave(nextDraft: string) {
    if (!canEdit || !task) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      persistNotes(nextDraft);
    }, NOTES_SAVE_DEBOUNCE_MS);
  }

  scheduleSaveRef.current = scheduleSave;

  function flushSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    persistNotes(draft);
  }

  if (!task) {
    return null;
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

  const showMic = canEdit && voiceSupported;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close task details"
        className="flex-1"
        onClick={() => {
          stopListening();
          flushSave();
          onClose();
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-v2-detail-title"
        className="flex h-full w-full max-w-md flex-col border-l border-cos-border bg-cos-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-cos-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-cos-muted uppercase">
              Task
            </p>
            <h2
              id="tasks-v2-detail-title"
              className="mt-1 font-display text-xl text-cos-text"
            >
              {task.title}
            </h2>
            <p className="mt-1 truncate text-sm text-cos-muted">
              {task.event.eventTitle}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              stopListening();
              flushSave();
              onClose();
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="space-y-2">
            <label
              htmlFor="tasks-v2-detail-notes"
              className="block text-xs font-medium tracking-[0.12em] text-cos-muted uppercase"
            >
              Notes
            </label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Textarea
                  id="tasks-v2-detail-notes"
                  value={draft}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft(value);
                    setSaveState("idle");
                    clearVoiceError();
                    scheduleSave(value);
                  }}
                  onBlur={flushSave}
                  disabled={!canEdit}
                  placeholder="Add notes for this task…"
                  rows={10}
                  className="min-h-48"
                />
              </div>
              {showMic ? (
                <button
                  type="button"
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  aria-pressed={isListening}
                  title={isListening ? "Stop voice input" : "Dictate notes"}
                  onClick={toggleVoice}
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center border transition-colors",
                    isListening
                      ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                      : "border-cos-border bg-cos-card text-cos-muted hover:text-cos-text",
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
              "text-xs",
              saveState === "error" || voiceError
                ? "text-cos-error-text"
                : "text-cos-muted",
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
