"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Minus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import {
  BUILT_IN_ROLES,
  PERMISSION_COLUMNS,
  PERMISSION_MATRIX,
  type PermissionLevel,
} from "@/components/settings-v2/team-access/permissions-matrix";
import { countMembersForRole } from "@/components/settings-v2/team-access/team-access-utils";
import { RESPONSIBILITY_LABELS } from "@/lib/organization-workspace/constants";
import { updateResponsibilityMatrixAction } from "@/lib/organization-workspace/actions";
import { cn } from "@/lib/utils/cn";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

type RolesTab = "roles" | "matrix" | "responsibilities";

interface TeamAccessRolesModalProps {
  open: boolean;
  onClose: () => void;
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  onCreateRole: () => void;
}

function PermissionIcon({ level }: { level: PermissionLevel }) {
  switch (level) {
    case "allowed":
      return <Check className="h-4 w-4 text-emerald-600" />;
    case "limited":
      return (
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-400 text-[10px] text-amber-600">
          ○
        </span>
      );
    case "denied":
      return <Minus className="h-4 w-4 text-cos-muted" />;
  }
}

export function TeamAccessRolesModal({
  open,
  onClose,
  members,
  workspace,
  onCreateRole,
}: TeamAccessRolesModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<RolesTab>("roles");
  const [isPending, startTransition] = useTransition();

  const rosterRoles = workspace.roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? `${role.roleKind ?? "Board"} role`,
    memberCount: countMembersForRole(role.id, members, workspace),
    isBuiltIn: role.systemRole,
  }));

  const allRoles = [
    ...BUILT_IN_ROLES.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      memberCount: members.filter((member) => {
        if (role.id === "owner") return member.campaignRole === "admin";
        if (role.id === "president") return member.campaignRole === "president";
        if (role.id === "vp") return member.campaignRole === "vp_communications";
        if (role.id === "chair") return member.campaignRole === "committee_chair";
        if (role.id === "volunteer") return member.campaignRole === "contributor";
        if (role.id === "viewer") return member.campaignRole === "view_only";
        return false;
      }).length,
      isBuiltIn: true,
    })),
    ...rosterRoles.filter(
      (role) => !BUILT_IN_ROLES.some((builtIn) => builtIn.name === role.name),
    ),
  ];

  function handleResponsibilityChange(entryId: string, defaultRoleId: string) {
    startTransition(async () => {
      await updateResponsibilityMatrixAction(entryId, defaultRoleId || null);
      router.refresh();
    });
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title="Manage roles & permissions"
      wide
      footer={
        tab === "roles" ? (
          <div className="flex justify-end">
            <Button type="button" onClick={onCreateRole}>
              Create role
            </Button>
          </div>
        ) : null
      }
    >
      <div className="mb-4 flex gap-1 border-b border-cos-border">
        {(
          [
            { id: "roles", label: "Roles" },
            { id: "matrix", label: "Permissions matrix" },
            { id: "responsibilities", label: "Responsibilities" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-cos-primary text-cos-text"
                : "border-transparent text-cos-muted hover:text-cos-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "roles" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Description</th>
                <th className="pb-3 pr-4 font-medium">Members</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allRoles.map((role) => (
                <tr key={role.id} className="border-b border-cos-border">
                  <td className="py-3 pr-4 font-medium text-cos-text">{role.name}</td>
                  <td className="py-3 pr-4 text-cos-muted">{role.description}</td>
                  <td className="py-3 pr-4 text-cos-text">{role.memberCount}</td>
                  <td className="py-3">
                    <Button type="button" variant="ghost" size="sm" disabled>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "matrix" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
                <th className="pb-3 pr-4 font-medium">Permission</th>
                {PERMISSION_COLUMNS.map((column) => (
                  <th key={column.id} className="pb-3 pr-4 text-center font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.id} className="border-b border-cos-border">
                  <td className="py-3 pr-4 text-cos-text">{row.label}</td>
                  {PERMISSION_COLUMNS.map((column) => (
                    <td key={column.id} className="py-3 pr-4 text-center">
                      <div className="flex justify-center">
                        <PermissionIcon level={row.levels[column.id] ?? "denied"} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-cos-muted">
            Role permissions are derived from access levels. Edit individual member
            access in the member drawer or edit modal.
          </p>
        </div>
      ) : null}

      {tab === "responsibilities" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
                <th className="pb-3 pr-4 font-medium">Responsibility</th>
                <th className="pb-3 font-medium">Default role</th>
              </tr>
            </thead>
            <tbody>
              {workspace.responsibilityMatrix.map((entry) => (
                <tr key={entry.id} className="border-b border-cos-border">
                  <td className="py-3 pr-4 font-medium text-cos-text">
                    {RESPONSIBILITY_LABELS[entry.responsibilityType]}
                  </td>
                  <td className="py-3">
                    <Select
                      defaultValue={entry.defaultRoleId ?? ""}
                      disabled={isPending}
                      onChange={(event) =>
                        handleResponsibilityChange(entry.id, event.target.value)
                      }
                    >
                      <option value="">Not assigned</option>
                      {workspace.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </TeamAccessModal>
  );
}
