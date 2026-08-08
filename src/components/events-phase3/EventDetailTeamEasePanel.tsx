"use client";

import {
  EaseBtnSecondary,
  EaseSectionLabel,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
import type { EventInviteCollaboratorPreview } from "@/lib/events-phase3/invite-event-member";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";

const ROLE_ORDER = [
  "Event Lead",
  "Supervisor",
  "Final Approval",
  "Publisher",
  "Assistant Lead",
  "Team Member",
] as const;

export function EventDetailTeamEasePanel({
  responsibilities,
  inviteCollaborators = [],
  canManageAssignments,
  onManageAssignments,
  onInviteTeamMember,
}: {
  responsibilities: EventResponsibilityPerson[];
  /** Local invite/add previews until server responsibilities refresh. */
  inviteCollaborators?: EventInviteCollaboratorPreview[];
  canManageAssignments: boolean;
  onManageAssignments?: () => void;
  onInviteTeamMember?: () => void;
}) {
  const people = ROLE_ORDER.flatMap((label) =>
    responsibilities
      .filter(
        (row) =>
          row.responsibility === label && Boolean(row.displayName?.trim()),
      )
      .map((row) => ({
        key: `${row.responsibility}-${row.memberId}`,
        role: row.responsibility,
        name: row.displayName.trim(),
        pending: false as boolean,
      })),
  );

  const existingNames = new Set(people.map((person) => person.name.toLowerCase()));
  const inviteRows = inviteCollaborators
    .filter((row) => !existingNames.has(row.displayName.trim().toLowerCase()))
    .map((row) => ({
      key: row.id,
      role: row.roleLabel,
      name: row.displayName.trim(),
      pending: row.status === "pending",
    }));

  const rows = [...people, ...inviteRows];

  return (
    <section>
      <EaseSectionLabel hint="From Team Access + event assignments">
        Who owns what
      </EaseSectionLabel>

      {rows.length === 0 ? (
        <p className="text-sm text-cos-muted">No roles assigned yet.</p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {rows.map((person) => (
            <div
              key={person.key}
              className="rounded-2xl bg-[rgba(255,252,247,0.65)] p-3.5"
              data-testid={
                person.pending
                  ? "event-team-invite-pending"
                  : "event-team-collaborator"
              }
            >
              <div className="mb-1 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                {person.role}
              </div>
              <strong className="text-sm font-bold text-cos-text">
                {person.name}
              </strong>
              {person.pending ? (
                <p className="mt-1 text-[11px] text-[#5e6b65]">
                  <span className="font-medium italic text-[#c5a880]">
                    Invite pending
                  </span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canManageAssignments && (onManageAssignments || onInviteTeamMember) ? (
        <EaseSoftActions>
          {onInviteTeamMember ? (
            <EaseBtnSecondary onClick={onInviteTeamMember}>
              + Invite team member
            </EaseBtnSecondary>
          ) : null}
          {onManageAssignments ? (
            <EaseBtnSecondary onClick={onManageAssignments}>
              Manage assignments
            </EaseBtnSecondary>
          ) : null}
        </EaseSoftActions>
      ) : null}
    </section>
  );
}
