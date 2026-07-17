"use client";

import Link from "next/link";
import { MoreHorizontal, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import {
  peopleLoginStatus,
  peopleLoginStatusLabel,
  peopleRelatedEventIds,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";

interface TeamAccessMemberTableProps {
  members: UnifiedTeamMember[];
  search: string;
  roleFilter: string;
  eventFilter: string;
  statusFilter: string;
  eventOptions: Array<{ id: string; title: string }>;
  eventTitlesById: Map<string, string>;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onEventFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectMember: (member: UnifiedTeamMember) => void;
  onMoreActions: (member: UnifiedTeamMember, anchor: DOMRect) => void;
  canManage: boolean;
  peopleCount?: number;
}

const filterSelectClass =
  "h-11 w-full rounded-lg border border-cos-border bg-white px-3 text-sm text-cos-text shadow-sm focus:border-cos-primary focus:outline-none focus:ring-2 focus:ring-cos-primary/15 sm:w-[10rem]";

function loginStatusBadge(member: UnifiedTeamMember) {
  const status = peopleLoginStatus(member);
  const label = peopleLoginStatusLabel(status);
  switch (status) {
    case "active":
      return <Badge variant="success">{label}</Badge>;
    case "invited":
      return <Badge variant="warning">{label}</Badge>;
    case "inactive":
      return <Badge variant="default">Inactive</Badge>;
    case "not_invited":
      return (
        <Badge variant="default" className="bg-[#ece8e1] text-cos-muted">
          Not Invited
        </Badge>
      );
  }
}

function AssignedEventsCell({
  member,
  eventTitlesById,
}: {
  member: UnifiedTeamMember;
  eventTitlesById: Map<string, string>;
}) {
  const ids = peopleRelatedEventIds(member);
  if (ids.length === 0) {
    return <span className="text-cos-muted">—</span>;
  }

  if (ids.length === 1) {
    const eventId = ids[0]!;
    const title = eventTitlesById.get(eventId) ?? "Event";
    return (
      <Link
        href={`/events/${eventId}`}
        onClick={(event) => event.stopPropagation()}
        className="block min-w-0 truncate text-sm font-medium text-cos-text hover:underline"
      >
        {title}
      </Link>
    );
  }

  return (
    <span className="text-sm font-medium tabular-nums text-cos-text">
      {ids.length}
    </span>
  );
}

export function TeamAccessMemberTable({
  members,
  search,
  roleFilter,
  eventFilter,
  statusFilter,
  eventOptions,
  eventTitlesById,
  onSearchChange,
  onRoleFilterChange,
  onEventFilterChange,
  onStatusFilterChange,
  onSelectMember,
  onMoreActions,
  canManage,
  peopleCount,
}: TeamAccessMemberTableProps) {
  const roleOptions = [
    ...new Set(members.map((member) => member.accessLabel).filter(Boolean)),
  ].sort();
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
          Roles, event assignments, and login access in one place.
        </p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by person, role, or event..."
            className="h-12 pl-10 text-base shadow-sm"
            aria-label="Search by person, role, or event"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
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
          value={eventFilter}
          onChange={(event) => onEventFilterChange(event.target.value)}
          aria-label="Filter by event"
          className={filterSelectClass}
        >
          <option value="">All Events</option>
          {eventOptions.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          aria-label="Filter by login status"
          className={filterSelectClass}
        >
          <option value="">All Login Status</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="not_invited">Not Invited</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[18%]" />
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            {canManage ? <col className="w-[8%]" /> : null}
          </colgroup>
          <thead>
            <tr className="border-b border-cos-border text-[11px] uppercase tracking-[0.08em] text-cos-muted">
              <th className="pb-3.5 pr-3 font-medium">Person</th>
              <th className="pb-3.5 pr-3 font-medium">Role</th>
              <th className="pb-3.5 pr-3 font-medium">Assigned Events</th>
              <th className="pb-3.5 pr-3 font-medium">Login Status</th>
              {canManage ? (
                <th className="pb-3.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="py-12 text-center text-cos-muted"
                >
                  No people match your search or filters.
                </td>
              </tr>
            ) : (
              members.map((member) => {
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
                          <p className="mt-0.5 truncate text-sm text-cos-muted">
                            {member.emailMissing || !member.email.trim()
                              ? "No email"
                              : member.email}
                          </p>
                          {member.phone ? (
                            <p className="mt-0.5 truncate text-xs text-cos-muted/90">
                              {member.phone}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="truncate py-4.5 pr-3 align-middle text-sm font-medium text-cos-text">
                      {member.accessLabel}
                    </td>
                    <td className="py-4.5 pr-3 align-middle">
                      <AssignedEventsCell
                        member={member}
                        eventTitlesById={eventTitlesById}
                      />
                    </td>
                    <td className="py-4.5 pr-3 align-middle">
                      {loginStatusBadge(member)}
                    </td>
                    {canManage ? (
                      <td className="py-4.5 align-middle">
                        <div
                          className="flex justify-end"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(event) => {
                              const rect =
                                event.currentTarget.getBoundingClientRect();
                              onMoreActions(member, rect);
                            }}
                            aria-label={`Actions for ${member.displayName}`}
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
