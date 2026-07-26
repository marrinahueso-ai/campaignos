"use client";

import Image from "next/image";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Mail,
  Send,
  User,
  X,
} from "lucide-react";
import type { UnifiedApprovalHistoryEntry } from "@/lib/approvals-scheduling/types";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";
import {
  campaignBuilderEditArtworkHref,
  campaignBuilderPreviewMilestoneHref,
} from "@/lib/campaign-builder-v2/navigation";
import {
  changeRequestDisplayComment,
  hasStaleContentNote,
} from "@/lib/dev-tools/clear-generated-content";
import { formatDateTime } from "@/lib/utils/dates";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

interface ReviewDrawerProps {
  item: UnifiedApprovalItem | null;
  open: boolean;
  onClose: () => void;
  comment: string;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  isSubmitting: boolean;
  canAct: boolean;
}

function HistoryList({ entries }: { entries: UnifiedApprovalHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-cos-muted">No history yet for this item.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry, index) => (
        <li key={`${entry.timestamp}-${index}`} className="flex gap-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cos-success" />
          <div>
            <p className="text-cos-text">{entry.label}</p>
            <p className="text-xs text-cos-muted">
              {entry.actor} · {formatDateTime(entry.timestamp)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function statusChip(item: UnifiedApprovalItem): {
  label: string;
  className: string;
} {
  switch (item.workflowStatus) {
    case "assigned_to_me":
    case "in_queue":
      return {
        label: "Needs approval",
        className: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
      };
    case "changes_requested":
      return {
        label: "Changes requested",
        className: "bg-[rgba(166,90,58,0.14)] text-[#a65a3a]",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        className: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
      };
    case "posted":
    case "published":
      return {
        label: "Published",
        className: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
      };
    default:
      return {
        label: item.statusDetail || "In review",
        className: "bg-cos-bg-alt text-cos-muted",
      };
  }
}

function platformLabel(item: UnifiedApprovalItem): string {
  if (item.platforms.length === 0) {
    return "Social";
  }
  return item.platforms
    .map((platform) =>
      platform === "facebook"
        ? "Facebook"
        : platform === "instagram"
          ? "Instagram"
          : "Email",
    )
    .join(" · ");
}

export function ReviewDrawer({
  item,
  open,
  onClose,
  comment,
  onCommentChange,
  onApprove,
  onRequestChanges,
  isSubmitting,
  canAct,
}: ReviewDrawerProps) {
  if (!open || !item) {
    return null;
  }

  const changeRequestComment = changeRequestDisplayComment(item.notes);
  const showChangeRequestBanner = item.workflowStatus === "changes_requested";
  const editPreviewHref =
    item.campaignMilestoneId != null
      ? campaignBuilderPreviewMilestoneHref(
          item.eventId,
          item.campaignMilestoneId,
        )
      : null;
  const editArtworkHref =
    item.campaignMilestoneId != null
      ? campaignBuilderEditArtworkHref(item.eventId, item.campaignMilestoneId)
      : null;

  const chip = statusChip(item);
  const caption =
    item.preview.captionText?.trim() ||
    item.preview.storyCaptionSnippet?.trim() ||
    null;
  const storyCaption =
    item.preview.storyCaptionSnippet?.trim() &&
    item.preview.storyCaptionSnippet.trim() !== caption
      ? item.preview.storyCaptionSnippet.trim()
      : null;
  const heroUrl =
    item.preview.feedArtworkUrl ||
    item.preview.storyArtworkUrl ||
    item.thumbnailUrl;
  const hasFeed = Boolean(item.preview.feedArtworkUrl);
  const hasStory = Boolean(item.preview.storyArtworkUrl);
  const scheduleLine = [
    item.scheduleLabel,
    platformLabel(item),
    item.deliveryMethod === "manual-email"
      ? "Manual email"
      : item.deliveryMethod === "draft-only"
        ? "Draft only"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close review drawer"
        className="flex-1 bg-[rgba(42,38,34,0.28)] transition-opacity"
        onClick={onClose}
      />
      <aside
        className="flex h-full w-full max-w-[440px] flex-col border-l border-cos-border bg-[#f6f2eb] shadow-[0_20px_48px_rgba(42,38,34,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
          <div className="min-w-0">
            <h2
              id="review-drawer-title"
              className="font-display text-2xl tracking-[-0.02em] text-cos-text"
            >
              {item.campaignName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
                  chip.className,
                )}
              >
                {chip.label}
              </span>
              <span className="text-xs font-bold text-cos-muted">
                {item.milestoneName}
              </span>
              {hasStaleContentNote(item.notes) ? (
                <span className="inline-flex rounded-full bg-[#f8e3e3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#8b3f3f] uppercase">
                  Needs regeneration
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-muted transition hover:text-cos-text"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-6 sm:px-6">
          {heroUrl ? (
            <div className="overflow-hidden rounded-[18px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
              {hasFeed ? (
                <ArtworkLightboxThumbnail
                  src={item.preview.feedArtworkUrl!}
                  alt={`${item.milestoneName} feed artwork`}
                  label="Feed"
                  variant="feed"
                  wrapperClassName="w-full"
                  frameClassName="aspect-square"
                  placeholder="Feed"
                />
              ) : hasStory ? (
                <ArtworkLightboxThumbnail
                  src={item.preview.storyArtworkUrl!}
                  alt={`${item.milestoneName} story artwork`}
                  label="Story"
                  variant="story"
                  wrapperClassName="w-full"
                  frameClassName="aspect-[9/16] max-h-[360px]"
                  placeholder="Story"
                />
              ) : (
                <div className="relative aspect-square bg-gradient-to-br from-[#1e4a3a] via-[#6b8171] to-[#c4922e]">
                  <Image
                    src={heroUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="440px"
                    unoptimized
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-[18px] border border-dashed border-cos-border bg-cos-card/60 px-4 text-center">
              <div>
                <p className="text-sm font-medium text-cos-text">
                  No artwork attached
                </p>
                <p className="mt-1 text-xs text-cos-muted">
                  Artwork appears here once this milestone has creatives.
                </p>
              </div>
            </div>
          )}

          {hasFeed && hasStory ? (
            <div className="grid grid-cols-2 gap-3">
              <ArtworkLightboxThumbnail
                src={item.preview.storyArtworkUrl!}
                alt={`${item.milestoneName} story artwork`}
                label="Story"
                variant="story"
                wrapperClassName="w-full"
                frameClassName="aspect-[9/16] max-h-40"
                placeholder="Story"
              />
              <div className="flex items-end text-xs leading-relaxed text-cos-muted">
                Tap either image to enlarge.
              </div>
            </div>
          ) : null}

          {showChangeRequestBanner ? (
            <div className="rounded-2xl border border-[rgba(166,90,58,0.25)] bg-[rgba(166,90,58,0.08)] px-4 py-3">
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-[#a65a3a] uppercase">
                Changes requested
              </p>
              <p className="mt-2 text-sm leading-relaxed text-cos-text">
                {changeRequestComment ||
                  "An approver requested changes to this content."}
              </p>
              {editPreviewHref || editArtworkHref ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {editArtworkHref ? (
                    <Button href={editArtworkHref} variant="primary" size="sm">
                      Edit artwork
                    </Button>
                  ) : null}
                  {editPreviewHref ? (
                    <Button href={editPreviewHref} variant="secondary" size="sm">
                      Open in Preview
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
              Caption
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
              {caption || "No caption yet."}
            </p>
          </div>

          {storyCaption ? (
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                Story caption
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
                {storyCaption}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
              Schedule
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
              {scheduleLine || "Schedule not set"}
            </p>
          </div>

          {item.approvalHistory.length > 0 ? (
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                History
              </p>
              <div className="mt-2">
                <HistoryList entries={item.approvalHistory} />
              </div>
            </div>
          ) : null}

          {canAct ? (
            <div>
              <label
                className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase"
                htmlFor="review-comment"
              >
                Note to creator (optional)
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                rows={3}
                placeholder="If you’re requesting changes, say what to fix…"
                className="mt-2 w-full resize-y rounded-[14px] border border-cos-border bg-cos-card px-3 py-3 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-cos-border bg-[rgba(255,252,247,0.7)] px-5 py-4 sm:px-6">
          {canAct ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onApprove}
                className="rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714] disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Approve & schedule"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onRequestChanges}
                className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:-translate-y-px disabled:opacity-50"
              >
                Request changes
              </button>
            </>
          ) : item.workflowStatus === "scheduled" ||
            item.workflowStatus === "posted" ||
            item.workflowStatus === "published" ? (
            <button
              type="button"
              disabled
              className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-muted"
            >
              Already approved
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function DeliveryIcons({
  platforms,
  deliveryMethod,
}: {
  platforms: UnifiedApprovalItem["platforms"];
  deliveryMethod: UnifiedApprovalItem["deliveryMethod"];
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-cos-muted">
        {platforms.includes("facebook") || platforms.includes("instagram") ? (
          <Send className="h-3.5 w-3.5" />
        ) : null}
        {platforms.includes("instagram") ? (
          <span className="text-[10px] font-semibold">IG</span>
        ) : null}
        {platforms.includes("facebook") ? (
          <span className="text-[10px] font-semibold">FB</span>
        ) : null}
        {platforms.includes("email") ? <Mail className="h-3.5 w-3.5" /> : null}
      </div>
      <span className="text-xs text-cos-muted">
        {deliveryMethod === "manual-email"
          ? "Manual email"
          : deliveryMethod === "draft-only"
            ? "Draft only"
            : deliveryMethod === "schedule"
              ? "Scheduled"
              : "Publish Now"}
      </span>
    </div>
  );
}

export function AssigneeAvatar({
  initials,
  name,
  role,
}: {
  initials: string;
  name: string;
  role: string;
}) {
  if (name === "System" || name === "—") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-cos-muted">—</span>
        <div>
          <p className="text-sm text-cos-text">System</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cos-bg text-xs font-semibold text-cos-text">
        {initials}
      </span>
      <div>
        <p className="text-sm text-cos-text">{name}</p>
        <p className="text-xs text-cos-muted">{role}</p>
      </div>
    </div>
  );
}

export function ApprovalFlowGuide() {
  const steps = [
    {
      icon: Send,
      title: "Creator submits",
      description: "Campaign is sent for approval",
    },
    {
      icon: User,
      title: "Assigned to approver",
      description: "You'll get a notification",
    },
    {
      icon: CheckCircle2,
      title: "Review & approve",
      description: "Approve, request changes, or comment",
    },
    {
      icon: Calendar,
      title: "Scheduled or delivered",
      description: "Content is published or emailed",
    },
    {
      icon: CheckCircle2,
      title: "Live & complete",
      description: "Track performance in Insights",
    },
  ];

  return (
    <section className="rounded-[22px] border border-cos-border bg-cos-card/80 px-6 py-6">
      <h2 className="font-display text-2xl text-cos-text">
        How the approval flow works
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cos-border bg-[#f6f2eb]">
                <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-cos-text">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-cos-muted">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <ChevronRight
                  className="absolute -right-2 top-3 hidden h-4 w-4 text-cos-muted lg:block"
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
