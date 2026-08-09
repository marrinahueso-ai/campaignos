"use client";

import { AppImage } from "@/components/images/AppImage";
import {
  countdownFromToday,
  eventStatusTone,
  type EventsHomeResponsiblePerson,
} from "@/components/events-phase3/EventsEaseList";
import { resolveEventsHomeListArtwork } from "@/lib/events/resolve-events-home-list-artwork";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";
import { cn } from "@/lib/utils/cn";

function typeLabel(event: Event): string | null {
  if (event.eventType) {
    return EVENT_TYPE_LABELS[event.eventType as EventType] ?? event.eventType;
  }
  return event.category;
}

export function EventsAlsoAheadList({
  events,
  today,
  artworkByEventId,
  responsibleByEventId,
  heading,
  expanded,
  canExpand,
  onToggleExpand,
  onSelect,
}: {
  events: Event[];
  today: string;
  artworkByEventId: Record<string, HeroArtworkSelection | null>;
  responsibleByEventId: Record<string, EventsHomeResponsiblePerson>;
  heading: string;
  expanded: boolean;
  canExpand: boolean;
  onToggleExpand: () => void;
  onSelect: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section id="also-ahead" className="pt-1" data-testid="events-also-ahead">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold tracking-[0.2em] text-[#5e6b65] uppercase">
          {heading}
        </h2>
        {canExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-semibold text-[#c5a880] transition hover:text-[#1c352d]"
          >
            {expanded ? "Show less" : "Show all events"}
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const artwork = resolveEventsHomeListArtwork(
            event,
            artworkByEventId[event.id] ?? null,
          );
          const imageUrl =
            hasDisplayableArtwork(artwork) && artwork?.imageUrl
              ? artwork.imageUrl
              : null;
          const lead =
            responsibleByEventId[event.id] ??
            ({
              displayName: "Unassigned",
              organizationTitle: null,
            } satisfies EventsHomeResponsiblePerson);
          const tone = eventStatusTone(event, today);
          const when = countdownFromToday(event.date, today);
          const type = typeLabel(event);

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              className="group relative flex w-full items-center gap-4 rounded-2xl border border-[#e6dfd5] bg-white p-4 text-left transition hover:-translate-y-px hover:border-[#c5a880]/60 hover:shadow-sm"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#e6dfd5] bg-[#f4f0ea]">
                {imageUrl ? (
                  <AppImage
                    src={imageUrl}
                    alt=""
                    width={48}
                    height={48}
                    preset="thumb"
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#1c352d]/80 to-[#c5a880]/70" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1c352d]">
                  {event.title}
                </p>
                <p className="text-[10px] text-[#5a7568] italic">
                  {[when, type].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="hidden border-l border-[#e6dfd5] px-6 md:block">
                <p className="text-[10px] font-bold tracking-wider text-[#5e6b65] uppercase">
                  Lead Coordinator
                </p>
                <p className="mt-1 text-xs font-semibold text-[#1c352d]">
                  {lead.displayName}
                </p>
              </div>

              <div className="hidden min-w-[100px] flex-col items-end sm:flex">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold",
                    tone.pillClass,
                  )}
                >
                  {tone.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
