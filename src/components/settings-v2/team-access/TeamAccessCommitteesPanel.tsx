"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Plus, Trash2, User } from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import {
  deleteOrganizationCommitteeAction,
  deleteOrganizationRoleAction,
} from "@/lib/organization-workspace/actions";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";
import { cn } from "@/lib/utils/cn";

interface TeamAccessCommitteesPanelProps {
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  canManage: boolean;
  onAddCommittee: (parentRoleId?: string) => void;
  onEditCommittee: (committee: OrganizationCommittee) => void;
  onEditRole: (role: OrganizationRole) => void;
  onSelectCommittee: (committeeId: string) => void;
}

function roleKindLabel(kind: OrganizationRole["roleKind"]): string {
  switch (kind) {
    case "president":
      return "President";
    case "vp":
      return "VP";
    default:
      return "Role";
  }
}

export function TeamAccessCommitteesPanel({
  roles,
  committees,
  canManage,
  onAddCommittee,
  onEditCommittee,
  onEditRole,
  onSelectCommittee,
}: TeamAccessCommitteesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeCommittees = committees.filter((committee) => !committee.archivedAt);
  const activeRoles = roles.filter((role) => !role.archivedAt);

  const committeesByRole = useMemo(() => {
    const grouped = new Map<string, OrganizationCommittee[]>();
    for (const role of activeRoles) {
      grouped.set(role.id, []);
    }
    grouped.set("unassigned", []);
    for (const committee of activeCommittees) {
      const key = committee.parentRoleId ?? "unassigned";
      const bucket = grouped.get(key) ?? grouped.get("unassigned")!;
      bucket.push(committee);
    }
    return grouped;
  }, [activeRoles, activeCommittees]);

  function handleDeleteCommittee(committee: OrganizationCommittee) {
    if (!window.confirm(`Remove "${committee.name}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteOrganizationCommitteeAction(committee.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function handleDeleteRole(role: OrganizationRole, committeeCount: number) {
    if (
      !window.confirm(
        `Remove "${role.name}" and ${committeeCount} committee(s)?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteOrganizationRoleAction(role.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <SettingsV2Card
      title="Committees & portfolios"
      description="VP portfolios, committee chairs, and nested committees. Changes update approval routing and tasks."
      actions={
        canManage ? (
          <Button type="button" size="sm" onClick={() => onAddCommittee()}>
            <Plus className="h-4 w-4" />
            Add committee
          </Button>
        ) : null
      }
    >
      {activeRoles.length === 0 ? (
        <p className="text-sm text-cos-muted">
          Upload a roster or add your first leadership role to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {activeRoles.map((role) => {
            const roleCommittees = committeesByRole.get(role.id) ?? [];
            const filled = Boolean(role.contactName?.trim());

            return (
              <details
                key={role.id}
                open
                className={cn(
                  "group border bg-cos-card",
                  filled ? "border-cos-border" : "border-dashed border-cos-border",
                )}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted transition-transform group-open:rotate-180" />
                      <h3 className="font-display text-xl text-cos-text">{role.name}</h3>
                      <Badge variant="info">{roleKindLabel(role.roleKind)}</Badge>
                      <span className="text-xs text-cos-muted">
                        {roleCommittees.length} committee
                        {roleCommittees.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-2 pl-6">
                      {role.contactName ? (
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-cos-text">
                          <User className="h-3.5 w-3.5 text-emerald-600" />
                          {role.contactName}
                        </p>
                      ) : (
                        <p className="text-sm text-amber-700/80">Open role</p>
                      )}
                    </div>
                  </div>
                  {canManage ? (
                    <div
                      className="flex shrink-0 gap-1"
                      onClick={(event) => event.preventDefault()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => onEditRole(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDeleteRole(role, roleCommittees.length)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </summary>

                <div className="border-t border-cos-border px-5 pb-5 pt-4">
                  {roleCommittees.length === 0 ? (
                    <p className="text-sm text-cos-muted">No committees under this role yet.</p>
                  ) : (
                    <div className="space-y-2 border-l-2 border-cos-border pl-4">
                      {roleCommittees.map((committee) => {
                        const chairs = parseCommitteeChairNames(committee.contactName);
                        return (
                          <div
                            key={committee.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-cos-border px-4 py-3 transition-colors hover:border-cos-primary/40"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => onSelectCommittee(committee.id)}
                            >
                              <p className="font-medium text-cos-text">{committee.name}</p>
                              <p className="mt-1 text-sm text-cos-muted">
                                {chairs.length > 0
                                  ? `Chair: ${chairs.join(", ")}`
                                  : "Open role"}
                              </p>
                            </button>
                            {canManage ? (
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => onEditCommittee(committee)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handleDeleteCommittee(committee)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {canManage ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      disabled={isPending}
                      onClick={() => onAddCommittee(role.id)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add committee
                    </Button>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {(committeesByRole.get("unassigned") ?? []).length > 0 ? (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-cos-text">Unassigned committees</h3>
          {(committeesByRole.get("unassigned") ?? []).map((committee) => (
            <div
              key={committee.id}
              className="flex items-center justify-between rounded-lg border border-cos-border px-4 py-3"
            >
              <button
                type="button"
                className="text-left"
                onClick={() => onSelectCommittee(committee.id)}
              >
                <p className="font-medium text-cos-text">{committee.name}</p>
              </button>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditCommittee(committee)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </SettingsV2Card>
  );
}
