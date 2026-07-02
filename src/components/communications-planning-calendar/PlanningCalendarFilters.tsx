"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  getChannelStyles,
  ITEM_TYPE_LABELS,
  PLANNING_CHANNELS,
} from "@/lib/communications-calendar/channel-styles";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import type {
  PlanningCalendarFilters,
  PlanningCalendarItem,
  PlanningItemType,
} from "@/types/communications-calendar";
import type { CommunicationChannel } from "@/types/event-workspace";

interface PlanningCalendarFiltersBarProps {
  filters: PlanningCalendarFilters;
  events: { id: string; title: string }[];
  onChange: (filters: PlanningCalendarFilters) => void;
}

const TYPE_OPTIONS: { value: PlanningItemType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "event", label: "PTO Events" },
  { value: "timeline_task", label: "Timeline Tasks" },
  { value: "draft", label: "Drafts" },
  { value: "artwork", label: "Artwork" },
  { value: "approval", label: "Approvals" },
  { value: "scheduled_post", label: "Scheduled Posts" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "generated", label: "Generated" },
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "uploaded", label: "Uploaded" },
  { value: "completed", label: "Completed" },
];

export function PlanningCalendarFiltersBar({
  filters,
  events,
  onChange,
}: PlanningCalendarFiltersBarProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-cos-border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-cos-text"
      >
        Filters
        <span className="text-xs font-normal text-cos-muted">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="grid gap-4 border-t border-cos-border px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
          <FilterField label="Event">
            <select
              value={filters.eventId ?? "all"}
              onChange={(event) =>
                onChange({
                  ...filters,
                  eventId: event.target.value === "all" ? null : event.target.value,
                })
              }
              className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text"
            >
              <option value="all">All events</option>
              {events.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Channel">
            <select
              value={filters.channel}
              onChange={(event) =>
                onChange({
                  ...filters,
                  channel: event.target.value as CommunicationChannel | "all",
                })
              }
              className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text"
            >
              <option value="all">All channels</option>
              {PLANNING_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Status">
            <select
              value={filters.status}
              onChange={(event) =>
                onChange({ ...filters, status: event.target.value })
              }
              className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Assigned user">
            <select
              value={filters.assignedUser}
              onChange={(event) =>
                onChange({ ...filters, assignedUser: event.target.value })
              }
              className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text"
              disabled
              title="Multi-user assignments coming soon"
            >
              <option value="all">All users</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </FilterField>

          <FilterField label="Communication type">
            <select
              value={filters.communicationType}
              onChange={(event) =>
                onChange({
                  ...filters,
                  communicationType: event.target.value as PlanningItemType | "all",
                })
              }
              className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-sm text-cos-text"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-cos-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ChannelLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {PLANNING_CHANNELS.map((channel) => {
        const styles = getChannelStyles(channel);
        return (
          <span
            key={channel}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              styles.bg,
              styles.border,
              styles.text,
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
            {CHANNEL_LABELS[channel]}
          </span>
        );
      })}
    </div>
  );
}

export function formatPlanningItemForPanel(item: PlanningCalendarItem) {
  return {
    typeLabel: ITEM_TYPE_LABELS[item.communicationType],
    channelLabel: item.channel ? CHANNEL_LABELS[item.channel] : "—",
  };
}
