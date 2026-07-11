"use client";

import { ArrowRight, Mail, Pencil, Phone } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TeamAccessDrawer } from "@/components/settings-v2/team-access/TeamAccessDrawer";
import { resolveMemberEditContext } from "@/components/settings-v2/team-access/member-edit-utils";
import {
  PERMISSION_MATRIX,
  type PermissionLevel,
} from "@/components/settings-v2/team-access/permissions-matrix";
import {
  accessBadgeVariant,
  accessLevelLabel,
  formatCount,
  formatMemberEmail,
  formatMemberPhone,
  formatRelativeDate,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";
import { cn } from "@/lib/utils/cn";

type DrawerTab = "overview" | "committees" | "permissions" | "activity";

interface TeamAccessMemberDrawerProps {
  member: UnifiedTeamMember | null;
  open: boolean;
  onClose: () => void;
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  workspace: OrganizationWorkspaceData;
  onEdit: () => void;
  onInvite: () => void;
  onResendInvite: () => void;
  onCancelInvite: () => void;
  onSendMessage: () => void;
  onDeactivate: () => void;
  onArchive: () => void;
  onRemove: () => void;
  onViewTasks: () => void;
  onSelectCommittee: (committeeId: string) => void;
  onSaveAccessLevel?: (campaignRole: CampaignRole) => Promise<string | null>;
  canManage: boolean;
}

const TABS: { id: DrawerTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "committees", label: "Committees" },
  { id: "permissions", label: "Permissions" },
  { id: "activity", label: "Activity" },
];

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

function committeeStatusBadge(status: string) {
  switch (status) {
    case "on_track":
      return <Badge variant="success">On track</Badge>;
    case "needs_attention":
      return <Badge variant="warning">Needs attention</Badge>;
    case "open_role":
      return <Badge variant="info">Open role</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function roleOnCommitteeLabel(
  role: string,
  member: UnifiedTeamMember,
): string {
  switch (role) {
    case "vp":
      if (member.isPresident) {
        return "President portfolio";
      }
      if (member.isVp) {
        return "VP oversight";
      }
      return member.organizationRoleName
        ? `${member.organizationRoleName} portfolio`
        : "Role portfolio";
    case "chair":
      return "Committee Chair";
    case "co_chair":
      return "Committee Co-Chair";
    case "member":
      return "Committee Member";
    default:
      return role.replace("_", " ");
  }
}

function StatItem({
  label,
  value,
  action,
  onAction,
}: {
  label: string;
  value: string | number;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-cos-border bg-cos-bg/50 p-3">
      <p className="text-xs text-cos-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-cos-text">{value}</p>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cos-primary hover:underline"
        >
          <Pencil className="h-3 w-3" />
          {action}
        </button>
      ) : null}
    </div>
  );
}

function formatCommitteeLeaders(assignment: UnifiedTeamMember["committees"][number]): string {
  if (assignment.memberNames.length === 0) {
    return "Open role";
  }
  return assignment.memberNames.join(", ");
}

function resolvePermissionColumn(role: CampaignRole): string {
  switch (role) {
    case "admin":
      return "owner";
    case "president":
      return "president";
    case "vp_communications":
      return "vp";
    case "committee_chair":
      return "chair";
    case "contributor":
      return "volunteer";
    default:
      return "viewer";
  }
}

function permissionLabel(level: PermissionLevel): string {
  switch (level) {
    case "allowed":
      return "Allowed";
    case "limited":
      return "Limited";
    case "denied":
      return "Not allowed";
  }
}

export function TeamAccessMemberDrawer({
  member,
  open,
  onClose,
  activeTab,
  onTabChange,
  workspace,
  onEdit,
  onInvite,
  onResendInvite,
  onCancelInvite,
  onSendMessage,
  onDeactivate,
  onArchive,
  onViewTasks,
  onSelectCommittee,
  onSaveAccessLevel,
  canManage,
}: TeamAccessMemberDrawerProps) {
  const [draftAccessLevel, setDraftAccessLevel] = useState<CampaignRole>("view_only");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isSavingAccess, startSaveAccess] = useTransition();

  const editContext = useMemo(
    () => (member ? resolveMemberEditContext(member, workspace) : null),
    [member, workspace],
  );
  const canEditAccess = Boolean(canManage && editContext?.canEditAccess && onSaveAccessLevel);

  useEffect(() => {
    if (!member) {
      return;
    }
    setDraftAccessLevel(member.accessLevel);
    setAccessError(null);
  }, [member]);

  if (!member) {
    return null;
  }

  const committeeTabCount = member.committees.length;
  const previewAccessLevel =
    activeTab === "permissions" && canEditAccess ? draftAccessLevel : member.accessLevel;
  const permissionColumn = resolvePermissionColumn(previewAccessLevel);
  const accessLevelDirty = draftAccessLevel !== member.accessLevel;

  function handleSaveAccessLevel() {
    if (!onSaveAccessLevel || !accessLevelDirty) {
      return;
    }

    startSaveAccess(async () => {
      const error = await onSaveAccessLevel(draftAccessLevel);
      if (error) {
        setAccessError(error);
        return;
      }
      setAccessError(null);
    });
  }

  return (
    <TeamAccessDrawer open={open} onClose={onClose}>
      <div className="flex h-full flex-col">
        <div className="border-b border-cos-border px-6 pb-5 pt-6">
          <div className="flex items-start gap-4 pr-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-sm font-medium text-cos-text">
              {member.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(member.status)}
                <Badge variant={accessBadgeVariant(member.accessLevel)}>
                  {member.orgRoleLabel}
                </Badge>
              </div>
              <h2 className="font-display mt-2 text-2xl text-cos-text">
                {member.displayName}
              </h2>
              <p className="text-sm text-cos-muted">{formatMemberEmail(member)}</p>
              {!member.phoneMissing ? (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-cos-muted">
                  <Phone className="h-3.5 w-3.5" />
                  {formatMemberPhone(member)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex gap-1 border-b border-cos-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-cos-primary text-cos-text"
                    : "border-transparent text-cos-muted hover:text-cos-text",
                )}
              >
                {tab.label}
                {tab.id === "committees" && committeeTabCount > 0
                  ? ` (${committeeTabCount})`
                  : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <StatItem label="Org role" value={member.orgRoleLabel} />
                <StatItem
                  label="Access level"
                  value={member.accessLabel}
                  action={canEditAccess ? "Change access level" : undefined}
                  onAction={
                    canEditAccess ? () => onTabChange("permissions") : undefined
                  }
                />
                <StatItem label="Reports to" value={member.reportsTo ?? "—"} />
                {member.hasRoleOversight ? (
                  <>
                    <StatItem label="Total committees" value={member.totalCommittees} />
                    <StatItem
                      label="Total committee members"
                      value={member.totalCommitteeMembers}
                    />
                    <StatItem
                      label="Open committee roles"
                      value={member.openCommitteeRoles}
                    />
                  </>
                ) : (
                  <>
                    <StatItem label="VP portfolio" value={member.vpPortfolio ?? "—"} />
                    <StatItem label="Committees" value={member.committeeCount || "—"} />
                  </>
                )}
                <StatItem label="Open tasks" value={formatCount(member.openTasks)} />
                <StatItem label="Campaigns" value={formatCount(member.campaigns)} />
                <StatItem
                  label="Approvals waiting"
                  value={formatCount(member.approvalsWaiting)}
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                  Quick actions
                </p>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => onTabChange("committees")}
                    className="flex w-full items-center justify-between text-sm text-cos-text hover:text-cos-primary"
                  >
                    View all committees
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onViewTasks}
                    className="flex w-full items-center justify-between text-sm text-cos-text hover:text-cos-primary"
                  >
                    View open tasks
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onSendMessage}
                    disabled={member.emailMissing}
                  >
                    <Mail className="h-4 w-4" />
                    Send message
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                  About
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-cos-muted">Joined</dt>
                    <dd className="text-cos-text">
                      {formatRelativeDate(member.joinedAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-cos-muted">Last active</dt>
                    <dd className="text-cos-text">
                      {formatRelativeDate(member.lastActive)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-cos-muted">Contact email</dt>
                    <dd className="text-cos-text">{formatMemberEmail(member)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-cos-muted">Contact phone</dt>
                    <dd className="text-cos-text">{formatMemberPhone(member)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === "committees" && (
            <div className="space-y-4">
              <p className="text-sm text-cos-muted">
                {member.hasRoleOversight
                  ? `Committees under ${member.organizationRoleName ?? member.displayName}`
                  : "Committee assignments"}
              </p>
              {member.committees.length === 0 ? (
                <p className="text-sm text-cos-muted">No committee assignments.</p>
              ) : (
                member.committees.map((assignment) => (
                  <button
                    key={assignment.committee.id}
                    type="button"
                    onClick={() => onSelectCommittee(assignment.committee.id)}
                    className="w-full rounded-lg border border-cos-border p-4 text-left transition-colors hover:border-cos-primary/40 hover:bg-cos-bg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-cos-text">
                          {assignment.committee.name}
                        </p>
                        <p className="mt-1 text-sm text-cos-muted">
                          Role: {roleOnCommitteeLabel(assignment.roleOnCommittee, member)}
                        </p>
                        {assignment.roleOnCommittee === "vp" ? (
                          <p className="mt-1 text-xs text-cos-muted">
                            {formatCommitteeLeaders(assignment)}
                          </p>
                        ) : null}
                        {assignment.committee.parentRoleName ? (
                          <p className="mt-1 text-sm text-cos-muted">
                            Portfolio: {assignment.committee.parentRoleName}
                          </p>
                        ) : null}
                      </div>
                      {committeeStatusBadge(assignment.status)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cos-muted">
                      {assignment.roleOnCommittee === "vp" ? (
                        <span>Members: {assignment.memberCount || "—"}</span>
                      ) : null}
                      <span>Open tasks: {formatCount(assignment.openTasks)}</span>
                      <span>Campaigns: {formatCount(assignment.campaigns)}</span>
                      <span>Approvals: {formatCount(assignment.approvals)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4 text-sm">
              {canEditAccess ? (
                <div className="rounded-lg border border-cos-border bg-cos-bg/50 p-4">
                  <Select
                    label="Access level"
                    value={draftAccessLevel}
                    disabled={isSavingAccess}
                    onChange={(event) => {
                      setDraftAccessLevel(event.target.value as CampaignRole);
                      setAccessError(null);
                    }}
                  >
                    {CAMPAIGN_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {campaignRoleLabel(role)}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 text-xs text-cos-muted">
                    Access level controls what this member can do. Permissions below
                    update as you change the level.
                  </p>
                  {accessError ? (
                    <p className="mt-2 text-xs text-red-600">{accessError}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-cos-muted">
                  Permissions for {campaignRoleLabel(member.accessLevel)} (
                  {accessLevelLabel(member.accessLevel)}).
                  {canManage && !canEditAccess && !member.raw
                    ? " Access level cannot be changed for this member."
                    : null}
                </p>
              )}
              <ul className="space-y-2">
                {PERMISSION_MATRIX.map((row) => (
                  <li
                    key={row.id}
                    className="flex justify-between border-b border-cos-border py-2"
                  >
                    <span className="text-cos-muted">{row.label}</span>
                    <span className="text-cos-text">
                      {permissionLabel(row.levels[permissionColumn] ?? "denied")}
                    </span>
                  </li>
                ))}
              </ul>
              {canManage ? (
                <p className="text-xs text-cos-muted">
                  Per-member permissions follow access level. To change approval
                  routing defaults, use Manage roles & permissions → Responsibilities.
                </p>
              ) : null}
            </div>
          )}

          {activeTab === "activity" && (
            <p className="text-sm text-cos-muted">
              Activity history will appear here as members use Hey Ralli.
            </p>
          )}
        </div>

        {canManage && (activeTab === "overview" || activeTab === "permissions") ? (
          <div className="flex flex-wrap gap-2 border-t border-cos-border px-6 py-4">
            {activeTab === "permissions" && canEditAccess && accessLevelDirty ? (
              <Button
                type="button"
                size="sm"
                disabled={isSavingAccess}
                onClick={handleSaveAccessLevel}
              >
                Save access level
              </Button>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit member
            </Button>
            {activeTab === "overview" && member.status === "invited" && member.raw ? (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={onResendInvite}>
                  Resend invite
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancelInvite}>
                  Cancel invite
                </Button>
              </>
            ) : activeTab === "overview" && (member.isRosterOnly || member.emailMissing) ? (
              <Button type="button" variant="secondary" size="sm" onClick={onInvite}>
                Invite
              </Button>
            ) : null}
            {activeTab === "overview" && member.raw ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={onDeactivate}>
                  Deactivate
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onArchive}>
                  Archive
                </Button>
              </>
            ) : activeTab === "overview" ? (
              <Button type="button" variant="ghost" size="sm" onClick={onArchive}>
                Archive
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </TeamAccessDrawer>
  );
}
