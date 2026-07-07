"use client";

import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { CreativeStudioStepHeader } from "@/components/event-workspace/plan/CreativeStudioStepHeader";
import { PlanningOverviewPanel } from "@/components/event-playbooks/PlanningOverviewPanel";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { MilestoneCaptionPreview } from "@/components/event-workspace/MilestoneCaptionPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublishedScheduledMilestones } from "@/components/event-workspace/PublishedScheduledMilestones";
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
import { formatDateTime } from "@/lib/utils/dates";
import { milestoneAccordionCardProps } from "@/lib/utils/milestone-accordion";
import type { MetaPublishBundle, MetaPublishBundleStatus } from "@/lib/meta-publishing/types";
import type { EventPlanningOverviewData } from "@/types/planning-overview";
import { cn } from "@/lib/utils/cn";

interface CampaignPublishedStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  planningOverview?: EventPlanningOverviewData | null;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  backHref?: string;
}

const SCHEDULED_STATUSES: MetaPublishBundleStatus[] = ["scheduled", "approved"];

function sortBundlesByWhen(bundles: MetaPublishBundle[]): MetaPublishBundle[] {
  return [...bundles].sort((left, right) => {
    const leftWhen =
      left.scheduledFor ??
      (left.dueDate ? planDueDateToScheduledTime(left.dueDate) : null) ??
      "";
    const rightWhen =
      right.scheduledFor ??
      (right.dueDate ? planDueDateToScheduledTime(right.dueDate) : null) ??
      "";

    if (leftWhen && rightWhen && leftWhen !== rightWhen) {
      return leftWhen.localeCompare(rightWhen);
    }

    return left.relativeDay - right.relativeDay;
  });
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

function formatWhenLine(bundle: MetaPublishBundle, section: "scheduled" | "published"): string {
  const when = resolveBundleWhen(bundle);
  if (!when) {
    return section === "published" ? "Published" : "Scheduled";
  }

  const formatted = formatDateTime(when);
  if (section === "published") {
    return `Published ${formatted}`;
  }

  if (bundle.status === "approved") {
    return `Goes out ${formatted} · Queued for auto-post`;
  }

  return `Goes out ${formatted}`;
}

function PublishedMilestoneCard({
  bundle,
  section,
}: {
  bundle: MetaPublishBundle;
  section: "scheduled" | "published";
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
          <p className="mt-0.5 text-xs text-cos-muted">{formatWhenLine(bundle, section)}</p>
        </div>

        {badgeStatus && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              milestoneWorkflowBadgeClassName(badgeStatus),
            )}
          >
            {section === "scheduled" && bundle.status === "approved"
              ? "Queued for auto-post"
              : milestoneWorkflowBadgeLabel(badgeStatus)}
          </span>
        )}
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

function MilestoneSection({
  title,
  description,
  bundles,
  section,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  bundles: MetaPublishBundle[];
  section: "scheduled" | "published";
  emptyIcon: typeof CalendarCheck;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader className="border-b border-cos-border px-6 py-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {bundles.length === 0 ? (
        <EmptyState
          icon={EmptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          className="px-6 py-8"
        />
      ) : (
        <div className="space-y-4 p-5">
          {bundles.map((bundle) => (
            <PublishedMilestoneCard key={bundle.relativeDay} bundle={bundle} section={section} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function CampaignPublishedStep({
  eventId,
  metaPublishBundles,
  planningOverview = null,
  onWorkflowStepSelect,
  backHref,
}: CampaignPublishedStepProps) {
  const metaBundles = metaPublishBundles.filter(
    (bundle) => bundle.isMetaPost && bundle.status !== "skipped",
  );

  const scheduledBundles = sortBundlesByWhen(
    metaBundles.filter((bundle) => SCHEDULED_STATUSES.includes(bundle.status)),
  );

  const publishedBundles = sortBundlesByWhen(
    metaBundles.filter((bundle) => bundle.status === "published"),
  );

  return (
    <div className="space-y-6">
      <CreativeStudioStepHeader
        eventId={eventId}
        title="Published"
        description="Track scheduled and live posts for this campaign."
        backHref={backHref}
      />

      <div className="overflow-hidden border border-cos-border bg-cos-card">
      <CaptionsProgressStepper
        activeStep="published"
        onStepSelect={onWorkflowStepSelect}
      />

      <div className="space-y-6 p-5 lg:p-6">
        {planningOverview ? (
          <PlanningOverviewPanel eventId={eventId} overview={planningOverview} />
        ) : null}

        <PublishedScheduledMilestones eventId={eventId} bundles={scheduledBundles} />

        <MilestoneSection
          title="Published milestones"
          description="Meta feed and story posts that have gone live for this event."
          bundles={publishedBundles}
          section="published"
          emptyIcon={CheckCircle2}
          emptyTitle="Nothing published yet"
          emptyDescription="When communications are marked published, they will appear here with their publish date and time."
        />
      </div>
      </div>
    </div>
  );
}
