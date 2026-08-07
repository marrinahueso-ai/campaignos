"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArtworkHoverThumbnail, ArtworkPreviewActions } from "@/components/artwork/ArtworkHoverThumbnail";
import { AppImage } from "@/components/images/AppImage";
import {
  formatEventsHomeMonthLabel,
  matchesEventsHomeSummary,
  monthKeyFromDate,
  type EventsHomeSummaryKey,
} from "@/lib/events/events-home-summary";
import { resolveEventsHomeListArtwork } from "@/lib/events/resolve-events-home-list-artwork";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import {
  addDaysToDateOnly,
  formatLocalDate,
  normalizeDateOnly,
  parseLocalDate,
} from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

export type EventsHomeResponsiblePerson = {
  displayName: string;
  organizationTitle: string | null;
};

export type EventsEaseLens = "upcoming" | "next_month" | "all" | "archived";

export function easeLensToSummary(
  lens: EventsEaseLens,
): EventsHomeSummaryKey | "all" {
  if (lens === "upcoming") return "next_60_days";
  return "all";
}

export function eventStatusTone(
  event: Event,
  today: string,
): {
  label: string;
  className: string;
  pillClass: string;
} {
  if (matchesEventsHomeSummary(event, "needs_follow_up", today)) {
    return {
      label: "Follow-up",
      className: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
      pillClass: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
    };
  }
  if (event.status === "published") {
    return {
      label: "Published",
      className: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
      pillClass: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
    };
  }
  if (event.status === "draft") {
    return {
      label: "Needs setup",
      className: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
      pillClass: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
    };
  }
  if (event.status === "archived") {
    return {
      label: "Archived",
      className: "bg-[rgba(28,36,48,0.08)] text-cos-muted",
      pillClass: "bg-[rgba(28,36,48,0.08)] text-cos-muted",
    };
  }
  return {
    label: "Ready",
    className: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
    pillClass: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
  };
}

export function countdownFromToday(eventDate: string, today: string): string {
  const start = parseLocalDate(today);
  const end = parseLocalDate(eventDate);
  const days = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
}

function typeLabel(event: Event): string | null {
  if (event.eventType) {
    return EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;
  }
  return event.category;
}

function ArtThumb({
  event,
  artwork,
  className,
  compact = false,
  sizes,
}: {
  event: Event;
  artwork: HeroArtworkSelection | null;
  className?: string;
  compact?: boolean;
  sizes?: string;
}) {
  const resolved = resolveEventsHomeListArtwork(event, artwork);
  const url =
    hasDisplayableArtwork(resolved) && resolved?.imageUrl
      ? resolved.imageUrl
      : null;

  return (
    <ArtworkHoverThumbnail
      imageUrl={url}
      alt={`${event.title} artwork`}
      downloadName={event.title}
      className={className}
      compact={compact}
      sizes={sizes ?? (compact ? "56px" : "120px")}
    />
  );
}

export function EventsEaseFocusCard({
  event,
  today,
  artwork,
}: {
  event: Event;
  today: string;
  artwork: HeroArtworkSelection | null;
}) {
  const tone = eventStatusTone(event, today);
  const resolved = resolveEventsHomeListArtwork(event, artwork);
  const url =
    hasDisplayableArtwork(resolved) && resolved?.imageUrl
      ? resolved.imageUrl
      : null;

  return (
    <article className="group relative isolate flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[22px] border border-cos-border text-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1e4a3a] via-[#4a6b58] to-[#c4922e]"
        aria-hidden
      >
        {url ? (
          <AppImage
            src={url}
            alt=""
            fill
            preset="hero"
            displayWidth={800}
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover object-center"
            priority
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(20,28,24,0.92)] via-[rgba(20,28,24,0.55)] to-[rgba(20,28,24,0.18)]" />
      </div>
      {url ? (
        <div className="absolute top-4 right-4 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <ArtworkPreviewActions
            imageUrl={url}
            alt={`${event.title} artwork`}
            downloadName={event.title}
            floating
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5 p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[rgba(255,252,247,0.78)]">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
              event.status === "draft"
                ? "bg-[rgba(166,90,58,0.95)] text-white"
                : "bg-[rgba(255,252,247,0.92)] text-cos-text",
            )}
          >
            {tone.label}
          </span>
          <span>{countdownFromToday(event.date, today)}</span>
        </div>
        <h2 className="max-w-[18ch] font-display text-[clamp(28px,3.5vw,36px)] tracking-[-0.02em] text-cos-card">
          {event.title}
        </h2>
        <p className="text-sm font-semibold text-[rgba(255,252,247,0.85)]">
          {formatLocalDate(event.date, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center rounded-full bg-cos-card px-3.5 py-2.5 text-xs font-bold text-cos-text transition hover:-translate-y-px"
          >
            Open event
          </Link>
          <Link
            href={`/events/${event.id}/campaign-builder`}
            className="inline-flex items-center rounded-full border border-[rgba(255,252,247,0.28)] bg-[rgba(255,252,247,0.12)] px-3.5 py-2.5 text-xs font-bold text-cos-card backdrop-blur-sm transition hover:bg-[rgba(255,252,247,0.22)]"
          >
            Social
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EventsEaseAheadCard({
  event,
  today,
  artwork,
  onSelect,
}: {
  event: Event;
  today: string;
  artwork: HeroArtworkSelection | null;
  onSelect: () => void;
}) {
  const tone = eventStatusTone(event, today);
  return (
    <div className="grid min-h-[100px] flex-1 grid-cols-[88px_1fr] items-stretch overflow-hidden rounded-[18px] border border-cos-border bg-cos-card text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(42,38,34,0.12)]">
      <ArtThumb
        event={event}
        artwork={artwork}
        className="min-h-[100px] self-stretch rounded-none"
        sizes="88px"
      />
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-col justify-center gap-1 px-3.5 py-3 text-left"
      >
        <strong className="truncate text-sm font-bold text-cos-text">
          {event.title}
        </strong>
        <span className="text-xs text-cos-muted">
          {formatLocalDate(event.date, { month: "short", day: "numeric" })}
          {" · "}
          {countdownFromToday(event.date, today)}
        </span>
        <span
          className={cn(
            "mt-0.5 inline-flex self-start rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-[0.04em] uppercase",
            tone.className,
          )}
        >
          {tone.label}
        </span>
      </button>
    </div>
  );
}

export function EventsEaseQueueRow({
  event,
  today,
  artwork,
  responsible,
}: {
  event: Event;
  today: string;
  artwork: HeroArtworkSelection | null;
  responsible: EventsHomeResponsiblePerson;
}) {
  const tone = eventStatusTone(event, today);
  const type = typeLabel(event);

  return (
    <Link
      href={`/events/${event.id}`}
      className="grid w-full grid-cols-[48px_1fr] items-center gap-3.5 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.55)] px-3.5 py-3 text-left transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:grid-cols-[56px_1fr_auto_auto]"
    >
      <ArtThumb
        event={event}
        artwork={artwork}
        compact
        className="h-12 w-12 rounded-[14px] sm:h-14 sm:w-14"
      />
      <span className="min-w-0">
        <p className="truncate text-sm font-bold text-cos-text">{event.title}</p>
        <p className="mt-0.5 truncate text-xs text-cos-muted">
          {formatLocalDate(event.date, { month: "short", day: "numeric" })}
          {type ? ` · ${type}` : ""}
        </p>
      </span>
      <span
        className={cn(
          "hidden rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase sm:inline-flex",
          tone.className,
        )}
      >
        {tone.label}
      </span>
      <span className="hidden text-right text-xs font-bold whitespace-nowrap text-cos-muted sm:block">
        {responsible.displayName}
        <span className="mt-0.5 block font-semibold text-cos-muted">
          {responsible.organizationTitle || "—"}
        </span>
      </span>
    </Link>
  );
}

export function EventsEaseEmpty({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-12 text-center">
      <strong className="mb-2 block font-display text-[22px] font-semibold text-cos-text">
        {title}
      </strong>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-cos-muted">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/create-with-ai"
          className="inline-flex rounded-full bg-[#2f4a3c] px-4 py-2.5 text-[13px] font-bold text-[#f6f2eb]"
        >
          Create with AI
        </Link>
        <Link
          href="/events/create"
          className="inline-flex rounded-full border border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-text"
        >
          New event
        </Link>
      </div>
    </div>
  );
}

export function EventsEaseSuiteStrip() {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)] before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-full before:w-1/2 before:bg-[radial-gradient(ellipse_at_left,rgba(47,74,60,0.1),transparent_60%)] before:content-[''] after:pointer-events-none after:absolute after:top-0 after:right-0 after:h-full after:w-1/2 after:bg-[radial-gradient(ellipse_at_right,rgba(196,146,46,0.12),transparent_55%)] after:content-['']">
      <div className="relative">
        <h3 className="font-display text-[22px] tracking-[-0.02em] text-cos-text">
          Create with AI
        </h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cos-muted">
          The suite that already feels like Hey Ralli — pick a surface, make the
          piece, land it back on the event.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/create-with-ai/social",
              title: "Social",
              body: "Posts, artwork, captions, approval.",
              art: "from-[#c4922e] via-[#e0b65a] to-[#f5e6c2]",
            },
            {
              href: "/homepage-composer",
              title: "Homepage",
              body: "Pick events, blurbs, Toolkit HTML.",
              art: "from-[#2f4a3c] via-[#6b8171] to-[#b8c9bc]",
            },
            {
              href: "/newsletter-composer",
              title: "Newsletter",
              body: "Scoop layout, voice, and send-ready copy.",
              art: "from-[#0b2f5b] via-[#2f9fb3] to-[#7fd0df]",
            },
          ].map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="overflow-hidden rounded-[18px] border border-cos-border bg-cos-bg transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            >
              <div
                className={cn("h-[88px] bg-gradient-to-br", tile.art)}
                aria-hidden
              />
              <div className="px-3.5 py-3.5">
                <strong className="block text-sm font-bold text-cos-text">
                  {tile.title}
                </strong>
                <span className="mt-1 block text-xs leading-snug text-cos-muted">
                  {tile.body}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EventsEaseMonthGlance({
  events,
  today,
  viewMonthKey,
  onViewMonthKeyChange,
}: {
  events: Event[];
  today: string;
  viewMonthKey: string;
  onViewMonthKeyChange: (key: string) => void;
}) {
  const [yearText, monthText] = viewMonthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevDays = new Date(year, monthIndex, 0).getDate();
  const todayKey = normalizeDateOnly(today);
  const todayParts = todayKey.split("-");

  const byDay = new Map<number, Event[]>();
  for (const event of events) {
    if (monthKeyFromDate(event.date) !== viewMonthKey) continue;
    const day = Number(normalizeDateOnly(event.date).slice(8, 10));
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  }

  function shiftMonth(delta: number) {
    const next = new Date(year, monthIndex + delta, 1);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    onViewMonthKeyChange(key);
  }

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: ReactNode[] = [];

  for (const dow of dows) {
    cells.push(
      <div
        key={`dow-${dow}`}
        className="px-0 py-2 text-center text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase"
      >
        {dow}
      </div>,
    );
  }

  for (let i = 0; i < startPad; i++) {
    const day = prevDays - startPad + i + 1;
    cells.push(
      <div
        key={`pad-prev-${day}`}
        className="min-h-[72px] rounded-[14px] bg-[rgba(255,252,247,0.45)] p-2 opacity-40 sm:min-h-[92px]"
      >
        <span className="text-xs font-extrabold text-cos-muted tabular-nums">
          {day}
        </span>
      </div>,
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = `${viewMonthKey}-${String(day).padStart(2, "0")}`;
    const isToday = dayKey === todayKey;
    const dayEvents = byDay.get(day) ?? [];
    cells.push(
      <div
        key={dayKey}
        className={cn(
          "flex min-h-[72px] flex-col gap-1 rounded-[14px] border border-transparent bg-[rgba(255,252,247,0.45)] p-2 sm:min-h-[92px]",
          isToday &&
            "border-[rgba(47,74,60,0.28)] bg-cos-card shadow-[0_0_0_3px_rgba(47,74,60,0.08)]",
          dayEvents.length > 0 && "border-cos-border bg-cos-card",
        )}
      >
        <span
          className={cn(
            "text-xs font-extrabold text-cos-muted tabular-nums",
            isToday && "text-[#2f4a3c]",
          )}
        >
          {day}
        </span>
        {dayEvents.slice(0, 2).map((event) => {
          const tone = eventStatusTone(event, today);
          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className={cn(
                "block truncate rounded-lg px-1.5 py-1 text-[10px] font-bold leading-tight",
                tone.pillClass,
              )}
              title={event.title}
            >
              {event.title}
            </Link>
          );
        })}
        {dayEvents.length > 2 ? (
          <span className="px-1 text-[10px] font-semibold text-cos-muted">
            +{dayEvents.length - 2} more
          </span>
        ) : null}
      </div>,
    );
  }

  const totalFilled = startPad + daysInMonth;
  const trailing = (7 - (totalFilled % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    cells.push(
      <div
        key={`pad-next-${i}`}
        className="min-h-[72px] rounded-[14px] bg-[rgba(255,252,247,0.45)] p-2 opacity-40 sm:min-h-[92px]"
      >
        <span className="text-xs font-extrabold text-cos-muted tabular-nums">
          {i}
        </span>
      </div>,
    );
  }

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)] hover:text-cos-text"
          >
            ‹
          </button>
          <h2 className="min-w-[10ch] text-center font-display text-[26px] tracking-[-0.02em] text-cos-text">
            {formatEventsHomeMonthLabel(viewMonthKey)}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)] hover:text-cos-text"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            onViewMonthKeyChange(
              `${todayParts[0]}-${todayParts[1]}`,
            )
          }
          className="rounded-full border border-cos-border bg-cos-card px-3.5 py-2 text-xs font-bold text-cos-text"
        >
          This month
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">{cells}</div>
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-cos-muted">
        <span>Upcoming · Next month · All · Archived</span>
        <span className="text-cos-muted">
          Upcoming looks ahead about 60 days (through{" "}
          {addDaysToDateOnly(today, 60)})
        </span>
      </div>
    </div>
  );
}
