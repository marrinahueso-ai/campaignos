"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";
import { resolveAccessTemplateSelection } from "@/lib/access-templates/merge";
import type { AccessTemplate } from "@/lib/access-templates/types";
import { createRosterPersonAction } from "@/lib/organization-workspace/actions";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";

interface EventOption {
  id: string;
  title: string;
}

interface TeamAccessAddRosterPersonModalProps {
  open: boolean;
  onClose: () => void;
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  events?: EventOption[];
  accessTemplates?: AccessTemplate[];
  accessLabels?: Partial<Record<string, string>> | null;
}

export function TeamAccessAddRosterPersonModal({
  open,
  onClose,
  events = [],
  accessTemplates = [],
  accessLabels = null,
}: TeamAccessAddRosterPersonModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  function handleClose() {
    setError(null);
    setSelectedEventIds([]);
    onClose();
  }

  function toggleEvent(eventId: string) {
    setSelectedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
  }

  const roleOptions =
    accessTemplates.length > 0
      ? accessTemplates.map((template) => ({
          id: template.id,
          label: template.displayName,
        }))
      : CAMPAIGN_ROLES.map((role) => ({
          id: role,
          label: accessLabels?.[role] ?? campaignRoleLabel(role),
        }));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name")?.toString()?.trim() ?? "";
    const email = formData.get("email")?.toString()?.trim() || null;
    const phone = formData.get("phone")?.toString()?.trim() || null;
    const roleRaw = formData.get("accessRole")?.toString() ?? "contributor";
    const selection =
      resolveAccessTemplateSelection(accessTemplates, roleRaw) ??
      (isCampaignRole(roleRaw)
        ? { templateId: roleRaw, campaignRole: roleRaw }
        : { templateId: "contributor", campaignRole: "contributor" as CampaignRole });

    startTransition(async () => {
      const result = await createRosterPersonAction({
        name,
        email,
        phone,
        organizationRoleId: null,
        committeeId: null,
        committeeRole: null,
        eventIds: selectedEventIds,
        campaignRole: selection.campaignRole,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
      handleClose();
    });
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={handleClose}
      title="Add person"
      subtitle="Add someone to People. Role comes from Access templates."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-roster-person-form" disabled={isPending}>
            {isPending ? "Saving…" : "Add person"}
          </Button>
        </div>
      }
    >
      <form id="add-roster-person-form" onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Full name" placeholder="Jamie Smith" required />
        <Input
          name="email"
          label="Email (optional)"
          type="email"
          placeholder="name@schoolpto.org"
        />
        <Input
          name="phone"
          label="Phone (optional)"
          type="tel"
          placeholder="(555) 555-5555"
        />
        <div className="space-y-1.5">
          <Select name="accessRole" label="Role" defaultValue="contributor">
            {roleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-cos-muted">
            From Access templates. Applied when they are invited to log in.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Assigned events (optional)
          </legend>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-cos-border bg-cos-card p-3">
            {events.length === 0 ? (
              <p className="text-sm text-cos-muted">No events available yet.</p>
            ) : (
              events.map((eventItem) => (
                <label
                  key={eventItem.id}
                  className="flex items-center gap-2 text-sm text-cos-text"
                >
                  <input
                    type="checkbox"
                    checked={selectedEventIds.includes(eventItem.id)}
                    onChange={() => toggleEvent(eventItem.id)}
                    className="rounded border-cos-border"
                  />
                  {eventItem.title}
                </label>
              ))
            )}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </TeamAccessModal>
  );
}
