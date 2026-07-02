"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  MetaSocialCaptionField,
} from "@/components/meta-captions/MetaSocialCaptionField";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";
import { generateAllMetaSocialCaptionsAction } from "@/lib/meta-captions/actions";
import { channelLabelForBundle } from "@/lib/meta-publishing/bundle-display";
import {
  publishMetaBundleNowAction,
  scheduleMetaBundleAction,
  skipMetaPublishMilestoneAction,
  unskipMetaPublishMilestoneAction,
} from "@/lib/meta-publishing/actions";
import { formatDateTime } from "@/lib/utils/dates";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle, MetaPublishBundleStatus } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";

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

function statusLabel(bundle: MetaPublishBundle): string {
  if (!bundle.isMetaPost) {
    if (bundle.status === "needs_artwork") {
      return "Needs artwork";
    }
    return channelLabelForBundle(bundle);
  }

  switch (bundle.status) {
    case "needs_artwork":
      return "Needs artwork";
    case "needs_caption":
      return "Needs caption approval";
    case "ready":
      return "Ready to publish";
    case "scheduled":
      return "Scheduled";
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

function isMilestoneComplete(milestone: MetaSocialCaptionMilestone): boolean {
  return (
    milestone.feed.status === "approved" &&
    Boolean(milestone.feed.content) &&
    milestone.story.status === "approved" &&
    Boolean(milestone.story.content)
  );
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
  publishPending?: boolean;
  schedulePending?: boolean;
  skipPending?: boolean;
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
  publishPending = false,
  skipPending = false,
  schedulePending = false,
}: MetaPublishBundleCardProps) {
  const isSkipped = bundle.status === "skipped";
  const isMetaPost = bundle.isMetaPost;
  const canSchedule =
    isMetaPost &&
    bundle.status === "ready" &&
    Boolean(onSchedule) &&
    !isSkipped;
  const canPublishNow =
    isMetaPost &&
    Boolean(onPublishNow) &&
    ["ready", "scheduled", "approved", "failed"].includes(bundle.status);
  const canSkip =
    !isSkipped &&
    bundle.status !== "published" &&
    bundle.status !== "posting" &&
    Boolean(onSkip);
  const canUnskip = isSkipped && Boolean(onUnskip);

  return (
    <article
      className={cn(
        "overflow-hidden border border-cos-border bg-cos-card",
        isSkipped && "opacity-75",
      )}
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
                statusClassName(bundle.status),
              )}
            >
              {statusLabel(bundle)}
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
              {publishPending ? "Publishing…" : "Publish now"}
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr]">
            <div className="flex gap-3">
              <ArtworkLightboxThumbnail
                src={bundle.feedArtworkUrl}
                alt={`${bundle.title} feed artwork`}
                label="Feed 1:1"
                wrapperClassName="w-20"
                frameClassName="aspect-square"
                placeholder="Feed"
              />
              <ArtworkLightboxThumbnail
                src={bundle.storyArtworkUrl}
                alt={`${bundle.title} story artwork`}
                label="Story"
                wrapperClassName="w-14"
                frameClassName="aspect-[9/16]"
                placeholder="Story"
              />
            </div>

            <div className="min-w-0 space-y-3">
              {isSkipped ? (
                <p className="text-sm text-cos-muted">
                  This milestone is skipped — nothing will go out for{" "}
                  {channelLabelForBundle(bundle)}. Use Restore post if plans change.
                </p>
              ) : (
                <>
                  {showCaptionPreview && !captionEdit && isMetaPost && (
                    <div className="space-y-2">
                      <div>
                        <p className="cos-section-title">Feed caption</p>
                        <p className="mt-1 text-sm text-cos-text">
                          {bundle.captionPreview?.trim() || "Draft captions below."}
                        </p>
                      </div>
                      {bundle.storyCaptionPreview && (
                        <div>
                          <p className="cos-section-title">Story caption</p>
                          <p className="mt-1 text-sm text-cos-text">
                            {bundle.storyCaptionPreview}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isMetaPost && (
                    <div>
                      <p className="cos-section-title">Publishes to</p>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {bundle.targets.map((target) => (
                          <li
                            key={`${target.platform}-${target.placement}`}
                            className="rounded-full border border-cos-border bg-cos-bg px-2 py-0.5 text-xs text-cos-text"
                          >
                            {target.label}
                          </li>
                        ))}
                      </ul>
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
                </>
              )}
            </div>
          </div>

          {captionEdit && milestone && !isSkipped && isMetaPost && (
            <div className="divide-y divide-cos-border border-t border-cos-border">
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
  aiStatus?: AiAssistantStatus;
  userRole?: CampaignRole;
  onScheduleAll?: () => Promise<{ success: boolean; error?: string | null }>;
  onApproveAll?: () => Promise<{ success: boolean; error?: string | null }>;
  onPublishAll?: () => Promise<{ success: boolean; error?: string | null }>;
}

export function MetaPublishBundlesPanel({
  eventId,
  bundles,
  mode,
  captionMilestones = [],
  aiStatus,
  userRole,
  onScheduleAll,
  onApproveAll,
  onPublishAll,
}: MetaPublishBundlesPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingCaptions, startCaptionGeneration] = useTransition();
  const [skipPendingDay, setSkipPendingDay] = useState<number | null>(null);
  const [schedulePendingDay, setSchedulePendingDay] = useState<number | null>(null);
  const [publishPendingDay, setPublishPendingDay] = useState<number | null>(null);
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
    () => captionMilestones.filter(isMilestoneComplete).length,
    [captionMilestones],
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

  function runPublishNow(relativeDay: number) {
    setError(null);
    setPublishPendingDay(relativeDay);
    startTransition(async () => {
      const result = await publishMetaBundleNowAction(eventId, relativeDay);
      setPublishPendingDay(null);
      if (!result.success) {
        setError(result.error ?? "Unable to publish this milestone.");
        return;
      }
      router.refresh();
    });
  }

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
    mode === "schedule" && captionMilestones.length > 0 && aiStatus && userRole;

  return (
    <div className="space-y-6">
      {showCaptionEditing && (
        <section className="overflow-hidden border border-cos-border bg-cos-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cos-border px-5 py-4">
            <div>
              <p className="cos-section-title">Social captions</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
                Draft feed captions for Facebook and Instagram milestones. Story auto-syncs
                from feed — expand any milestone below to review or edit.
              </p>
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
        </section>
      )}

      {captionError && (
        <p className="text-sm text-red-600" role="alert">
          {captionError}
        </p>
      )}

      {!showCaptionEditing && primaryAction && (
        <div className="flex justify-end">
          <Button type="button" disabled={isPending} onClick={primaryAction.onClick}>
            {isPending ? "Working…" : primaryAction.label}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {displayBundles.map((bundle) => (
          <li key={`${eventId}-${bundle.relativeDay}`}>
            <MetaPublishBundleCard
              bundle={bundle}
              milestone={milestoneByDay.get(bundle.relativeDay)}
              showCaptionPreview={!showCaptionEditing}
              expanded={expandedDays.has(bundle.relativeDay)}
              onToggle={() => toggleExpanded(bundle.relativeDay)}
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
                mode === "schedule" && bundle.status === "ready"
                  ? () => runScheduleMilestone(bundle.relativeDay)
                  : undefined
              }
              onPublishNow={
                mode === "publishing" &&
                ["ready", "scheduled", "approved", "failed"].includes(bundle.status)
                  ? () => runPublishNow(bundle.relativeDay)
                  : undefined
              }
              publishPending={publishPendingDay === bundle.relativeDay}
              skipPending={skipPendingDay === bundle.relativeDay}
              schedulePending={schedulePendingDay === bundle.relativeDay}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
