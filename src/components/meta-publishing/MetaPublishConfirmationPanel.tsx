"use client";

import { CalendarCheck, CheckCircle2, PartyPopper } from "lucide-react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { planDueDateToScheduledTime } from "@/lib/campaign-plan/plan-milestone-display";
import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import { CAMPAIGN_WORKFLOW_STEP_LABELS } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { NextMilestoneTarget } from "@/lib/meta-publishing/next-milestone";
import { formatDateTime } from "@/lib/utils/dates";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

export type MetaPublishConfirmationAction = "scheduled" | "published";

function formatConfirmationWhen(isoOrEmpty: string): string {
  if (!isoOrEmpty) {
    return "";
  }
  return formatDateTime(isoOrEmpty).replace(/,([^,]*)$/, " at$1");
}

function resolveWhen(bundle: MetaPublishBundle): string {
  if (bundle.scheduledFor) {
    return formatConfirmationWhen(bundle.scheduledFor);
  }
  if (bundle.dueDate) {
    const planned = planDueDateToScheduledTime(bundle.dueDate);
    return planned ? formatConfirmationWhen(planned) : "";
  }
  return formatConfirmationWhen(new Date().toISOString());
}

interface MetaPublishConfirmationPanelProps {
  bundle: MetaPublishBundle;
  action: MetaPublishConfirmationAction;
  nextMilestone: NextMilestoneTarget | null;
  allComplete: boolean;
  onNextMilestone?: (step: CampaignWorkflowStep, relativeDay: number) => void;
  onViewPublished?: () => void;
  onContinueReviewing?: () => void;
}

export function MetaPublishConfirmationPanel({
  bundle,
  action,
  nextMilestone,
  allComplete,
  onNextMilestone,
  onViewPublished,
  onContinueReviewing,
}: MetaPublishConfirmationPanelProps) {
  const when = resolveWhen(bundle);
  const statusLine =
    action === "scheduled"
      ? when
        ? `Scheduled for ${when}`
        : "Scheduled for later"
      : when
        ? `Published on ${when}`
        : "Published";

  const showFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const showStory = isStorySurfaceEnabled(bundle.metaPublishSurfaces);
  const Icon = action === "scheduled" ? CalendarCheck : CheckCircle2;

  return (
    <Card padding="none" className="overflow-hidden border-emerald-200 bg-emerald-50/40">
      <CardHeader className="border-b border-emerald-100 px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-emerald-800 uppercase">
              {action === "scheduled" ? "Scheduled" : "Published"}
            </p>
            <CardTitle className="mt-1 font-display text-2xl text-cos-text">
              {bundle.title}
            </CardTitle>
            <CardDescription className="mt-2 text-base text-cos-text">
              {statusLine}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {(showFeed || showStory) && (
        <div className="flex gap-3 border-b border-emerald-100 px-6 py-4">
          {showFeed && (
            <ArtworkLightboxThumbnail
              src={bundle.feedArtworkUrl}
              alt={`${bundle.title} feed artwork`}
              label="Feed 1:1"
              variant="feed"
              wrapperClassName="w-20"
              frameClassName="aspect-square"
              placeholder="Feed"
            />
          )}
          {showStory && (
            <ArtworkLightboxThumbnail
              src={bundle.storyArtworkUrl}
              alt={`${bundle.title} story artwork`}
              label="Story"
              variant="story"
              wrapperClassName="w-14"
              frameClassName="aspect-[9/16]"
              placeholder="Story"
            />
          )}
        </div>
      )}

      <div className="space-y-3 px-6 py-5">
        {allComplete ? (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white/80 px-4 py-3">
              <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
              <p className="text-sm text-cos-text">
                All milestones are scheduled or published. You&apos;re done with Review &amp;
                publish for this event.
              </p>
            </div>
            {onViewPublished && (
              <Button type="button" onClick={onViewPublished}>
                View Published step
              </Button>
            )}
          </>
        ) : nextMilestone ? (
          <Button
            type="button"
            onClick={() => onNextMilestone?.(nextMilestone.step, nextMilestone.relativeDay)}
          >
            Next milestone: {nextMilestone.title}
          </Button>
        ) : null}

        {onContinueReviewing && !allComplete && (
          <button
            type="button"
            className="text-sm text-cos-muted underline-offset-2 hover:text-cos-text hover:underline"
            onClick={onContinueReviewing}
          >
            Review other milestones
          </button>
        )}

        {nextMilestone && !allComplete && (
          <p className="text-xs text-cos-muted">
            Opens {CAMPAIGN_WORKFLOW_STEP_LABELS[nextMilestone.step]} for{" "}
            {nextMilestone.title}.
          </p>
        )}
      </div>
    </Card>
  );
}
