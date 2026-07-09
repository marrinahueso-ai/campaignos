"use client";

import { useEffect, useRef } from "react";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";

interface TeamAccessMoreActionsMenuProps {
  member: UnifiedTeamMember | null;
  anchor: DOMRect | null;
  onClose: () => void;
  onViewProfile: () => void;
  onEdit: () => void;
  onAssignCommittee: () => void;
  onViewTasks: () => void;
  onViewApprovals: () => void;
  onSendMessage: () => void;
  onInvite: () => void;
  onDeactivate: () => void;
  onArchive: () => void;
  onRemove: () => void;
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
  onSendMessage,
  onInvite,
  onDeactivate,
  onArchive,
  onRemove,
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

  const items = [
    { id: "profile", label: "View profile" },
    { id: "edit", label: "Edit" },
    { id: "assign", label: "Assign committee" },
    { id: "tasks", label: "View tasks" },
    { id: "approvals", label: "View approvals" },
    { id: "message", label: "Send message" },
    ...(member.isRosterOnly || member.emailMissing
      ? [{ id: "invite", label: "Invite" }]
      : []),
    ...(member.raw
      ? [{ id: "deactivate", label: "Deactivate" }]
      : []),
    { id: "archive", label: "Archive" },
    ...(member.raw ? [{ id: "remove", label: "Remove", danger: true }] : []),
  ] as const;

  const handlers: Record<string, () => void> = {
    profile: onViewProfile,
    edit: onEdit,
    assign: onAssignCommittee,
    tasks: onViewTasks,
    approvals: onViewApprovals,
    message: onSendMessage,
    invite: onInvite,
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
