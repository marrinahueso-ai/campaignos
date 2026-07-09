"use client";

import {
  Download,
  MoreHorizontal,
  Pencil,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import {
  accessBadgeVariant,
  formatMemberEmail,
  formatRelativeDate,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type {
  OrganizationCommittee,
  OrganizationRole,
} from "@/types/organization-workspace";

interface TeamAccessMemberTableProps {
  members: UnifiedTeamMember[];
  roles: OrganizationRole[];
  committees: OrganizationCommittee[];
  search: string;
  roleFilter: string;
  accessFilter: string;
  statusFilter: string;
  vpPortfolioFilter: string;
  committeeFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onAccessFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onVpPortfolioFilterChange: (value: string) => void;
  onCommitteeFilterChange: (value: string) => void;
  onSelectMember: (member: UnifiedTeamMember) => void;
  onEditMember: (member: UnifiedTeamMember) => void;
  onMoreActions: (member: UnifiedTeamMember, anchor: DOMRect) => void;
  canManage: boolean;
}

function statusBadge(status: UnifiedTeamMember["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "invited":
      return <Badge variant="warning">Pending</Badge>;
    case "deactivated":
      return <Badge variant="default">Deactivated</Badge>;
    case "roster":
      return <Badge variant="info">Roster</Badge>;
  }
}

export function TeamAccessMemberTable({
  members,
  roles,
  committees,
  search,
  roleFilter,
  accessFilter,
  statusFilter,
  vpPortfolioFilter,
  committeeFilter,
  onSearchChange,
  onRoleFilterChange,
  onAccessFilterChange,
  onStatusFilterChange,
  onVpPortfolioFilterChange,
  onCommitteeFilterChange,
  onSelectMember,
  onEditMember,
  onMoreActions,
  canManage,
}: TeamAccessMemberTableProps) {
  const roleOptions = [...new Set(members.map((member) => member.orgRoleLabel))].sort();
  const vpPortfolioOptions = roles.filter((role) => role.roleKind === "vp");

  return (
    <SettingsV2Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={roleFilter}
            onChange={(event) => onRoleFilterChange(event.target.value)}
            className="h-9 min-w-[120px]"
          >
            <option value="">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
          <Select
            value={accessFilter}
            onChange={(event) => onAccessFilterChange(event.target.value)}
            className="h-9 min-w-[140px]"
          >
            <option value="">All access levels</option>
            {CAMPAIGN_ROLES.map((role) => (
              <option key={role} value={role}>
                {campaignRoleLabel(role as CampaignRole)}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="h-9 min-w-[120px]"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="invited">Pending</option>
            <option value="deactivated">Deactivated</option>
            <option value="roster">Roster</option>
          </Select>
          <Select
            value={vpPortfolioFilter}
            onChange={(event) => onVpPortfolioFilterChange(event.target.value)}
            className="h-9 min-w-[160px]"
          >
            <option value="">All VP portfolios</option>
            {vpPortfolioOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <Select
            value={committeeFilter}
            onChange={(event) => onCommitteeFilterChange(event.target.value)}
            className="h-9 min-w-[140px]"
          >
            <option value="">All committees</option>
            {committees.map((committee) => (
              <option key={committee.id} value={committee.id}>
                {committee.name}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" type="button">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
              <th className="pb-3 pr-4 font-medium">Member</th>
              <th className="pb-3 pr-4 font-medium">Org role</th>
              <th className="pb-3 pr-4 font-medium">Access</th>
              <th className="pb-3 pr-4 font-medium">VP portfolio</th>
              <th className="pb-3 pr-4 font-medium">Committees</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Last active</th>
              {canManage ? <th className="pb-3 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="py-8 text-center text-cos-muted">
                  No members match your filters.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="cursor-pointer border-b border-cos-border transition-colors hover:bg-cos-bg/60"
                  onClick={() => onSelectMember(member)}
                >
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-xs font-medium text-cos-text">
                        {member.initials}
                      </div>
                      <div>
                        <p className="font-medium text-cos-text">{member.displayName}</p>
                        <p className="text-xs text-cos-muted">{formatMemberEmail(member)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-cos-text">{member.orgRoleLabel}</td>
                  <td className="py-4 pr-4">
                    <Badge variant={accessBadgeVariant(member.accessLevel)}>
                      {member.accessLabel}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4 text-cos-text">
                    {member.vpPortfolio ?? "—"}
                  </td>
                  <td className="py-4 pr-4 text-cos-text">
                    {member.committeeCount > 0 ? member.committeeCount : "—"}
                  </td>
                  <td className="py-4 pr-4">{statusBadge(member.status)}</td>
                  <td className="py-4 pr-4 text-cos-muted">
                    {formatRelativeDate(member.lastActive)}
                  </td>
                  {canManage ? (
                    <td className="py-4">
                      <div
                        className="flex items-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditMember(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            onMoreActions(member, rect);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SettingsV2Card>
  );
}
