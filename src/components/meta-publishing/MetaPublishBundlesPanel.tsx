"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  MetaSocialCaptionField,
} from "@/components/meta-captions/MetaSocialCaptionField";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { generateAllMetaSocialCaptionsAction } from "@/lib/meta-captions/actions";
import { channelLabelForBundle } from "@/lib/meta-publishing/bundle-display";
import {
  publishMetaBundleNowAction,
  scheduleMetaBundleAction,
  skipMetaPublishMilestoneAction,
  unskipMetaPublishMilestoneAction,
  updatePublishModeAction,
} from "@/lib/meta-publishing/actions";
import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import {
  isManualStoryEmailMode,
  isManualStoryOnlyMode,
  type MetaPublishMode,
} from "@/lib/meta-publishing/publish-mode";
import { PublishModeSelect } from "@/components/meta-publishing/PublishModeSelect";
import { StoryPostKit } from "@/components/meta-publishing/StoryPostKit";
import { formatDateTime } from "@/lib/utils/dates";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle, MetaPublishBundleStatus } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";
import { milestoneAccordionCardProps } from "@/lib/utils/milestone-accordion";

function isBundleDeprioritized(
  bundle: MetaPublishBundle,
  optimisticSkippedDays: Set<number>,
): boolean {
  return bundle.status === "skipped" || optimisticSkippedDays.has(bundle.relativeDay);
}

function sortBundlesForDisplay(
  bundles: MetaPublishBundle[],
  optimisticSkippedDays: Set<number>,
): MetaPublishBundle[] {
  return [...bundles].sort((left, right) => {
    const leftDeprioritized = isBundleDeprioritized(left, optimisticSkippedDays);
    const rightDeprioritized = isBundleDeprioritized(right, optimisticSkippedDays);

    if (leftDeprioritized !== rightDeprioritized) {
      return leftDeprioritized ? 1 : -1;
    }

    return left.relativeDay - right.relativeDay;
  });
}

function statusLabel(bundle: MetaPublishBundle, publishPending = false): string {
  if (publishPending) {
    return "Publishing…";
  }

  if (!bundle.isMetaPost) {
    if (bundle.status === "needs_artwork") {
      return "Needs artwork";
    }
    return channelLabelForBundle(bundle);
  }

  const manualStoryOnly = isManualStoryOnlyMode(bundle.publishMode);

  switch (bundle.status) {
    case "needs_artwork":
      return "Needs artwork";
    case "needs_caption":
      return "Needs caption approval";
    case "ready":
      return manualStoryOnly ? "Ready — confirm to send post kit" : "Ready to publish";
    case "scheduled":
      return manualStoryOnly && bundle.storyReminderSentAt
        ? "Post kit sent"
        : "Scheduled";
    case "approved":
      return "Queued for auto-post";
    case "posting":
      return "Publishing…";
    case "failed":
      return "Publish failed";
    case "published":
      return "Published";
    case "skipped":
      return "Skipped";
    case "channel_only":
      return channelLabelForBundle(bundle);
  }
}

function statusClassName(status: MetaPublishBundleStatus): string {
  switch (status) {
    case "published":
    case "approved":
    case "posting":
      return "bg-emerald-50 text-emerald-700";
    case "failed":
      return "bg-red-50 text-red-700";
    case "scheduled":
      return "bg-cos-info/50 text-cos-text";
    case "ready":
      return "bg-amber-50 text-amber-800";
    case "skipped":
      return "bg-cos-bg text-cos-muted line-through decoration-cos-muted/60";
    default:
      return "bg-cos-bg text-cos-muted";
  }
}

function isMilestoneComplete(
  milestone: MetaSocialCaptionMilestone,
  surfaces: MetaPublishBundle["metaPublishSurfaces"],
): boolean {
  const feedOk =
    !isFeedSurfaceEnabled(surfaces) ||
    (milestone.feed.status === "approved" && Boolean(milestone.feed.content));
  const storyOk =
    !isStorySurfaceEnabled(surfaces) ||
    (milestone.story.status === "approved" && Boolean(milestone.story.content));
  return feedOk && storyOk;
}

interface MetaPublishBundleCardProps {
  bundle: MetaPublishBundle;
  milestone?: MetaSocialCaptionMilestone;
  showCaptionPreview?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  captionEdit?: {
    eventId: string;
    aiStatus: AiAssistantStatus;
    userRole: CampaignRole;
    disabled?: boolean;
  };
  onSkip?: () => void;
  onUnskip?: () => void;
  onSchedule?: () => void;
  onPublishNow?: () => void;
  onPublishModeChange?: (mode: MetaPublishMode) => void;
  publishModePending?: boolean;
  publishPending?: boolean;
  schedulePending?: boolean;
  skipPending?: boolean;
  approvalRoleLabel?: string | null;
  eventLink?: string | null;
  showPostKit?: boolean;
}

export function MetaPublishBundleCard({
  bundle,
  milestone,
  showCaptionPreview = true,
  expanded = false,
  onToggle,
  captionEdit,
  onSkip,
  onUnskip,
  onSchedule,
  onPublishNow,
  onPublishModeChange,
  publishModePending = false,
  publishPending = false,
  skipPending = false,
  schedulePending = false,
  approvalRoleLabel = null,
  eventLink = null,
  showPostKit = false,
}: MetaPublishBundleCardProps) {
  const isPublishing = publishPending || bundle.status === "posting";
  const displayStatus: MetaPublishBundleStatus = isPublishing ? "posting" : bundle.status;
  const isSkipped = bundle.status === "skipped";
  const isMetaPost = bundle.isMetaPost;
  const manualStoryOnly = isManualStoryOnlyMode(bundle.publishMode);
  const manualStoryEmail = isManualStoryEmailMode(bundle.publishMode);
  const canSchedule =
    isMetaPost &&
    bundle.status === "ready" &&
    Boolean(onSchedule) &&
    !isSkipped;
  const canPublishNow =
    isMetaPost &&
    Boolean(onPublishNow) &&
    !isPublishing &&
    (manualStoryOnly
      ? ["ready", "scheduled"].includes(bundle.status)
      : ["ready", "scheduled", "approved", "failed"].includes(bundle.status));
  const showFeed = isFeedSurfaceEnabled(bundle.metaPublishSurfaces);
  const showStory = isStorySurfaceEnabled(bundle.metaPublishSurfaces);
  const showPostKitSection =
    showPostKit &&
    isMetaPost &&
    !isSkipped &&
    (manualStoryEmail || showStory || showFeed) &&
    (Boolean(bundle.storyArtworkUrl) ||
      Boolean(bundle.feedArtworkUrl) ||
      Boolean(bundle.captionPreview) ||
      Boolean(bundle.storyCaptionPreview));
  const canSkip =
    !isSkipped &&
    !isPublishing &&
    bundle.status !== "published" &&
    Boolean(onSkip);
  const canUnskip = isSkipped && Boolean(onUnskip);

  return (
    <article
      {...milestoneAccordionCardProps(expanded, isSkipped ? "opacity-75" : undefined)}
    >
      <div className="flex items-start gap-2 border-b border-cos-border px-4 py-4">
        {onToggle && (
          <button
            type="button"
            className="mt-1 shrink-0 rounded-lg p-1 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse milestone" : "Expand milestone"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onToggle}
          disabled={!onToggle}
          aria-expanded={onToggle ? expanded : undefined}
        >
          <div className="min-w-0">
            <h3
              className={cn(
                "font-display text-2xl text-cos-text",
                isSkipped && "text-cos-muted",
              )}
            >
              {bundle.title}
            </h3>
            {bundle.scheduledFor && !isSkipped && (
              <p className="mt-0.5 text-xs text-cos-muted">
                {bundle.status === "published" ? "Published" : "Goes out"}{" "}
                {formatDateTime(bundle.scheduledFor)}
                {!isMetaPost && (
                  <span> · {channelLabelForBundle(bundle)}</span>
                )}
              </p>
            )}
            {!bundle.scheduledFor && isMetaPost && !isSkipped && bundle.dueDate && (
              <p className="mt-0.5 text-xs text-cos-muted">
                Planned for {formatDateTime(`${bundle.dueDate.slice(0, 10)}T10:00:00.000Z`)}
              </p>
            )}
            {approvalRoleLabel &&
              isMetaPost &&
              !isSkipped &&
              ["ready", "scheduled"].includes(bundle.status) && (
                <p className="mt-1 text-xs text-cos-muted">
                  {bundle.status === "ready"
                    ? `Publishing requires approval from ${approvalRoleLabel}`
                    : `Awaiting ${approvalRoleLabel} in Review & publish`}
                </p>
              )}
            {!isMetaPost && !isSkipped && (
              <p className="mt-1 text-xs text-cos-muted">
                Not posted to Meta — create artwork in the Artwork step.
              </p>
            )}
            {!expanded && bundle.captionPreview?.trim() && !isSkipped && isMetaPost && (
              <p className="mt-1 truncate text-xs text-cos-muted">
                {bundle.captionPreview.trim()}
              </p>
            )}
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1.5 self-start pt-1">
          {canSchedule ? (
            <Button
              type="button"
              size="sm"
              disabled={schedulePending || skipPending || publishPending}
              onClick={() => onSchedule?.()}
            >
              {schedulePending ? "Scheduling…" : "Schedule"}
            </Button>
          ) : (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusClassName(displayStatus),
              )}
            >
              {statusLabel(bundle, publishPending)}
            </span>
          )}
          {canSkip && (
            <button
              type="button"
              className="text-xs text-cos-muted underline-offset-2 transition-colors hover:text-cos-text hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={skipPending || publishPending}
              onClick={() => onSkip?.()}
            >
              {skipPending ? "Skipping…" : "Don't need this post"}
            </button>
          )}
          {canUnskip && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-cos-muted underline-offset-2 transition-colors hover:text-cos-text hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={skipPending || publishPending}
              onClick={() => onUnskip?.()}
            >
              <RotateCcw className="h-3 w-3" />
              {skipPending ? "Restoring…" : "Restore post"}
            </button>
          )}
          {canPublishNow && (
            <Button
              type="button"
              size="sm"
              disabled={publishPending || skipPending}
              onClick={() => onPublishNow?.()}
            >
              {publishPending
                ? "Working…"
                : manualStoryOnly
                  ? "Send post kit"
                  : "Publish now"}
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
            <div className="flex gap-3">
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

            <div className="min-w-0 space-y-4">
              {isSkipped ? (
                <p className="text-sm text-cos-muted">
                  This milestone is skipped — nothing will go out for{" "}
                  {channelLabelForBundle(bundle)}. Use Restore post if plans change.
                </p>
              ) : (
                <>
                  {isMetaPost && onPublishModeChange && (
                    <PublishModeSelect
                      value={bundle.publishMode}
                      disabled={publishModePending || publishPending || skipPending}
                      onChange={onPublishModeChange}
                    />
                  )}

                  {manualStoryEmail && !manualStoryOnly && bundle.status !== "ready" && (
                    <p className="text-xs text-cos-muted">
                      Story: post from your phone — post kit below.
                    </p>
                  )}

                  {manualStoryOnly && (
                    <p className="text-sm text-cos-text">
                      Post the story from your phone. Schedule or publish now to email the post kit
                      to your team.
                    </p>
                  )}

                  {showCaptionPreview && !captionEdit && isMetaPost && !showPostKitSection && (
                    <div className="space-y-2 border-t border-cos-border pt-4">
                      {showFeed && (
                        <div>
                          <p className="cos-section-title">Feed caption</p>
                          <p className="mt-1 text-sm text-cos-text">
                            {bundle.captionPreview?.trim() || "Draft captions below."}
                          </p>
                        </div>
                      )}
                      {showStory && bundle.storyCaptionPreview && (
                        <div>
                          <p className="cos-section-title">Story caption</p>
                          <p className="mt-1 text-sm text-cos-text">
                            {bundle.storyCaptionPreview}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!isMetaPost && (
                    <p className="text-sm text-cos-muted">
                      Deliver via {channelLabelForBundle(bundle)}. Artwork still lives in
                      the Artwork step if you want graphics for this milestone.
                    </p>
                  )}

                  {bundle.missingArtwork.length > 0 && (
                    <p className="text-xs text-amber-700">
                      Missing artwork: {bundle.missingArtwork.join(", ")}
                    </p>
                  )}

                  {showPostKitSection && (
                    <StoryPostKit
                      bundle={bundle}
                      milestone={milestone}
                      eventLink={eventLink}
                      defaultExpanded={manualStoryOnly || (manualStoryEmail && bundle.status !== "ready")}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {captionEdit && milestone && !isSkipped && isMetaPost && (
            <div className="divide-y divide-cos-border border-t border-cos-border">
              {showFeed && (
                <MetaSocialCaptionField
                  eventId={captionEdit.eventId}
                  relativeDay={milestone.relativeDay}
                  placement="feed"
                  label="Feed (FB + IG)"
                  caption={milestone.feed}
                  hasApprovedFeedArtwork={milestone.hasApprovedFeedArtwork}
                  aiStatus={captionEdit.aiStatus}
                  userRole={captionEdit.userRole}
                  disabled={captionEdit.disabled}
                />
              )}
              {showStory && (
                <MetaSocialCaptionField
                  eventId={captionEdit.eventId}
                  relativeDay={milestone.relativeDay}
                  placement="story"
                  label="Story (FB + IG)"
                  caption={milestone.story}
                  feedCaption={milestone.feed.content}
                  hasApprovedFeedArtwork={milestone.hasApprovedFeedArtwork}
                  aiStatus={captionEdit.aiStatus}
                  userRole={captionEdit.userRole}
                  disabled={captionEdit.disabled}
                />
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

interface MetaPublishBundlesPanelProps {
  eventId: string;
  bundles: MetaPublishBundle[];
  mode: "schedule" | "approval" | "publishing";
  captionMilestones?: MetaSocialCaptionMilestone[];
  captionsSectionSeparate?: boolean;
  aiStatus?: AiAssistantStatus;
  userRole?: CampaignRole;
  approvalRoleLabel?: string | null;
  initialExpandedDay?: number | null;
  onScheduleAll?: () => Promise<{ success: boolean; error?: string | null }>;
  onApproveAll?: () => Promise<{ success: boolean; error?: string | null }>;
  onPublishAll?: () => Promise<{ success: boolean; error?: string | null }>;
  eventLink?: string | null;
  showPostKit?: boolean;
}

export function MetaPublishBundlesPanel({
  eventId,
  bundles,
  mode,
  captionMilestones = [],
  captionsSectionSeparate = false,
  aiStatus,
  userRole,
  approvalRoleLabel = null,
  initialExpandedDay = null,
  onScheduleAll,
  onApproveAll,
  onPublishAll,
  eventLink = null,
  showPostKit = false,
}: MetaPublishBundlesPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingCaptions, startCaptionGeneration] = useTransition();
  const [skipPendingDay, setSkipPendingDay] = useState<number | null>(null);
  const [schedulePendingDay, setSchedulePendingDay] = useState<number | null>(null);
  const [publishPendingDay, setPublishPendingDay] = useState<number | null>(null);
  const [publishModePendingDay, setPublishModePendingDay] = useState<number | null>(null);
  const [optimisticSkippedDays, setOptimisticSkippedDays] = useState<Set<number>>(
    () => new Set(),
  );

  const milestoneByDay = useMemo(
    () => new Map(captionMilestones.map((milestone) => [milestone.relativeDay, milestone])),
    [captionMilestones],
  );

  const activeBundles = useMemo(
    () => bundles.filter((bundle) => bundle.isMetaPost && bundle.status !== "skipped"),
    [bundles],
  );

  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (initialExpandedDay == null) {
      return;
    }

    setExpandedDays((current) => {
      if (current.has(initialExpandedDay)) {
        return current;
      }
      return new Set(current).add(initialExpandedDay);
    });
  }, [initialExpandedDay]);

  useEffect(() => {
    setOptimisticSkippedDays((current) => {
      if (current.size === 0) {
        return current;
      }

      const next = new Set(current);
      for (const day of current) {
        const bundle = bundles.find((entry) => entry.relativeDay === day);
        if (bundle?.status === "skipped") {
          next.delete(day);
        }
      }

      return next.size === current.size ? current : next;
    });
  }, [bundles]);

  const toggleExpanded = useCallback((relativeDay: number) => {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(relativeDay)) {
        next.delete(relativeDay);
      } else {
        next.add(relativeDay);
      }
      return next;
    });
  }, []);

  const approvedCaptionCount = useMemo(
    () =>
      captionMilestones.filter((milestone) => {
        const bundle = bundles.find(
          (entry) => entry.relativeDay === milestone.relativeDay && entry.isMetaPost,
        );
        return isMilestoneComplete(
          milestone,
          bundle?.metaPublishSurfaces ?? "both",
        );
      }).length,
    [captionMilestones, bundles],
  );

  const counts = useMemo(
    () => ({
      ready: activeBundles.filter((bundle) => bundle.status === "ready").length,
      scheduled: activeBundles.filter((bundle) => bundle.status === "scheduled").length,
      approved: activeBundles.filter((bundle) => bundle.status === "approved").length,
      failed: activeBundles.filter((bundle) => bundle.status === "failed").length,
      published: activeBundles.filter((bundle) => bundle.status === "published").length,
      skipped: bundles.filter((bundle) => bundle.status === "skipped").length,
    }),
    [activeBundles, bundles],
  );

  function runAction(
    action: (() => Promise<{ success: boolean; error?: string | null }>) | undefined,
  ) {
    if (!action) return;

    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  function runScheduleMilestone(relativeDay: number) {
    setError(null);
    setSchedulePendingDay(relativeDay);
    startTransition(async () => {
      const result = await scheduleMetaBundleAction(eventId, relativeDay);
      setSchedulePendingDay(null);
      if (!result.success) {
        setError(result.error ?? "Unable to schedule this milestone.");
        return;
      }
      router.refresh();
    });
  }

  function runPublishModeChange(relativeDay: number, mode: MetaPublishMode) {
    setError(null);
    setPublishModePendingDay(relativeDay);
    startTransition(async () => {
      const result = await updatePublishModeAction(eventId, relativeDay, mode);
      setPublishModePendingDay(null);
      if (!result.success) {
        setError(result.error ?? "Unable to update publish mode.");
        return;
      }
      router.refresh();
    });
  }

  function runPublishNow(relativeDay: number) {
    setError(null);
    setPublishPendingDay(relativeDay);
    startTransition(async () => {
      const result = await publishMetaBundleNowAction(eventId, relativeDay);
      if (!result.success) {
        setPublishPendingDay(null);
        setError(result.error ?? "Unable to publish this milestone.");
        return;
      }
      router.refresh();
    });
  }

  useEffect(() => {
    if (publishPendingDay == null) {
      return;
    }

    const bundle = bundles.find((entry) => entry.relativeDay === publishPendingDay);
    if (bundle && ["published", "failed", "posting"].includes(bundle.status)) {
      setPublishPendingDay(null);
    }
  }, [bundles, publishPendingDay]);

  function runSkipMilestone(relativeDay: number, skip: boolean) {
    setError(null);
    setSkipPendingDay(relativeDay);
    startTransition(async () => {
      const result = skip
        ? await skipMetaPublishMilestoneAction(eventId, relativeDay)
        : await unskipMetaPublishMilestoneAction(eventId, relativeDay);

      setSkipPendingDay(null);
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }

      if (skip) {
        setOptimisticSkippedDays((current) => new Set(current).add(relativeDay));
        setExpandedDays((current) => {
          const next = new Set(current);
          next.delete(relativeDay);
          return next;
        });
      } else {
        setOptimisticSkippedDays((current) => {
          const next = new Set(current);
          next.delete(relativeDay);
          return next;
        });
      }

      router.refresh();
    });
  }

  const filteredBundles = useMemo(
    () =>
      mode === "schedule"
        ? bundles
        : mode === "approval"
          ? bundles.filter(
              (bundle) =>
                bundle.isMetaPost &&
                ["scheduled", "approved", "published"].includes(bundle.status),
            )
          : bundles.filter(
              (bundle) =>
                bundle.isMetaPost &&
                ["ready", "scheduled", "approved", "failed", "needs_artwork", "needs_caption"].includes(
                  bundle.status,
                ),
            ),
    [bundles, mode],
  );

  const displayBundles = useMemo(
    () => sortBundlesForDisplay(filteredBundles, optimisticSkippedDays),
    [filteredBundles, optimisticSkippedDays],
  );

  if (bundles.length === 0) {
    return null;
  }

  const actionableCount =
    counts.ready + counts.scheduled + counts.approved + counts.failed;

  function runGenerateAllCaptions() {
    setCaptionError(null);
    startCaptionGeneration(async () => {
      const result = await generateAllMetaSocialCaptionsAction(eventId);
      if (!result.success) {
        setCaptionError(result.error ?? "Unable to generate captions.");
        return;
      }
      router.refresh();
    });
  }

  const primaryAction =
    mode === "schedule" && counts.ready > 0
      ? {
          label: `Schedule all ready (${counts.ready})`,
          onClick: () => runAction(onScheduleAll),
        }
      : mode === "approval" && counts.scheduled > 0
        ? {
            label: `Approve all scheduled (${counts.scheduled})`,
            onClick: () => runAction(onApproveAll),
          }
        : mode === "publishing" && counts.ready > 0 && onScheduleAll
          ? {
              label: `Schedule all ready (${counts.ready})`,
              onClick: () => runAction(onScheduleAll),
            }
          : mode === "publishing" &&
              (counts.approved > 0 || counts.failed > 0) &&
              onPublishAll
            ? {
                label:
                  counts.failed > 0
                    ? `Publish now (${counts.approved + counts.failed})`
                    : `Publish all queued now (${counts.approved})`,
                onClick: () => runAction(onPublishAll),
              }
            : mode === "publishing" && counts.scheduled > 0 && onApproveAll
              ? {
                  label: `Approve all scheduled (${counts.scheduled})`,
                  onClick: () => runAction(onApproveAll),
                }
              : mode === "publishing" && actionableCount > 0
                ? {
                    label:
                      counts.failed > 0
                        ? `Publish now (${actionableCount})`
                        : `Publish all ready now (${actionableCount})`,
                    onClick: () => runAction(onPublishAll),
                  }
                : null;

  const showCaptionEditing =
    mode === "schedule" &&
    captionMilestones.length > 0 &&
    aiStatus &&
    userRole &&
    !captionsSectionSeparate;

  return (
    <div className="space-y-6">
      {showCaptionEditing && (
        <Card padding="none">
          <CardHeader className="px-5 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Social captions</CardTitle>
                <CardDescription>
                  Draft feed captions for Facebook and Instagram milestones. Story auto-syncs
                  from feed — expand any milestone below to review or edit.
                </CardDescription>
                {approvedCaptionCount > 0 && (
                  <p className="mt-2 text-xs text-emerald-700">
                    {approvedCaptionCount} of {captionMilestones.length} milestones approved
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                {primaryAction && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending || isGeneratingCaptions}
                    onClick={primaryAction.onClick}
                  >
                    {isPending ? "Working…" : primaryAction.label}
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={isGeneratingCaptions || !aiStatus.available}
                  onClick={runGenerateAllCaptions}
                  title={aiStatus.available ? undefined : (aiStatus.reason ?? undefined)}
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratingCaptions ? "Generating…" : "Generate all social captions"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {captionError && (
        <p className="text-sm text-red-600" role="alert">
          {captionError}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Card padding="none">
        {(mode === "schedule" || mode === "publishing") && (
          <CardHeader className="px-5 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {mode === "publishing" ? "Milestones to review" : "Communication milestones"}
                </CardTitle>
                <CardDescription>
                  {mode === "publishing"
                    ? "Confirm go-live dates, schedule posts, and publish when ready."
                    : "Expand any milestone for artwork previews, channel details, and scheduling actions."}
                  {approvalRoleLabel && mode === "publishing" && (
                    <span className="mt-1 block text-cos-muted">
                      Approver: {approvalRoleLabel}
                    </span>
                  )}
                </CardDescription>
              </div>
              {!showCaptionEditing && primaryAction && (
                <Button type="button" disabled={isPending} onClick={primaryAction.onClick}>
                  {isPending ? "Working…" : primaryAction.label}
                </Button>
              )}
            </div>
          </CardHeader>
        )}

        {!showCaptionEditing && primaryAction && mode !== "schedule" && mode !== "publishing" && (
          <div className="flex justify-end px-5 pt-5">
            <Button type="button" disabled={isPending} onClick={primaryAction.onClick}>
              {isPending ? "Working…" : primaryAction.label}
            </Button>
          </div>
        )}

        <ul
          className={cn(
            "space-y-4 px-5 pb-5",
            mode === "schedule" || mode === "publishing" ? "" : "pt-5",
          )}
        >
        {displayBundles.map((bundle) => (
          <li key={`${eventId}-${bundle.relativeDay}`}>
            <MetaPublishBundleCard
              bundle={bundle}
              milestone={milestoneByDay.get(bundle.relativeDay)}
              showCaptionPreview={!showCaptionEditing}
              expanded={expandedDays.has(bundle.relativeDay)}
              onToggle={() => toggleExpanded(bundle.relativeDay)}
              approvalRoleLabel={approvalRoleLabel}
              captionEdit={
                showCaptionEditing
                  ? {
                      eventId,
                      aiStatus: aiStatus!,
                      userRole: userRole!,
                      disabled: isPending || isGeneratingCaptions,
                    }
                  : undefined
              }
              onSkip={
                mode === "schedule"
                  ? () => runSkipMilestone(bundle.relativeDay, true)
                  : undefined
              }
              onUnskip={
                mode === "schedule"
                  ? () => runSkipMilestone(bundle.relativeDay, false)
                  : undefined
              }
              onSchedule={
                (mode === "schedule" || mode === "publishing") && bundle.status === "ready"
                  ? () => runScheduleMilestone(bundle.relativeDay)
                  : undefined
              }
              onPublishNow={
                mode === "publishing" &&
                ["ready", "scheduled", "approved", "failed"].includes(bundle.status)
                  ? () => runPublishNow(bundle.relativeDay)
                  : undefined
              }
              onPublishModeChange={
                (mode === "schedule" || mode === "publishing") && bundle.isMetaPost
                  ? (publishMode) => runPublishModeChange(bundle.relativeDay, publishMode)
                  : undefined
              }
              publishModePending={publishModePendingDay === bundle.relativeDay}
              publishPending={publishPendingDay === bundle.relativeDay}
              skipPending={skipPendingDay === bundle.relativeDay}
              schedulePending={schedulePendingDay === bundle.relativeDay}
              eventLink={eventLink}
              showPostKit={showPostKit}
            />
          </li>
        ))}
        </ul>
      </Card>
    </div>
  );
}
