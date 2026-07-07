"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatEventDate } from "@/lib/utils/dates";
import type { Event } from "@/types";

interface CreativeStudioEventSearchProps {
  event: Event;
  campaignEvents: Event[];
}

export function CreativeStudioEventSearch({
  event,
  campaignEvents,
}: CreativeStudioEventSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) {
      return campaignEvents;
    }

    return campaignEvents.filter((entry) =>
      entry.title.toLocaleLowerCase().includes(normalized),
    );
  }, [campaignEvents, query]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  function handleSelect(entry: Event) {
    setOpen(false);
    setQuery("");
    if (entry.id !== event.id) {
      window.location.assign(`/events/${entry.id}#plan`);
    }
  }

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="font-display inline-flex max-w-full items-center gap-2 text-left text-[2rem] leading-tight text-cos-text sm:text-[2.25rem]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{event.title}</span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-cos-dark-muted sm:h-6 sm:w-6"
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-80 overflow-hidden rounded-[12px] border border-cos-border bg-cos-card shadow-lg">
          <div className="border-b border-cos-border px-3 py-2">
            <label className="sr-only" htmlFor="creative-studio-event-search">
              Search events
            </label>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
              <input
                ref={inputRef}
                id="creative-studio-event-search"
                type="search"
                value={query}
                onChange={(changeEvent) => setQuery(changeEvent.target.value)}
                placeholder="Search events…"
                className="min-w-0 flex-1 bg-transparent text-sm text-cos-text outline-none placeholder:text-cos-muted"
                autoComplete="off"
              />
            </div>
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filteredEvents.length === 0 ? (
              <li className="px-3 py-2 text-sm text-cos-muted">No matching events</li>
            ) : (
              filteredEvents.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={entry.id === event.id}
                    className={cn(
                      "block w-full px-3 py-2 text-left transition-colors hover:bg-cos-bg",
                      entry.id === event.id && "bg-cos-bg",
                    )}
                    onClick={() => handleSelect(entry)}
                  >
                    <span
                      className={cn(
                        "block text-sm text-cos-text",
                        entry.id === event.id && "font-medium",
                      )}
                    >
                      {entry.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-cos-muted">
                      {formatEventDate(entry.date)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
