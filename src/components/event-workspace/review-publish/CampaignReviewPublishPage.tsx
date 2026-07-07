"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Send } from "lucide-react";
import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { MilestoneScheduleBar } from "@/components/event-workspace/MilestoneScheduleBar";
import {
  buildReviewPostsFromBundles,
  resolveFocusBundles,
} from "@/components/event-workspace/review-publish/build-review-posts";
import { ReviewPublishContentPanel } from "@/components/event-workspace/review-publish/ReviewPublishContentPanel";
import { ReviewPublishFooterActions } from "@/components/event-workspace/review-publish/ReviewPublishFooterActions";
import { ReviewPublishOptionsPanel } from "@/components/event-workspace/review-publish/ReviewPublishOptionsPanel";
import { ReviewPublishPageHeader } from "@/components/event-workspace/review-publish/ReviewPublishPageHeader";
import type { ReviewPublishPlatformId } from "@/components/event-workspace/review-publish/ReviewPublishPlatformCheckboxes";
import {
  combineDateAndTimeToIso,
  resolveDefaultScheduleDate,
  resolveDefaultScheduleTime,
  type ReviewPublishTimingOption,
} from "@/components/event-workspace/review-publish/schedule-utils";
import { MetaPublishConfirmationPanel } from "@/components/meta-publishing/MetaPublishConfirmationPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import {
  allReviewPublishMetaBundlesHandled,
  isReviewPublishVisibleBundle,
} from "@/lib/meta-publishing/bundle-display";
import {
  publishMetaBundleNowAction,
  scheduleMetaBundlesAtAction,
} from "@/lib/meta-publishing/actions";
import {
  allMetaMilestonesComplete,
  findNextIncompleteMilestone,
} from "@/lib/meta-publishing/next-milestone";
import { findMetaPublishBundleForDay } from "@/lib/meta-publishing/milestone-workflow-badge";
import { resolveMetaPublishBundleScheduledFor } from "@/lib/meta-publishing/resolve-bundle-scheduled-for";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

const DEFAULT_PUBLISH_PLATFORMS: Record<ReviewPublishPlatformId, boolean> = {
  instagram: true,
  facebook: true,
};

const DEFAULT_SCHEDULE_PLATFORMS: Record<ReviewPublishPlatformId, boolean> = {
  instagram: false,
  facebook: false,
};

function resolveReviewPublishRelativeDay(
  milestones: { relativeDay: number }[],
  preferredDay: number | null | undefined,
): number | null {
  if (milestones.length === 0) {
    return null;
  }

  if (
    preferredDay != null &&
    milestones.some((milestone) => milestone.relativeDay === preferredDay)
  ) {
    return preferredDay;
  }

  return milestones[0]?.relativeDay ?? null;
}

interface CampaignReviewPublishPageProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
  approvalRoleLabel?: string | null;
  initialExpandedDay?: number | null;
  onFocusedMilestoneChange?: (relativeDay: number) => void;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  onNavigateToMilestone?: (step: CampaignWorkflowStep, relativeDay: number) => void;
  onViewPublished?: () => void;
}

type ConfirmationState = {
  relativeDay: number;
  action: "scheduled" | "published";
};

export function CampaignReviewPublishPage({
  eventId,
  metaPublishBundles,
  approvalRoleLabel = null,
  initialExpandedDay = null,
  onFocusedMilestoneChange,
  onWorkflowStepSelect,
  onNavigateToMilestone,
  onViewPublished,
}: CampaignReviewPublishPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  const reviewMilestones = useMemo(
    () =>
      metaPublishBundles
        .filter((bundle) => bundle.isMetaPost && bundle.status !== "skipped")
        .map((bundle) => ({
          relativeDay: bundle.relativeDay,
          title: bundle.title,
        }))
        .sort((left, right) => left.relativeDay - right.relativeDay),
    [metaPublishBundles],
  );

  const [selectedRelativeDay, setSelectedRelativeDay] = useState<number | null>(() =>
    resolveReviewPublishRelativeDay(reviewMilestones, initialExpandedDay),
  );

  useEffect(() => {
    setSelectedRelativeDay((current) =>
      resolveReviewPublishRelativeDay(reviewMilestones, initialExpandedDay ?? current),
    );
  }, [initialExpandedDay, reviewMilestones]);

  useEffect(() => {
    if (selectedRelativeDay != null) {
      onFocusedMilestoneChange?.(selectedRelativeDay);
    }
  }, [onFocusedMilestoneChange, selectedRelativeDay]);

  const [timingOption, setTimingOption] = useState<ReviewPublishTimingOption>("now");
  const [bestTimeSuggestions, setBestTimeSuggestions] = useState(true);
  const [publishPlatforms, setPublishPlatforms] = useState(DEFAULT_PUBLISH_PLATFORMS);
  const [schedulePlatforms, setSchedulePlatforms] = useState(DEFAULT_SCHEDULE_PLATFORMS);

  const focusBundles = useMemo(
    () => resolveFocusBundles(metaPublishBundles, selectedRelativeDay),
    [metaPublishBundles, selectedRelativeDay],
  );

  const selectedBundle =
    selectedRelativeDay != null
      ? findMetaPublishBundleForDay(metaPublishBundles, selectedRelativeDay)
      : undefined;
  const primaryBundle = focusBundles[0] ?? selectedBundle;
  const posts = useMemo(() => buildReviewPostsFromBundles(focusBundles), [focusBundles]);

  const [scheduleDate, setScheduleDate] = useState(() =>
    resolveDefaultScheduleDate(primaryBundle?.scheduledFor, primaryBundle?.dueDate),
  );
  const [scheduleTime, setScheduleTime] = useState(() =>
    resolveDefaultScheduleTime(primaryBundle?.scheduledFor),
  );

  useEffect(() => {
    if (!bestTimeSuggestions || !primaryBundle) {
      return;
    }

    setScheduleDate(
      resolveDefaultScheduleDate(primaryBundle.scheduledFor, primaryBundle.dueDate),
    );
    setScheduleTime(resolveDefaultScheduleTime(primaryBundle.scheduledFor));
  }, [bestTimeSuggestions, primaryBundle]);

  const togglePublishPlatform = useCallback((id: ReviewPublishPlatformId) => {
    setPublishPlatforms((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const toggleSchedulePlatform = useCallback((id: ReviewPublishPlatformId) => {
    setSchedulePlatforms((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const activeMetaBundles = metaPublishBundles.filter(
    (bundle) => bundle.isMetaPost && bundle.status !== "skipped",
  );
  const visibleBundles = metaPublishBundles.filter(isReviewPublishVisibleBundle);

  const confirmationBundle = confirmation
    ? metaPublishBundles.find((bundle) => bundle.relativeDay === confirmation.relativeDay)
    : null;

  const nextMilestone =
    confirmationBundle && confirmation
      ? findNextIncompleteMilestone(metaPublishBundles, confirmation.relativeDay)
      : null;
  const allComplete = confirmationBundle
    ? allMetaMilestonesComplete(metaPublishBundles)
    : false;

  function handleEditCaptionsOrArtwork(step: CampaignWorkflowStep) {
    onWorkflowStepSelect?.(step);
  }

  function handleSelectMilestone(relativeDay: number) {
    setSelectedRelativeDay(relativeDay);
  }

  const showMilestoneBar =
    reviewMilestones.length > 0 && selectedRelativeDay != null;

  function runPublishNow() {
    if (!publishPlatforms.instagram && !publishPlatforms.facebook) {
      setError("Select at least one platform to publish.");
      return;
    }

    const relativeDays = focusBundles
      .filter((bundle) => ["ready", "scheduled", "approved", "failed"].includes(bundle.status))
      .map((bundle) => bundle.relativeDay);

    if (relativeDays.length === 0) {
      setError("Nothing ready to publish yet.");
      return;
    }

    setError(null);
    setTimingOption("now");
    startTransition(async () => {
      try {
        let publishedCount = 0;
        let firstError: string | null = null;

        for (const relativeDay of relativeDays) {
          const result = await publishMetaBundleNowAction(eventId, relativeDay);
          if (result.success) {
            publishedCount += result.publishedCount ?? 0;
          } else {
            firstError ??= result.error ?? "Unable to publish.";
          }
        }

        if (publishedCount === 0) {
          setError(firstError ?? "Unable to publish.");
          return;
        }

        setConfirmation({ relativeDay: relativeDays[0], action: "published" });
        router.refresh();
      } catch {
        setError("Unable to publish. Refresh the page and try again.");
      }
    });
  }

  function runScheduleForLater() {
    const scheduledFor = combineDateAndTimeToIso(scheduleDate, scheduleTime);
    if (!scheduledFor) {
      setError("Enter a valid date and time.");
      return;
    }

    const relativeDays = focusBundles
      .filter((bundle) => bundle.status === "ready")
      .map((bundle) => bundle.relativeDay);

    if (relativeDays.length === 0) {
      setError("No milestones are ready to schedule yet.");
      return;
    }

    setError(null);
    setTimingOption("schedule");
    startTransition(async () => {
      try {
        const result = await scheduleMetaBundlesAtAction(eventId, scheduledFor, relativeDays);
        if (!result.success) {
          setError(result.error ?? "Unable to schedule milestones.");
          return;
        }

        setConfirmation({ relativeDay: relativeDays[0], action: "scheduled" });
        router.refresh();
      } catch {
        setError("Unable to schedule milestones. Refresh the page and try again.");
      }
    });
  }

  function runSaveDraft() {
    setError(null);
    setTimingOption("draft");
  }

  if (activeMetaBundles.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Nothing ready to publish"
        description="Approve artwork and captions in Captions first."
        action={{ label: "Go to Captions", href: "#schedule" }}
      />
    );
  }

  if (
    visibleBundles.length === 0 &&
    allReviewPublishMetaBundlesHandled(metaPublishBundles)
  ) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="All milestones handled"
        description="Published posts appear in the Published step. Need to adjust captions? Go back to Captions."
        action={{ label: "Go to Captions", href: "#schedule" }}
      />
    );
  }

  if (visibleBundles.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Nothing ready to publish"
        description="Approve artwork and captions in Captions first."
        action={{ label: "Go to Captions", href: "#schedule" }}
      />
    );
  }

  if (confirmation && confirmationBundle) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden border border-cos-border bg-cos-card">
          <CaptionsProgressStepper
            activeStep="publish"
            onStepSelect={onWorkflowStepSelect}
          />
          <div className="p-5 lg:p-6">
            <MetaPublishConfirmationPanel
              bundle={confirmationBundle}
              action={confirmation.action}
              approvalRoleLabel={approvalRoleLabel}
              nextMilestone={nextMilestone}
              allComplete={allComplete}
              onNextMilestone={onNavigateToMilestone}
              onViewPublished={onViewPublished}
              onContinueReviewing={() => setConfirmation(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden border border-cos-border bg-cos-card">
        <CaptionsProgressStepper
          activeStep="publish"
          onStepSelect={onWorkflowStepSelect}
        />

        <div className="p-5 lg:p-6">
          <ReviewPublishPageHeader />

          {showMilestoneBar && (
            <MilestoneScheduleBar
              milestones={reviewMilestones}
              selectedRelativeDay={selectedRelativeDay}
              onSelectMilestone={handleSelectMilestone}
              scheduledFor={resolveMetaPublishBundleScheduledFor(selectedBundle)}
              className="-mx-5 mb-5 lg:-mx-6 lg:mb-6"
            />
          )}

          {error && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(300px,1fr)] lg:gap-6">
            <ReviewPublishContentPanel
              posts={posts}
              onEditCaptionsOrArtwork={handleEditCaptionsOrArtwork}
            />

            <ReviewPublishOptionsPanel
              timingOption={timingOption}
              onTimingOptionChange={setTimingOption}
              bestTimeSuggestions={bestTimeSuggestions}
              onBestTimeSuggestionsChange={setBestTimeSuggestions}
              publishPlatforms={publishPlatforms}
              schedulePlatforms={schedulePlatforms}
              onPublishPlatformToggle={togglePublishPlatform}
              onSchedulePlatformToggle={toggleSchedulePlatform}
              scheduleDate={scheduleDate}
              scheduleTime={scheduleTime}
              onScheduleDateChange={setScheduleDate}
              onScheduleTimeChange={setScheduleTime}
            />
          </div>
        </div>

        <ReviewPublishFooterActions
          timingOption={timingOption}
          isPending={isPending}
          onSaveDraft={runSaveDraft}
          onScheduleForLater={runScheduleForLater}
          onPublishNow={runPublishNow}
        />
      </div>
    </div>
  );
}
