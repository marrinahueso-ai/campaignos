"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { CreativeStudioStepHeader } from "@/components/event-workspace/plan/CreativeStudioStepHeader";
import type { ReviewPublishPlatformId } from "@/components/event-workspace/review-publish/ReviewPublishPlatformCheckboxes";
import {
  combineDateAndTimeToIso,
  resolveDefaultScheduleDate,
  resolveDefaultScheduleTime,
  type ReviewPublishTimingOption,
} from "@/components/event-workspace/review-publish/schedule-utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import {
  allReviewPublishMetaBundlesHandled,
  bundleIsSchedulable,
  isReviewPublishVisibleBundle,
} from "@/lib/meta-publishing/bundle-display";
import {
  publishMetaBundleNowAction,
  scheduleMetaBundlesAtAction,
  setMetaPublishPlatformEnabledAction,
} from "@/lib/meta-publishing/actions";
import { findMetaPublishBundleForDay } from "@/lib/meta-publishing/milestone-workflow-badge";
import { resolveMetaPublishBundleScheduledFor } from "@/lib/meta-publishing/resolve-bundle-scheduled-for";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

const DEFAULT_PLATFORMS: Record<ReviewPublishPlatformId, boolean> = {
  instagram: true,
  facebook: true,
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
  backHref?: string;
}

export function CampaignReviewPublishPage({
  eventId,
  metaPublishBundles,
  initialExpandedDay = null,
  onFocusedMilestoneChange,
  onWorkflowStepSelect,
  onNavigateToMilestone,
  onViewPublished,
  backHref,
}: CampaignReviewPublishPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPlatformPending, startPlatformTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
  const [platforms, setPlatforms] = useState(DEFAULT_PLATFORMS);

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

  useEffect(() => {
    if (!primaryBundle) {
      return;
    }

    setPlatforms({
      instagram: primaryBundle.publishPlatforms.instagram,
      facebook: primaryBundle.publishPlatforms.facebook,
    });
  }, [primaryBundle]);

  function togglePlatform(id: ReviewPublishPlatformId) {
    if (selectedRelativeDay == null) {
      return;
    }

    setError(null);
    setPlatforms((current) => {
      const nextEnabled = !current[id];
      const previousEnabled = current[id];

      startPlatformTransition(async () => {
        try {
          const result = await setMetaPublishPlatformEnabledAction(
            eventId,
            selectedRelativeDay,
            id,
            nextEnabled,
          );

          if (!result.success) {
            setPlatforms((latest) => ({ ...latest, [id]: previousEnabled }));
            setError(result.error ?? "Unable to update publish platforms.");
            return;
          }

          router.refresh();
        } catch {
          setPlatforms((latest) => ({ ...latest, [id]: previousEnabled }));
          setError("Unable to update publish platforms. Refresh the page and try again.");
        }
      });

      return { ...current, [id]: nextEnabled };
    });
  }

  const activeMetaBundles = metaPublishBundles.filter(
    (bundle) => bundle.isMetaPost && bundle.status !== "skipped",
  );
  const visibleBundles = metaPublishBundles.filter(isReviewPublishVisibleBundle);

  function handleEditCaptionsOrArtwork(step: CampaignWorkflowStep) {
    if (selectedRelativeDay != null && onNavigateToMilestone) {
      onNavigateToMilestone(step, selectedRelativeDay);
      return;
    }

    onWorkflowStepSelect?.(step);
  }

  function handleSelectMilestone(relativeDay: number) {
    setSelectedRelativeDay(relativeDay);
  }

  const showMilestoneBar =
    reviewMilestones.length > 0 && selectedRelativeDay != null;

  function runPublishNow() {
    if (!platforms.instagram && !platforms.facebook) {
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
        let handledCount = 0;
        let firstError: string | null = null;

        for (const relativeDay of relativeDays) {
          const result = await publishMetaBundleNowAction(eventId, relativeDay);
          if (result.success) {
            handledCount += 1;
          } else {
            firstError ??= result.error ?? "Unable to publish.";
          }
        }

        if (handledCount === 0) {
          setError(firstError ?? "Unable to publish.");
          return;
        }

        router.refresh();
        onViewPublished?.();
      } catch {
        setError("Unable to publish. Refresh the page and try again.");
      }
    });
  }

  function runScheduleForLater() {
    if (!platforms.instagram && !platforms.facebook) {
      setError("Select at least one platform to schedule.");
      return;
    }

    const scheduledFor = combineDateAndTimeToIso(scheduleDate, scheduleTime);
    if (!scheduledFor) {
      setError("Enter a valid date and time.");
      return;
    }

    const relativeDays = focusBundles
      .filter((bundle) => bundleIsSchedulable(bundle))
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

        router.refresh();
        onViewPublished?.();
      } catch {
        setError("Unable to schedule milestones. Refresh the page and try again.");
      }
    });
  }

  function runSaveDraft() {
    setError(null);
    setTimingOption("draft");
    router.refresh();
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

  return (
    <div className="space-y-6">
      <CreativeStudioStepHeader
        eventId={eventId}
        title="Review & publish"
        description="Review your content and choose when and where to publish."
        backHref={backHref}
      />

      <div className="overflow-hidden border border-cos-border bg-cos-card">
        <CaptionsProgressStepper
          activeStep="publish"
          onStepSelect={onWorkflowStepSelect}
        />

        <div className="p-5 lg:p-6">
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
              publishPlatforms={platforms}
              schedulePlatforms={platforms}
              onPublishPlatformToggle={togglePlatform}
              onSchedulePlatformToggle={togglePlatform}
              platformsDisabled={isPlatformPending}
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
          isPlatformPending={isPlatformPending}
          onSaveDraft={runSaveDraft}
          onScheduleForLater={runScheduleForLater}
          onPublishNow={runPublishNow}
        />
      </div>
    </div>
  );
}
