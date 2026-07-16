"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarPlus,
  Mail,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";
import { cn } from "@/lib/utils/cn";

interface TeamAccessPeopleSidebarProps {
  totalCount: number;
  activeCount: number;
  invitedCount: number;
  inactiveCount: number;
  mostAssigned: UnifiedTeamMember[];
  canManage: boolean;
  onInvite: () => void;
  onViewRoles: () => void;
  onSelectMember: (member: UnifiedTeamMember) => void;
}

export function TeamAccessPeopleSidebar({
  totalCount,
  activeCount,
  invitedCount,
  inactiveCount,
  mostAssigned,
  canManage,
  onInvite,
  onViewRoles,
  onSelectMember,
}: TeamAccessPeopleSidebarProps) {
  const glanceItems = [
    {
      label: "People",
      value: totalCount,
      icon: Users,
      iconClass: "bg-[#ebe4f7] text-[#5b4a7a]",
    },
    {
      label: "Active",
      value: activeCount,
      icon: Users,
      iconClass: "bg-cos-success-bg text-cos-success-text",
    },
    {
      label: "Invited",
      value: invitedCount,
      icon: UserPlus,
      iconClass: "bg-cos-warning text-cos-warning-text",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: UserMinus,
      iconClass: "bg-[#ece8e1] text-cos-muted",
    },
  ];

  return (
    <aside className="space-y-6 lg:sticky lg:top-6">
      <SettingsV2Card className="rounded-2xl p-5 shadow-sm sm:p-6">
        <h3 className="font-display text-xl text-cos-text">People at a Glance</h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {glanceItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-cos-border bg-cos-bg/30 px-3 py-4 text-center"
            >
              <div
                className={cn(
                  "mx-auto mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg",
                  item.iconClass,
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-cos-text">
                {item.value}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.06em] text-cos-muted">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </SettingsV2Card>

      <SettingsV2Card className="rounded-2xl p-5 shadow-sm sm:p-6">
        <h3 className="font-display text-xl text-cos-text">Most Assigned People</h3>
        <div className="mt-5 space-y-1">
          {mostAssigned.length === 0 ? (
            <p className="py-2 text-sm text-cos-muted">No event assignments yet.</p>
          ) : (
            mostAssigned.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelectMember(member)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-cos-bg/70"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-xs font-semibold text-cos-text">
                  {member.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cos-text">
                    {member.displayName}
                  </p>
                  <p className="truncate text-xs text-cos-muted">
                    {member.orgRoleLabel}
                  </p>
                </div>
                <span className="rounded-full border border-cos-border bg-cos-bg px-2 py-0.5 text-xs font-medium tabular-nums text-cos-text">
                  {member.assignedEventIds.length}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cos-muted" />
              </button>
            ))
          )}
        </div>
      </SettingsV2Card>

      <SettingsV2Card className="rounded-2xl p-5 shadow-sm sm:p-6">
        <h3 className="font-display text-xl text-cos-text">Quick Actions</h3>
        <div className="mt-5 space-y-1.5">
          {canManage ? (
            <button
              type="button"
              onClick={onInvite}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-cos-bg/70"
            >
              <div className="rounded-lg bg-[#ebe4f7] p-2 text-[#5b4a7a]">
                <Mail className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cos-text">Invite Person</p>
                <p className="text-xs text-cos-muted">Send a login invite</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cos-muted" />
            </button>
          ) : null}

          <Link
            href="/events/create"
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-cos-bg/70"
          >
            <div className="rounded-lg bg-cos-success-bg p-2 text-cos-success-text">
              <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cos-text">Create Event</p>
              <p className="text-xs text-cos-muted">Assign responsibilities</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cos-muted" />
          </Link>

          <button
            type="button"
            onClick={onViewRoles}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-cos-bg/70"
          >
            <div className="rounded-lg bg-[#f3e6d8] p-2 text-[#8a5a2b]">
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cos-text">Organization Roles</p>
              <p className="text-xs text-cos-muted">View roles & access</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cos-muted" />
          </button>
        </div>
      </SettingsV2Card>
    </aside>
  );
}
