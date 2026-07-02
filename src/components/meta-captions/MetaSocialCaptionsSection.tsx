"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
}: MetaSocialCaptionsSectionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const approvedCount = milestones.filter(isMilestoneComplete).length;

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
    <Card>
      <CardHeader>
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
          </p>
        )}
      </CardHeader>

      {error && (
        <p className="mx-6 -mt-2 mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-3 px-6 pb-6">
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
          />
        ))}
      </ul>
    </Card>
  );
}
