"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { pilotInput } from "@/components/settings-v2/team-access/team-access-pilot-theme";

export type PilotEventOption = {
  id: string;
  title: string;
  date?: string | null;
  status?: string | null;
};

function parseEventDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isUpcoming(date: string | null | undefined): boolean {
  const parsed = parseEventDate(date);
  if (!parsed) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() >= today.getTime();
}

function formatMonthDay(date: string | null | undefined): {
  month: string;
  day: string;
} {
  const parsed = parseEventDate(date);
  if (!parsed) {
    return { month: "—", day: "—" };
  }
  return {
    month: parsed.toLocaleDateString("en-US", { month: "short" }),
    day: String(parsed.getDate()),
  };
}

interface TeamAccessPilotEventPickerProps {
  events: PilotEventOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Show assigned-only zero-events warning when true and nothing selected. */
  assignedOnlyWarning?: boolean;
}

export function TeamAccessPilotEventPicker({
  events,
  selectedIds,
  onChange,
  disabled = false,
  assignedOnlyWarning = false,
}: TeamAccessPilotEventPickerProps) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? events.filter((event) => event.title.toLowerCase().includes(needle))
      : events;
    const upcoming = list.filter((event) => isUpcoming(event.date));
    const past = list.filter((event) => !isUpcoming(event.date));
    return { upcoming, past };
  }, [events, query]);

  const selectedEvents = events.filter((event) => selectedSet.has(event.id));

  function toggle(eventId: string) {
    if (disabled) return;
    onChange(
      selectedSet.has(eventId)
        ? selectedIds.filter((id) => id !== eventId)
        : [...selectedIds, eventId],
    );
  }

  function clearAll() {
    if (disabled) return;
    onChange([]);
  }

  function renderGroup(label: string, group: PilotEventOption[], muted = false) {
    if (group.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/60">
          {label}
        </p>
        <div className="flex flex-col gap-2">
          {group.map((event) => {
            const on = selectedSet.has(event.id);
            const { month, day } = formatMonthDay(event.date);
            return (
              <button
                key={event.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(event.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition hover:-translate-y-px disabled:opacity-60 ${
                  on
                    ? "border-[#586c63] bg-[#fdfcf7]"
                    : muted
                      ? "border-[#e5e1d8] bg-white/70 opacity-80"
                      : "border-[#e5e1d8] bg-white"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f5f2eb] text-[#201b17]">
                  <span className="text-[9px] font-bold uppercase leading-none">
                    {month}
                  </span>
                  <span className="text-sm font-bold leading-none">{day}</span>
                </div>
                <span className="min-w-0 flex-1 truncate font-bold text-[#201b17]">
                  {event.title}
                </span>
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-extrabold ${
                    on
                      ? "border-[#586c63] bg-[#586c63] text-white"
                      : "border-[#e5e1d8] text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#586c63]">
          {selectedIds.length} event{selectedIds.length === 1 ? "" : "s"} selected
        </p>
        {selectedIds.length > 0 ? (
          <button
            type="button"
            className="text-xs font-bold text-[#737373] hover:text-[#201b17]"
            disabled={disabled}
            onClick={clearAll}
          >
            Clear all
          </button>
        ) : null}
      </div>

      {selectedEvents.length > 0 ? (
        <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
          {selectedEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(event.id)}
              className="rounded-full bg-[#eef2f0] px-3 py-1.5 text-[11px] font-bold text-[#586c63]"
            >
              {event.title} ×
            </button>
          ))}
        </div>
      ) : null}

      {assignedOnlyWarning && selectedIds.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          This role can only work on assigned events. Without any events linked,
          they won&apos;t be able to open or edit events.
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#737373]/50" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events…"
          className={`${pilotInput} pl-11`}
          disabled={disabled}
        />
      </div>

      {events.length === 0 ? (
        <p className="text-sm font-medium text-[#737373]">
          No events yet for this organization.
        </p>
      ) : filtered.upcoming.length === 0 && filtered.past.length === 0 ? (
        <p className="text-sm font-medium text-[#737373]">
          No events match your search.
        </p>
      ) : (
        <div className="max-h-72 space-y-6 overflow-y-auto pr-1">
          {renderGroup("Upcoming", filtered.upcoming)}
          {renderGroup("Past", filtered.past, true)}
        </div>
      )}
    </div>
  );
}
