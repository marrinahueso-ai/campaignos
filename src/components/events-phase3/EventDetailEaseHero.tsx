"use client";

import Link from "next/link";
import { EditEventDetailsButton } from "@/components/event-workspace/EditEventDetailsButton";
import { EventManageMenu } from "@/components/event-workspace/EventManageMenu";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import type { EventDetailHeroStatTab } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import {
  formatEventDate,
  formatEventTime,
  getEventCountdown,
} from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

type EaseJumpTab = EventDetailHeroStatTab | "create-with-ai";

interface EventDetailEaseHeroProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
  eventTypeLabel: string | null;
  stats: EventDetailHeroStats;
  onSelectTab: (tab: EaseJumpTab) => void;
}

function statusChip(status: Event["status"]): { label: string; className: string } {
  if (status === "draft") {
    return {
      label: "Needs setup",
      className: "bg-[rgba(166,90,58,0.95)] text-white",
    };
  }
  if (status === "scheduled") {
    return {
      label: "Ready",
      className: "bg-[rgba(255,252,247,0.92)] text-cos-text",
    };
  }
  if (status === "published") {
    return {
      label: "Published",
      className: "bg-[rgba(255,252,247,0.92)] text-cos-text",
    };
  }
  return {
    label: "Archived",
    className: "bg-[rgba(255,252,247,0.92)] text-cos-text",
  };
}

export function EventDetailEaseHero({
  event,
  artwork,
  eventTypeLabel,
  stats,
  onSelectTab,
}: EventDetailEaseHeroProps) {
  const chip = statusChip(event.status);
  const countdown = getEventCountdown(event.date);
  const imageUrl =
    hasDisplayableArtwork(artwork) && artwork?.imageUrl
      ? artwork.imageUrl
      : null;
  const createHref = createWithAiHref(event.id);

  const jumps: Array<{
    id: EaseJumpTab;
    value: string;
    label: string;
  }> = [
    {
      id: "approvals",
      value: String(stats.pendingApprovals),
      label: "Needs approval",
    },
    {
      id: "tasks",
      value: String(stats.tasks),
      label: "Open tasks",
    },
    {
      id: "volunteers",
      value: String(stats.filledSpots),
      label: "Volunteers filled",
    },
    {
      id: "create-with-ai",
      value: String(stats.milestones),
      label: "Milestones",
    },
  ];

  return (
    <section
      className="relative isolate grid min-h-[260px] overflow-hidden rounded-[22px] border border-cos-border text-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] lg:grid-cols-[1fr_auto]"
      aria-label="Event hero"
    >
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1e4a3a] via-[#4a6b58] to-[#c4922e]"
        aria-hidden
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(20,28,24,0.9)] via-[rgba(20,28,24,0.55)] to-[rgba(20,28,24,0.28)]" />
      </div>

      <div className="flex max-w-xl flex-col gap-3 p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[rgba(255,252,247,0.78)]">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
              chip.className,
            )}
          >
            {chip.label}
          </span>
          {!countdown.isPast ? <span>{countdown.label}</span> : null}
          <span aria-hidden>·</span>
          <span>{formatEventDate(event.date)}</span>
          {event.time ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatEventTime(event.time)}</span>
            </>
          ) : null}
          {eventTypeLabel ? (
            <>
              <span aria-hidden>·</span>
              <span>{eventTypeLabel}</span>
            </>
          ) : null}
        </div>

        <h1 className="font-display text-[clamp(30px,4vw,42px)] tracking-[-0.02em] text-cos-card">
          {event.title}
        </h1>
        <p className="max-w-[34ch] text-sm leading-relaxed text-[rgba(255,252,247,0.8)]">
          Tasks, approvals, volunteers, and Create with AI — one calm place for
          this event.
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Link
            href={createHref}
            prefetch={false}
            onClick={(clickEvent) => {
              clickEvent.preventDefault();
              window.location.assign(createHref);
            }}
            className="inline-flex items-center rounded-full bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
          >
            Create with AI
          </Link>
          <span className="[&_button]:border-[rgba(255,252,247,0.28)] [&_button]:bg-[rgba(255,252,247,0.12)] [&_button]:text-cos-card [&_button]:backdrop-blur-sm">
            <EditEventDetailsButton event={event} size="sm" />
          </span>
          <span className="[&_button]:border-[rgba(255,252,247,0.28)] [&_button]:bg-[rgba(255,252,247,0.12)] [&_button]:text-cos-card [&_button]:backdrop-blur-sm">
            <EventManageMenu event={event} size="sm" />
          </span>
        </div>
      </div>

      <div
        className="relative z-10 flex flex-row flex-wrap gap-2 self-end p-5 pt-0 lg:min-w-[180px] lg:flex-col lg:p-6 lg:pl-0"
        aria-label="Jump to"
      >
        {jumps.map((jump) => (
          <button
            key={jump.id}
            type="button"
            onClick={() => onSelectTab(jump.id)}
            className="min-w-[120px] flex-1 rounded-[14px] border border-[rgba(255,252,247,0.22)] bg-[rgba(255,252,247,0.12)] px-3.5 py-2.5 text-left text-cos-card backdrop-blur-sm transition hover:bg-[rgba(255,252,247,0.2)] lg:flex-none"
          >
            <strong className="block font-display text-[22px] font-semibold tracking-[-0.02em]">
              {jump.value}
            </strong>
            <span className="text-[11px] font-bold opacity-80">{jump.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export type { EaseJumpTab };
