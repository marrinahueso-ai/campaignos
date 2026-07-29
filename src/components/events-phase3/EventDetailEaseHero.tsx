"use client";

import Link from "next/link";
import { EventManageMenu } from "@/components/event-workspace/EventManageMenu";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import type { EventDetailHeroStatTab } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import { formatEventDate, getEventCountdown } from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

type EaseJumpTab = EventDetailHeroStatTab | "create-with-ai";

interface EventDetailEaseHeroProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
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
    id: EventDetailHeroStatTab;
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
      label: "Volunteers",
    },
  ];

  return (
    <section
      className="relative isolate grid min-h-[240px] overflow-hidden rounded-[22px] border border-cos-border text-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] lg:grid-cols-[1fr_auto]"
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
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[rgba(255,252,247,0.88)]">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
              chip.className,
            )}
          >
            {chip.label}
          </span>
          {!countdown.isPast ? (
            <>
              <span>{countdown.label}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>{formatEventDate(event.date)}</span>
        </div>

        <h1 className="font-display text-[clamp(30px,4vw,42px)] tracking-[-0.02em] text-cos-card">
          {event.title}
        </h1>

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
          <EventManageMenu
            event={event}
            size="sm"
            includeEditDetails
            iconOnly
            triggerClassName="border-[rgba(255,252,247,0.28)] bg-[rgba(255,252,247,0.12)] text-cos-card backdrop-blur-sm"
          />
        </div>
      </div>

      <div
        className="relative z-10 flex flex-row flex-wrap gap-2.5 self-end p-5 pt-0 lg:min-w-[200px] lg:flex-col lg:p-6 lg:pl-0"
        aria-label="Jump to"
      >
        {jumps.map((jump) => (
          <button
            key={jump.id}
            type="button"
            onClick={() => onSelectTab(jump.id)}
            className="min-w-[132px] flex-1 rounded-[16px] border border-[rgba(255,252,247,0.35)] bg-[rgba(255,252,247,0.94)] px-4 py-3 text-left text-cos-text shadow-[0_4px_16px_rgba(20,28,24,0.2)] transition hover:bg-cos-card lg:flex-none"
          >
            <strong className="block font-display text-[32px] font-semibold leading-none tracking-[-0.02em]">
              {jump.value}
            </strong>
            <span className="mt-1 block text-[13px] font-semibold text-cos-muted">
              {jump.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export type { EaseJumpTab };
