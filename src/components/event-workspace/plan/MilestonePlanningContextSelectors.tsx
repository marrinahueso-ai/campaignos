"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  formatVpRoleLabel,
  withCommitteePersonOption,
  type MilestonePlanningVpRoleOption,
} from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import { buildEventDetailsFormState } from "@/lib/event-workspace/event-form-utils";
import { updateEventDetailsAction } from "@/lib/event-workspace/actions";
import { assignPlaybookToEventAction } from "@/lib/playbooks/actions";
import type { Event } from "@/types";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface MilestonePlanningContextSelectorsProps {
  event: Event;
  playbookId: string;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
}

const selectClassName =
  "h-9 w-full appearance-none border border-cos-border bg-cos-card px-3 pr-8 text-xs text-cos-text focus:outline-none focus:ring-2 focus:ring-cos-text/10 disabled:cursor-not-allowed disabled:opacity-50";

const labelClassName =
  "mb-1.5 block text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-cos-muted";

function PlanningSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 sm:max-w-[15rem]">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={selectClassName}
        >
          {children}
        </select>
      </div>
    </div>
  );
}

export function MilestonePlanningContextSelectors({
  event,
  playbookId,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
}: MilestonePlanningContextSelectorsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedVpRoleId, setSelectedVpRoleId] = useState(defaultVpRoleId);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(playbookId);
  const [selectedCommitteePerson, setSelectedCommitteePerson] = useState(
    defaultCommitteePerson,
  );

  const committeeOptions = withCommitteePersonOption(
    committeePersonOptions,
    selectedCommitteePerson,
  );

  function handlePlaybookChange(nextPlaybookId: string) {
    if (nextPlaybookId === selectedPlaybookId) {
      return;
    }

    setError(null);
    setSelectedPlaybookId(nextPlaybookId);
    startTransition(async () => {
      const result = await assignPlaybookToEventAction(event.id, nextPlaybookId);
      if (!result.success) {
        setSelectedPlaybookId(playbookId);
        setError(result.error ?? "Unable to update playbook.");
        return;
      }
      router.refresh();
    });
  }

  function handleCommitteePersonChange(nextPerson: string) {
    if (nextPerson === selectedCommitteePerson) {
      return;
    }

    setError(null);
    setSelectedCommitteePerson(nextPerson);
    startTransition(async () => {
      const form = buildEventDetailsFormState(event);
      const result = await updateEventDetailsAction(event.id, {
        ...form,
        eventOwner: nextPerson || null,
      });

      if (!result.success) {
        setSelectedCommitteePerson(defaultCommitteePerson);
        setError(result.error ?? "Unable to save committee person.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-row flex-wrap items-end gap-3 sm:gap-4">
        <PlanningSelect
          id="milestone-planning-vp"
          label="VP"
          value={selectedVpRoleId}
          onChange={setSelectedVpRoleId}
          disabled={vpRoles.length === 0}
        >
          {vpRoles.length === 0 ? (
            <option value="">No VP roles configured</option>
          ) : (
            vpRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {formatVpRoleLabel(role)}
              </option>
            ))
          )}
        </PlanningSelect>

        <PlanningSelect
          id="milestone-planning-playbook"
          label="Playbook"
          value={selectedPlaybookId}
          onChange={handlePlaybookChange}
          disabled={isPending || availablePlaybooks.length === 0}
        >
          {availablePlaybooks.length === 0 ? (
            <option value={playbookId}>Default playbook</option>
          ) : (
            availablePlaybooks.map((playbook) => (
              <option key={playbook.id} value={playbook.id}>
                {playbook.name}
              </option>
            ))
          )}
        </PlanningSelect>

        <PlanningSelect
          id="milestone-planning-committee-person"
          label="Committee Person"
          value={selectedCommitteePerson}
          onChange={handleCommitteePersonChange}
          disabled={isPending || committeeOptions.length === 0}
        >
          {committeeOptions.length === 0 ? (
            <option value="">No committee chairs yet</option>
          ) : (
            committeeOptions.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))
          )}
        </PlanningSelect>
      </div>

      {error && (
        <p className="text-xs text-cos-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
