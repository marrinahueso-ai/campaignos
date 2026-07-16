"use client";

import { useState } from "react";
import { EventDetailShell } from "@/components/events-phase3/EventDetailShell";
import { EventManageAssignmentsModal } from "@/components/events-phase3/EventManageAssignmentsModal";
import type { EventApprovalFlowStep } from "@/components/events-phase3/EventDetailShell";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
import type { EventDetailWorkspacePanels } from "@/components/events-phase3/EventDetailShell";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import type { CommitteeAssignmentRole } from "@/lib/organization-workspace/roster-first";
import type { Event } from "@/types";

interface EventDetailPhase3ClientProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
  playbookName: string | null;
  responsibilities: EventResponsibilityPerson[];
  approvalFlow: EventApprovalFlowStep[];
  heroStats: EventDetailHeroStats;
  canManageAssignments: boolean;
  workspace?: EventDetailWorkspacePanels;
  initialTab?: string | null;
  committeeId: string | null;
  committeeName: string | null;
  members: Array<{
    id: string;
    name: string;
    assignedEventIds: string[];
  }>;
  currentAssignments: Array<{
    organizationMemberId: string;
    role: CommitteeAssignmentRole;
  }>;
}

export function EventDetailPhase3Client({
  event,
  artwork,
  playbookName,
  responsibilities,
  approvalFlow,
  heroStats,
  canManageAssignments,
  workspace = {},
  initialTab = null,
  committeeId,
  committeeName,
  members,
  currentAssignments,
}: EventDetailPhase3ClientProps) {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <EventDetailShell
        event={event}
        artwork={artwork}
        playbookName={playbookName}
        responsibilities={responsibilities}
        approvalFlow={approvalFlow}
        heroStats={heroStats}
        canManageAssignments={canManageAssignments}
        onManageAssignments={() => setManageOpen(true)}
        workspace={workspace}
        initialTab={initialTab}
      />
      {manageOpen ? (
        <EventManageAssignmentsModal
          eventId={event.id}
          committeeId={committeeId}
          committeeName={committeeName}
          members={members}
          currentAssignments={currentAssignments}
          onClose={() => setManageOpen(false)}
        />
      ) : null}
    </>
  );
}
