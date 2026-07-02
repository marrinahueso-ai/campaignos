"use client";

import { cn } from "@/lib/utils/cn";
import {
  UNIFIED_CALENDAR_LAYERS,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";

interface CalendarLayerBarProps {
  activeLayers: Set<CalendarLayerId>;
  onChange: (layers: Set<CalendarLayerId>) => void;
}

export function CalendarLayerBar({ activeLayers, onChange }: CalendarLayerBarProps) {
  function toggleLayer(layerId: CalendarLayerId) {
    const next = new Set(activeLayers);
    if (next.has(layerId)) {
      next.delete(layerId);
    } else {
      next.add(layerId);
    }
    onChange(next);
  }

  function showAll() {
    onChange(new Set(UNIFIED_CALENDAR_LAYERS.map((layer) => layer.id)));
  }

  function hideAll() {
    onChange(new Set());
  }

  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cos-text">What to show</p>
          <p className="text-xs leading-relaxed text-cos-muted">
            School events and Meta posts — one entry per date, no duplicates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={showAll}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-cos-primary hover:bg-cos-info"
          >
            Show all
          </button>
          <button
            type="button"
            onClick={hideAll}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-cos-muted hover:bg-cos-bg"
          >
            Hide all
          </button>
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Calendar layers"
      >
        {UNIFIED_CALENDAR_LAYERS.map((layer) => {
          const active = activeLayers.has(layer.id);
          return (
            <button
              key={layer.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggleLayer(layer.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                active
                  ? "bg-cos-text text-cos-card"
                  : "bg-cos-bg text-cos-muted hover:bg-cos-card hover:text-cos-text",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  active ? layer.accent : "bg-cos-border",
                )}
              />
              {layer.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
