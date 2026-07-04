"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  approveMilestoneCaptionsAction,
  approveMetaSocialCaptionAction,
  generateMetaSocialCaptionAction,
  saveMetaSocialCaptionAction,
  syncStoryFromFeedCaptionAction,
  unapproveMetaSocialCaptionAction,
} from "@/lib/meta-captions/actions";
import type {
  MetaSocialCaptionPlacement,
  MetaSocialCaptionPlacementState,
} from "@/lib/meta-captions/types";
import type { AiAssistantStatus } from "@/lib/ai";
import { canApproveDraft, type CampaignRole } from "@/lib/auth/campaign-roles";
import { cn } from "@/lib/utils/cn";
import { milestoneAccordionCardProps } from "@/lib/utils/milestone-accordion";

interface MetaSocialCaptionFieldProps {
  eventId: string;
  relativeDay: number;
  placement: MetaSocialCaptionPlacement;
  label: string;
  caption: MetaSocialCaptionPlacementState;
  feedCaption?: string | null;
  hasApprovedFeedArtwork: boolean;
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  disabled?: boolean;
}

export function MetaSocialCaptionField({
  eventId,
  relativeDay,
  placement,
  label,
  caption,
  feedCaption = null,
  hasApprovedFeedArtwork,
  aiStatus,
  userRole,
  disabled = false,
}: MetaSocialCaptionFieldProps) {
  const router = useRouter();
  const [content, setContent] = useState(caption.content ?? "");
  const [isEditing, setIsEditing] = useState(!caption.content);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(caption.content ?? "");
    setIsEditing(!caption.content);
    setError(null);
  }, [caption.content, caption.status, caption.id]);

  const hasContent = Boolean(content.trim());
  const isApproved = caption.status === "approved";
  const canApprove = canApproveDraft(userRole) && hasContent && !isApproved;
  const canUnapprove = canApproveDraft(userRole) && isApproved;

  function runGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateMetaSocialCaptionAction(eventId, relativeDay, placement);
      if (!result.success) {
        setError(result.error ?? "Unable to generate caption.");
        return;
      }
      router.refresh();
    });
  }

  function runSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveMetaSocialCaptionAction(
        eventId,
        relativeDay,
        placement,
        content,
      );
      if (!result.success) {
        setError(result.error ?? "Unable to save caption.");
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function runUnapprove() {
    setError(null);
    startTransition(async () => {
      const result = await unapproveMetaSocialCaptionAction(eventId, relativeDay, placement);
      if (!result.success) {
        setError(result.error ?? "Unable to unapprove caption.");
        return;
      }
      setIsEditing(true);
      router.refresh();
    });
  }

  function runApprove() {
    setError(null);
    startTransition(async () => {
      if (isEditing && content.trim() !== (caption.content ?? "").trim()) {
        const saveResult = await saveMetaSocialCaptionAction(
          eventId,
          relativeDay,
          placement,
          content,
        );
        if (!saveResult.success) {
          setError(saveResult.error ?? "Unable to save caption.");
          return;
        }
      }

      const result = await approveMetaSocialCaptionAction(eventId, relativeDay, placement);
      if (!result.success) {
        setError(result.error ?? "Unable to approve caption.");
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function runSyncFromFeed() {
    setError(null);
    startTransition(async () => {
      const result = await syncStoryFromFeedCaptionAction(eventId, relativeDay);
      if (!result.success) {
        setError(result.error ?? "Unable to sync story from feed.");
        return;
      }
      router.refresh();
    });
  }

  const canSyncFromFeed =
    placement === "story" &&
    Boolean(feedCaption?.trim()) &&
    !isApproved &&
    aiStatus.available;

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="cos-section-title">{label}</p>
          {isApproved ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              Approved
            </span>
          ) : hasContent ? (
            <span className="rounded-full bg-cos-bg px-2.5 py-0.5 text-xs font-medium text-cos-muted">
              Draft
            </span>
          ) : null}
        </div>
        {hasApprovedFeedArtwork && (
          <p className="text-[11px] text-cos-muted">
            Drafts use your approved feed artwork for this milestone.
          </p>
        )}
      </div>

      {isEditing || !hasContent ? (
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          disabled={disabled || isPending}
          placeholder="Draft a warm, fun caption for Facebook and Instagram…"
          className="text-sm leading-6"
        />
      ) : (
        <div className="border border-cos-border bg-cos-bg/50 p-3 text-sm leading-6 whitespace-pre-wrap text-cos-text">
          {content}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {isEditing || !hasContent ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={disabled || isPending || !hasContent}
              onClick={runSave}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled || isPending || !aiStatus.available}
              onClick={runGenerate}
              title={aiStatus.available ? undefined : (aiStatus.reason ?? undefined)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isPending ? "Working…" : hasContent ? "Redraft" : "Draft for me"}
            </Button>
            {hasContent && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || isPending}
                onClick={() => {
                  setContent(caption.content ?? "");
                  setIsEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            )}
            {canSyncFromFeed && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || isPending}
                onClick={runSyncFromFeed}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync from feed
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled || isPending || isApproved}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled || isPending || !aiStatus.available || isApproved}
              onClick={runGenerate}
              title={aiStatus.available ? undefined : (aiStatus.reason ?? undefined)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Redraft
            </Button>
            {canSyncFromFeed && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || isPending}
                onClick={runSyncFromFeed}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync from feed
              </Button>
            )}
          </>
        )}

        {canApprove && (
          <Button
            type="button"
            size="sm"
            disabled={disabled || isPending}
            onClick={runApprove}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
        )}

        {canUnapprove && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled || isPending}
            onClick={runUnapprove}
          >
            Unapprove
          </Button>
        )}

        {isApproved && !canUnapprove && (
          <p className="self-center text-xs text-emerald-700">Ready for Schedule</p>
        )}
      </div>
    </div>
  );
}

interface MetaSocialCaptionMilestoneCardProps {
  eventId: string;
  milestone: import("@/lib/meta-captions/types").MetaSocialCaptionMilestone;
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  approvalRoleLabel?: string | null;
  onNavigateToPublish?: (relativeDay: number) => void;
}

function milestoneStatus(milestone: import("@/lib/meta-captions/types").MetaSocialCaptionMilestone) {
  const feedApproved = milestone.feed.status === "approved" && milestone.feed.content;
  const storyApproved = milestone.story.status === "approved" && milestone.story.content;

  if (feedApproved && storyApproved) {
    return {
      label: "Complete",
      subtitle: "Feed + Story captions ready",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  const hasAny = milestone.feed.content || milestone.story.content;
  if (hasAny) {
    return {
      label: "In progress",
      subtitle: "Captions in progress",
      className: "bg-cos-bg text-cos-muted",
    };
  }

  return {
    label: "Not started",
    subtitle: "Feed + Story · draft captions",
    className: "bg-cos-bg text-cos-muted",
  };
}

export function MetaSocialCaptionMilestoneCard({
  eventId,
  milestone,
  aiStatus,
  userRole,
  expanded,
  onToggle,
  disabled = false,
  approvalRoleLabel = null,
  onNavigateToPublish,
}: MetaSocialCaptionMilestoneCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = milestoneStatus(milestone);

  const feedReady = Boolean(milestone.feed.content?.trim());
  const storyReady = Boolean(milestone.story.content?.trim());
  const milestoneApproved =
    milestone.feed.status === "approved" && milestone.story.status === "approved";
  const isComplete = milestoneApproved && feedReady && storyReady;
  const canApproveMilestone =
    canApproveDraft(userRole) && feedReady && storyReady && !milestoneApproved;

  function runApproveMilestone() {
    setError(null);
    startTransition(async () => {
      const result = await approveMilestoneCaptionsAction(eventId, milestone.relativeDay);
      if (!result.success) {
        setError(result.error ?? "Unable to approve milestone.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li id={`caption-milestone-${milestone.relativeDay}`}>
      <article {...milestoneAccordionCardProps(expanded)}>
        <div className="flex items-start gap-2 border-b border-cos-border px-4 py-4">
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

          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-2xl text-cos-text">{milestone.title}</h3>
                <p className="mt-0.5 text-xs text-cos-muted">{status.subtitle}</p>
                {isComplete && approvalRoleLabel && (
                  <p className="mt-1 text-xs text-cos-muted">
                    Publishing requires approval from {approvalRoleLabel}
                  </p>
                )}
                {!expanded && (milestone.feed.content || milestone.story.content) && (
                  <p className="mt-1 truncate text-xs text-cos-muted">
                    {milestone.feed.content?.slice(0, 80) ?? milestone.story.content?.slice(0, 80)}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  status.className,
                )}
              >
                {status.label}
              </span>
            </div>
          </button>
        </div>

      {expanded && (
        <div className="divide-y divide-cos-border">
          <MetaSocialCaptionField
            eventId={eventId}
            relativeDay={milestone.relativeDay}
            placement="feed"
            label="Feed (FB + IG)"
            caption={milestone.feed}
            hasApprovedFeedArtwork={milestone.hasApprovedFeedArtwork}
            aiStatus={aiStatus}
            userRole={userRole}
            disabled={disabled || isPending}
          />
          <MetaSocialCaptionField
            eventId={eventId}
            relativeDay={milestone.relativeDay}
            placement="story"
            label="Story (FB + IG)"
            caption={milestone.story}
            feedCaption={milestone.feed.content}
            hasApprovedFeedArtwork={milestone.hasApprovedFeedArtwork}
            aiStatus={aiStatus}
            userRole={userRole}
            disabled={disabled || isPending}
          />
          {(canApproveMilestone || isComplete || error) && (
            <div className="space-y-3 border-t border-cos-border px-4 py-3">
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              {canApproveMilestone && (
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || isPending}
                  onClick={runApproveMilestone}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve milestone
                </Button>
              )}
              {isComplete && onNavigateToPublish && (
                <div className="space-y-2">
                  {approvalRoleLabel && (
                    <p className="text-xs text-cos-muted">
                      Ready for {approvalRoleLabel} to review in Review &amp; publish
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled || isPending}
                    onClick={() => onNavigateToPublish(milestone.relativeDay)}
                  >
                    Continue to Review &amp; publish
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </article>
    </li>
  );
}
