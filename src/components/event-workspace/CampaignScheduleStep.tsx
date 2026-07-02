"use client";

import { CalendarClock } from "lucide-react";
import { MetaPublishBundlesPanel } from "@/components/meta-publishing/MetaPublishBundlesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { scheduleAllReadyMetaBundlesAction } from "@/lib/meta-publishing/actions";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignScheduleStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  metaSocialCaptionMilestones: MetaSocialCaptionMilestone[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
}

export function CampaignScheduleStep({
  eventId,
  metaPublishBundles,
  metaSocialCaptionMilestones,
  aiStatus,
  userRole,
}: CampaignScheduleStepProps) {
  const hasBundles = metaPublishBundles.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">Schedule</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">Posts & Schedule</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
          Draft captions and prepare each milestone in your communication plan. Expand any row
          for artwork previews, channel details, and caption editing. Plans change? Use{" "}
          <span className="text-cos-text">Don&apos;t need this post</span> on any milestone you
          want to drop.
        </p>
      </header>

      {!hasBundles ? (
        <EmptyState
          icon={CalendarClock}
          title="No posts for this plan"
          description="Approve artwork first — your communication milestones will appear here."
        />
      ) : (
        <MetaPublishBundlesPanel
          eventId={eventId}
          bundles={metaPublishBundles}
          mode="schedule"
          captionMilestones={metaSocialCaptionMilestones}
          aiStatus={aiStatus}
          userRole={userRole}
          onScheduleAll={() => scheduleAllReadyMetaBundlesAction(eventId)}
        />
      )}
    </div>
  );
}
