"use client";

import { MoreHorizontal, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import {
  accessBadgeVariant,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { OrganizationCommittee } from "@/types/organization-workspace";

interface TeamAccessMemberTableProps {
  members: UnifiedTeamMember[];
  committees: OrganizationCommittee[];
  search: string;
  roleFilter: string;
  accessFilter: string;
  statusFilter: string;
  committeeFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onAccessFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCommitteeFilterChange: (value: string) => void;
  onSelectMember: (member: UnifiedTeamMember) => void;
  onEditMember: (member: UnifiedTeamMember) => void;
  onMoreActions: (member: UnifiedTeamMember, anchor: DOMRect) => void;
  canManage: boolean;
  peopleCount?: number;
}

const filterSelectClass =
  "h-10 w-[7.5rem] shrink-0 rounded-lg border border-cos-border bg-white px-3 text-sm text-cos-text shadow-sm focus:border-cos-primary focus:outline-none focus:ring-2 focus:ring-cos-primary/15 sm:w-[8.5rem]";

function resolvePrimaryTeam(member: UnifiedTeamMember): string | null {
  const direct = member.committees.find(
    (assignment) => assignment.roleOnCommittee !== "vp",
  );
  if (direct) {
    return direct.committee.name;
  }
  if (member.vpPortfolio) {
    return member.vpPortfolio;
  }
  if (member.committees[0]) {
    return member.committees[0].committee.name;
  }
  return null;
}

function statusBadge(status: UnifiedTeamMember["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "invited":
      return <Badge variant="warning">Invited</Badge>;
    case "deactivated":
      return <Badge variant="default">Inactive</Badge>;
    case "roster":
      return <Badge variant="default">Roster Only</Badge>;
  }
}

export function TeamAccessMemberTable({
  members,
  committees,
  search,
  roleFilter,
  accessFilter,
  statusFilter,
  committeeFilter,
  onSearchChange,
  onRoleFilterChange,
  onAccessFilterChange,
  onStatusFilterChange,
  onCommitteeFilterChange,
  onSelectMember,
  onEditMember,
  onMoreActions,
  canManage,
  peopleCount,
}: TeamAccessMemberTableProps) {
  const roleOptions = [...new Set(members.map((member) => member.orgRoleLabel))].sort();
  const totalLabel =
    typeof peopleCount === "number" ? peopleCount : members.length;

  return (
    <SettingsV2Card className="min-w-0 overflow-hidden rounded-2xl p-6 shadow-sm sm:p-7">
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-2xl text-cos-text sm:text-[1.75rem]">
            People
          </h2>
          <span className="rounded-full border border-cos-border bg-cos-bg px-2.5 py-0.5 text-xs font-medium text-cos-muted">
            {totalLabel}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-cos-muted">
          All members of your organization.
        </p>
      </div>

      <div className="mb-6 flex flex-nowrap items-center gap-2.5 overflow-x-auto pb-1">
        <div className="relative min-w-[16rem] flex-[2] basis-[16rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search people..."
            className="h-10 pl-9 shadow-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value)}
          aria-label="Filter by role"
          className={filterSelectClass}
        >
          <option value="">All Roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select
          value={committeeFilter}
          onChange={(event) => onCommitteeFilterChange(event.target.value)}
          aria-label="Filter by team"
          className={filterSelectClass}
        >
          <option value="">All Teams</option>
          {committees.map((committee) => (
            <option key={committee.id} value={committee.id}>
              {committee.name}
            </option>
          ))}
        </select>
        <select
          value={accessFilter}
          onChange={(event) => onAccessFilterChange(event.target.value)}
          aria-label="Filter by access level"
          className={filterSelectClass}
        >
          <option value="">All Access</option>
          {CAMPAIGN_ROLES.map((role) => (
            <option key={role} value={role}>
              {campaignRoleLabel(role as CampaignRole)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          aria-label="Filter by status"
          className={filterSelectClass}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="deactivated">Inactive</option>
          <option value="roster">Roster Only</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            {canManage ? <col className="w-[18%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-cos-border text-[11px] uppercase tracking-[0.08em] text-cos-muted">
              <th className="pb-3.5 pr-3 font-medium">Person</th>
              <th className="pb-3.5 pr-3 font-medium">Organization Title</th>
              <th className="pb-3.5 pr-3 font-medium">App Access</th>
              <th className="pb-3.5 pr-3 font-medium">Events</th>
              <th className="pb-3.5 pr-3 font-medium">Status</th>
              {canManage ? <th className="pb-3.5 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="py-12 text-center text-cos-muted"
                >
                  No members match your filters.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const primaryTeam = resolvePrimaryTeam(member);
                return (
                  <tr
                    key={member.id}
                    className="cursor-pointer border-b border-cos-border/80 transition-colors hover:bg-cos-bg/70"
                    onClick={() => onSelectMember(member)}
                  >
                    <td className="py-4.5 pr-3 align-middle">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-xs font-semibold text-cos-text shadow-sm">
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold leading-snug text-cos-text">
                            {member.displayName}
                          </p>
                          <p className="mt-0.5 truncate text-sm font-normal text-cos-muted">
                            {member.orgRoleLabel}
                          </p>
                          {primaryTeam && primaryTeam !== member.orgRoleLabel ? (
                            <p className="mt-0.5 truncate text-xs text-cos-muted/90">
                              {primaryTeam}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="truncate py-4.5 pr-3 align-middle text-sm font-normal text-cos-muted">
                      {member.orgRoleLabel}
                    </td>
                    <td className="py-4.5 pr-3 align-middle">
                      {member.isRosterOnly ? (
                        <Badge
                          variant="default"
                          className="bg-[#ece8e1] text-cos-muted"
                        >
                          Roster Only
                        </Badge>
                      ) : (
                        <Badge variant={accessBadgeVariant(member.accessLevel)}>
                          {member.accessLabel}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4.5 pr-3 align-middle text-sm tabular-nums text-cos-text">
                      {member.assignedEventIds.length > 0
                        ? member.assignedEventIds.length
                        : "—"}
                    </td>
                    <td className="py-4.5 pr-3 align-middle">
                      {statusBadge(member.status)}
                    </td>
                    {canManage ? (
                      <td className="py-4.5 align-middle">
                        <div
                          className="flex flex-wrap items-center gap-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onSelectMember(member)}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditMember(member)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              const rect =
                                event.currentTarget.getBoundingClientRect();
                              onMoreActions(member, rect);
                            }}
                            aria-label={`More actions for ${member.displayName}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </SettingsV2Card>
  );
}
