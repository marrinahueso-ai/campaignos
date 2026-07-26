"use client";

import { TasksV2OwnerAvatar } from "@/components/tasks-v2/TasksV2OwnerAvatar";
import type { TaskHubOrgMember } from "@/types/task-hub";

interface TasksV2AssigneeSelectProps {
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  orgMembers: TaskHubOrgMember[];
  canEdit: boolean;
  disabled?: boolean;
  /** Wider select for detail drawers. */
  fullWidth?: boolean;
  onChange: (next: {
    assigneeUserId: string | null;
    assigneeName: string | null;
    assigneeInitials: string | null;
  }) => void;
}

export function TasksV2AssigneeSelect({
  assigneeUserId,
  assigneeName,
  assigneeInitials,
  orgMembers,
  canEdit,
  disabled,
  fullWidth = false,
  onChange,
}: TasksV2AssigneeSelectProps) {
  const assignable = orgMembers.filter((member) => member.userId);

  if (!canEdit) {
    return (
      <TasksV2OwnerAvatar name={assigneeName} initials={assigneeInitials} />
    );
  }

  const selectValue =
    assigneeUserId &&
    assignable.some((member) => member.userId === assigneeUserId)
      ? assigneeUserId
      : "";

  return (
    <label
      className={
        fullWidth
          ? "inline-flex w-full items-center gap-2"
          : "inline-flex max-w-[9rem] items-center gap-1.5"
      }
    >
      <TasksV2OwnerAvatar name={assigneeName} initials={assigneeInitials} />
      <select
        value={selectValue}
        disabled={disabled}
        aria-label="Assign task"
        onChange={(event) => {
          const userId = event.target.value || null;
          if (!userId) {
            onChange({
              assigneeUserId: null,
              assigneeName: null,
              assigneeInitials: null,
            });
            return;
          }
          const member = assignable.find((entry) => entry.userId === userId);
          onChange({
            assigneeUserId: userId,
            assigneeName: member?.displayName ?? null,
            assigneeInitials: member?.initials ?? null,
          });
        }}
        className={
          fullWidth
            ? "min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent py-0.5 text-sm font-semibold text-cos-text outline-none"
            : "max-w-[6.5rem] cursor-pointer truncate border-0 bg-transparent py-0.5 text-xs text-cos-muted outline-none focus:text-cos-text"
        }
      >
        <option value="">Unassigned</option>
        {assignable.map((member) => (
          <option key={member.id} value={member.userId!}>
            {member.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
