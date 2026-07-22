"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { CalendarReviewActions } from "@/components/calendar-review/CalendarReviewActions";
import { CalendarReviewBulkActions } from "@/components/calendar-review/CalendarReviewBulkActions";
import { CalendarReviewChatPanel } from "@/components/calendar-review/CalendarReviewChatPanel";
import { CalendarReviewEditDialog } from "@/components/calendar-review/CalendarReviewEditDialog";
import { CalendarReviewFilters } from "@/components/calendar-review/CalendarReviewFilters";
import { CalendarReviewHeader } from "@/components/calendar-review/CalendarReviewHeader";
import { CalendarReviewStats } from "@/components/calendar-review/CalendarReviewStats";
import { CalendarReviewTable } from "@/components/calendar-review/CalendarReviewTable";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  deleteImportedCalendarEventsAction,
  findMissingCalendarEventsAction,
  importCalendarEventsAction,
  parseCalendarImportAction,
  saveCalendarReviewEventsAction,
} from "@/lib/calendar-import/actions";
import { buildCalendarReviewStats } from "@/lib/calendar-import/stats";
import {
  applyReviewEventFilters,
  getPastReviewEventIds,
  getReviewDateFilterLabel,
  getReviewFilterLabel,
  isPastReviewEvent,
  statKeyToFilter,
  type CalendarReviewDateFilter,
  type CalendarReviewFilter,
  type CalendarReviewStatKey,
} from "@/lib/calendar-import/review-filters";
import {
  applyRecommendedPlansToEvents,
} from "@/lib/calendar-import/review-event-normalize";
import {
  resolveReviewPlanSelection,
  type ReviewPlaybookOption,
} from "@/lib/calendar-import/review-plan-options";
import { getTodayDateString } from "@/lib/utils/dates";
import type { CalendarParseStatus } from "@/types";
import type { CalendarReviewData, CalendarReviewEvent } from "@/types/calendar-review";

interface CalendarImportReviewProps {
  importId: string;
  parseStatus: CalendarParseStatus;
  parseError: string | null;
  data: CalendarReviewData;
  importedEventCount: number;
  playbookOptions: ReviewPlaybookOption[];
}

export function CalendarImportReview({
  importId,
  parseStatus: initialParseStatus,
  parseError: initialParseError,
  data,
  importedEventCount,
  playbookOptions,
}: CalendarImportReviewProps) {
  const [events, setEvents] = useState<CalendarReviewEvent[]>(data.events);
  const [parseStatus, setParseStatus] = useState(initialParseStatus);
  const [parseError, setParseError] = useState(initialParseError);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarReviewEvent | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importComplete, setImportComplete] = useState(
    initialParseStatus === "imported" || importedEventCount > 0,
  );
  const [importedCount, setImportedCount] = useState(importedEventCount);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CalendarReviewFilter>("all");
  const [dateFilter, setDateFilter] = useState<CalendarReviewDateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const tableRef = useRef<HTMLDivElement>(null);
  const parseStartedRef = useRef(false);

  const today = getTodayDateString();
  const stats = buildCalendarReviewStats(events);
  const pastCount = useMemo(
    () => events.filter((event) => isPastReviewEvent(event, today)).length,
    [events, today],
  );
  const upcomingCount = events.length - pastCount;
  const filteredEvents = useMemo(
    () =>
      applyReviewEventFilters(events, {
        filter: activeFilter,
        dateFilter,
        search: searchQuery,
        today,
      }),
    [events, activeFilter, dateFilter, searchQuery, today],
  );
  const isTypeFiltered = activeFilter !== "all";
  const isDateFiltered = dateFilter !== "all";
  const isSearchFiltered = searchQuery.trim().length > 0;
  const isFiltered = isTypeFiltered || isDateFiltered || isSearchFiltered;
  const isImported = parseStatus === "imported" || importComplete;
  const isParsing = parseStatus === "parsing" || (isPending && parseStatus === "pending");

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
    if (!highlightedEventId) return;
    const timeout = setTimeout(() => setHighlightedEventId(null), 3000);
    return () => clearTimeout(timeout);
  }, [highlightedEventId]);

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

  function handleDelete(eventId: string) {
    const nextEvents = events.filter((event) => event.id !== eventId);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(eventId);
      return next;
    });
    persistEvents(nextEvents);
  }

  function handleBulkDelete(ids: string[]) {
    const idSet = new Set(ids);
    persistEvents(events.filter((event) => !idSet.has(event.id)));
    setSelectedIds(new Set());
  }

  function handleRemovePastEvents() {
    const pastIds = getPastReviewEventIds(events, today);
    if (pastIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${pastIds.length} past event${pastIds.length === 1 ? "" : "s"} from this import list? They will not be added to your calendar. This only affects the review queue.`,
    );
    if (!confirmed) {
      return;
    }

    handleBulkDelete(pastIds);
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

  function handlePlanChange(eventId: string, planValue: string) {
    const resolved = resolveReviewPlanSelection(planValue, playbookOptions);
    persistEvents(
      events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              playbookId: resolved.playbookId,
              communicationStrategy: resolved.communicationStrategy,
              eventType: resolved.eventType ?? event.eventType,
              planManuallySet: true,
            }
          : event,
      ),
    );
  }

  function handleApplyUpdateChange(eventId: string, applyUpdate: boolean) {
    persistEvents(
      events.map((event) =>
        event.id === eventId ? { ...event, applyUpdate } : event,
      ),
    );
  }

  function handleApplyRecommendedPlans() {
    persistEvents(applyRecommendedPlansToEvents(events, playbookOptions));
    setSelectedIds(new Set());
  }

  function handleStatFilterChange(key: CalendarReviewStatKey) {
    setActiveFilter(statKeyToFilter(key));
    setSelectedIds(new Set());
    setHighlightedEventId(null);
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleDateFilterChange(next: CalendarReviewDateFilter) {
    setDateFilter(next);
    setSelectedIds(new Set());
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSelectedIds(new Set());
  }

  function handleClearFilter() {
    setActiveFilter("all");
    setDateFilter("all");
    setSearchQuery("");
    setSelectedIds(new Set());
  }

  function getActiveFilterSummary(): string {
    const parts: string[] = [];
    if (isTypeFiltered) {
      parts.push(getReviewFilterLabel(activeFilter).toLowerCase());
    }
    if (isDateFiltered) {
      parts.push(getReviewDateFilterLabel(dateFilter).toLowerCase());
    }
    if (isSearchFiltered) {
      parts.push(`matching “${searchQuery.trim()}”`);
    }
    return parts.join(" · ");
  }

  function handleReviewIndividually() {
    const nextEvent =
      events.find((event) => event.status !== "ready") ?? events[0] ?? null;

    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (nextEvent) {
      setHighlightedEventId(nextEvent.id);
    }
  }

  function handleImportAll() {
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
    });
  }

  function handleFindMissing() {
    setActionError(null);

    startTransition(async () => {
      const result = await findMissingCalendarEventsAction(importId, events);
      if (result.error) {
        setActionError(result.error);
        return;
      }

      setEvents(result.events);
      setSelectedIds(new Set());
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

  return (
    <div className="space-y-8">
      <CalendarReviewHeader
        filename={data.filename}
        uploadedAt={data.uploadedAt}
        eventCount={stats.totalEventsFound}
      />

      {parseStatus === "parsing" && (
        <div className="flex items-start gap-3 rounded-xl border border-cos-border bg-cos-accent-soft px-4 py-3">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-cos-accent" />
          <div>
            <p className="text-sm font-medium text-cos-text">
              Reading your calendar and finding dates...
            </p>
            <p className="mt-1 text-sm text-cos-text">
              This usually takes a few seconds. PTO and school events default to a full
              campaign plan — adjust each row before importing.
            </p>
          </div>
        </div>
      )}

      {parseStatus === "failed" && parseError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Could not parse calendar</p>
            <p className="mt-1 text-sm text-red-700">{parseError}</p>
            <Button className="mt-3" size="sm" onClick={handleRetryParse}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {importComplete && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-900">
              {importedCount} events added to your calendar
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              View-only dates are on the calendar now. Open any one to start a
              campaign later if you need it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="/calendar" size="sm">
                Open calendar
              </Button>
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
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {parseStatus === "parsed" && !isImported && (
        <>
          <CalendarReviewChatPanel
            importId={importId}
            events={events}
            onEventsUpdated={(nextEvents) => {
              setEvents(nextEvents);
              setSelectedIds(new Set());
            }}
            disabled={isPending}
          />

          <CalendarReviewActions
            onImportAll={handleImportAll}
            onReviewIndividually={handleReviewIndividually}
            onFindMissing={handleFindMissing}
            isImporting={isPending}
            importComplete={importComplete}
          />
        </>
      )}

      {(parseStatus === "parsed" || isImported) && events.length > 0 && (
        <div ref={tableRef} className="space-y-3">
          <CalendarReviewStats
            stats={stats}
            activeFilter={activeFilter}
            onFilterChange={handleStatFilterChange}
          />

          <CalendarReviewFilters
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            dateFilter={dateFilter}
            onDateFilterChange={handleDateFilterChange}
            pastCount={pastCount}
            upcomingCount={upcomingCount}
            disabled={isPending || isParsing}
          />

          {isFiltered && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cos-border bg-cos-accent-soft px-4 py-3">
              <p className="text-sm text-cos-text">
                Showing{" "}
                <span className="font-semibold">{filteredEvents.length}</span> of{" "}
                {events.length}
                {getActiveFilterSummary() ? (
                  <>
                    {" "}
                    — {getActiveFilterSummary()}
                  </>
                ) : null}
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={handleClearFilter}>
                Show all {events.length} events
              </Button>
            </div>
          )}

          {!isImported && (
            <CalendarReviewBulkActions
              selectedCount={selectedIds.size}
              totalCount={filteredEvents.length}
              pastCount={pastCount}
              onSelectAll={() =>
                setSelectedIds(new Set(filteredEvents.map((event) => event.id)))
              }
              onClearSelection={() => setSelectedIds(new Set())}
              onDeleteSelected={() => handleBulkDelete(Array.from(selectedIds))}
              onDeleteAll={() => handleBulkDelete(filteredEvents.map((event) => event.id))}
              onRemovePastEvents={handleRemovePastEvents}
              onApplyRecommendedPlans={handleApplyRecommendedPlans}
              disabled={isPending || isParsing}
            />
          )}

          <Card padding="none" className="overflow-hidden">
            <CardHeader className="border-b border-cos-border px-6 py-5">
              <CardTitle>
                {isTypeFiltered
                  ? getReviewFilterLabel(activeFilter)
                  : isDateFiltered
                    ? getReviewDateFilterLabel(dateFilter)
                    : "Imported events"}
              </CardTitle>
              <CardDescription>
                {isImported
                  ? "These events are on your calendar. Delete them all above if the import had errors."
                  : isFiltered
                    ? `Edit each row below, then import when ready. ${filteredEvents.length} of ${events.length} events shown.`
                    : "Review each row before importing. Use summary cards, search, or date filters to narrow the list."}
              </CardDescription>
            </CardHeader>
            {filteredEvents.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-cos-muted">
                No events match these filters.
                {isFiltered && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="font-medium text-cos-accent hover:underline"
                      onClick={handleClearFilter}
                    >
                      Show all events
                    </button>
                  </>
                )}
              </div>
            ) : (
              <CalendarReviewTable
                events={filteredEvents}
                playbookOptions={playbookOptions}
                highlightedEventId={highlightedEventId}
                selectedIds={selectedIds}
                onToggleSelect={(eventId) =>
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (next.has(eventId)) {
                      next.delete(eventId);
                    } else {
                      next.add(eventId);
                    }
                    return next;
                  })
                }
                onToggleSelectAll={() => {
                  if (selectedIds.size === filteredEvents.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredEvents.map((event) => event.id)));
                  }
                }}
                onEdit={setEditingEvent}
                onDelete={handleDelete}
                onPlanChange={handlePlanChange}
                onApplyUpdateChange={handleApplyUpdateChange}
                disabled={isPending || isImported || isParsing}
              />
            )}
          </Card>
        </div>
      )}

      {parseStatus === "parsed" && events.length === 0 && !isImported && (
        <div className="rounded-xl border border-dashed border-cos-border bg-cos-bg px-6 py-10 text-center">
          <p className="text-sm font-medium text-cos-text">No events left to import</p>
          <p className="mt-1 text-sm text-cos-muted">
            Upload a different calendar or use chat to add events back.
          </p>
          <Button href="/calendar/import" variant="secondary" className="mt-4">
            Upload another calendar
          </Button>
        </div>
      )}

      {!importComplete && parseStatus !== "parsed" && parseStatus !== "parsing" && (
        <p className="text-sm text-cos-muted">
          Need a different file?{" "}
          <Link href="/calendar/import" className="font-medium text-cos-accent hover:underline">
            Upload another calendar
          </Link>
        </p>
      )}

      {editingEvent && (
        <CalendarReviewEditDialog
          event={editingEvent}
          playbookOptions={playbookOptions}
          onClose={() => setEditingEvent(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
