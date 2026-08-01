"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import {
  addGeneratedTasksV2Action,
  generateTasksV2Action,
} from "@/lib/tasks-v2/actions";
import { saveTaskPriority } from "@/lib/tasks-v2/tasks-ease-priorities";
import { tasksV2PriorityLabel } from "@/lib/tasks-v2/status-labels";
import { cn } from "@/lib/utils/cn";
import type { TaskHubEventOption } from "@/types/task-hub";
import type { TasksV2Priority } from "@/types/tasks-v2";

type SuggestionLevel = "essential" | "recommended" | "extra";

interface AiSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  level: SuggestionLevel;
  priority: TasksV2Priority;
  dueDate: string;
  selected: boolean;
}

const CATEGORY_OPTIONS = [
  "All Categories",
  "Volunteers",
  "Logistics",
  "Marketing",
] as const;

const PRIORITY_OPTIONS: TasksV2Priority[] = ["high", "medium", "low"];

const LEVEL_META: Record<
  SuggestionLevel,
  { label: string; dot: string; border: string; checkbox: string }
> = {
  essential: {
    label: "Essential",
    dot: "bg-[#6b8171]",
    border: "border-l-[#6b8171]",
    checkbox: "accent-[#6b8171]",
  },
  recommended: {
    label: "Recommended",
    dot: "bg-[#c4922e]",
    border: "border-l-[#c4922e]",
    checkbox: "accent-[#c4922e]",
  },
  extra: {
    label: "Extra Touch",
    dot: "bg-[#8a9a8f]",
    border: "border-l-[#8a9a8f]",
    checkbox: "accent-[#5a7062]",
  },
};

const LEVEL_ORDER: SuggestionLevel[] = ["essential", "recommended", "extra"];

interface TasksEaseAskAiProps {
  events: TaskHubEventOption[];
  canEdit: boolean;
  aiAvailable: boolean;
  aiUnavailableReason: string | null;
  preferredEventId?: string | null;
  onClose: () => void;
  onTasksAdded: () => void;
}

function inferCategory(title: string, preferred: string): string {
  if (preferred && preferred !== "All Categories") return preferred;
  const t = title.toLowerCase();
  if (/\bvolunteer|signup|staff|chaperone|roster\b/.test(t)) return "Volunteers";
  if (/\bpark|signage|setup|tear|supply|room|logistics|vendor|delivery\b/.test(t))
    return "Logistics";
  if (/\bpost|flyer|email|social|market|announce|newsletter\b/.test(t))
    return "Marketing";
  if (/\bphoto|consent|safety|sticker\b/.test(t)) return "Safety";
  if (/\bdecor|stage|instrument\b/.test(t)) return "Decor";
  if (/\bplaylist|experience|seating\b/.test(t)) return "Experience";
  return "Planning";
}

function buildDescription(title: string): string {
  const trimmed = title.trim().replace(/\.$/, "");
  if (trimmed.length > 90) {
    return `${trimmed.slice(0, 87)}…`;
  }
  return `Suggested next step for your event: ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
}

function titlesToSuggestions(
  titles: string[],
  categoryFilter: string,
): AiSuggestion[] {
  const n = titles.length;
  return titles.map((title, index) => {
    let level: SuggestionLevel = "recommended";
    if (n <= 1) {
      level = "essential";
    } else if (n === 2) {
      level = index === 0 ? "essential" : "recommended";
    } else {
      const essentialCount = Math.max(1, Math.ceil(n / 3));
      const recommendedCount = Math.max(1, Math.ceil(n / 3));
      if (index < essentialCount) level = "essential";
      else if (index < essentialCount + recommendedCount) level = "recommended";
      else level = "extra";
    }

    const priority: TasksV2Priority =
      level === "essential" ? "high" : level === "recommended" ? "medium" : "low";

    return {
      id: `sug-${index}-${title.slice(0, 24)}`,
      title,
      description: buildDescription(title),
      category: inferCategory(title, categoryFilter),
      level,
      priority,
      dueDate: "",
      selected: level === "essential" || level === "recommended",
    };
  });
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
    preferredEventId &&
      sortedEvents.some((event) => event.eventId === preferredEventId)
      ? preferredEventId
      : (sortedEvents[0]?.eventId ?? ""),
  );
  const [category, setCategory] = useState<string>("All Categories");
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedDueId, setFocusedDueId] = useState<string | null>(null);

  const selectedCount = suggestions.filter((s) => s.selected).length;
  const hasRecommendations = suggestions.length > 0;

  const byLevel = useMemo(() => {
    const map: Record<SuggestionLevel, AiSuggestion[]> = {
      essential: [],
      recommended: [],
      extra: [],
    };
    for (const suggestion of suggestions) {
      map[suggestion.level].push(suggestion);
    }
    return map;
  }, [suggestions]);

  async function handleGenerate() {
    if (!canEdit || !eventId) {
      setErrorMessage("Select an event first.");
      return;
    }
    setIsGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const focusParts = [prompt.trim()];
      if (category && category !== "All Categories") {
        focusParts.push(`Focus category: ${category}`);
      }
      const result = await generateTasksV2Action({
        eventId,
        userPrompt: focusParts.filter(Boolean).join("\n"),
      });
      if (!result.success) {
        setSuggestions([]);
        setErrorMessage(result.error ?? "Could not generate tasks.");
        return;
      }
      const next = titlesToSuggestions(result.tasks, category);
      setSuggestions(next);
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
    const chosen = suggestions.filter((s) => s.selected);
    if (chosen.length === 0) {
      setErrorMessage("Select at least one suggestion to add.");
      return;
    }
    setIsAdding(true);
    setErrorMessage(null);
    try {
      const result = await addGeneratedTasksV2Action({
        eventId,
        tasks: chosen.map((s) => ({
          title: s.title,
          dueDate: s.dueDate.trim() || null,
        })),
      });
      if (!result.success) {
        setErrorMessage(result.error ?? "Could not add tasks.");
        return;
      }

      for (const created of result.created) {
        const match = chosen.find(
          (s) => s.title.trim().toLowerCase() === created.title.toLowerCase(),
        );
        if (match) {
          saveTaskPriority(created.id, match.priority);
        }
      }

      setStatusMessage(
        `Added ${result.addedCount} task${result.addedCount === 1 ? "" : "s"}${
          result.skippedDuplicates
            ? ` (${result.skippedDuplicates} already existed)`
            : ""
        }.`,
      );
      const addedTitles = new Set(
        result.created.map((c) => c.title.trim().toLowerCase()),
      );
      setSuggestions((prev) =>
        prev.filter((s) => !addedTitles.has(s.title.trim().toLowerCase())),
      );
      onTasksAdded();
    } finally {
      setIsAdding(false);
    }
  }

  function patchSuggestion(id: string, patch: Partial<AiSuggestion>) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function clearRecommendations() {
    setSuggestions([]);
    setStatusMessage(null);
    setErrorMessage(null);
    setFocusedDueId(null);
  }

  const selectClass =
    "h-14 w-full appearance-none rounded-xl border border-[#e8e3da] bg-[#f6f2eb] px-5 pr-10 text-sm font-medium text-[#2f4a3c] outline-none transition focus:border-[#c4922e] focus:ring-2 focus:ring-[#c4922e]/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#2f4a3c]/20 px-4 py-8 backdrop-blur-sm sm:py-12">
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
        className="relative w-full max-w-6xl space-y-8"
      >
        {/* Input card */}
        <div
          className={cn(
            "relative mx-auto w-full max-w-2xl overflow-visible rounded-[32px] border border-[#e8e3da] bg-white p-8 shadow-xl shadow-[#2f4a3c]/5 transition-all duration-500",
            hasRecommendations && "scale-[0.98] opacity-90",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 grid h-8 w-8 place-items-center rounded-full text-[#8a9a8f] transition hover:bg-[#f6f2eb] hover:text-[#2f4a3c]"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10">
            <div className="mb-8 flex items-center gap-5 pr-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e8e3da] bg-[#f6f2eb] text-[#c4922e]">
                <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <div>
                <h2
                  id="tasks-ease-ask-ai-title"
                  className="font-display text-3xl text-[#2f4a3c]"
                >
                  Ask AI for tasks
                </h2>
                <p className="mt-1 text-sm text-[#5a7062]">
                  Suggestions for the event you pick.
                </p>
              </div>
            </div>

            {!aiAvailable ? (
              <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                AI suggestions aren’t available right now — you’ll still get
                practical ideas from the event.
              </p>
            ) : null}

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="px-1 text-[10px] font-bold tracking-widest text-[#8a9a8f] uppercase">
                    Event
                  </span>
                  <div className="relative">
                    <select
                      value={eventId}
                      onChange={(event) => setEventId(event.target.value)}
                      disabled={sortedEvents.length === 0}
                      className={selectClass}
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
                    <ChevronDown
                      className="pointer-events-none absolute top-1/2 right-4 h-3.5 w-3.5 -translate-y-1/2 text-[#8a9a8f]"
                      aria-hidden
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="px-1 text-[10px] font-bold tracking-widest text-[#8a9a8f] uppercase">
                    Category (Optional)
                  </span>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className={selectClass}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute top-1/2 right-4 h-3.5 w-3.5 -translate-y-1/2 text-[#8a9a8f]"
                      aria-hidden
                    />
                  </div>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="px-1 text-[10px] font-bold tracking-widest text-[#8a9a8f] uppercase">
                  What are you working on?
                </span>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={3}
                  placeholder="e.g. volunteer signup, booth setup, reminder posts..."
                  className="w-full resize-none rounded-xl border border-[#e8e3da] bg-[#f6f2eb] p-5 text-sm font-medium text-[#2f4a3c] outline-none transition placeholder:text-[#8a9a8f]/50 focus:border-[#c4922e] focus:ring-2 focus:ring-[#c4922e]/20"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isGenerating || !eventId || !canEdit}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#2f4a3c] text-sm font-bold text-white shadow-lg shadow-[#2f4a3c]/10 transition hover:bg-[#6b8171] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {isGenerating ? "Generating…" : "Generate tasks"}
              </button>
            </div>

            {errorMessage && !hasRecommendations ? (
              <p className="mt-3 text-[12px] text-cos-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {statusMessage && !hasRecommendations ? (
              <p className="mt-3 text-[12px] text-[#5a7062]">{statusMessage}</p>
            ) : null}
          </div>
        </div>

        {/* Recommendations */}
        {hasRecommendations ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 overflow-visible pb-28 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-3xl text-[#2f4a3c]">
                AI Recommendations
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearRecommendations}
                  className="rounded-lg border border-[#e8e3da] px-4 py-2 text-xs font-bold text-[#5a7062] transition hover:bg-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddSelected()}
                  disabled={isAdding || selectedCount === 0 || !canEdit}
                  className="rounded-lg bg-[#2f4a3c] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#6b8171] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAdding ? "Adding…" : "Add Selected Tasks"}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p className="text-[12px] text-cos-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="text-[12px] text-[#5a7062]">{statusMessage}</p>
            ) : null}

            <div className="grid grid-cols-1 gap-6 overflow-visible md:grid-cols-3">
              {LEVEL_ORDER.map((level) => {
                const meta = LEVEL_META[level];
                const cards = byLevel[level];
                return (
                  <div key={level} className="space-y-4 overflow-visible">
                    <h4 className="flex items-center gap-2 px-2 text-[10px] font-bold tracking-[0.2em] text-[#8a9a8f] uppercase">
                      <span
                        className={cn("h-2 w-2 rounded-full", meta.dot)}
                        aria-hidden
                      />
                      {meta.label}
                    </h4>
                    {cards.length === 0 ? (
                      <p className="px-2 text-[11px] text-[#8a9a8f]">
                        No suggestions in this tier.
                      </p>
                    ) : (
                      cards.map((suggestion, cardIndex) => {
                        const isNearBottom =
                          cardIndex >= Math.max(0, cards.length - 2);
                        const isFocused = focusedDueId === suggestion.id;
                        return (
                          <div
                            key={suggestion.id}
                            className={cn(
                              "level-card relative rounded-2xl border border-[#e8e3da] border-l-4 bg-white p-5 shadow-sm transition hover:-translate-y-0.5",
                              meta.border,
                              "overflow-visible",
                              (isNearBottom || isFocused) && "z-20",
                              isFocused && "z-30",
                            )}
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h5 className="text-sm leading-snug font-bold text-[#2f4a3c]">
                                {suggestion.title}
                              </h5>
                              <input
                                type="checkbox"
                                checked={suggestion.selected}
                                onChange={() =>
                                  patchSuggestion(suggestion.id, {
                                    selected: !suggestion.selected,
                                  })
                                }
                                aria-label={`Select ${suggestion.title}`}
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#e8e3da]",
                                  meta.checkbox,
                                )}
                              />
                            </div>
                            <p className="mb-4 text-[11px] leading-relaxed text-[#5a7062]">
                              {suggestion.description}
                            </p>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded bg-[#f6f2eb] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#8a9a8f] uppercase">
                                {suggestion.category}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <label className="block space-y-1">
                                <span className="text-[9px] font-bold tracking-widest text-[#8a9a8f] uppercase">
                                  Priority
                                </span>
                                <select
                                  value={suggestion.priority}
                                  aria-label={`Priority for ${suggestion.title}`}
                                  onChange={(event) =>
                                    patchSuggestion(suggestion.id, {
                                      priority: event.target
                                        .value as TasksV2Priority,
                                    })
                                  }
                                  className="w-full appearance-none rounded-lg border border-[#e8e3da] bg-[#f6f2eb] px-2.5 py-1.5 text-[11px] font-semibold text-[#2f4a3c] outline-none focus:border-[#c4922e] focus:ring-1 focus:ring-[#c4922e]/30"
                                >
                                  {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {tasksV2PriorityLabel(option)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="relative block space-y-1">
                                <span className="text-[9px] font-bold tracking-widest text-[#8a9a8f] uppercase">
                                  Due date
                                </span>
                                <input
                                  type="date"
                                  value={suggestion.dueDate}
                                  aria-label={`Due date for ${suggestion.title}`}
                                  onFocus={() =>
                                    setFocusedDueId(suggestion.id)
                                  }
                                  onBlur={() =>
                                    setFocusedDueId((current) =>
                                      current === suggestion.id
                                        ? null
                                        : current,
                                    )
                                  }
                                  onChange={(event) =>
                                    patchSuggestion(suggestion.id, {
                                      dueDate: event.target.value,
                                    })
                                  }
                                  className="relative z-10 w-full rounded-lg border border-[#e8e3da] bg-[#f6f2eb] px-2.5 py-1.5 text-[11px] font-semibold text-[#2f4a3c] outline-none focus:border-[#c4922e] focus:ring-1 focus:ring-[#c4922e]/30"
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
