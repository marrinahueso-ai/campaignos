"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Mic, MicOff, Plus, Sparkles } from "lucide-react";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { cn } from "@/lib/utils/cn";
import {
  addGeneratedTasksV2Action,
  generateTasksV2Action,
} from "@/lib/tasks-v2/actions";
import type { TaskHubEventOption } from "@/types/task-hub";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

const MY_VIEWS = [
  { id: "my_tasks", label: "My Tasks" },
  { id: "assigned", label: "Assigned to Me" },
  { id: "this_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

interface TasksV2SidebarProps {
  eventGroups: TasksV2EventGroup[];
  events: TaskHubEventOption[];
  canEdit: boolean;
  aiAvailable: boolean;
  aiUnavailableReason: string | null;
  preferredEventId?: string | null;
  /** When set, source is fixed to this event and the select is locked. */
  lockedEventId?: string | null;
  hideMyViews?: boolean;
  onViewSelect?: (viewId: string) => void;
}

export function TasksV2Sidebar({
  eventGroups,
  events,
  canEdit,
  aiAvailable,
  aiUnavailableReason,
  preferredEventId,
  lockedEventId = null,
  hideMyViews = false,
  onViewSelect,
}: TasksV2SidebarProps) {
  const refreshTasksTab = useEventTabMutationRefresh("tasks");
  const lockedId = lockedEventId?.trim() || null;
  const sourceOptions = useMemo(() => {
    const byId = new Map<string, TaskHubEventOption>();
    for (const event of events) {
      byId.set(event.eventId, event);
    }
    for (const group of eventGroups) {
      if (!byId.has(group.eventId)) {
        byId.set(group.eventId, {
          eventId: group.eventId,
          eventTitle: group.eventTitle,
          eventDate: group.eventDate,
        });
      }
    }
    return [...byId.values()].sort((left, right) =>
      left.eventTitle.localeCompare(right.eventTitle, undefined, {
        sensitivity: "base",
      }),
    );
  }, [eventGroups, events]);

  const resolvedPreferredId = lockedId ?? preferredEventId ?? null;

  const [sourceEventId, setSourceEventId] = useState(
    resolvedPreferredId &&
      sourceOptions.some((event) => event.eventId === resolvedPreferredId)
      ? resolvedPreferredId
      : (sourceOptions[0]?.eventId ?? ""),
  );
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    if (
      resolvedPreferredId &&
      sourceOptions.some((event) => event.eventId === resolvedPreferredId)
    ) {
      setSourceEventId(resolvedPreferredId);
    }
  }, [resolvedPreferredId, sourceOptions]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setErrorMessage("Voice input isn’t supported in this browser.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setErrorMessage("Couldn’t capture voice. Try typing instead.");
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setErrorMessage(null);
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setErrorMessage("Couldn’t start voice input.");
    }
  }, [isListening, stopListening]);

  async function handleGenerate() {
    if (!canEdit) {
      setErrorMessage("You don’t have permission to generate tasks.");
      return;
    }
    if (!sourceEventId) {
      setErrorMessage("Select a campaign/event source first.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    stopListening();

    try {
      const result = await generateTasksV2Action({
        eventId: sourceEventId,
        userPrompt: prompt,
      });

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
    if (!canEdit || !sourceEventId) {
      return;
    }
    const titles = suggestions.filter((title) => selected.has(title));
    if (titles.length === 0) {
      setErrorMessage("Select at least one suggestion to add.");
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);
    try {
      const result = await addGeneratedTasksV2Action({
        eventId: sourceEventId,
        titles,
      });
      if (!result.success) {
        setErrorMessage(result.error ?? "Could not add tasks.");
        return;
      }

      setStatusMessage(
        `Added ${result.addedCount} task${result.addedCount === 1 ? "" : "s"}${
          result.skippedDuplicates
            ? ` (${result.skippedDuplicates} already existed)`
            : ""
        }.`,
      );
      setSuggestions((prev) => prev.filter((title) => !selected.has(title)));
      setSelected(new Set());
      await refreshTasksTab();
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
    <aside className="flex flex-col gap-4">
      <section className="border border-cos-border bg-cos-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cos-accent" />
          <h2 className="font-display text-base text-cos-text">AI Task Generator</h2>
          <span className="rounded bg-[#dce8dc] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#3f5240] uppercase">
            New
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-cos-muted">
          {lockedId
            ? "Describe what you’re working on (or use voice), then generate tasks grounded in this event."
            : "Pick a campaign/event, describe what you’re working on (or use voice), then generate tasks grounded in that event."}
        </p>

        {!aiAvailable && (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
            {aiUnavailableReason ??
              "AI isn’t configured yet — you’ll still get practical suggestions from event context."}
          </p>
        )}

        <label className="mt-3 block text-xs text-cos-muted">
          {lockedId ? "Source event" : "Select source"}
          <select
            className="mt-1 w-full rounded-md border border-cos-border bg-cos-bg px-2 py-1.5 text-sm text-cos-text disabled:cursor-not-allowed disabled:opacity-80"
            value={sourceEventId}
            onChange={(event) => setSourceEventId(event.target.value)}
            disabled={Boolean(lockedId) || sourceOptions.length === 0}
          >
            {sourceOptions.length === 0 ? (
              <option value="">No campaigns available</option>
            ) : (
              sourceOptions.map((event) => (
                <option key={event.eventId} value={event.eventId}>
                  {event.eventTitle}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="mt-3 block text-xs text-cos-muted">
          What are you working on?
          <div className="mt-1 flex gap-2">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="e.g. volunteer signup, booth setup, reminder posts…"
              className="min-h-[4.5rem] w-full resize-y rounded-md border border-cos-border bg-cos-bg px-2 py-1.5 text-sm text-cos-text placeholder:text-cos-muted"
            />
            {voiceSupported ? (
              <button
                type="button"
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                onClick={toggleVoice}
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cos-border transition-colors",
                  isListening
                    ? "bg-cos-text text-[#f6f2eb]"
                    : "bg-cos-bg text-cos-muted hover:text-cos-text",
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
        </label>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !sourceEventId || !canEdit}
          className="mt-3 w-full rounded-md bg-[#2a2622] px-3 py-2 text-xs font-medium text-[#f6f2eb] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : "Generate tasks"}
        </button>

        {errorMessage ? (
          <p className="mt-2 text-[11px] text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? (
          <p className="mt-2 text-[11px] text-cos-muted">{statusMessage}</p>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-cos-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-cos-text">
                Suggestions ({suggestions.length})
              </p>
              <button
                type="button"
                onClick={() => void handleAddSelected()}
                disabled={isAdding || selected.size === 0 || !canEdit}
                className="inline-flex items-center gap-1 rounded-md bg-[#2a2622] px-2 py-1 text-[10px] font-medium text-[#f6f2eb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                {isAdding ? "Adding…" : "Add selected"}
              </button>
            </div>
            <ul className="space-y-2">
              {suggestions.map((title) => {
                const checked = selected.has(title);
                return (
                  <li key={title}>
                    <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-cos-muted">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSuggestion(title)}
                        className="mt-0.5"
                      />
                      <span className={checked ? "text-cos-text" : undefined}>
                        {title}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-cos-muted">
            View suggestions
            <ChevronRight className="h-3.5 w-3.5" />
            <span>generate to see them here</span>
          </p>
        )}
      </section>

      {!hideMyViews ? (
        <section className="border border-cos-border bg-cos-card p-4">
          <h2 className="font-display text-base text-cos-text">My Views</h2>
          <ul className="mt-3 space-y-1">
            {MY_VIEWS.map((view) => (
              <li key={view.id}>
                <button
                  type="button"
                  onClick={() => onViewSelect?.(view.id)}
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                  )}
                >
                  {view.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm text-cos-accent hover:bg-cos-bg"
              >
                <Plus className="h-3.5 w-3.5" />
                Create new view
              </button>
            </li>
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
