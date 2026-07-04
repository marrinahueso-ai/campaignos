"use client";

import { useEffect, useState } from "react";
import { MetaSocialCaptionMilestoneCard } from "@/components/meta-captions/MetaSocialCaptionField";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";

interface MetaSocialCaptionsSectionProps {
  eventId: string;
  milestones: MetaSocialCaptionMilestone[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  /** Auto-expand a milestone when navigating from artwork approval. */
  initialExpandedDay?: number | null;
  approvalRoleLabel?: string | null;
  onNavigateToPublish?: (relativeDay: number) => void;
}

function isMilestoneComplete(milestone: MetaSocialCaptionMilestone): boolean {
  return (
    milestone.feed.status === "approved" &&
    Boolean(milestone.feed.content) &&
    milestone.story.status === "approved" &&
    Boolean(milestone.story.content)
  );
}

export function MetaSocialCaptionsSection({
  eventId,
  milestones,
  aiStatus,
  userRole,
  initialExpandedDay = null,
  approvalRoleLabel = null,
  onNavigateToPublish,
}: MetaSocialCaptionsSectionProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(initialExpandedDay);

  useEffect(() => {
    if (initialExpandedDay == null) {
      return;
    }
    setExpandedDay(initialExpandedDay);

    const timer = window.setTimeout(() => {
      document
        .getElementById(`caption-milestone-${initialExpandedDay}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [initialExpandedDay]);

  const approvedCount = milestones.filter(isMilestoneComplete).length;

  function toggleMilestone(relativeDay: number) {
    setExpandedDay((current) => (current === relativeDay ? null : relativeDay));
  }

  if (milestones.length === 0) {
    return null;
  }

  return (
    <Card padding="none">
      <CardHeader className="px-5 pt-5">
        <div>
          <CardTitle>Meta social captions</CardTitle>
          <CardDescription>
            Draft feed captions — story auto-syncs from feed. Approve each milestone when both
            are ready for Schedule.
          </CardDescription>
        </div>
        {approvedCount > 0 && (
          <p className="mt-2 text-xs text-emerald-700">
            {approvedCount} of {milestones.length} milestones approved for Schedule
            {approvalRoleLabel ? ` · Approver: ${approvalRoleLabel}` : ""}
          </p>
        )}
      </CardHeader>

      <ul className="space-y-4 px-5 pb-5">
        {milestones.map((milestone) => (
          <MetaSocialCaptionMilestoneCard
            key={milestone.relativeDay}
            eventId={eventId}
            milestone={milestone}
            aiStatus={aiStatus}
            userRole={userRole}
            expanded={expandedDay === milestone.relativeDay}
            onToggle={() => toggleMilestone(milestone.relativeDay)}
            approvalRoleLabel={approvalRoleLabel}
            onNavigateToPublish={onNavigateToPublish}
          />
        ))}
      </ul>
    </Card>
  );
}
