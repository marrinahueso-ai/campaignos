"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MetaSocialCaptionMilestoneCard } from "@/components/meta-captions/MetaSocialCaptionField";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { generateAllMetaSocialCaptionsAction } from "@/lib/meta-captions/actions";
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
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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
  const expandedMilestone =
    expandedDay != null
      ? milestones.find((milestone) => milestone.relativeDay === expandedDay)
      : null;
  const showExpandedPublishCta =
    expandedMilestone != null &&
    isMilestoneComplete(expandedMilestone) &&
    Boolean(onNavigateToPublish);

  function runGenerateAll() {
    setError(null);
    startTransition(async () => {
      const result = await generateAllMetaSocialCaptionsAction(eventId);
      if (!result.success) {
        setError(result.error ?? "Unable to generate captions.");
        return;
      }
      router.refresh();
    });
  }

  function toggleMilestone(relativeDay: number) {
    setExpandedDay((current) => (current === relativeDay ? null : relativeDay));
  }

  if (milestones.length === 0) {
    return null;
  }

  return (
    <Card padding="none">
      <CardHeader className="px-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Meta social captions</CardTitle>
            <CardDescription>
              Draft feed captions — story auto-syncs from feed. Approve each milestone when both
              are ready for Schedule.
            </CardDescription>
          </div>
          <Button
            type="button"
            disabled={isPending || !aiStatus.available}
            onClick={runGenerateAll}
            title={aiStatus.available ? undefined : (aiStatus.reason ?? undefined)}
          >
            <Sparkles className="h-4 w-4" />
            {isPending ? "Generating…" : "Generate all social captions"}
          </Button>
        </div>
        {approvedCount > 0 && (
          <p className="mt-2 text-xs text-emerald-700">
            {approvedCount} of {milestones.length} milestones approved for Schedule
            {approvalRoleLabel ? ` · Approver: ${approvalRoleLabel}` : ""}
          </p>
        )}
        {showExpandedPublishCta && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => onNavigateToPublish?.(expandedMilestone!.relativeDay)}
            >
              Continue to Review &amp; Publish
            </Button>
          </div>
        )}
      </CardHeader>

      {error && (
        <p className="mx-5 -mt-2 mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

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
            disabled={isPending}
            approvalRoleLabel={approvalRoleLabel}
            onNavigateToPublish={onNavigateToPublish}
          />
        ))}
      </ul>
    </Card>
  );
}
