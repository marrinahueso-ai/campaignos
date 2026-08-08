"use client";

import {
  EaseBtnSecondary,
  EaseSectionLabel,
  EaseSoftActions,
} from "@/components/events-phase3/EventDetailEaseUi";
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
  canManageAssignments,
  onManageAssignments,
  onInviteTeamMember,
}: {
  responsibilities: EventResponsibilityPerson[];
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
      })),
  );

  return (
    <section>
      <EaseSectionLabel hint="From Team Access + event assignments">
        Who owns what
      </EaseSectionLabel>

      {people.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No roles assigned yet.
        </p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {people.map((person) => (
            <div
              key={person.key}
              className="rounded-2xl bg-[rgba(255,252,247,0.65)] p-3.5"
            >
              <div className="mb-1 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                {person.role}
              </div>
              <strong className="text-sm font-bold text-cos-text">
                {person.name}
              </strong>
            </div>
          ))}
        </div>
      )}

      {canManageAssignments && (onManageAssignments || onInviteTeamMember) ? (
        <EaseSoftActions>
          {onInviteTeamMember ? (
            <EaseBtnSecondary onClick={onInviteTeamMember}>
              Invite team member
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
