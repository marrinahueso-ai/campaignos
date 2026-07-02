"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { updateEventCampaignSettingsAction } from "@/lib/events/actions";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { DEFAULT_EVENT_TYPE, EVENT_TYPES } from "@/lib/playbooks/constants";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

export interface ApprovalRoleOption {
  id: string;
  name: string;
  contactName: string | null;
}

interface CampaignCommunicationPlanSettingsProps {
  eventId: string;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  approvalOrganizationRoleId: string | null;
  defaultApprovalRoleId: string | null;
  approvalRoles: ApprovalRoleOption[];
  ownership: EventRosterOwnership;
}

const PLAN_OPTIONS = COMMUNICATION_STRATEGY_OPTIONS.filter(
  (option) => option.value !== "custom",
);

function formatRoleLabel(role: ApprovalRoleOption): string {
  if (role.contactName?.trim()) {
    return `${role.name} · ${role.contactName.trim()}`;
  }

  return role.name;
}

export function CampaignCommunicationPlanSettings({
  eventId,
  eventType,
  communicationStrategy,
  approvalOrganizationRoleId,
  defaultApprovalRoleId,
  approvalRoles,
  ownership,
}: CampaignCommunicationPlanSettingsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resolvedApprovalRoleId =
    approvalOrganizationRoleId ?? defaultApprovalRoleId ?? "";

  function save(
    patch: Parameters<typeof updateEventCampaignSettingsAction>[1],
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateEventCampaignSettingsAction(eventId, patch);
      if (!result.success) {
        setError(result.error ?? "Unable to save.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Event type"
          value={eventType ?? DEFAULT_EVENT_TYPE}
          onChange={(changeEvent) =>
            save({ eventType: changeEvent.target.value as EventType })
          }
          disabled={isPending}
        >
          {EVENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          label="Communication plan"
          value={communicationStrategy}
          onChange={(changeEvent) =>
            save({
              communicationStrategy: changeEvent.target.value as CommunicationStrategy,
            })
          }
          disabled={isPending}
        >
          {PLAN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Select
          label="Approval person"
          value={resolvedApprovalRoleId}
          onChange={(changeEvent) =>
            save({
              approvalOrganizationRoleId: changeEvent.target.value || null,
            })
          }
          disabled={isPending || approvalRoles.length === 0}
        >
          {approvalRoles.length === 0 ? (
            <option value="">Set up roles in School Setup</option>
          ) : (
            approvalRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {formatRoleLabel(role)}
              </option>
            ))
          )}
        </Select>
        <p className="text-xs text-cos-muted">
          Who reviews drafts before publishing for this campaign.
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-xl border border-cos-border bg-cos-bg/50 px-4 py-3">
        <p className="inline-flex min-w-0 items-start gap-2 text-sm text-cos-text">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
          <span>
            <span className="font-medium text-cos-muted">Chair · </span>
            {ownership.chairNames.length > 0 ? (
              ownership.chairNames.join(", ")
            ) : ownership.committeeName ? (
              <span className="text-cos-muted">{ownership.committeeName}</span>
            ) : (
              <span className="text-cos-muted">No committee matched yet</span>
            )}
          </span>
        </p>
        <Badge variant={ownership.committeeFilled ? "success" : "warning"}>
          {ownership.committeeFilled ? "Filled" : "Open"}
        </Badge>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
