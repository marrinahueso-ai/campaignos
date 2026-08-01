"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
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
      className: "border border-white/40 bg-transparent text-white",
    };
  }
  if (status === "scheduled") {
    return {
      label: "Ready",
      className: "border border-white/40 bg-white/15 text-white",
    };
  }
  if (status === "published") {
    return {
      label: "Published",
      className: "border border-white/40 bg-white/15 text-white",
    };
  }
  return {
    label: "Archived",
    className: "border border-white/40 bg-white/15 text-white",
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
  const volunteerLabel =
    stats.filledSpots > 0
      ? `${stats.filledSpots} filled`
      : "No fills yet";

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-2xl border border-[#e8e3da] bg-white shadow-sm"
        aria-label="Event hero"
      >
        <div className="relative h-32 sm:h-36">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#1e4a3a] via-[#4a6b58] to-[#c4922e]"
            aria-hidden
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(47,74,60,0.92)] via-[rgba(47,74,60,0.45)] to-transparent" />
          </div>

          <div className="relative z-10 flex h-full items-center justify-between gap-4 px-5 sm:px-8">
            <div className="min-w-0">
              <h1 className="mb-1 truncate font-display text-2xl leading-none text-white sm:text-3xl">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                <span>{formatEventDate(event.date)}</span>
                {!countdown.isPast ? (
                  <span className="text-white/70">{countdown.label}</span>
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    chip.className,
                  )}
                >
                  {chip.label}
                </span>
                {event.location ? (
                  <span className="truncate">{event.location}</span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={createHref}
                prefetch={false}
                onClick={(clickEvent) => {
                  clickEvent.preventDefault();
                  window.location.assign(createHref);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c4922e] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#a87a22] sm:px-5"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Generate Event Plan</span>
                <span className="sm:hidden">Plan</span>
              </Link>
              <EventManageMenu
                event={event}
                size="sm"
                includeEditDetails
                iconOnly
                triggerClassName="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              />
            </div>
          </div>
        </div>
      </section>

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6"
        aria-label="Event snapshot"
      >
        <button
          type="button"
          onClick={() => onSelectTab("approvals")}
          className="rounded-2xl border border-[#e8e3da] bg-white p-5 text-left shadow-sm transition hover:border-[#c4922e]/60"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold tracking-wider text-[#6b8171] uppercase">
              Needs approval
            </h3>
            <span className="rounded bg-[rgba(196,146,46,0.1)] px-2 py-0.5 text-xs font-bold text-[#a87a22]">
              {stats.pendingApprovals} pending
            </span>
          </div>
          <p className="text-sm text-[#2f4a3c]">
            {stats.pendingApprovals === 0
              ? "Nothing waiting on approval."
              : `${stats.pendingApprovals} item${stats.pendingApprovals === 1 ? "" : "s"} need a look.`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("tasks")}
          className="rounded-2xl border border-[#e8e3da] bg-white p-5 text-left shadow-sm transition hover:border-[#c4922e]/60"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold tracking-wider text-[#6b8171] uppercase">
              Quick Tasks
            </h3>
            <span className="rounded bg-[#f6f2eb] px-2 py-0.5 text-xs font-bold text-[#6b8171]">
              {stats.tasks} open
            </span>
          </div>
          <p className="text-sm text-[#2f4a3c]">
            {stats.tasks === 0
              ? "No open tasks for this event."
              : `Jump to ${stats.tasks} open task${stats.tasks === 1 ? "" : "s"}.`}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("volunteers")}
          className="rounded-2xl border border-[#e8e3da] bg-white p-5 text-left shadow-sm transition hover:border-[#c4922e]/60"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold tracking-wider text-[#6b8171] uppercase">
              Volunteer Staffing
            </h3>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {volunteerLabel}
            </span>
          </div>
          <p className="text-sm text-[#2f4a3c]">
            Review signup fill and open roles for this event.
          </p>
          <span className="mt-3 inline-block text-[10px] font-bold tracking-wider text-[#a87a22] uppercase">
            Manage →
          </span>
        </button>
      </div>
    </div>
  );
}

export type { EaseJumpTab };
