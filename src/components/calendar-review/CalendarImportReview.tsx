"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { CalendarReviewEditDialog } from "@/components/calendar-review/CalendarReviewEditDialog";
import {
  deleteImportedCalendarEventsAction,
  importCalendarEventsAction,
  parseCalendarImportAction,
  saveCalendarReviewEventsAction,
} from "@/lib/calendar-import/actions";
import type { ReviewPlaybookOption } from "@/lib/calendar-import/review-plan-options";
import {
  applySyncReviewDecision,
  buildFirstImportSummaryCopy,
  buildSyncReviewSummaryCopy,
  countEventsToAdd,
  formatSyncReviewShortDate,
  getSyncReviewChangeDiffs,
  partitionFirstImportSections,
  partitionSyncReviewSections,
  resolveCalendarReviewMode,
  type SyncReviewDecision,
} from "@/lib/calendar-import/sync-review-decisions";
import { cn } from "@/lib/utils/cn";
import { formatEventDate } from "@/lib/utils/dates";
import type { CalendarParseStatus } from "@/types";
import type {
  CalendarReviewData,
  CalendarReviewEvent,
} from "@/types/calendar-review";
import { CALENDAR_EVENT_CATEGORY_LABELS } from "@/types/calendar-review";

const READY_PREVIEW_LIMIT = 5;

interface CalendarImportReviewProps {
  importId: string;
  parseStatus: CalendarParseStatus;
  parseError: string | null;
  data: CalendarReviewData;
  importedEventCount: number;
  playbookOptions: ReviewPlaybookOption[];
  /** True when the org has completed a prior calendar import (sync mode). */
  hasPriorImportedCalendar?: boolean;
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
  hasPriorImportedCalendar = false,
  embedded = false,
  onGoToImport,
}: CalendarImportReviewProps) {
  const [events, setEvents] = useState<CalendarReviewEvent[]>(data.events);
  const [parseStatus, setParseStatus] = useState(initialParseStatus);
  const [parseError, setParseError] = useState(initialParseError);
  const [editingEvent, setEditingEvent] = useState<CalendarReviewEvent | null>(
    null,
  );
  const [importComplete, setImportComplete] = useState(
    initialParseStatus === "imported" || importedEventCount > 0,
  );
  const [importedCount, setImportedCount] = useState(importedEventCount);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAllReady, setShowAllReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const parseStartedRef = useRef(false);

  const reviewMode = useMemo(
    () =>
      resolveCalendarReviewMode(events, {
        hasPriorImportedCalendar,
      }),
    [events, hasPriorImportedCalendar],
  );
  const isFirstImport = reviewMode === "first_import";

  const syncSections = useMemo(
    () => partitionSyncReviewSections(events),
    [events],
  );
  const firstSections = useMemo(
    () => partitionFirstImportSections(events),
    [events],
  );
  const summaryCopy = useMemo(
    () =>
      isFirstImport
        ? buildFirstImportSummaryCopy(firstSections, events.length)
        : buildSyncReviewSummaryCopy(syncSections),
    [isFirstImport, firstSections, syncSections, events.length],
  );
  const eventsToAddCount = useMemo(() => countEventsToAdd(events), [events]);
  const readyPreview = useMemo(() => {
    if (showAllReady) return firstSections.readyToAdd;
    return firstSections.readyToAdd.slice(0, READY_PREVIEW_LIMIT);
  }, [firstSections.readyToAdd, showAllReady]);
  const readyHiddenCount = Math.max(
    0,
    firstSections.readyToAdd.length - READY_PREVIEW_LIMIT,
  );
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
    });
  }, [importId, parseStatus, initialParseStatus]);

  function handleDecision(eventId: string, decision: SyncReviewDecision) {
    const nextEvents = events.map((event) =>
      event.id === eventId ? applySyncReviewDecision(event, decision) : event,
    );
    persistEvents(nextEvents);
  }

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

  function handleFinishReview() {
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

      setImportedCount(result.importedCount);
      setUpdatedCount(result.updatedCount);
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
      setUpdatedCount(0);
      setParseStatus("parsed");
    });
  }

  const backControl = onGoToImport ? (
    <button
      type="button"
      onClick={onGoToImport}
      className="inline-flex items-center gap-2 text-sm font-medium text-cos-muted transition hover:text-cos-brand-sage"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Import
    </button>
  ) : (
    <Link
      href="/calendar"
      className="inline-flex items-center gap-2 text-sm font-medium text-cos-muted transition hover:text-cos-brand-sage"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Calendar
    </Link>
  );

  const attentionEvents = isFirstImport
    ? firstSections.needsAttention
    : syncSections.needsAttention;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          {isFirstImport ? "First Calendar Import" : "Calendar Sync Review"}
          {data.filename ? (
            <span className="ml-2 font-semibold tracking-normal text-cos-muted normal-case">
              · {data.filename}
            </span>
          ) : null}
        </p>
        {backControl}
      </div>

      {parseStatus === "parsing" ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-cos-border bg-cos-card px-5 py-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
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
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">
              Could not parse calendar
            </p>
            <p className="mt-1 text-sm text-red-700">{parseError}</p>
            <button
              type="button"
              onClick={handleRetryParse}
              className="mt-3 inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {isImported ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-900">
              {importedCount > 0 || updatedCount > 0
                ? [
                    importedCount > 0
                      ? `${importedCount} event${importedCount === 1 ? "" : "s"} added`
                      : null,
                    updatedCount > 0
                      ? `${updatedCount} updated`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Review finished"}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Dates are on your calendar now.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!embedded ? (
                <Link
                  href="/calendar"
                  className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card"
                >
                  Open calendar
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleDeleteImported}
                disabled={isPending}
                className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text disabled:opacity-50"
              >
                Delete all imported events
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {(parseStatus === "parsed" || isImported) && events.length > 0 ? (
        <>
          <header className="space-y-6">
            <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-[-0.02em] text-cos-text">
              {isImported
                ? isFirstImport
                  ? "Calendar imported"
                  : "Calendar updated"
                : isFirstImport
                  ? "Calendar ready to import"
                  : "Review calendar sync"}
            </h1>

            {isFirstImport ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                  value={events.length}
                  label="events found"
                  tone="neutral"
                />
                <SummaryCard
                  value={firstSections.readyToAdd.length}
                  label="ready to add"
                  tone="success"
                />
                <SummaryCard
                  value={firstSections.needsAttention.length}
                  label="need your review"
                  tone="attention"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                  value={syncSections.newlyAdded.length}
                  label="new events added"
                  tone="success"
                />
                <SummaryCard
                  value={syncSections.changes.length}
                  label="events changed"
                  tone="neutral"
                />
                <SummaryCard
                  value={syncSections.needsAttention.length}
                  label="needs your review"
                  tone="attention"
                />
              </div>
            )}

            {!isFirstImport && syncSections.alreadyOnCalendar.length > 0 ? (
              <p className="text-sm text-cos-muted">
                {syncSections.alreadyOnCalendar.length} already on your calendar
                (skipped).
              </p>
            ) : null}

            <p className="max-w-2xl font-display text-xl italic leading-relaxed text-cos-muted">
              “{summaryCopy}”
            </p>
          </header>

          {attentionEvents.length > 0 && !isImported ? (
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cos-brand-terracotta text-white">
                  <TriangleAlert className="h-4 w-4" />
                </div>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-cos-text">
                  Needs your attention
                </h2>
              </div>

              <div className="space-y-4">
                {attentionEvents.map((event) => (
                  <AttentionCard
                    key={event.id}
                    event={event}
                    disabled={isPending}
                    mode={reviewMode}
                    onDecision={(decision) => handleDecision(event.id, decision)}
                    onEdit={() => setEditingEvent(event)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {isFirstImport ? (
            firstSections.readyToAdd.length > 0 ? (
              <section className="space-y-5">
                <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-cos-text">
                  Ready to import
                </h2>
                <div className="divide-y divide-cos-border overflow-hidden rounded-[32px] border border-cos-border bg-cos-card">
                  {readyPreview.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-[rgba(246,242,235,0.55)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-cos-brand-sage/30" />
                        <span className="truncate font-display text-lg font-medium text-cos-text">
                          {event.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm text-cos-muted">
                        {formatSyncReviewShortDate(event.date)}
                        {" · "}
                        {CALENDAR_EVENT_CATEGORY_LABELS[event.category]}
                      </span>
                    </div>
                  ))}
                </div>
                {!showAllReady && readyHiddenCount > 0 ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllReady(true)}
                      className="text-sm font-medium text-cos-brand-sage hover:underline"
                    >
                      Show {readyHiddenCount} more event
                      {readyHiddenCount === 1 ? "" : "s"}…
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null
          ) : (
            <>
              {syncSections.changes.length > 0 ? (
                <section className="space-y-5">
                  <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-cos-text">
                    Changes
                  </h2>
                  <div className="space-y-6 rounded-[32px] border border-cos-border bg-[rgba(246,242,235,0.85)] p-6 sm:p-8">
                    {syncSections.changes.map((event, index) => (
                      <ChangeRow
                        key={event.id}
                        event={event}
                        showDivider={index < syncSections.changes.length - 1}
                        disabled={isPending || isImported}
                        onDecision={(decision) =>
                          handleDecision(event.id, decision)
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {syncSections.newlyAdded.length > 0 ? (
                <section className="space-y-5">
                  <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-cos-text">
                    Newly added
                  </h2>
                  <div className="divide-y divide-cos-border overflow-hidden rounded-[32px] border border-cos-border bg-cos-card">
                    {syncSections.newlyAdded.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-[rgba(246,242,235,0.55)]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Check className="h-4 w-4 shrink-0 text-cos-brand-sage" />
                          <span className="truncate font-display text-lg font-medium text-cos-text">
                            {event.name}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm text-cos-muted">
                          {formatSyncReviewShortDate(event.date)}
                          {" · "}
                          {CALENDAR_EVENT_CATEGORY_LABELS[event.category]}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}

          {!isImported ? (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleFinishReview}
                disabled={isPending}
                className="inline-flex items-center rounded-full bg-cos-text px-12 py-4 text-lg font-bold text-cos-card shadow-lg transition hover:-translate-y-0.5 hover:bg-cos-brand-sage disabled:opacity-50"
              >
                {isPending
                  ? isFirstImport
                    ? "Adding…"
                    : "Finishing…"
                  : isFirstImport
                    ? "Add Events to Calendar"
                    : "Finish Review"}
              </button>
              <p className="mt-3 text-sm text-cos-muted">
                {isFirstImport
                  ? `This will add ${eventsToAddCount} event${eventsToAddCount === 1 ? "" : "s"} to your Hey Ralli calendar.`
                  : "Adds new events, applies updates you kept, and skips duplicates."}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {parseStatus === "parsed" && events.length === 0 && !isImported ? (
        <div className="rounded-[24px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-12 text-center">
          <p className="text-sm font-bold text-cos-text">
            No events left to import
          </p>
          <p className="mt-1 text-sm text-cos-muted">
            Upload a different calendar or bring another source in.
          </p>
          <div className="mt-4">{backControl}</div>
        </div>
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

function SummaryCard({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "success" | "neutral" | "attention";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-6",
        tone === "attention"
          ? "border-cos-brand-terracotta/25 bg-cos-brand-terracotta-soft"
          : "border-cos-border bg-[rgba(246,242,235,0.9)]",
      )}
    >
      <div
        className={cn(
          "font-display text-4xl font-semibold",
          tone === "success" && "text-cos-brand-sage",
          tone === "neutral" && "text-cos-text",
          tone === "attention" && "text-cos-brand-terracotta",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-cos-muted">{label}</div>
    </div>
  );
}

function AttentionCard({
  event,
  disabled,
  mode,
  onDecision,
  onEdit,
}: {
  event: CalendarReviewEvent;
  disabled: boolean;
  mode: "first_import" | "sync";
  onDecision: (decision: SyncReviewDecision) => void;
  onEdit: () => void;
}) {
  const existingName = event.existingEventName ?? null;
  const existingDate = event.existingEventDate ?? null;
  const hasExisting = Boolean(event.existingEventId || existingName || existingDate);
  const subtitle =
    event.matchReason ??
    (event.status === "conflict"
      ? "Conflict in this import"
      : event.status === "needs_review"
        ? "Needs a closer look before adding"
        : "Possible duplicate");
  const calendarSourceLabel =
    mode === "first_import"
      ? "From your calendar"
      : "From your connected calendar";
  const primaryActionLabel =
    mode === "first_import" ? "Use Calendar Event" : "Use Calendar Update";

  return (
    <article className="overflow-hidden rounded-[32px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div className="border-b border-cos-border bg-cos-brand-terracotta-soft/40 px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cos-border bg-cos-card text-cos-brand-terracotta shadow-sm">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] text-cos-text">
              {event.name}
            </h3>
            <p className="text-sm text-cos-muted">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-cos-border" />

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cos-muted">
                Currently in Hey Ralli
              </span>
              <span className="h-2 w-2 rounded-full bg-cos-border" />
            </div>
            {hasExisting ? (
              <div className="space-y-3 text-lg text-cos-text">
                <p>{existingName ?? event.name}</p>
                <p className="text-cos-muted">
                  {existingDate
                    ? formatEventDate(existingDate)
                    : "Date on file"}
                </p>
              </div>
            ) : (
              <p className="text-lg text-cos-muted">
                Not on your Hey Ralli calendar yet.
              </p>
            )}
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cos-brand-sage">
                {calendarSourceLabel}
              </span>
              <span className="rounded-full bg-cos-brand-sage-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cos-brand-sage">
                Recommended
              </span>
            </div>
            <div className="space-y-3 text-lg">
              <p className="font-medium text-cos-text">{event.name}</p>
              <p className="font-bold text-cos-brand-sage">
                {formatEventDate(event.date)}
              </p>
              <p className="text-sm text-cos-muted">
                {CALENDAR_EVENT_CATEGORY_LABELS[event.category]}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-cos-border pt-8">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecision("use_calendar_update")}
            className="inline-flex items-center rounded-full bg-cos-brand-sage px-8 py-3.5 text-[13px] font-bold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecision("keep_hey_ralli")}
            className="inline-flex items-center rounded-full border border-cos-border bg-cos-card px-8 py-3.5 text-[13px] font-medium text-cos-muted transition hover:bg-[rgba(246,242,235,0.9)] disabled:opacity-50"
          >
            Keep Hey Ralli Event
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecision("keep_both")}
            className="px-4 py-2 text-sm font-medium text-cos-muted transition hover:text-cos-text disabled:opacity-50"
          >
            Keep Both
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onEdit}
            className="ml-auto px-4 py-2 text-sm font-medium text-cos-muted transition hover:text-cos-text disabled:opacity-50"
          >
            Edit details
          </button>
        </div>
      </div>
    </article>
  );
}

function ChangeRow({
  event,
  showDivider,
  disabled,
  onDecision,
}: {
  event: CalendarReviewEvent;
  showDivider: boolean;
  disabled: boolean;
  onDecision: (decision: SyncReviewDecision) => void;
}) {
  const diffs = getSyncReviewChangeDiffs(event);

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-6 md:flex-row md:items-center",
        showDivider && "border-b border-cos-border/50 pb-8",
      )}
    >
      <div className="min-w-0">
        <h4 className="font-display text-xl font-semibold text-cos-text">
          {event.name}
        </h4>
        <p className="mt-1 text-xs text-cos-muted">
          {event.matchReason ?? "Connected calendar update"}
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:items-end">
        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-cos-border/60 bg-cos-card/70 px-5 py-4">
          {diffs.map((diff) => (
            <div key={`${diff.label}-${diff.from}-${diff.to}`} className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cos-muted">
                {diff.label}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-cos-muted line-through">
                  {diff.label === "Date"
                    ? formatSyncReviewShortDate(diff.from)
                    : diff.from}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-cos-brand-sage" />
                <span className="font-bold text-cos-text">
                  {diff.label === "Date"
                    ? formatSyncReviewShortDate(diff.to)
                    : diff.to}
                </span>
              </div>
            </div>
          ))}
        </div>
        {!disabled ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDecision("keep_hey_ralli")}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-cos-muted hover:text-cos-text"
            >
              Keep Hey Ralli Event
            </button>
            <button
              type="button"
              onClick={() => onDecision("keep_both")}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-cos-muted hover:text-cos-text"
            >
              Keep Both
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
