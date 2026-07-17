"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CalendarReviewCategoryBadge } from "@/components/calendar-review/CalendarReviewBadges";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  bulkDeleteEventsAction,
  clearCalendarWindowEventsAction,
} from "@/lib/calendar-import/actions";
import { updateEventPlanTypeAction } from "@/lib/events/actions";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
import { formatEventDate } from "@/lib/utils/dates";
import type { CalendarImportedEventListItem } from "@/types/communications-calendar";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CalendarImportPlanListProps {
  events: CalendarImportedEventListItem[];
  filename: string | null;
}

export function CalendarImportPlanList({
  events: initialEvents,
  filename,
}: CalendarImportPlanListProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEvents(initialEvents);
    setSelectedIds(new Set());
  }, [initialEvents]);

  const counts = useMemo(() => {
    const byStrategy = new Map<CommunicationStrategy, number>();
    for (const event of events) {
      byStrategy.set(
        event.communicationStrategy,
        (byStrategy.get(event.communicationStrategy) ?? 0) + 1,
      );
    }
    return byStrategy;
  }, [events]);

  const selectedCount = selectedIds.size;
  const allSelected = events.length > 0 && selectedCount === events.length;

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

  function handleSelectAll() {
    setSelectedIds(new Set(events.map((event) => event.id)));
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  function handleStrategyChange(eventId: string, strategy: CommunicationStrategy) {
    setError(null);
    setPendingId(eventId);

    startTransition(async () => {
      const result = await updateEventPlanTypeAction(eventId, strategy);
      setPendingId(null);

      if (!result.success) {
        setError(result.error ?? "Unable to update plan type.");
        return;
      }

      setEvents((current) =>
        current.map((event) =>
          event.id === eventId ? { ...event, communicationStrategy: strategy } : event,
        ),
      );
      router.refresh();
    });
  }

  function handleDeleteSelected() {
    if (selectedCount === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${selectedCount} selected event${selectedCount === 1 ? "" : "s"}? This removes them from Calendar, Campaigns, Publishing, and Approvals.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    const ids = Array.from(selectedIds);

    startTransition(async () => {
      const result = await bulkDeleteEventsAction(ids);
      if (!result.success) {
        setError(result.error ?? "Unable to delete selected events.");
        return;
      }

      setEvents((current) => current.filter((event) => !selectedIds.has(event.id)));
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleClearAll() {
    if (events.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete all ${events.length} events from Calendar, Campaigns, Publishing, and Approvals? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await clearCalendarWindowEventsAction();
      if (!result.success) {
        setError(result.error ?? "Unable to clear calendar events.");
        return;
      }

      if (result.deletedCount === 0 && events.length > 0) {
        setError("No events were deleted. Refresh the page and try again.");
        return;
      }

      setEvents([]);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="items-center py-12 text-center">
          <CardTitle>No calendar events yet</CardTitle>
          <CardDescription className="max-w-md">
            Sync your subscribe feed or upload a school calendar PDF, review the dates,
            then import them here.
          </CardDescription>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button href="/calendar/import">Import calendar</Button>
            <Button href="/settings/integrations/calendar" variant="secondary">
              Sync subscribe feed
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cos-border bg-cos-card px-5 py-4">
        <p className="text-sm font-medium text-cos-text">
          {events.length} events for {filename ?? "this school year"}
        </p>
        <p className="mt-1 text-sm text-cos-muted">
          All school-year events in your planning window. Select rows to permanently
          delete bad imports, or{" "}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isPending}
            className="text-cos-muted underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            {isPending ? "clearing…" : "clear all to start fresh"}
          </button>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {COMMUNICATION_STRATEGY_OPTIONS.map((option) => {
            const count = counts.get(option.value) ?? 0;
            if (count === 0) return null;
            return (
              <CommunicationStrategyBadge
                key={option.value}
                strategy={option.value}
                className="text-xs"
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-cos-border bg-cos-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-cos-muted">
          {selectedCount > 0 ? (
            <span>
              <span className="font-medium text-cos-text">{selectedCount}</span> selected
            </span>
          ) : (
            <span>Select rows to permanently delete events.</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!allSelected ? (
            <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll} disabled={isPending}>
              Select all
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearSelection}
              disabled={isPending}
            >
              Clear selection
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDeleteSelected}
            disabled={isPending || selectedCount === 0}
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card padding="none" className="overflow-hidden">
        <CardHeader className="border-b border-cos-border px-6 py-5">
          <CardTitle>School year events</CardTitle>
          <CardDescription>
            Change plan type anytime. Upgrading to a campaign creates the communication
            workspace automatically.
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Plan type</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(event.id)}
                    onChange={() => toggleSelected(event.id)}
                    aria-label={`Select ${event.title}`}
                    className="h-4 w-4 rounded border-cos-border"
                  />
                </TableCell>
                <TableCell className="font-medium text-cos-text">{event.title}</TableCell>
                <TableCell>{formatEventDate(event.date)}</TableCell>
                <TableCell>
                  {event.category ? (
                    <CalendarReviewCategoryBadge
                      category={
                        event.category as import("@/types/calendar-review").CalendarEventCategory
                      }
                    />
                  ) : (
                    <span className="text-sm text-cos-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="min-w-[12rem] space-y-2">
                    <Select
                      value={event.communicationStrategy}
                      onChange={(changeEvent) =>
                        handleStrategyChange(
                          event.id,
                          changeEvent.target.value as CommunicationStrategy,
                        )
                      }
                      disabled={isPending && pendingId === event.id}
                      aria-label={`Plan type for ${event.title}`}
                    >
                      {COMMUNICATION_STRATEGY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <CommunicationStrategyBadge strategy={event.communicationStrategy} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button href={`/events/${event.id}`} variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-cos-muted">
        Need to fix names or dates before import?{" "}
        <Link href="/calendar/review" className="font-medium text-cos-text hover:underline">
          Review imported calendar
        </Link>
      </p>
    </div>
  );
}
