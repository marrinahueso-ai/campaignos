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
import { cn } from "@/lib/utils/cn";
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
  layout?: "inline" | "stacked";
  committeeLabel?: string;
  idPrefix?: string;
  className?: string;
}

export const milestonePlanningSelectClassName =
  "h-9 w-full appearance-none border border-cos-border bg-cos-card px-3 pr-8 text-xs text-cos-text focus:outline-none focus:ring-2 focus:ring-cos-text/10 disabled:cursor-not-allowed disabled:opacity-50";

export const milestonePlanningLabelClassName =
  "mb-1.5 block text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-cos-muted";

export function MilestonePlanningSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
  fullWidth = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("min-w-0", fullWidth ? "w-full" : "flex-1 sm:max-w-[15rem]")}>
      <label htmlFor={id} className={milestonePlanningLabelClassName}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={milestonePlanningSelectClassName}
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
  layout = "inline",
  committeeLabel = "Committee Person",
  idPrefix = "milestone-planning",
  className,
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

  const vpSelect = (
    <MilestonePlanningSelect
      id={`${idPrefix}-vp`}
      label="VP"
      value={selectedVpRoleId}
      onChange={setSelectedVpRoleId}
      disabled={vpRoles.length === 0}
      fullWidth={layout === "stacked"}
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
    </MilestonePlanningSelect>
  );

  const committeeSelect = (
    <MilestonePlanningSelect
      id={`${idPrefix}-committee-person`}
      label={committeeLabel}
      value={selectedCommitteePerson}
      onChange={handleCommitteePersonChange}
      disabled={isPending || committeeOptions.length === 0}
      fullWidth={layout === "stacked"}
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
    </MilestonePlanningSelect>
  );

  const playbookSelect = (
    <MilestonePlanningSelect
      id={`${idPrefix}-playbook`}
      label="Playbook"
      value={selectedPlaybookId}
      onChange={handlePlaybookChange}
      disabled={isPending || availablePlaybooks.length === 0}
      fullWidth={layout === "stacked"}
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
    </MilestonePlanningSelect>
  );

  return (
    <div className={cn(layout === "inline" ? "mt-4 space-y-2" : "space-y-3", className)}>
      <div
        className={cn(
          layout === "stacked"
            ? "flex flex-col gap-3"
            : "flex flex-row flex-wrap items-end gap-3 sm:gap-4",
        )}
      >
        {vpSelect}
        {layout === "stacked" ? committeeSelect : playbookSelect}
        {layout === "stacked" ? playbookSelect : committeeSelect}
      </div>

      {error && (
        <p className="text-xs text-cos-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
