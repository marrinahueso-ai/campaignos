"use client";

import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { MilestoneCaptionPreview } from "@/components/event-workspace/MilestoneCaptionPreview";
import { EmptyState } from "@/components/ui/EmptyState";
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
import {
  milestoneWorkflowBadgeClassName,
  milestoneWorkflowBadgeLabel,
  resolvePublishWorkflowBadgeStatus,
} from "@/lib/meta-publishing/milestone-workflow-badge";
import { unscheduleMetaBundleAction } from "@/lib/meta-publishing/actions";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { formatDateTime } from "@/lib/utils/dates";
import { milestoneAccordionCardProps } from "@/lib/utils/milestone-accordion";
import { cn } from "@/lib/utils/cn";

interface PublishedScheduledMilestonesProps {
  eventId: string;
  bundles: MetaPublishBundle[];
}

function resolveBundleWhen(bundle: MetaPublishBundle): string | null {
  if (bundle.scheduledFor) {
    return bundle.scheduledFor;
  }

  if (bundle.dueDate) {
    return planDueDateToScheduledTime(bundle.dueDate);
  }

  return null;
}

function formatWhenLine(bundle: MetaPublishBundle): string {
  const when = resolveBundleWhen(bundle);
  if (!when) {
    return "Scheduled";
  }

  const formatted = formatDateTime(when);
  if (bundle.status === "approved") {
    return `Goes out ${formatted} · Queued for auto-post`;
  }

  return `Goes out ${formatted}`;
}

function ScheduledMilestoneCard({
  bundle,
  onUnschedule,
  unschedulePending,
}: {
  bundle: MetaPublishBundle;
  onUnschedule: (relativeDay: number, title: string) => void;
  unschedulePending: boolean;
}) {
  const badgeStatus = resolvePublishWorkflowBadgeStatus(bundle.status);
  const showFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const showStory = isStorySurfaceEnabled(bundle.metaPublishSurfaces);
  const hasThumbnails = showFeed || showStory;

  return (
    <article {...milestoneAccordionCardProps(false)}>
      <div className="flex items-start gap-4 border-b border-cos-border px-4 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl text-cos-text">{bundle.title}</h3>
          <p className="mt-0.5 text-xs text-cos-muted">{formatWhenLine(bundle)}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {badgeStatus && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                milestoneWorkflowBadgeClassName(badgeStatus),
              )}
            >
              {bundle.status === "approved"
                ? "Queued for auto-post"
                : milestoneWorkflowBadgeLabel(badgeStatus)}
            </span>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={unschedulePending}
            onClick={() => onUnschedule(bundle.relativeDay, bundle.title)}
          >
            {unschedulePending ? "Unscheduling…" : "Unschedule"}
          </Button>
        </div>
      </div>

      {hasThumbnails && (
        <div className="flex gap-3 p-4">
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

      <MilestoneCaptionPreview
        bundle={bundle}
        className={hasThumbnails ? "border-t border-cos-border" : undefined}
      />
    </article>
  );
}

export function PublishedScheduledMilestones({
  eventId,
  bundles,
}: PublishedScheduledMilestonesProps) {
  const router = useRouter();
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUnschedule(relativeDay: number, title: string) {
    const confirmed = window.confirm(
      `Unschedule "${title}"?\n\nIt will leave the publishing queue and be removed from the Meta planning calendar. You can schedule it again from Review & publish.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setPendingDay(relativeDay);
    startTransition(async () => {
      const result = await unscheduleMetaBundleAction(eventId, relativeDay);
      setPendingDay(null);

      if (!result.success) {
        setError(result.error ?? "Unable to unschedule this milestone.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card id="scheduled-milestones" padding="none" className="overflow-hidden scroll-mt-24">
      <CardHeader className="border-b border-cos-border px-6 py-5">
        <CardTitle>Scheduled milestones</CardTitle>
        <CardDescription>
          Meta posts queued or waiting for their go-live time.
        </CardDescription>
      </CardHeader>

      {error && (
        <p className="border-b border-cos-border px-6 py-3 text-sm text-cos-error">
          {error}
        </p>
      )}

      {bundles.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nothing scheduled yet"
          description="When you schedule posts in Review & publish, they will appear here with their go-live date and time."
          className="px-6 py-8"
        />
      ) : (
        <div className="space-y-4 p-5">
          {bundles.map((bundle) => (
            <ScheduledMilestoneCard
              key={bundle.relativeDay}
              bundle={bundle}
              onUnschedule={handleUnschedule}
              unschedulePending={isPending && pendingDay === bundle.relativeDay}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
