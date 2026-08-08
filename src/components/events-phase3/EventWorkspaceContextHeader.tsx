"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { EventManageMenu } from "@/components/event-workspace/EventManageMenu";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ew, ewCard } from "@/components/events-phase3/event-workspace-tokens";

type Props = {
  event: Event;
  artwork: HeroArtworkSelection | null;
  /** Optional status line under the title (e.g. “3 items need review”). */
  statusLine?: string | null;
  showGeneratePlan?: boolean;
  /** Return to Overview landing (clears `?tab=`). */
  onBackToWorkspace?: () => void;
};

export function EventWorkspaceContextHeader({
  event,
  artwork,
  statusLine = null,
  showGeneratePlan = true,
  onBackToWorkspace,
}: Props) {
  const imageUrl =
    hasDisplayableArtwork(artwork) && artwork?.imageUrl
      ? artwork.imageUrl
      : null;
  const timeLabel = formatEventTime(event.time);
  const createHref = createWithAiHref(event.id);

  return (
    <div className="space-y-4">
      {onBackToWorkspace ? (
        <button
          type="button"
          onClick={onBackToWorkspace}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium",
            ew.inksoft,
            "hover:text-[#1c352d]",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workspace
        </button>
      ) : (
        <Link
          href="/events"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium",
            ew.inksoft,
            "hover:text-[#1c352d]",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      )}

      <div
        className={cn(
          ewCard,
          "flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5",
        )}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#1c352d] via-[#5a7568] to-[#c5a880]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "truncate font-display text-2xl leading-tight sm:text-3xl",
              ew.ink,
            )}
          >
            {event.title}
          </h1>
          <p className={cn("mt-0.5 text-sm", ew.inksoft)}>
            {formatEventDate(event.date)}
            {timeLabel ? ` · ${timeLabel}` : null}
            {event.location ? ` · ${event.location}` : null}
          </p>
          {statusLine ? (
            <p className={cn("mt-1 text-sm font-medium", ew.sageDeep)}>
              {statusLine}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showGeneratePlan ? (
            <Link
              href={createHref}
              prefetch={false}
              onClick={(clickEvent) => {
                clickEvent.preventDefault();
                window.location.assign(createHref);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition",
                ew.fillInk,
                "hover:bg-[#5e6b65]",
              )}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Generate Event Plan</span>
              <span className="sm:hidden">Plan</span>
            </Link>
          ) : null}
          <EventManageMenu
            event={event}
            size="sm"
            includeEditDetails
            iconOnly
          />
        </div>
      </div>
    </div>
  );
}
