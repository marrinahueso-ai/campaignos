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

  return (
    <TeamAccessDrawer open={open} onClose={onClose} width="lg">
      <div className="flex h-full flex-col px-6 py-6">
        <h2 className="font-display text-2xl text-cos-text">Open tasks</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Jump to the Tasks hub for {member.displayName}.
        </p>

        <div className="mt-6 flex-1">
          <p className="text-sm text-cos-muted">
            Person-level task filtering is coming next. Open Tasks to review the
            full workspace list.
          </p>
        </div>

        <div className="border-t border-cos-border pt-4">
          <Button href="/tasks" onClick={onClose}>
            Open Tasks
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TeamAccessDrawer>
  );
}
