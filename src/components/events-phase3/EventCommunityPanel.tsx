"use client";

import { useEffect, useRef } from "react";
import { EventDetailTeamEasePanel } from "@/components/events-phase3/EventDetailTeamEasePanel";
import { EventDetailVendorsEasePanel } from "@/components/events-phase3/EventDetailVendorsEasePanel";
import { ew, ewCard } from "@/components/events-phase3/event-workspace-tokens";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import type { EventVendorsData } from "@/types/vendors";
import { cn } from "@/lib/utils/cn";

type CommunitySection = "responsibilities" | "vendors";

type Props = {
  section: CommunitySection;
  responsibilities: EventResponsibilityPerson[];
  canManageAssignments: boolean;
  onManageAssignments?: () => void;
  eventId: string;
  vendorsData: EventVendorsData;
  vendorsReady: boolean;
};

export function EventCommunityPanel({
  section,
  responsibilities,
  canManageAssignments,
  onManageAssignments,
  eventId,
  vendorsData,
  vendorsReady,
}: Props) {
  const teamRef = useRef<HTMLDivElement | null>(null);
  const vendorsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = section === "vendors" ? vendorsRef.current : teamRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <section className="space-y-8">
      <div>
        <h2 className={cn("font-display text-2xl", ew.ink)}>Community</h2>
        <p className={cn("mt-1 text-sm", ew.inksoft)}>
          The people and partners helping bring this event together.
        </p>
      </div>

      <div
        ref={teamRef}
        id="event-community-team"
        data-testid="event-detail-tab-responsibilities"
        className={cn(
          ewCard,
          "p-6 sm:p-8",
          section === "responsibilities" && "ring-2 ring-[#c5a880]/35",
        )}
      >
        <div className="mb-4 flex items-center gap-2">
          <h3 className={cn("font-display text-xl", ew.ink)}>Team</h3>
          <span
            className={cn(
              "rounded-full bg-[#f4f0ea] px-2.5 py-0.5 text-[11px] font-semibold uppercase",
              ew.inksoft,
            )}
          >
            Internal
          </span>
        </div>
        <EventDetailTeamEasePanel
          responsibilities={responsibilities}
          canManageAssignments={canManageAssignments}
          onManageAssignments={onManageAssignments}
        />
      </div>

      <div
        ref={vendorsRef}
        id="event-community-vendors"
        data-testid="event-detail-tab-vendors"
        className={cn(
          ewCard,
          "p-6 sm:p-8",
          section === "vendors" && "ring-2 ring-[#c5a880]/35",
        )}
      >
        <div className="mb-4 flex items-center gap-2">
          <h3 className={cn("font-display text-xl", ew.ink)}>
            Vendors & Partners
          </h3>
          <span
            className={cn(
              "rounded-full bg-[#f4f0ea] px-2.5 py-0.5 text-[11px] font-semibold uppercase",
              ew.inksoft,
            )}
          >
            External
          </span>
        </div>
        {vendorsReady ? (
          <EventDetailVendorsEasePanel
            eventId={eventId}
            data={vendorsData}
            directoryHref="/vendors"
          />
        ) : (
          <div className="min-h-[8rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
        )}
      </div>

      <p className={cn("text-sm", ew.inksoft)}>
        This page preserves institutional memory. Future event leaders will see
        these contacts when this event is reused.
      </p>
    </section>
  );
}
