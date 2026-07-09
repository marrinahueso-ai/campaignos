"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TeamAccessDrawer } from "@/components/settings-v2/team-access/TeamAccessDrawer";
import type { UnifiedTeamMember } from "@/components/settings-v2/team-access/team-access-utils";

interface TeamAccessOpenTasksDrawerProps {
  open: boolean;
  onClose: () => void;
  member: UnifiedTeamMember | null;
}

export function TeamAccessOpenTasksDrawer({
  open,
  onClose,
  member,
}: TeamAccessOpenTasksDrawerProps) {
  if (!member) {
    return null;
  }

  const tasksUrl = `/tasks?member=${encodeURIComponent(member.displayName)}`;

  return (
    <TeamAccessDrawer open={open} onClose={onClose} width="lg">
      <div className="flex h-full flex-col px-6 py-6">
        <h2 className="font-display text-2xl text-cos-text">Open tasks</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Tasks assigned to {member.displayName}
        </p>

        <div className="mt-6 flex-1">
          <p className="text-sm text-cos-muted">
            Task counts are loaded from the task hub. View the full filtered list in
            Tasks.
          </p>
          <div className="mt-6 rounded-lg border border-cos-border p-4">
            <p className="text-sm text-cos-text">
              Filter: <span className="font-medium">{member.displayName}</span>
            </p>
            <p className="mt-2 text-xs text-cos-muted">
              Committee and campaign filters available on the Tasks page.
            </p>
          </div>
        </div>

        <div className="border-t border-cos-border pt-4">
          <Button href={tasksUrl} onClick={onClose}>
            View all tasks
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TeamAccessDrawer>
  );
}
