"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { resolveMemberEditContext } from "@/components/settings-v2/team-access/member-edit-utils";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import {
  isCurrentUserTeamMember,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import { updateTeamMemberAction } from "@/lib/auth/actions";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { resolveAccessTemplateSelection } from "@/lib/access-templates/merge";
import type { AccessTemplate } from "@/lib/access-templates/types";
import {
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
  accessLabels?: Partial<Record<string, string>> | null;
  accessTemplates?: AccessTemplate[];
  currentUserEmail?: string | null;
}

export function TeamAccessEditMemberModal({
  open,
  onClose,
  member,
  workspace,
  accessLabels = null,
  accessTemplates = [],
  currentUserEmail = null,
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
    editContext.source.kind !== "org_member" ||
    Boolean(editContext.source.memberId);

  if (!canSave) {
    return null;
  }

  const activeMember = member;
  const activeEditContext = editContext;

  /** Access templates are the real assignable roles. */
  const canEditAccessRole =
    activeEditContext.canEditAccess ||
    (activeEditContext.source.kind === "org_member" &&
      Boolean(activeEditContext.source.memberId));

  const accessSelectOptions =
    accessTemplates.length > 0
      ? accessTemplates.map((template) => ({
          id: template.id,
          label: template.displayName,
        }))
      : CAMPAIGN_ROLES.map((role) => ({
          id: role,
          label: accessLabels?.[role] ?? campaignRoleLabel(role as CampaignRole),
        }));

  const defaultRoleId =
    activeMember.accessTemplateId ??
    activeMember.accessLevel ??
    "contributor";
  const isSelf = isCurrentUserTeamMember(activeMember, currentUserEmail);
  const canEditStatus = activeEditContext.canEditStatus && !isSelf;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fullName =
      formData.get("fullName")?.toString()?.trim() ?? activeMember.displayName;
    const emailRaw = formData.get("email")?.toString()?.trim() ?? "";
    const email = emailRaw || null;
    const phone = formData.get("phone")?.toString()?.trim() || null;
    const roleSelectionRaw =
      formData.get("accessRole")?.toString() ?? defaultRoleId;
    const status = formData.get("status") as "active" | "deactivated";

    const selection =
      resolveAccessTemplateSelection(accessTemplates, roleSelectionRaw) ??
      (CAMPAIGN_ROLES.includes(roleSelectionRaw as CampaignRole)
        ? {
            templateId: roleSelectionRaw,
            campaignRole: roleSelectionRaw as CampaignRole,
          }
        : null);

    startTransition(async () => {
      const { source } = activeEditContext;

      if (activeEditContext.canEditName && !fullName) {
        setError("Full name is required.");
        return;
      }

      if (!selection && canEditAccessRole) {
        setError("Choose a role.");
        return;
      }

      const membershipId =
        activeMember.raw?.id ??
        (source.kind === "org_user" ? source.membershipId : null);

      // Login seat: persist edit-profile display name + access/status.
      // Roster-only name updates alone look like they failed because the
      // unified people list prefers organization_users.display_name.
      if (membershipId) {
        const result = await updateTeamMemberAction(membershipId, {
          ...(selection && canEditAccessRole
            ? { campaignRole: selection.templateId }
            : {}),
          status: canEditStatus
            ? status === "deactivated"
              ? "deactivated"
              : "active"
            : undefined,
          ...(activeEditContext.canEditName
            ? { displayName: fullName }
            : {}),
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      if (source.kind === "org_role") {
        const result = await updateOrganizationRoleAction(source.roleId, {
          contactName: fullName,
          contactEmail: email,
          contactPhone: phone,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      if (source.kind === "org_member") {
        // Roster can store system campaign_role only (DB check). Custom
        // templates resolve to their base role until invite.
        const result = await updateOrganizationMemberAction(source.memberId, {
          name: fullName,
          email,
          phone,
          active: status !== "deactivated",
          campaignRole: selection?.campaignRole ?? null,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }

      // Keep board-role contact name in sync when this person is that contact,
      // otherwise Team Access merge overwrites the renamed display name.
      const roleId =
        source.kind === "org_role"
          ? null
          : (activeMember.organizationRoleId ??
            activeMember.vpPortfolioId ??
            null);
      if (roleId && activeEditContext.canEditName) {
        const role = workspace.roles.find((entry) => entry.id === roleId);
        const previousName = activeMember.displayName.trim();
        const contactName = role?.contactName?.trim() ?? "";
        const contactEmail = role?.contactEmail?.trim().toLowerCase() ?? "";
        const memberEmail = activeMember.email?.trim().toLowerCase() ?? "";
        const shouldSyncContact =
          Boolean(role) &&
          (contactName.length === 0 ||
            contactName.toLowerCase() === previousName.toLowerCase() ||
            (memberEmail.length > 0 && contactEmail === memberEmail));
        if (shouldSyncContact) {
          const result = await updateOrganizationRoleAction(roleId, {
            contactName: fullName,
            contactEmail: email ?? role?.contactEmail ?? null,
            contactPhone: phone ?? role?.contactPhone ?? null,
          });
          if (result.error) {
            setError(result.error);
            return;
          }
        }
      }

      if (source.kind === "committee") {
        setError(
          "Manage this person’s role from their profile after they are on the roster.",
        );
        return;
      }

      setError(null);
      router.refresh();
      onClose();
    });
  }

  const defaultStatus =
    activeMember.status === "deactivated" ? "deactivated" : "active";

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title="Edit person"
      subtitle={activeMember.displayName}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-member-form"
            disabled={isPending || !canSave}
          >
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

        {canEditAccessRole ? (
          <div className="space-y-1.5">
            <Select
              name="accessRole"
              label="Role"
              defaultValue={defaultRoleId}
              required
            >
              {accessSelectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-cos-muted">
              Choose what they can do when they sign in. Rename roles with Edit
              roles on Team & Access.
            </p>
          </div>
        ) : null}

        {canEditStatus ? (
          <Select name="status" label="Sign-in status" defaultValue={defaultStatus}>
            <option value="active">Active</option>
            <option value="deactivated">Inactive</option>
          </Select>
        ) : isSelf && activeEditContext.canEditStatus ? (
          <p className="text-xs leading-relaxed text-cos-muted">
            You can’t turn off your own sign-in. Ask another admin if you need
            access removed.
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-cos-muted">
          Event assignments are managed on the person&apos;s{" "}
          <span className="font-medium">Events</span> tab.
        </p>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </TeamAccessModal>
  );
}
