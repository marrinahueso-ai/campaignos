"use client";

import { Button } from "@/components/ui/Button";
import type {
  NewsletterComposerEvent,
  NewsletterEventInsertLayout,
} from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";
import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatEventMeta(event: NewsletterComposerEvent): string {
  const parts = [event.date, event.time, event.location].filter((p) => p && p.trim());
  return parts.join(" · ") || "No date set";
}

export const EVENT_INSERT_LAYOUTS: {
  id: NewsletterEventInsertLayout;
  label: string;
  hint: string;
}[] = [
  { id: "featured", label: "Featured", hint: "One rich card per event" },
  { id: "card", label: "Card", hint: "One card per event" },
  { id: "artwork-only", label: "Artwork only", hint: "Image per event" },
  { id: "compact", label: "Compact", hint: "Small row per event" },
  { id: "textImage", label: "Text + image", hint: "One section per event" },
  { id: "columns", label: "2/3 column", hint: "Side-by-side from selection" },
  { id: "grid", label: "Grid", hint: "All selected in a grid" },
];

type Props = {
  open: boolean;
  events: NewsletterComposerEvent[];
  /**
   * When set, picker replaces a single event on an existing block
   * (single-select, no layout chooser).
   */
  selectedEventId?: string | null;
  /**
   * Multi-add mode (palette → Event). Allows selecting many events + a layout.
   * When false, clicking a row immediately selects (change-event).
   */
  multiSelect?: boolean;
  /** Pre-selected event ids when opening (e.g. converting an event block). */
  initialSelectedEventIds?: string[];
  /** Pre-chosen layout when converting from Event settings. */
  initialLayout?: NewsletterEventInsertLayout;
  onClose: () => void;
  /** Change-event / legacy single pick. */
  onSelect: (event: NewsletterComposerEvent) => void;
  /** Multi-add confirm — events in selection order + layout. */
  onConfirmMulti?: (
    events: NewsletterComposerEvent[],
    layout: NewsletterEventInsertLayout,
  ) => void;
};

/** "Add Event Block" picker — lists real org events, never invented data. */
export function EventPickerModal({
  open,
  events,
  selectedEventId = null,
  multiSelect = false,
  initialSelectedEventIds,
  initialLayout = "card",
  onClose,
  onSelect,
  onConfirmMulti,
}: Props) {
  const [query, setQuery] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [layout, setLayout] = useState<NewsletterEventInsertLayout>(initialLayout);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setLayout(initialLayout);
    if (multiSelect) {
      setPickedIds(initialSelectedEventIds ?? []);
    }
  }, [open, multiSelect, initialLayout, initialSelectedEventIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q),
    );
  }, [events, query]);

  const pickedEvents = useMemo(() => {
    const byId = new Map(events.map((e) => [e.id, e]));
    return pickedIds
      .map((id) => byId.get(id))
      .filter((e): e is NewsletterComposerEvent => Boolean(e));
  }, [events, pickedIds]);

  function togglePick(eventId: string) {
    setPickedIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId],
    );
  }

  function handleConfirm() {
    if (!onConfirmMulti || pickedEvents.length === 0) return;
    onConfirmMulti(pickedEvents, layout);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(28,36,48,0.5)] backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-picker-title"
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-cos-border bg-cos-card shadow-[0_24px_64px_rgba(28,36,48,0.28)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-cos-border p-6">
          <div>
            <h3
              id="event-picker-title"
              className="font-display text-2xl text-cos-text"
            >
              {multiSelect ? "Add events" : "Add event block"}
            </h3>
            <p className="mt-1 text-sm text-cos-muted">
              {multiSelect
                ? "Select one or more events, then choose how they should appear in the newsletter."
                : "Choose an event you've already created — artwork, dates, and links come along automatically."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-cos-muted transition hover:text-cos-text"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-6" style={{ maxHeight: "60vh" }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cos-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your events…"
              className="w-full rounded-2xl border border-cos-border bg-cos-bg px-10 py-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            />
          </div>

          {multiSelect ? (
            <div className="space-y-2 rounded-2xl border border-cos-border bg-cos-bg-alt/50 p-3">
              <p className="text-[10px] font-bold tracking-[0.14em] text-cos-muted uppercase">
                Event layout
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EVENT_INSERT_LAYOUTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLayout(item.id)}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-left transition",
                      layout === item.id
                        ? "border-2 border-cos-brand-sage bg-cos-brand-sage-soft"
                        : "border-cos-border bg-cos-card hover:border-cos-brand-sage",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[11px] font-bold",
                        layout === item.id
                          ? "text-cos-brand-sage"
                          : "text-cos-text",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-cos-muted">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-cos-muted">
              {events.length === 0
                ? "No events yet — create one from Events first."
                : "No events match that search."}
            </p>
          ) : (
            <div className="space-y-2 pt-2">
              {filtered.map((event) => {
                const isCurrent = event.id === selectedEventId;
                const isPicked = multiSelect
                  ? pickedIds.includes(event.id)
                  : isCurrent;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      if (multiSelect) {
                        togglePick(event.id);
                        return;
                      }
                      onSelect(event);
                    }}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                      isPicked
                        ? "border-2 border-cos-brand-sage bg-cos-brand-sage-soft"
                        : "border-cos-border hover:border-cos-brand-sage hover:bg-cos-brand-sage-soft/40",
                    )}
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cos-bg-alt">
                      {event.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-cos-text">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-sm text-cos-muted">
                        {formatEventMeta(event)}
                      </p>
                      {event.volunteerSignupUrl ? (
                        <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider text-cos-brand-sage">
                          Has volunteer signup
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        isPicked
                          ? "border-cos-brand-sage bg-cos-brand-sage text-white"
                          : "border-cos-border text-cos-muted",
                      )}
                    >
                      {isPicked ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cos-border bg-cos-bg-alt/60 p-5">
          {multiSelect ? (
            <p className="text-sm text-cos-muted">
              {pickedEvents.length === 0
                ? "Select at least one event"
                : `${pickedEvents.length} selected · ${EVENT_INSERT_LAYOUTS.find((l) => l.id === layout)?.label ?? layout}`}
            </p>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {multiSelect ? (
              <Button
                type="button"
                disabled={pickedEvents.length === 0}
                onClick={handleConfirm}
              >
                Add to newsletter
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
