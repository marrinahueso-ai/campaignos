import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { CampaignProgressStrip } from "@/components/campaign-progress/CampaignProgressStrip";
import { EditEventDetailsButton } from "@/components/event-workspace/EditEventDetailsButton";
import {
  EventArchivedBanner,
  EventManageMenu,
} from "@/components/event-workspace/EventManageMenu";
import { EventHeroArtwork } from "@/components/event-workspace/EventHeroArtwork";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Button } from "@/components/ui/Button";
import type { CampaignProgressSnapshot } from "@/lib/campaign-progress/types";
import { isArchivedEvent } from "@/lib/events/event-status";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { EventNextStep } from "@/lib/event-workspace/get-next-helpful-action";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";

interface EventWorkspaceHeroProps {
  event: Event;
  nextStep: EventNextStep;
  artwork: HeroArtworkSelection | null;
  /** When true, hide the next-step callout — campaign progress covers that. */
  compact?: boolean;
  /** When set, progress is shown inline in the same hero card. */
  campaignProgress?: CampaignProgressSnapshot;
}

export function EventWorkspaceHero({
  event,
  nextStep,
  artwork,
  compact = false,
  campaignProgress,
}: EventWorkspaceHeroProps) {
  const showArtwork = hasDisplayableArtwork(artwork);
  const archived = isArchivedEvent(event);
  const formattedTime = formatEventTime(event.time);
  const isUnified = Boolean(campaignProgress);

  return (
    <div className="overflow-hidden rounded-3xl bg-cos-card shadow-sm">
      {archived && (
        <div className="px-5 pt-5 lg:px-6">
          <EventArchivedBanner />
        </div>
      )}

      <div className={isUnified ? "p-5 lg:p-6" : "p-6 lg:p-8"}>
        <div
          className={
            showArtwork
              ? isUnified
                ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-6"
                : "grid gap-8 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] lg:items-start"
              : undefined
          }
        >
          <div className={isUnified ? "min-w-0 space-y-3" : "space-y-4"}>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className={
                  isUnified
                    ? "font-display text-2xl tracking-tight text-cos-text sm:text-3xl"
                    : "text-3xl font-semibold tracking-tight text-cos-text sm:text-4xl"
                }
              >
                {event.title}
              </h1>
              <EventStatusBadge status={event.status} />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cos-muted sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {formatEventDate(event.date)}
              </span>
              {formattedTime && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {formattedTime}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {event.location}
                </span>
              )}
              {!isUnified && event.audience && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 shrink-0" />
                  {event.audience}
                </span>
              )}
            </div>

            {event.description && (
              <p
                className={
                  isUnified
                    ? "line-clamp-2 max-w-2xl text-sm leading-relaxed text-cos-text/85"
                    : "max-w-2xl text-sm leading-relaxed text-cos-text/85"
                }
              >
                {event.description}
              </p>
            )}

            {!compact && !isUnified && (
              <>
                <p className="max-w-xl text-lg leading-relaxed text-cos-text/90">
                  {nextStep.action}
                </p>

                {nextStep.dueMessage && (
                  <p className="text-sm text-cos-muted">{nextStep.dueMessage}</p>
                )}
              </>
            )}

            <div className={`flex flex-wrap gap-2 ${isUnified ? "" : "pt-2"}`}>
              <EditEventDetailsButton event={event} />
              <EventManageMenu event={event} />
              <Button href="/events" variant="secondary" size="sm">
                Back to Campaigns
              </Button>
            </div>
          </div>

          {showArtwork && (
            <EventHeroArtwork
              artwork={artwork}
              eventTitle={event.title}
              compact={isUnified}
            />
          )}
        </div>
      </div>

      {campaignProgress && <CampaignProgressStrip progress={campaignProgress} />}
    </div>
  );
}
