"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Search } from "lucide-react";
import {
  bulkDeleteEventsAction,
  clearCalendarWindowEventsAction,
} from "@/lib/calendar-import/actions";
import {
  filterImportListEvents,
  formatImportSourceLabel,
  type ImportedEventsSourceFilter,
} from "@/lib/calendar-import/import-list-filters";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type {
  CalendarImportedEventListItem,
  PlanningCalendarView,
} from "@/types/communications-calendar";

const PAGE_SIZE = 20;

interface CalendarImportPlanListProps {
  events: CalendarImportedEventListItem[];
  filename: string | null;
  onNavigateView?: (view: PlanningCalendarView) => void;
}

export function CalendarImportPlanList({
  events: initialEvents,
  onNavigateView,
}: CalendarImportPlanListProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] =
    useState<ImportedEventsSourceFilter>("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEvents(initialEvents);
    setSelectedIds(new Set());
    setPage(0);
  }, [initialEvents]);

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [searchQuery, sourceFilter]);

  const filteredEvents = useMemo(
    () =>
      filterImportListEvents(events, {
        search: searchQuery,
        sourceFilter,
      }),
    [events, searchQuery, sourceFilter],
  );

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageEvents = filteredEvents.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const showingFrom =
    filteredEvents.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const showingTo = Math.min(
    filteredEvents.length,
    safePage * PAGE_SIZE + pageEvents.length,
  );

  const selectedCount = selectedIds.size;

  function goCalendar() {
    if (onNavigateView) {
      onNavigateView("month");
      return;
    }
    router.push("/calendar");
  }

  function goImport() {
    if (onNavigateView) {
      onNavigateView("import");
      return;
    }
    router.push("/calendar?tab=import");
  }

  function toggleSelected(eventId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selectedCount === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedCount} selected event${selectedCount === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;

    setError(null);
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkDeleteEventsAction(ids);
      if (!result.success) {
        setError(result.error ?? "Unable to delete selected events.");
        return;
      }
      const removedIds = new Set(result.deletedIds ?? ids);
      setEvents((current) =>
        current.filter((event) => !removedIds.has(event.id)),
      );
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleClearAll() {
    if (events.length === 0) return;
    const confirmed = window.confirm(
      `Permanently delete all ${events.length} listed events? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await clearCalendarWindowEventsAction();
      if (!result.success) {
        setError(result.error ?? "Unable to clear calendar events.");
        return;
      }
      setEvents([]);
      setSelectedIds(new Set());
      setSearchQuery("");
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Imported Events Library
          </p>
          <button
            type="button"
            onClick={goCalendar}
            className="inline-flex items-center gap-2 text-sm font-medium text-cos-muted hover:text-cos-brand-sage"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calendar
          </button>
        </div>
        <div className="rounded-[32px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-cos-text">
            No imported events yet
          </p>
          <p className="mx-auto mt-1.5 max-w-md font-display text-sm italic leading-relaxed text-cos-muted">
            Bring your year in, then review dates before they land here.
          </p>
          <button
            type="button"
            onClick={goImport}
            className="mt-4 inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card"
          >
            Bring in calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          Imported Events Library
        </p>
        <button
          type="button"
          onClick={goCalendar}
          className="inline-flex items-center gap-2 text-sm font-medium text-cos-muted hover:text-cos-brand-sage"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendar
        </button>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] text-cos-text">
            Imported Events
          </h1>
          <p className="mt-2 max-w-xl font-display text-lg italic leading-relaxed text-cos-muted">
            “Everything Hey Ralli has brought in from your connected calendars.”
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative block w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search events…"
              disabled={isPending}
              className="w-full rounded-xl border border-cos-border bg-[rgba(246,242,235,0.9)] py-2.5 pr-4 pl-10 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-brand-sage focus:outline-none disabled:opacity-50"
            />
          </label>
          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value as ImportedEventsSourceFilter)
            }
            disabled={isPending}
            aria-label="Filter by source"
            className="w-full rounded-xl border border-cos-border bg-[rgba(246,242,235,0.9)] px-4 py-2.5 text-sm text-cos-text focus:border-cos-brand-sage focus:outline-none disabled:opacity-50 sm:w-auto"
          >
            <option value="all">All Sources</option>
            <option value="google">Google Calendar</option>
            <option value="subscribe">School RSS Feed</option>
            <option value="file">PDF Import</option>
            <option value="other">Hey Ralli</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[32px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-cos-border bg-[rgba(246,242,235,0.5)] text-[11px] font-extrabold tracking-[0.2em] text-cos-muted uppercase">
                <th className="w-10 px-4 py-4 sm:px-8">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-4 sm:px-8">Event</th>
                <th className="px-4 py-4 sm:px-8">Date &amp; Time</th>
                <th className="px-4 py-4 sm:px-8">Source</th>
                <th className="px-4 py-4 text-right sm:px-8">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cos-border">
              {pageEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-12 text-center text-sm text-cos-muted"
                  >
                    No events match that search.
                  </td>
                </tr>
              ) : (
                pageEvents.map((event) => {
                  const timeLabel = formatEventTime(event.time ?? null);
                  return (
                    <tr
                      key={event.id}
                      className="transition hover:bg-[rgba(246,242,235,0.35)]"
                    >
                      <td className="px-4 py-5 align-middle sm:px-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(event.id)}
                          onChange={() => toggleSelected(event.id)}
                          aria-label={`Select ${event.title}`}
                          className="h-4 w-4 rounded border-cos-border"
                        />
                      </td>
                      <td className="px-4 py-5 align-middle sm:px-8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cos-brand-sage-soft text-cos-brand-sage">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <span className="font-display text-lg font-medium text-cos-text">
                            {event.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 align-middle sm:px-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-cos-text">
                            {formatEventDate(event.date)}
                          </span>
                          <span className="text-xs text-cos-muted">
                            {timeLabel ?? "All day"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 align-middle text-xs text-cos-muted sm:px-8">
                        {formatImportSourceLabel(event.importSource)}
                      </td>
                      <td className="px-4 py-5 align-middle text-right sm:px-8">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-sm font-bold text-cos-brand-sage hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cos-border bg-[rgba(246,242,235,0.2)] px-6 py-4 sm:px-8">
          <span className="text-xs font-medium text-cos-muted">
            Showing {showingFrom}–{showingTo} of {filteredEvents.length} events
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 0 || isPending}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-cos-muted hover:text-cos-text disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-cos-text">
              {safePage + 1}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1 || isPending}
              onClick={() =>
                setPage((current) => Math.min(pageCount - 1, current + 1))
              }
              className="rounded-full px-3 py-1.5 text-xs font-bold text-cos-muted hover:text-cos-text disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={goCalendar}
          className="inline-flex items-center rounded-full border border-cos-border bg-cos-card px-8 py-3.5 text-[13px] font-medium text-cos-muted transition hover:bg-[rgba(246,242,235,0.9)]"
        >
          Back to Calendar
        </button>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={isPending || selectedCount === 0}
          className={cn(
            "rounded-full px-4 py-2 text-[13px] font-bold transition",
            selectedCount > 0
              ? "text-cos-muted hover:text-[#a65a3a]"
              : "text-cos-muted opacity-40",
          )}
        >
          Delete selected
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={isPending}
          className="rounded-full px-4 py-2 text-[13px] font-bold text-cos-muted hover:text-[#a65a3a] disabled:opacity-40"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
