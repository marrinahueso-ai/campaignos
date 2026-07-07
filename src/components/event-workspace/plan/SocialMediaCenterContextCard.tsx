"use client";

import { MilestonePlanningContextSelectors } from "@/components/event-workspace/plan/MilestonePlanningContextSelectors";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { Event } from "@/types";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface SocialMediaCenterContextCardProps {
  event: Event;
  playbookId: string;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
}

export function SocialMediaCenterContextCard({
  event,
  playbookId,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
}: SocialMediaCenterContextCardProps) {
  return (
    <div className="border border-cos-border bg-cos-card p-4">
      <MilestonePlanningContextSelectors
        event={event}
        playbookId={playbookId}
        availablePlaybooks={availablePlaybooks}
        vpRoles={vpRoles}
        defaultVpRoleId={defaultVpRoleId}
        committeePersonOptions={committeePersonOptions}
        defaultCommitteePerson={defaultCommitteePerson}
        layout="stacked"
        committeeLabel="Committee"
        idPrefix="social-media-center"
      />
    </div>
  );
}
