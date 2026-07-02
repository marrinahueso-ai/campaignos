"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEvents(initialEvents);
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

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="items-center py-12 text-center">
          <CardTitle>No imported events yet</CardTitle>
          <CardDescription className="max-w-md">
            Upload a school calendar, review the dates, then import them here. After
            import, this list lets you set each date&apos;s plan type.
          </CardDescription>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button href="/calendar/import">Import calendar</Button>
            <Button href="/calendar/review" variant="secondary">
              Review latest upload
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
          {events.length} events from {filename ?? "your import"}
        </p>
        <p className="mt-1 text-sm text-cos-muted">
          Set plan type for each row — calendar-only dates stay view-only; full
          campaigns and reminders appear on the Campaigns page.
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

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card padding="none" className="overflow-hidden">
        <CardHeader className="border-b border-cos-border px-6 py-5">
          <CardTitle>Imported events</CardTitle>
          <CardDescription>
            Change plan type anytime. Upgrading to a campaign creates the communication
            workspace automatically.
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
