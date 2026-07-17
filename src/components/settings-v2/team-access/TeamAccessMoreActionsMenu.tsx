"use client";

import { useEffect, useRef } from "react";
import {
  peopleLoginStatus,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";

interface TeamAccessMoreActionsMenuProps {
  member: UnifiedTeamMember | null;
  anchor: DOMRect | null;
  onClose: () => void;
  onViewProfile: () => void;
  onEdit: () => void;
  onAssignCommittee: () => void;
  onViewTasks: () => void;
  onViewApprovals: () => void;
  onInvite: () => void;
  onResendInvite: () => void;
  onChangeAccess: () => void;
  onDeactivate: () => void;
  onArchive: () => void;
  onRemove: () => void;
  /** Hide deactivate/remove/archive for the signed-in user. */
  isSelf?: boolean;
}

export function TeamAccessMoreActionsMenu({
  member,
  anchor,
  onClose,
  onViewProfile,
  onEdit,
  onAssignCommittee,
  onViewTasks,
  onViewApprovals,
  onInvite,
  onResendInvite,
  onChangeAccess,
  onDeactivate,
  onArchive,
  onRemove,
  isSelf = false,
}: TeamAccessMoreActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!member || !anchor) {
    return null;
  }

  const loginStatus = peopleLoginStatus(member);

  const accessItems =
    loginStatus === "not_invited"
      ? [{ id: "invite" as const, label: "Invite to Login" }]
      : loginStatus === "invited"
        ? [{ id: "resend" as const, label: "Resend Invite" }]
        : loginStatus === "inactive"
          ? [{ id: "resend" as const, label: "Reinvite to Login" }]
          : loginStatus === "active"
            ? [{ id: "changeAccess" as const, label: "Change Access" }]
            : [];

  const items = [
    { id: "profile" as const, label: "View Profile" },
    { id: "edit" as const, label: "Edit Person" },
    { id: "assign" as const, label: "Manage Event Assignments" },
    { id: "tasks" as const, label: "View tasks" },
    { id: "approvals" as const, label: "View approvals" },
    ...accessItems,
    ...(!isSelf && member.raw
      ? [
          {
            id: "deactivate" as const,
            label:
              member.status === "deactivated"
                ? "Reactivate Access"
                : "Deactivate Access",
          },
        ]
      : []),
    ...(!isSelf ? [{ id: "archive" as const, label: "Archive" }] : []),
    ...(!isSelf && member.raw
      ? [{ id: "remove" as const, label: "Remove", danger: true as const }]
      : []),
  ];

  const handlers: Record<string, () => void> = {
    profile: onViewProfile,
    edit: onEdit,
    assign: onAssignCommittee,
    tasks: onViewTasks,
    approvals: onViewApprovals,
    invite: onInvite,
    resend: onResendInvite,
    changeAccess: onChangeAccess,
    deactivate: onDeactivate,
    archive: onArchive,
    remove: onRemove,
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] border border-cos-border bg-cos-card py-1 shadow-lg"
      style={{
        top: anchor.bottom + 4,
        left: Math.max(8, anchor.right - 180),
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            handlers[item.id]?.();
            onClose();
          }}
          className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-cos-bg ${
            "danger" in item && item.danger
              ? "text-red-600"
              : "text-cos-text"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
