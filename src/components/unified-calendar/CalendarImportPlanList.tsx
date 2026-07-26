"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  bulkDeleteEventsAction,
  clearCalendarWindowEventsAction,
} from "@/lib/calendar-import/actions";
import { filterImportListEventsBySearch } from "@/lib/calendar-import/import-list-filters";
import {
  buildCalendarReviewPlanOptions,
  getSelectedReviewPlanValue,
  type ReviewPlaybookOption,
} from "@/lib/calendar-import/review-plan-options";
import { updateImportedEventPlanAction } from "@/lib/events/actions";
import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type {
  CalendarImportedEventListItem,
  PlanningCalendarView,
} from "@/types/communications-calendar";

interface CalendarImportPlanListProps {
  events: CalendarImportedEventListItem[];
  filename: string | null;
  playbookOptions?: ReviewPlaybookOption[];
  onNavigateView?: (view: PlanningCalendarView) => void;
}

export function CalendarImportPlanList({
  events: initialEvents,
  filename,
  playbookOptions = [],
  onNavigateView,
}: CalendarImportPlanListProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const planOptions = useMemo(
    () => buildCalendarReviewPlanOptions(playbookOptions),
    [playbookOptions],
  );

  useEffect(() => {
    setEvents(initialEvents);
    setSelectedIds(new Set());
  }, [initialEvents]);

  const filteredEvents = useMemo(
    () => filterImportListEventsBySearch(events, searchQuery),
    [events, searchQuery],
  );

  const selectedCount = selectedIds.size;

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

  function goImport() {
    if (onNavigateView) {
      onNavigateView("import");
      return;
    }
    router.push("/calendar?tab=import");
  }

  function handlePlanChange(eventId: string, planValue: string) {
    setError(null);
    setPendingId(eventId);

    const resolvedPlaybookId =
      planValue === "calendar_only" ? null : planValue;
    const resolvedStrategy: CommunicationStrategy =
      planValue === "calendar_only" ? "calendar_only" : "full_campaign";

    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              playbookId: resolvedPlaybookId,
              communicationStrategy: resolvedStrategy,
            }
          : event,
      ),
    );

    startTransition(async () => {
      const result = await updateImportedEventPlanAction(eventId, planValue);
      setPendingId(null);
      if (!result.success) {
        setError(result.error ?? "Unable to update plan.");
        setEvents(initialEvents);
        return;
      }
      router.refresh();
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
      `Permanently delete all ${events.length} imported events? This cannot be undone.`,
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
      <div>
        <p className="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          Imported from school calendar
        </p>
        <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-cos-text">
            No imported events yet
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-cos-muted">
            Bring the school year in, then review dates before they land here.
          </p>
          <button
            type="button"
            onClick={goImport}
            className="mt-4 inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card"
          >
            Import school calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
        Imported from school calendar
      </p>

      <input
        type="search"
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setSelectedIds(new Set());
        }}
        placeholder="Search imported events…"
        disabled={isPending}
        className="mb-3 w-full max-w-[280px] rounded-full border border-cos-border bg-cos-card px-3.5 py-2.5 text-[13px] text-cos-text placeholder:text-cos-muted focus:border-cos-text focus:outline-none disabled:opacity-50"
      />

      {error ? (
        <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-cos-border bg-[rgba(255,252,247,0.65)]">
              <th className="w-10 px-3.5 py-3 text-left">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-3.5 py-3 text-left text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                Name
              </th>
              <th className="px-3.5 py-3 text-left text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                Date
              </th>
              <th className="min-w-[12rem] px-3.5 py-3 text-left text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                Plan
              </th>
              <th className="px-3.5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3.5 py-12 text-center text-sm text-cos-muted"
                >
                  No events match that search.
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => {
                const planValue = getSelectedReviewPlanValue(
                  {
                    playbookId: event.playbookId,
                    communicationStrategy: event.communicationStrategy,
                    eventType: null,
                  },
                  playbookOptions,
                );
                return (
                  <tr
                    key={event.id}
                    className="border-b border-cos-border last:border-b-0"
                  >
                    <td className="px-3.5 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(event.id)}
                        onChange={() => toggleSelected(event.id)}
                        aria-label={`Select ${event.title}`}
                        className="h-4 w-4 rounded border-cos-border"
                      />
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <strong className="font-bold text-cos-text">
                        {event.title}
                      </strong>
                    </td>
                    <td className="px-3.5 py-3 align-middle text-cos-text">
                      {formatEventDate(event.date)}
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <select
                        value={planValue}
                        onChange={(changeEvent) =>
                          handlePlanChange(event.id, changeEvent.target.value)
                        }
                        disabled={isPending && pendingId === event.id}
                        aria-label={`Plan for ${event.title}`}
                        className="h-9 min-w-[11rem] max-w-[16rem] rounded-full border border-cos-border bg-[rgba(255,252,247,0.9)] px-3 text-[12px] font-bold text-cos-text focus:border-cos-text focus:outline-none disabled:opacity-50"
                      >
                        {planOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3.5 py-3 align-middle text-right">
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
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

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={goImport}
          className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
        >
          Import more
        </button>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={isPending || selectedCount === 0}
          className={cn(
            "inline-flex items-center rounded-full px-[18px] py-[11px] text-[13px] font-bold transition",
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
          className="ml-auto rounded-full px-[18px] py-[11px] text-[13px] font-bold text-cos-muted hover:text-[#a65a3a] disabled:opacity-40"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
