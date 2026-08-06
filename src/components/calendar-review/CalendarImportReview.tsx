"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CalendarReviewChatPanel } from "@/components/calendar-review/CalendarReviewChatPanel";
import { CalendarReviewEditDialog } from "@/components/calendar-review/CalendarReviewEditDialog";
import { CalendarReviewPulseFilters } from "@/components/calendar-review/CalendarReviewPulseFilters";
import { Button } from "@/components/ui/Button";
import {
  deleteImportedCalendarEventsAction,
  importCalendarEventsAction,
  parseCalendarImportAction,
  saveCalendarReviewEventsAction,
} from "@/lib/calendar-import/actions";
import {
  applyReviewEventFilters,
  keepCalendarReviewCategory,
  type CalendarReviewFilter,
} from "@/lib/calendar-import/review-filters";
import type { ReviewPlaybookOption } from "@/lib/calendar-import/review-plan-options";
import { cn } from "@/lib/utils/cn";
import { formatEventDate, getTodayDateString } from "@/lib/utils/dates";
import type { CalendarParseStatus } from "@/types";
import type {
  CalendarEventReviewStatus,
  CalendarReviewData,
  CalendarReviewEvent,
} from "@/types/calendar-review";
import { CALENDAR_EVENT_CATEGORY_LABELS } from "@/types/calendar-review";

interface CalendarImportReviewProps {
  importId: string;
  parseStatus: CalendarParseStatus;
  parseError: string | null;
  data: CalendarReviewData;
  importedEventCount: number;
  playbookOptions: ReviewPlaybookOption[];
  /** Hide standalone page chrome when rendered inside Calendar tabs. */
  embedded?: boolean;
  onGoToImport?: () => void;
}

export function CalendarImportReview({
  importId,
  parseStatus: initialParseStatus,
  parseError: initialParseError,
  data,
  importedEventCount,
  playbookOptions,
  embedded = false,
  onGoToImport,
}: CalendarImportReviewProps) {
  const [events, setEvents] = useState<CalendarReviewEvent[]>(data.events);
  const [parseStatus, setParseStatus] = useState(initialParseStatus);
  const [parseError, setParseError] = useState(initialParseError);
  const [focusEventId, setFocusEventId] = useState<string | null>(
    () =>
      data.events.find((event) => event.status === "needs_review")?.id ??
      data.events[0]?.id ??
      null,
  );
  const [editingEvent, setEditingEvent] = useState<CalendarReviewEvent | null>(
    null,
  );
  const [importComplete, setImportComplete] = useState(
    initialParseStatus === "imported" || importedEventCount > 0,
  );
  const [importedCount, setImportedCount] = useState(importedEventCount);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] =
    useState<CalendarReviewFilter>(() => {
      const needs = data.events.filter((e) => e.status === "needs_review").length;
      const ready = data.events.filter((e) => e.status === "ready").length;
      const updates = data.events.filter((e) => e.status === "update").length;
      if (needs > 0) return "needs_review";
      if (ready > 0) return "ready";
      if (updates > 0) return "updates";
      return "ready";
    });
  const [showAiChat, setShowAiChat] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const parseStartedRef = useRef(false);

  const today = getTodayDateString();
  const filteredEvents = useMemo(
    () =>
      applyReviewEventFilters(events, {
        filter: activeFilter,
        dateFilter: "all",
        search: "",
        today,
      }),
    [events, activeFilter, today],
  );

  const focusEvent = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    return (
      filteredEvents.find((event) => event.id === focusEventId) ??
      filteredEvents[0]
    );
  }, [filteredEvents, focusEventId]);

  const queueEvents = useMemo(() => {
    if (!focusEvent) return filteredEvents;
    return filteredEvents.filter((event) => event.id !== focusEvent.id);
  }, [filteredEvents, focusEvent]);

  const isImported = parseStatus === "imported" || importComplete;

  const persistEvents = useCallback(
    (nextEvents: CalendarReviewEvent[]) => {
      setEvents(nextEvents);
      startTransition(async () => {
        await saveCalendarReviewEventsAction(importId, nextEvents);
      });
    },
    [importId],
  );

  useEffect(() => {
    setEvents(data.events);
  }, [data.events]);

  useEffect(() => {
    if (
      parseStartedRef.current ||
      parseStatus !== "pending" ||
      initialParseStatus === "imported"
    ) {
      return;
    }

    parseStartedRef.current = true;
    setParseStatus("parsing");

    startTransition(async () => {
      const result = await parseCalendarImportAction(importId);
      if (result.error) {
        setParseError(result.error);
        setParseStatus("failed");
        return;
      }

      setEvents(result.events);
      setParseStatus("parsed");
      setParseError(null);
      setFocusEventId(
        result.events.find((event) => event.status === "needs_review")?.id ??
          result.events[0]?.id ??
          null,
      );
    });
  }, [importId, parseStatus, initialParseStatus]);

  function handleSaveEdit(updatedEvent: CalendarReviewEvent) {
    persistEvents(
      events.map((event) =>
        event.id === updatedEvent.id
          ? { ...updatedEvent, planManuallySet: true }
          : event,
      ),
    );
    setEditingEvent(null);
  }

  function handlePulseFilterChange(filter: CalendarReviewFilter) {
    setActiveFilter(filter);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleKeepFocus(event: CalendarReviewEvent) {
    const nextEvents = keepCalendarReviewCategory(events, event.id);
    persistEvents(nextEvents);
    const nextNeeds = nextEvents.find(
      (entry) =>
        entry.id !== event.id &&
        (entry.status === "needs_review" || entry.status === "conflict"),
    );
    setFocusEventId(nextNeeds?.id ?? event.id);
  }

  function handleImportReady() {
    setActionError(null);

    startTransition(async () => {
      const result = await importCalendarEventsAction(importId, events);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      if (
        result.importedCount === 0 &&
        result.updatedCount === 0 &&
        result.skippedCount > 0
      ) {
        setActionError(
          `${result.skippedCount} event${result.skippedCount === 1 ? "" : "s"} already on your calendar — nothing new to import.`,
        );
        return;
      }

      setImportedCount(result.importedCount + result.updatedCount);
      setImportComplete(true);
      setParseStatus("imported");
    });
  }

  function handleRetryParse() {
    setParseError(null);
    setParseStatus("parsing");
    parseStartedRef.current = true;

    startTransition(async () => {
      const result = await parseCalendarImportAction(importId);
      if (result.error) {
        setParseError(result.error);
        setParseStatus("failed");
        return;
      }

      setEvents(result.events);
      setParseStatus("parsed");
      setFocusEventId(
        result.events.find((event) => event.status === "needs_review")?.id ??
          result.events[0]?.id ??
          null,
      );
    });
  }

  function handleDeleteImported() {
    setActionError(null);

    startTransition(async () => {
      const result = await deleteImportedCalendarEventsAction(importId);
      if (!result.success) {
        setActionError(result.error ?? "Unable to delete imported events.");
        return;
      }

      setImportComplete(false);
      setImportedCount(0);
      setParseStatus("parsed");
    });
  }

  const importHref = onGoToImport ? undefined : "/calendar?tab=import";

  return (
    <div ref={panelRef} className="space-y-4">
      <p className="flex flex-wrap items-baseline justify-between gap-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
        <span>Review import</span>
        <span className="text-[12px] font-semibold tracking-normal text-cos-muted normal-case">
          Focus what needs a decision — not eight KPI cards
          {data.filename ? ` · ${data.filename}` : ""}
        </span>
      </p>

      {parseStatus === "parsing" ? (
        <div className="flex items-start gap-3 rounded-[18px] border border-cos-border bg-[rgba(255,252,247,0.65)] px-4 py-3">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-cos-muted" />
          <div>
            <p className="text-sm font-bold text-cos-text">
              Reading your calendar and finding dates…
            </p>
            <p className="mt-1 text-sm text-cos-muted">
              This usually takes a few seconds.
            </p>
          </div>
        </div>
      ) : null}

      {parseStatus === "failed" && parseError ? (
        <div className="flex items-start gap-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">
              Could not parse calendar
            </p>
            <p className="mt-1 text-sm text-red-700">{parseError}</p>
            <Button className="mt-3" size="sm" onClick={handleRetryParse}>
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {importComplete ? (
        <div className="flex items-start gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-900">
              {importedCount} events added to your calendar
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              View-only dates are on the calendar now.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!embedded ? (
                <Button href="/calendar" size="sm">
                  Open calendar
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeleteImported}
                disabled={isPending}
              >
                Delete all imported events
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {(parseStatus === "parsed" || isImported) && events.length > 0 ? (
        <>
          <CalendarReviewPulseFilters
            events={events}
            activeFilter={activeFilter}
            onFilterChange={handlePulseFilterChange}
          />

          {filteredEvents.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-12 text-center">
              <p className="text-sm font-bold text-cos-text">
                Nothing in this pulse
              </p>
              <button
                type="button"
                className="mt-3 text-[13px] font-bold text-cos-muted hover:text-cos-text"
                onClick={() => setActiveFilter("all")}
              >
                Show all events
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.75fr)]">
              {focusEvent ? (
                <article className="grid overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:grid-cols-[120px_1fr]">
                  <div
                    className="min-h-[90px] bg-gradient-to-br from-[#1e4a3a] via-[#6b8171] to-[#c4922e] sm:min-h-[160px]"
                    aria-hidden
                  />
                  <div className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                          statusBadgeClass(focusEvent.status),
                        )}
                      >
                        {statusLabel(focusEvent.status)}
                      </span>
                      <span>
                        {CALENDAR_EVENT_CATEGORY_LABELS[focusEvent.category]} ·{" "}
                        {formatEventDate(focusEvent.date)}
                      </span>
                    </div>
                    <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text">
                      {focusEvent.name}
                    </h3>
                    <p className="text-[13px] leading-snug text-cos-muted">
                      {focusCopy(focusEvent)}
                    </p>
                    {!isImported ? (
                      <div className="mt-auto flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleKeepFocus(focusEvent)}
                          disabled={isPending}
                          className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px disabled:opacity-50"
                        >
                          Keep as{" "}
                          {CALENDAR_EVENT_CATEGORY_LABELS[focusEvent.category]}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingEvent(focusEvent)}
                          disabled={isPending}
                          className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px disabled:opacity-50"
                        >
                          Edit details
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ) : null}

              <div className="flex flex-col gap-1.5">
                {queueEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setFocusEventId(event.id)}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3.5 py-2.5 text-left transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                  >
                    <span className="min-w-0">
                      <strong className="mb-0.5 block truncate text-sm font-bold text-cos-text">
                        {event.name}
                      </strong>
                      <span className="text-xs text-cos-muted">
                        {queueMeta(event)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                        statusBadgeClass(event.status),
                      )}
                    >
                      {queueStatusLabel(event.status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isImported ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleImportReady}
                disabled={isPending}
                className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px disabled:opacity-50"
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => setShowAiChat((open) => !open)}
                className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
              >
                Ask AI to fix conflicts
              </button>
            </div>
          ) : null}

          {showAiChat && !isImported ? (
            <CalendarReviewChatPanel
              importId={importId}
              events={events}
              onEventsUpdated={(nextEvents) => {
                setEvents(nextEvents);
              }}
              disabled={isPending}
            />
          ) : null}
        </>
      ) : null}

      {parseStatus === "parsed" && events.length === 0 && !isImported ? (
        <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-10 text-center">
          <p className="text-sm font-bold text-cos-text">
            No events left to import
          </p>
          <p className="mt-1 text-sm text-cos-muted">
            Upload a different calendar or bring another source in.
          </p>
          {onGoToImport ? (
            <button
              type="button"
              onClick={onGoToImport}
              className="mt-4 inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text"
            >
              Back to Import
            </button>
          ) : (
            <Button href={importHref} variant="secondary" className="mt-4">
              Back to Import
            </Button>
          )}
        </div>
      ) : null}

      {!importComplete &&
      parseStatus !== "parsed" &&
      parseStatus !== "parsing" &&
      parseStatus !== "failed" ? (
        <p className="text-sm text-cos-muted">
          Need a different file?{" "}
          {onGoToImport ? (
            <button
              type="button"
              onClick={onGoToImport}
              className="font-medium text-cos-text underline-offset-2 hover:underline"
            >
              Go to Import
            </button>
          ) : (
            <Link
              href="/calendar?tab=import"
              className="font-medium text-cos-text underline-offset-2 hover:underline"
            >
              Go to Import
            </Link>
          )}
        </p>
      ) : null}

      {editingEvent ? (
        <CalendarReviewEditDialog
          event={editingEvent}
          playbookOptions={playbookOptions}
          onClose={() => setEditingEvent(null)}
          onSave={handleSaveEdit}
        />
      ) : null}
    </div>
  );
}

function statusLabel(status: CalendarEventReviewStatus): string {
  switch (status) {
    case "needs_review":
      return "Needs review";
    case "ready":
      return "Ready";
    case "conflict":
      return "Conflict";
    case "duplicate":
      return "Duplicate";
    case "update":
      return "Update";
    default:
      return "Review";
  }
}

function queueStatusLabel(status: CalendarEventReviewStatus): string {
  switch (status) {
    case "needs_review":
      return "Needs you";
    case "ready":
      return "Ready";
    case "conflict":
      return "Conflict";
    case "duplicate":
      return "Duplicate";
    case "update":
      return "Update";
    default:
      return "Review";
  }
}

function statusBadgeClass(status: CalendarEventReviewStatus): string {
  switch (status) {
    case "needs_review":
    case "conflict":
    case "update":
      return "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]";
    case "duplicate":
      return "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]";
    case "ready":
      return "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]";
    default:
      return "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]";
  }
}

function focusCopy(event: CalendarReviewEvent): string {
  if (event.status === "duplicate") {
    return (
      event.matchReason ??
      "Possible duplicate. Confirm whether to keep this row or skip it."
    );
  }
  if (event.status === "conflict") {
    return (
      event.matchReason ??
      "Something doesn’t line up. Edit details or ask AI to help resolve it."
    );
  }
  if (event.status === "ready") {
    return "Ready to import with the current plan type.";
  }
  const label = CALENDAR_EVENT_CATEGORY_LABELS[event.category].toLowerCase();
  return `Looks like a ${label}. Confirm the plan type, then keep or edit before importing.`;
}

function queueMeta(event: CalendarReviewEvent): string {
  if (event.status === "duplicate") {
    return `Possible duplicate · ${formatEventDate(event.date)}`;
  }
  return `${CALENDAR_EVENT_CATEGORY_LABELS[event.category]} · ${formatEventDate(event.date)}`;
}
