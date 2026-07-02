"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  CalendarReviewCategoryBadge,
  CalendarReviewStatusBadge,
} from "@/components/calendar-review/CalendarReviewBadges";
import { CampaignPlanPreview } from "@/components/calendar-review/CampaignPlanPreview";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getStrategyPlanSummary } from "@/lib/calendar-import/review-event-normalize";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import { formatEventDate } from "@/lib/utils/dates";
import type { CalendarReviewEvent } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CalendarReviewTableProps {
  events: CalendarReviewEvent[];
  highlightedEventId?: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (eventId: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (event: CalendarReviewEvent) => void;
  onDelete: (eventId: string) => void;
  onStrategyChange: (eventId: string, strategy: CommunicationStrategy) => void;
  disabled?: boolean;
}

export function CalendarReviewTable({
  events,
  highlightedEventId,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onStrategyChange,
  disabled = false,
}: CalendarReviewTableProps) {
  const allSelected = events.length > 0 && selectedIds.size === events.length;

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cos-border bg-cos-bg px-6 py-12 text-center">
        <p className="text-sm font-medium text-cos-text">No events to review</p>
        <p className="mt-1 text-sm text-cos-muted">
          Upload a calendar or use chat to add events before importing.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              disabled={disabled}
              aria-label="Select all events"
              className="h-4 w-4 rounded border-cos-border"
            />
          </TableHead>
          <TableHead>Event Name</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Plan type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow
            key={event.id}
            data-highlighted={highlightedEventId === event.id}
          >
            <TableCell>
              <input
                type="checkbox"
                checked={selectedIds.has(event.id)}
                onChange={() => onToggleSelect(event.id)}
                disabled={disabled}
                aria-label={`Select ${event.name}`}
                className="h-4 w-4 rounded border-cos-border"
              />
            </TableCell>
            <TableCell className="font-medium text-cos-text">
              {event.name}
            </TableCell>
            <TableCell>{formatEventDate(event.date)}</TableCell>
            <TableCell>
              <CalendarReviewCategoryBadge category={event.category} />
            </TableCell>
            <TableCell>
              {(() => {
                const eventType =
                  event.eventType ??
                  inferEventTypeFromTitle(event.name, event.category);

                return (
                  <div className="min-w-[14rem] space-y-2">
                    <Select
                      value={event.communicationStrategy}
                      onChange={(changeEvent) =>
                        onStrategyChange(
                          event.id,
                          changeEvent.target.value as CommunicationStrategy,
                        )
                      }
                      disabled={disabled}
                      aria-label={`Plan type for ${event.name}`}
                    >
                      {COMMUNICATION_STRATEGY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} —{" "}
                          {getStrategyPlanSummary(eventType, option.value)}
                        </option>
                      ))}
                    </Select>
                    <CommunicationStrategyBadge strategy={event.communicationStrategy} />
                    <CampaignPlanPreview
                      eventType={eventType}
                      communicationStrategy={event.communicationStrategy}
                      compact
                    />
                  </div>
                );
              })()}
            </TableCell>
            <TableCell>
              <CalendarReviewStatusBadge status={event.status} />
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(event)}
                  disabled={disabled}
                  aria-label={`Edit ${event.name}`}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDelete(event.id)}
                  disabled={disabled}
                  aria-label={`Delete ${event.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
