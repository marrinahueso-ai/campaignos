"use client";

import { useState, useTransition } from "react";
import { EventDetailShell } from "@/components/events-phase3/EventDetailShell";
import { EventManageAssignmentsModal } from "@/components/events-phase3/EventManageAssignmentsModal";
import type { EventApprovalFlowStep } from "@/components/events-phase3/EventDetailShell";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
import type { EventDetailWorkspacePanels } from "@/components/events-phase3/EventDetailShell";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import { loadEventManageAssignmentsAction } from "@/lib/events-phase3/actions";
import type { CommitteeAssignmentRole } from "@/lib/organization-workspace/roster-first";
import type { Event } from "@/types";

type ManageMember = {
  id: string;
  name: string;
  assignedEventIds: string[];
};

type ManageAssignment = {
  organizationMemberId: string;
  role: CommitteeAssignmentRole;
};

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
  showYoureSet?: boolean;
  committeeId: string | null;
  committeeName: string | null;
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
  showYoureSet = false,
  committeeId,
  committeeName,
}: EventDetailPhase3ClientProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [members, setMembers] = useState<ManageMember[] | null>(null);
  const [liveAssignments, setLiveAssignments] = useState<ManageAssignment[]>(
    [],
  );
  const [liveCommitteeId, setLiveCommitteeId] = useState(committeeId);
  const [liveCommitteeName, setLiveCommitteeName] = useState(committeeName);
  const [loadError, setLoadError] = useState<string | null>(null);

  function openManageAssignments() {
    setManageOpen(true);
    setLoadError(null);
    if (members) {
      return;
    }
    startTransition(async () => {
      const result = await loadEventManageAssignmentsAction(event.id);
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      setMembers(result.members);
      setLiveAssignments(result.currentAssignments);
      setLiveCommitteeId(result.committeeId);
      setLiveCommitteeName(result.committeeName);
    });
  }

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
        onManageAssignments={openManageAssignments}
        workspace={workspace}
        initialTab={initialTab}
        showYoureSet={showYoureSet}
      />
      {manageOpen ? (
        members ? (
          <EventManageAssignmentsModal
            eventId={event.id}
            committeeId={liveCommitteeId}
            committeeName={liveCommitteeName}
            members={members}
            currentAssignments={liveAssignments}
            onClose={() => setManageOpen(false)}
          />
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl border border-cos-border bg-white p-5 shadow-lg">
              <h2 className="font-display text-xl text-cos-text">
                Manage Assignments
              </h2>
              <p className="mt-3 text-sm text-cos-muted">
                {loadError ??
                  (pending ? "Loading team roster…" : "Loading team roster…")}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-cos-border px-3 py-2 text-sm font-semibold text-cos-text"
                  onClick={() => setManageOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      ) : null}
    </>
  );
}
