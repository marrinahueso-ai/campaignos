"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { EventDetailShell } from "@/components/events-phase3/EventDetailShell";
import { EventManageAssignmentsModal } from "@/components/events-phase3/EventManageAssignmentsModal";
import { InviteEventMemberDrawer } from "@/components/events-phase3/InviteEventMemberDrawer";
import type { EventApprovalFlowStep } from "@/components/events-phase3/EventDetailShell";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
import type { EventDetailWorkspacePanels } from "@/components/events-phase3/EventDetailShell";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import { loadEventManageAssignmentsAction } from "@/lib/events-phase3/actions";
import type {
  EventInviteCollaboratorPreview,
  InviteEventMemberAddedResult,
} from "@/lib/events-phase3/invite-event-member";
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
  /** RSC Suspense slot — streams Approvals after shell/hero paint. */
  approvalsSlot?: ReactNode;
  initialTab?: string | null;
  showYoureSet?: boolean;
  committeeId: string | null;
  committeeName: string | null;
  navigationMode?: "event-detail" | "events-home";
  onSyncTabUrl?: (
    tab: import("@/components/events-phase3/EventDetailShell").EventDetailTab,
  ) => void;
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
  approvalsSlot,
  initialTab = null,
  showYoureSet = false,
  committeeId,
  committeeName,
  navigationMode = "event-detail",
  onSyncTabUrl,
}: EventDetailPhase3ClientProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCollaborators, setInviteCollaborators] = useState<
    EventInviteCollaboratorPreview[]
  >([]);
  const [pending, startTransition] = useTransition();
  const [members, setMembers] = useState<ManageMember[] | null>(null);
  const [liveAssignments, setLiveAssignments] = useState<ManageAssignment[]>(
    [],
  );
  const [liveCommitteeId, setLiveCommitteeId] = useState(committeeId);
  const [liveCommitteeName, setLiveCommitteeName] = useState(committeeName);
  const [loadError, setLoadError] = useState<string | null>(null);
  const eventIdRef = useRef(event.id);
  eventIdRef.current = event.id;

  // Drop roster/modal state when navigating School A → School B (same client tree).
  useEffect(() => {
    setManageOpen(false);
    setInviteOpen(false);
    setInviteCollaborators([]);
    setMembers(null);
    setLiveAssignments([]);
    setLiveCommitteeId(committeeId);
    setLiveCommitteeName(committeeName);
    setLoadError(null);
  }, [event.id, committeeId, committeeName]);

  // Drop local active invite previews once server responsibilities include the same names.
  useEffect(() => {
    const names = new Set(
      responsibilities
        .map((row) => row.displayName?.trim().toLowerCase())
        .filter(Boolean),
    );
    setInviteCollaborators((current) => {
      if (current.length === 0) return current;
      const next = current.filter(
        (row) =>
          row.status === "pending" ||
          !names.has(row.displayName.trim().toLowerCase()),
      );
      return next.length === current.length ? current : next;
    });
  }, [responsibilities]);

  function openManageAssignments() {
    setManageOpen(true);
    setLoadError(null);
    if (members) {
      return;
    }
    const requestEventId = event.id;
    startTransition(async () => {
      const result = await loadEventManageAssignmentsAction(requestEventId);
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      // Ignore stale responses after an event switch.
      if (requestEventId !== eventIdRef.current) {
        return;
      }
      setMembers(result.members);
      setLiveAssignments(result.currentAssignments);
      setLiveCommitteeId(result.committeeId);
      setLiveCommitteeName(result.committeeName);
    });
  }

  function handleMemberAdded(result: InviteEventMemberAddedResult) {
    const preview: EventInviteCollaboratorPreview = {
      id: `${result.kind}-${result.email ?? result.displayName}-${Date.now()}`,
      displayName: result.displayName,
      roleLabel: result.roleLabel,
      status: result.kind === "invited" ? "pending" : "active",
    };
    setInviteCollaborators((current) => {
      const withoutDup = current.filter(
        (row) =>
          row.displayName.trim().toLowerCase() !==
          preview.displayName.trim().toLowerCase(),
      );
      return [preview, ...withoutDup];
    });
  }

  return (
    <>
      <EventDetailShell
        key={event.id}
        event={event}
        artwork={artwork}
        playbookName={playbookName}
        responsibilities={responsibilities}
        approvalFlow={approvalFlow}
        heroStats={heroStats}
        canManageAssignments={canManageAssignments}
        onManageAssignments={openManageAssignments}
        onInviteTeamMember={
          canManageAssignments ? () => setInviteOpen(true) : undefined
        }
        inviteCollaborators={inviteCollaborators}
        workspace={workspace}
        approvalsSlot={approvalsSlot}
        initialTab={initialTab}
        showYoureSet={showYoureSet}
        navigationMode={navigationMode}
        onSyncTabUrl={onSyncTabUrl}
      />
      {canManageAssignments ? (
        <InviteEventMemberDrawer
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          event={{
            id: event.id,
            title: event.title,
            date: event.date,
            imageUrl: artwork?.imageUrl ?? null,
          }}
          onMemberAdded={handleMemberAdded}
        />
      ) : null}
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
