"use client";

import { useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  addGeneratedTasksV2Action,
  generateTasksV2Action,
} from "@/lib/tasks-v2/actions";
import { cn } from "@/lib/utils/cn";
import type { TaskHubEventOption } from "@/types/task-hub";

interface TasksEaseAskAiProps {
  events: TaskHubEventOption[];
  canEdit: boolean;
  aiAvailable: boolean;
  aiUnavailableReason: string | null;
  preferredEventId?: string | null;
  onClose: () => void;
  onTasksAdded: () => void;
}

export function TasksEaseAskAi({
  events,
  canEdit,
  aiAvailable,
  preferredEventId = null,
  onClose,
  onTasksAdded,
}: TasksEaseAskAiProps) {
  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) =>
        a.eventTitle.localeCompare(b.eventTitle, undefined, {
          sensitivity: "base",
        }),
      ),
    [events],
  );
  const [eventId, setEventId] = useState(
    preferredEventId && sortedEvents.some((event) => event.eventId === preferredEventId)
      ? preferredEventId
      : (sortedEvents[0]?.eventId ?? ""),
  );
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerate() {
    if (!canEdit || !eventId) {
      setErrorMessage("Select an event first.");
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const result = await generateTasksV2Action({ eventId, userPrompt: prompt });
      if (!result.success) {
        setSuggestions([]);
        setSelected(new Set());
        setErrorMessage(result.error ?? "Could not generate tasks.");
        return;
      }
      setSuggestions(result.tasks);
      setSelected(new Set(result.tasks));
      setStatusMessage(
        result.message ??
          (result.usedAi
            ? `Generated ${result.tasks.length} suggestion${result.tasks.length === 1 ? "" : "s"}.`
            : `Showing ${result.tasks.length} suggestion${result.tasks.length === 1 ? "" : "s"} from event context.`),
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAddSelected() {
    if (!canEdit || !eventId) return;
    const titles = suggestions.filter((title) => selected.has(title));
    if (titles.length === 0) {
      setErrorMessage("Select at least one suggestion to add.");
      return;
    }
    setIsAdding(true);
    setErrorMessage(null);
    try {
      const result = await addGeneratedTasksV2Action({ eventId, titles });
      if (!result.success) {
        setErrorMessage(result.error ?? "Could not add tasks.");
        return;
      }
      setStatusMessage(
        `Added ${result.addedCount} task${result.addedCount === 1 ? "" : "s"}${
          result.skippedDuplicates ? ` (${result.skippedDuplicates} already existed)` : ""
        }.`,
      );
      setSuggestions((prev) => prev.filter((title) => !selected.has(title)));
      setSelected(new Set());
      onTasksAdded();
    } finally {
      setIsAdding(false);
    }
  }

  function toggleSuggestion(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-cos-text/20 px-4 py-10 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Close Ask AI for tasks"
        className="fixed inset-0 -z-10"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-ease-ask-ai-title"
        className="w-full max-w-lg rounded-[22px] border border-cos-border bg-cos-card p-6 shadow-[0_20px_48px_rgba(42,38,34,0.12)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(196,146,46,0.16)] text-[#7a5a12]">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h2
                id="tasks-ease-ask-ai-title"
                className="font-display text-xl text-cos-text"
              >
                Ask AI for tasks
              </h2>
              <p className="text-xs text-cos-muted">
                Suggestions for the event you pick — they land on that event’s Tasks
                tab too.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-cos-muted hover:bg-cos-bg hover:text-cos-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!aiAvailable ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            AI suggestions aren’t available right now — you’ll still get practical
            ideas from the event.
          </p>
        ) : null}

        <label className="mt-4 block text-xs font-semibold tracking-[0.08em] text-cos-muted uppercase">
          Event
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            disabled={sortedEvents.length === 0}
            className="mt-1.5 w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text shadow-sm"
          >
            {sortedEvents.length === 0 ? (
              <option value="">No events available</option>
            ) : (
              sortedEvents.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.eventTitle}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="mt-3 block text-xs font-semibold tracking-[0.08em] text-cos-muted uppercase">
          What are you working on?
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder="e.g. volunteer signup, booth setup, reminder posts…"
            className="mt-1.5 min-h-[4.5rem] w-full resize-y rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text shadow-sm placeholder:text-cos-muted"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !eventId || !canEdit}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {isGenerating ? "Generating…" : "Generate tasks"}
        </button>

        {errorMessage ? (
          <p className="mt-2 text-[12px] text-cos-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? (
          <p className="mt-2 text-[12px] text-cos-muted">{statusMessage}</p>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="mt-4 space-y-2 border-t border-cos-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-cos-text">
                Suggestions ({suggestions.length})
              </p>
              <button
                type="button"
                onClick={() => void handleAddSelected()}
                disabled={isAdding || selected.size === 0 || !canEdit}
                className="inline-flex items-center gap-1 rounded-full bg-cos-text px-3 py-1.5 text-[11px] font-bold text-cos-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdding ? "Adding…" : "Add selected"}
              </button>
            </div>
            <ul className="max-h-52 space-y-1.5 overflow-y-auto">
              {suggestions.map((title) => {
                const checked = selected.has(title);
                return (
                  <li key={title}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-[rgba(255,252,247,0.7)] px-2.5 py-2 text-xs leading-relaxed text-cos-muted ring-1 ring-cos-border/70">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSuggestion(title)}
                        className="mt-0.5"
                      />
                      <span className={cn(checked && "text-cos-text")}>{title}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
