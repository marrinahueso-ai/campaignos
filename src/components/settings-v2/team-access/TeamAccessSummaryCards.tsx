"use client";

import {
  ArrowRight,
  Briefcase,
  Shield,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";

interface TeamAccessSummaryCardsProps {
  activeCount: number;
  seatLimit: number;
  pendingCount: number;
  roleCount: number;
  committeeCount: number;
  openRoleCount: number;
  onViewInvites: () => void;
  onViewRoles: () => void;
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  subvalue,
  onClick,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  value: string;
  subvalue?: string;
  onClick?: () => void;
  linkLabel?: string;
}) {
  return (
    <SettingsV2Card>
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-cos-border bg-cos-bg p-2">
          <Icon className="h-5 w-5 text-cos-text" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
            {title}
          </p>
          <p className="mt-1 font-display text-xl text-cos-text">{value}</p>
          {subvalue ? (
            <p className="mt-0.5 text-sm text-cos-muted">{subvalue}</p>
          ) : null}
          {linkLabel && onClick ? (
            <button
              type="button"
              onClick={onClick}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cos-text transition-colors hover:text-cos-primary"
            >
              {linkLabel}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </div>
    </SettingsV2Card>
  );
}

export function TeamAccessSummaryCards({
  activeCount,
  seatLimit,
  pendingCount,
  roleCount,
  committeeCount,
  openRoleCount,
  onViewInvites,
  onViewRoles,
}: TeamAccessSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        icon={Users}
        title="Active members"
        value={`${activeCount} of ${seatLimit} seats`}
      />
      <SummaryCard
        icon={UserPlus}
        title="Pending invites"
        value={String(pendingCount)}
        onClick={onViewInvites}
        linkLabel="View invites"
      />
      <SummaryCard
        icon={Shield}
        title="Roles"
        value={String(roleCount)}
        onClick={onViewRoles}
        linkLabel="View roles"
      />
      <SummaryCard
        icon={Briefcase}
        title="Committees"
        value={String(committeeCount)}
        subvalue="Across all VPs"
      />
      <SummaryCard
        icon={UsersRound}
        title="Open committee roles"
        value={String(openRoleCount)}
        subvalue="Need volunteers"
      />
    </div>
  );
}
