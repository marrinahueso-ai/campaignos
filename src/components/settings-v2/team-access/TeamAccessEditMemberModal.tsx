"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import { updateTeamMemberAction } from "@/lib/auth/actions";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { OrganizationCommittee, OrganizationRole } from "@/types/organization-workspace";

interface TeamAccessEditMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: UnifiedTeamMember | null;
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
}

export function TeamAccessEditMemberModal({
  open,
  onClose,
  member,
  roles,
}: TeamAccessEditMemberModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!member || member.isRosterOnly) {
    return null;
  }

  const memberId = member.raw!.id;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const organizationRoleId = (formData.get("organizationRoleId") as string) || null;
    const campaignRole = formData.get("campaignRole") as CampaignRole;
    const status = formData.get("status") as "active" | "deactivated";

    startTransition(async () => {
      const result = await updateTeamMemberAction(memberId, {
        organizationRoleId: organizationRoleId || null,
        campaignRole,
        status,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
      onClose();
    });
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title="Edit member"
      subtitle={member.displayName}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-member-form" disabled={isPending}>
            Save changes
          </Button>
        </div>
      }
    >
      <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={member.displayName}
          readOnly
          disabled
        />
        <Input label="Email address" value={member.email} readOnly disabled />
        <Select
          name="organizationRoleId"
          label="Role"
          defaultValue={member.organizationRoleId ?? ""}
        >
          <option value="">No org role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        <Select
          name="campaignRole"
          label="Access level"
          defaultValue={member.accessLevel}
        >
          {CAMPAIGN_ROLES.map((role) => (
            <option key={role} value={role}>
              {campaignRoleLabel(role as CampaignRole)}
            </option>
          ))}
        </Select>
        <Select name="status" label="Status" defaultValue={member.status === "deactivated" ? "deactivated" : "active"}>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </Select>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </TeamAccessModal>
  );
}
