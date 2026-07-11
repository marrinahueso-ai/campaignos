"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  resolveMemberEditContext,
  updateCommitteeChairNames,
} from "@/components/settings-v2/team-access/member-edit-utils";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import {
  setRosterMemberAccessLevelAction,
  setTeamMemberAccessLevelAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import {
  createOrganizationMemberAction,
  updateOrganizationCommitteeAction,
  updateOrganizationMemberAction,
  updateOrganizationRoleAction,
} from "@/lib/organization-workspace/actions";
import type {
  OrganizationCommittee,
  OrganizationRole,
  OrganizationWorkspaceData,
} from "@/types/organization-workspace";

interface TeamAccessEditMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: UnifiedTeamMember | null;
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  workspace: OrganizationWorkspaceData;
}

export function TeamAccessEditMemberModal({
  open,
  onClose,
  member,
  roles,
  committees,
  workspace,
}: TeamAccessEditMemberModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editContext = useMemo(
    () => (member ? resolveMemberEditContext(member, workspace) : null),
    [member, workspace],
  );

  if (!member || !editContext) {
    return null;
  }

  const canSave =
    editContext.source.kind !== "org_member" || Boolean(editContext.source.memberId);

  if (!canSave) {
    return null;
  }

  const activeMember = member;
  const activeEditContext = editContext;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fullName = formData.get("fullName")?.toString()?.trim() ?? activeMember.displayName;
    const email = formData.get("email")?.toString()?.trim() ?? activeMember.email;
    const phone = formData.get("phone")?.toString()?.trim() || null;
    const organizationRoleId = (formData.get("organizationRoleId") as string) || null;
    const campaignRole = formData.get("campaignRole") as CampaignRole;
    const status = formData.get("status") as "active" | "deactivated" | "archived";
    const committeeId = (formData.get("committeeId") as string) || null;
    const committeeRole =
      (formData.get("committeeRole") as "chair" | "co_chair" | "member") || "member";
    const notes = formData.get("notes")?.toString()?.trim() || null;

    startTransition(async () => {
      const { source } = activeEditContext;

      if (source.kind === "org_user") {
        const result = await updateTeamMemberAction(source.membershipId, {
          organizationRoleId: organizationRoleId || null,
          campaignRole,
          status: status === "deactivated" ? "deactivated" : "active",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      if (
        activeEditContext.canEditAccess &&
        !activeMember.raw &&
        source.kind !== "org_user"
      ) {
        const accessResult = email
          ? await setTeamMemberAccessLevelAction({
              email,
              organizationRoleId: organizationRoleId || activeMember.organizationRoleId,
              campaignRole,
            })
          : await setRosterMemberAccessLevelAction({
              source,
              campaignRole,
            });
        if (accessResult.error) {
          setError(accessResult.error);
          return;
        }
      }

      if (source.kind === "org_role") {
        const result = await updateOrganizationRoleAction(source.roleId, {
          contactName: fullName,
          contactEmail: email || null,
          contactPhone: phone,
          description: notes,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      if (source.kind === "org_member") {
        const result = await updateOrganizationMemberAction(source.memberId, {
          name: fullName,
          email: email || activeMember.email,
          organizationRoleId: organizationRoleId || null,
          active: status !== "archived" && status !== "deactivated",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      if (source.kind === "committee") {
        const committee = committees.find((entry) => entry.id === source.committeeId);
        if (!committee) {
          setError("Committee not found.");
          return;
        }

        const contactName = updateCommitteeChairNames(
          committee,
          fullName,
          source.committeeRole,
        );

        const result = await updateOrganizationCommitteeAction(source.committeeId, {
          contactName,
          contactEmail: email || null,
          contactPhone: phone,
          parentRoleId: organizationRoleId,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      if (committeeId && committeeId !== activeEditContext.defaultCommitteeId) {
        const committee = committees.find((entry) => entry.id === committeeId);
        if (committee) {
          const contactName = updateCommitteeChairNames(
            committee,
            fullName,
            committeeRole,
          );
          const result = await updateOrganizationCommitteeAction(committeeId, {
            contactName,
            contactEmail: email || null,
            contactPhone: phone,
          });
          if (result.error) {
            setError(result.error);
            return;
          }
        }
      }

      if (
        !activeMember.raw &&
        source.kind !== "org_member" &&
        source.kind !== "committee" &&
        source.kind !== "org_role" &&
        email
      ) {
        await createOrganizationMemberAction({ error: null, success: false }, (() => {
          const payload = new FormData();
          payload.set("name", fullName);
          payload.set("email", email);
          payload.set("organizationRoleId", organizationRoleId ?? "");
          payload.set("active", status === "active" ? "true" : "false");
          return payload;
        })());
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
      subtitle={activeMember.displayName}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-member-form" disabled={isPending || !canSave}>
            Save changes
          </Button>
        </div>
      }
    >
      <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="fullName"
          label="Full name"
          defaultValue={activeMember.displayName}
          readOnly={!activeEditContext.canEditName}
          disabled={!activeEditContext.canEditName}
        />
        <Input
          name="email"
          label="Email address"
          type="email"
          defaultValue={activeMember.email}
          readOnly={!activeEditContext.canEditEmail}
          disabled={!activeEditContext.canEditEmail}
        />
        <Input
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={activeMember.phone ?? ""}
          readOnly={!activeEditContext.canEditPhone}
          disabled={!activeEditContext.canEditPhone}
        />
        {activeEditContext.canEditRole && !activeEditContext.canEditVpPortfolio ? (
          <Select
            name="organizationRoleId"
            label="Role"
            defaultValue={activeMember.organizationRoleId ?? ""}
          >
            <option value="">No org role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        ) : null}
        {activeEditContext.canEditAccess ? (
          <Select
            name="campaignRole"
            label="Access level"
            defaultValue={activeMember.accessLevel}
          >
            {CAMPAIGN_ROLES.map((role) => (
              <option key={role} value={role}>
                {campaignRoleLabel(role as CampaignRole)}
              </option>
            ))}
          </Select>
        ) : null}
        {activeEditContext.canEditVpPortfolio ? (
          <Select
            name="organizationRoleId"
            label="VP portfolio"
            defaultValue={activeEditContext.defaultVpPortfolioId ?? ""}
          >
            <option value="">None</option>
            {roles
              .filter((role) => role.roleKind === "vp" || role.roleKind === "president")
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </Select>
        ) : null}
        {activeEditContext.canEditCommittee ? (
          <>
            <Select
              name="committeeId"
              label="Assigned committee"
              defaultValue={activeEditContext.defaultCommitteeId ?? ""}
            >
              <option value="">None</option>
              {committees.map((committee) => (
                <option key={committee.id} value={committee.id}>
                  {committee.name}
                </option>
              ))}
            </Select>
            <Select
              name="committeeRole"
              label="Committee role"
              defaultValue={activeEditContext.defaultCommitteeRole ?? "member"}
            >
              <option value="chair">Chair</option>
              <option value="co_chair">Co-chair</option>
              <option value="member">Member</option>
            </Select>
          </>
        ) : null}
        {activeEditContext.canEditStatus ? (
          <Select name="status" label="Status" defaultValue={activeMember.status}>
            <option value="active">Active</option>
            <option value="invited">Pending invite</option>
            <option value="deactivated">Deactivated</option>
            <option value="archived">Archived</option>
            <option value="roster">Roster</option>
          </Select>
        ) : null}
        <Textarea
          name="notes"
          label="Notes"
          rows={3}
          placeholder="Optional notes about this member"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </TeamAccessModal>
  );
}
