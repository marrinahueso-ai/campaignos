"use client";

import Link from "next/link";
import { CalendarDays, User } from "lucide-react";
import { CampaignStatusPill } from "@/components/campaigns/CampaignStatusPill";
import { CampaignThumbnail } from "@/components/campaigns/CampaignThumbnail";
import {
  getCampaignDisplayStatus,
  getCampaignTypeLabel,
  getEventOwnerName,
} from "@/lib/events/campaign-page-filters";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { formatEventDate } from "@/lib/utils/dates";
import type { Event } from "@/types";

interface CampaignDraftsSectionProps {
  events: Event[];
  today: string;
  artworkByEventId: Map<string, HeroArtworkSelection | null>;
  ownershipByEventId?: Map<string, EventRosterOwnership>;
  metaScheduledEventIds?: Set<string>;
}

export function CampaignDraftsSection({
  events,
  today,
  artworkByEventId,
  ownershipByEventId,
  metaScheduledEventIds,
}: CampaignDraftsSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-cos-text">Drafts &amp; planning</h2>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {events.map((event) => {
          const ownership = ownershipByEventId?.get(event.id);
          const metaScheduled = metaScheduledEventIds?.has(event.id) ?? false;
          const displayStatus = getCampaignDisplayStatus(event, {
            metaScheduled,
            ownership,
            today,
          });
          const ownerName = getEventOwnerName(event, ownership);

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="flex min-w-[17rem] max-w-[17rem] shrink-0 gap-3 border border-cos-border bg-cos-card p-3 transition-colors hover:border-cos-accent/50 hover:bg-cos-bg/30"
            >
              <CampaignThumbnail
                artwork={artworkByEventId.get(event.id) ?? null}
                title={event.title}
              />

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-cos-text">
                  {event.title}
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-cos-muted">
                  <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {formatEventDate(event.date)}
                </span>
                <span className="mt-2 inline-flex w-fit rounded-full bg-cos-bg px-2 py-0.5 text-[10px] font-medium text-cos-muted">
                  {getCampaignTypeLabel(event.communicationStrategy)}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-cos-muted">
                  <User className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{ownerName}</span>
                </span>
                <span className="mt-auto flex justify-end pt-2">
                  <CampaignStatusPill status={displayStatus} />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
