"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveRosterCommitteeAssignmentAction } from "@/lib/organization-workspace/actions";
import { replaceMemberEventAssignmentsAction } from "@/lib/auth/actions";
import type { CommitteeAssignmentRole } from "@/lib/organization-workspace/roster-first";

interface EventManageAssignmentsModalProps {
  eventId: string;
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
  onClose: () => void;
}

const ROLE_OPTIONS: { value: CommitteeAssignmentRole; label: string }[] = [
  { value: "supervising_vp", label: "Supervisor" },
  { value: "chair", label: "Event Lead" },
  { value: "co_chair", label: "Assistant Lead" },
  { value: "member", label: "Team Member" },
];

export function EventManageAssignmentsModal({
  eventId,
  committeeId,
  committeeName,
  members,
  currentAssignments,
  onClose,
}: EventManageAssignmentsModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [role, setRole] = useState<CommitteeAssignmentRole>("chair");

  const assignmentSummary = useMemo(() => {
    const byId = new Map(members.map((m) => [m.id, m.name]));
    return currentAssignments.map((row) => ({
      ...row,
      name: byId.get(row.organizationMemberId) ?? row.organizationMemberId,
    }));
  }, [currentAssignments, members]);

  function handleSave() {
    if (!memberId) {
      setError("Select a person.");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (committeeId) {
        const result = await saveRosterCommitteeAssignmentAction({
          organizationMemberId: memberId,
          committeeId,
          committeeRole: role,
        });
        if (!result.success) {
          setError(result.error ?? "Unable to save assignment.");
          return;
        }
      }

      const member = members.find((entry) => entry.id === memberId);
      const nextEventIds = Array.from(
        new Set([...(member?.assignedEventIds ?? []), eventId]),
      );
      const eventResult = await replaceMemberEventAssignmentsAction({
        organizationMemberId: memberId,
        eventIds: nextEventIds,
      });
      if (!eventResult.success) {
        setError(eventResult.error ?? "Unable to update event assignment.");
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-cos-border bg-white p-5 shadow-lg">
        <h2 className="font-display text-xl text-cos-text">
          Manage Assignments
        </h2>
        <p className="mt-1 text-sm text-cos-muted">
          {committeeId
            ? `Update roles on ${committeeName ?? "the linked committee"} for this event.`
            : "No committee is linked to this event yet. You can still attach people via event assignment as Team Members."}
        </p>

        {assignmentSummary.length > 0 ? (
          <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-sm text-cos-muted">
            {assignmentSummary.map((row) => (
              <li key={`${row.organizationMemberId}-${row.role}`}>
                {row.name} · {row.role}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-cos-muted">No committee roles yet.</p>
        )}

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-cos-muted">Person</span>
            <select
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-cos-border px-3 py-2"
            >
              {members.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          {committeeId ? (
            <label className="block text-sm">
              <span className="text-cos-muted">Responsibility</span>
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as CommitteeAssignmentRole)
                }
                className="mt-1 w-full rounded-lg border border-cos-border px-3 py-2"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
