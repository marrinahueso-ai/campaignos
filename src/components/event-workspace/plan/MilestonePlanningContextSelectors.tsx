"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  formatVpRoleLabel,
  withCommitteePersonOption,
  type MilestonePlanningVpRoleOption,
} from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import { buildEventDetailsFormState } from "@/lib/event-workspace/event-form-utils";
import { updateEventDetailsAction } from "@/lib/event-workspace/actions";
import { updateEventCampaignSettingsAction } from "@/lib/events/actions";
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

export const milestonePlanningInlineSelectClassName =
  "h-8 w-full min-w-0 appearance-none border-0 bg-transparent px-0 pr-6 text-xs text-cos-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

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
  variant = "default",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
  variant?: "default" | "inline";
}) {
  const isInline = variant === "inline";

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
          className={isInline ? milestonePlanningInlineSelectClassName : milestonePlanningSelectClassName}
        >
          {children}
        </select>
        {isInline && (
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-0 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
        )}
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

  useEffect(() => {
    setSelectedVpRoleId(defaultVpRoleId);
  }, [defaultVpRoleId]);

  useEffect(() => {
    setSelectedPlaybookId(playbookId);
  }, [playbookId]);

  useEffect(() => {
    setSelectedCommitteePerson(defaultCommitteePerson);
  }, [defaultCommitteePerson]);

  const committeeOptions = withCommitteePersonOption(
    committeePersonOptions,
    selectedCommitteePerson,
  );

  function handleVpRoleChange(nextVpRoleId: string) {
    if (nextVpRoleId === selectedVpRoleId) {
      return;
    }

    setError(null);
    setSelectedVpRoleId(nextVpRoleId);
    startTransition(async () => {
      const result = await updateEventCampaignSettingsAction(event.id, {
        approvalOrganizationRoleId: nextVpRoleId || null,
      });

      if (!result.success) {
        setSelectedVpRoleId(defaultVpRoleId);
        setError(result.error ?? "Unable to save VP role.");
        return;
      }

      router.refresh();
    });
  }

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
      onChange={handleVpRoleChange}
      disabled={isPending || vpRoles.length === 0}
      fullWidth={layout === "stacked"}
      variant={layout === "inline" ? "inline" : "default"}
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
      variant={layout === "inline" ? "inline" : "default"}
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
      variant={layout === "inline" ? "inline" : "default"}
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
    <div className={cn(layout === "inline" ? "space-y-2" : "space-y-3", className)}>
      <div
        className={cn(
          layout === "stacked"
            ? "flex flex-col gap-3"
            : "flex flex-row flex-wrap items-end gap-4 sm:gap-6",
        )}
      >
        {vpSelect}
        {committeeSelect}
        {playbookSelect}
      </div>

      {error && (
        <p className="text-xs text-cos-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
