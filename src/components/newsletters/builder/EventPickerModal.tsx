"use client";

import { Button } from "@/components/ui/Button";
import type { NewsletterComposerEvent } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";
import { Check, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

function formatEventMeta(event: NewsletterComposerEvent): string {
  const parts = [event.date, event.time, event.location].filter((p) => p && p.trim());
  return parts.join(" · ") || "No date set";
}

type Props = {
  open: boolean;
  events: NewsletterComposerEvent[];
  /** Event id currently linked to the block being edited, if any. */
  selectedEventId?: string | null;
  onClose: () => void;
  onSelect: (event: NewsletterComposerEvent) => void;
};

/** "Add Event Block" picker — lists real org events, never invented data. */
export function EventPickerModal({
  open,
  events,
  selectedEventId = null,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");

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
            <h3 className="font-display text-2xl text-cos-text">Add event block</h3>
            <p className="mt-1 text-sm text-cos-muted">
              Choose an event you&apos;ve already created — artwork, dates, and links come along
              automatically.
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

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-cos-muted">
              {events.length === 0
                ? "No events yet — create one from Events first."
                : "No events match that search."}
            </p>
          ) : (
            <div className="space-y-2 pt-2">
              {filtered.map((event) => {
                const isSelected = event.id === selectedEventId;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelect(event)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                      isSelected
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
                      <p className="truncate text-base font-bold text-cos-text">{event.title}</p>
                      <p className="mt-0.5 text-sm text-cos-muted">{formatEventMeta(event)}</p>
                      {event.volunteerSignupUrl ? (
                        <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider text-cos-brand-sage">
                          Has volunteer signup
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-cos-brand-sage bg-cos-brand-sage text-white"
                          : "border-cos-border text-cos-muted",
                      )}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-cos-border bg-cos-bg-alt/60 p-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
