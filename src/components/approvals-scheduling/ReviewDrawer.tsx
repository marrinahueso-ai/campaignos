"use client";

import {
  Calendar,
  Mail,
  Send,
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
import {
  approvalOutcomeChip,
  canRetryFailedApproval,
} from "@/lib/approvals-scheduling/outcome-display";
import {
  flyerComposerEditHref,
  isFlyerComposerMilestoneId,
} from "@/lib/flyer-composer/approval";
import { formatDateTime } from "@/lib/utils/dates";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

interface ReviewDrawerProps {
  item: UnifiedApprovalItem | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onRetry?: () => void;
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
    <ul className="space-y-2.5">
      {entries.map((entry, index) => (
        <li
          key={`${entry.timestamp}-${index}`}
          className="grid grid-cols-[18px_1fr] gap-2.5 text-[13px] leading-snug"
        >
          <span
            className="mt-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-[rgba(47,74,60,0.12)] text-[11px] font-extrabold text-[#2f4a3c]"
            aria-hidden
          >
            ✓
          </span>
          <div>
            <p className="font-bold text-cos-text">{entry.label}</p>
            <p className="mt-0.5 text-xs text-cos-muted">
              {entry.actor} · {formatDateTime(entry.timestamp)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function isFlyerApprovalItem(item: UnifiedApprovalItem): boolean {
  return (
    item.channel === "flyer" ||
    isFlyerComposerMilestoneId(item.campaignMilestoneId)
  );
}

function platformLabel(item: UnifiedApprovalItem): string {
  if (isFlyerApprovalItem(item)) {
    return "Print flyer";
  }
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

function scheduleSubline(item: UnifiedApprovalItem): string {
  if (isFlyerApprovalItem(item)) {
    return "Print-ready — approve to clear the queue";
  }
  if (item.deliveryMethod === "manual-email") {
    return "Email post kit — ready once you approve";
  }
  if (item.deliveryMethod === "draft-only") {
    return "Draft — ready once you approve";
  }
  if (item.deliveryMethod === "publish-now" || item.deliveryMethod === "auto-publish") {
    return "Publishes when you approve";
  }
  if (item.scheduleLabel) {
    return "Scheduled — ready once you approve";
  }
  return "Schedule not set yet";
}

function typeChipLabel(item: UnifiedApprovalItem): string {
  if (isFlyerApprovalItem(item)) return "Flyer";
  const hasFeed = Boolean(item.preview.feedArtworkUrl);
  const hasStory = Boolean(item.preview.storyArtworkUrl);
  if (hasFeed && hasStory) return "Social · Feed + Story";
  if (hasStory) return "Social · Story";
  if (hasFeed) return "Social · Feed";
  if (item.platforms.includes("email")) return "Email";
  return "Social";
}

export function ReviewDrawer({
  item,
  open,
  onClose,
  onApprove,
  onRequestChanges,
  onRetry,
  isSubmitting,
  canAct,
}: ReviewDrawerProps) {
  if (!open || !item) {
    return null;
  }

  const changeRequestComment = changeRequestDisplayComment(item.notes);
  const showChangeRequestBanner = item.workflowStatus === "changes_requested";
  const isFlyer = isFlyerApprovalItem(item);
  const editPreviewHref = isFlyer
    ? flyerComposerEditHref()
    : item.campaignMilestoneId != null
      ? campaignBuilderPreviewMilestoneHref(
          item.eventId,
          item.campaignMilestoneId,
        )
      : null;
  const editArtworkHref = isFlyer
    ? flyerComposerEditHref()
    : item.campaignMilestoneId != null
      ? campaignBuilderEditArtworkHref(item.eventId, item.campaignMilestoneId)
      : null;

  const chip = approvalOutcomeChip(item);
  const showRetry = canRetryFailedApproval(item) && Boolean(onRetry);
  const caption =
    item.preview.captionText?.trim() ||
    item.preview.storyCaptionSnippet?.trim() ||
    null;
  const storyCaption =
    !isFlyer &&
    item.preview.storyCaptionSnippet?.trim() &&
    item.preview.storyCaptionSnippet.trim() !== caption
      ? item.preview.storyCaptionSnippet.trim()
      : null;
  const feedUrl = item.preview.feedArtworkUrl;
  const storyUrl = isFlyer ? null : item.preview.storyArtworkUrl;
  const platforms = platformLabel(item);
  const whenLabel = isFlyer
    ? "Print-ready"
    : item.scheduleLabel || "Schedule not set";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close review"
        className="absolute inset-0 bg-[rgba(42,38,34,0.4)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex max-h-[min(94vh,920px)] w-full max-w-[980px] flex-col overflow-hidden rounded-t-[22px] border border-cos-border bg-[#fffcf7] shadow-[0_20px_48px_rgba(42,38,34,0.12)] sm:rounded-[22px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-cos-border px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="review-drawer-title"
              className="font-display text-2xl tracking-[-0.02em] text-cos-text sm:text-[1.75rem]"
            >
              {item.campaignName}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cos-muted">
              {isFlyer
                ? "Review the print flyer artwork. Notes live on Request changes — not here."
                : "Review feed + story, caption, and when it posts. Notes live on Request changes — not here."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-[rgba(42,122,134,0.12)] px-2.5 py-1 text-[11px] font-extrabold text-[#2a7a86]">
                {typeChipLabel(item)}
              </span>
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
                  Content may be outdated
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Schedule hero */}
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 bg-gradient-to-br from-[#2f4a3c]/[96%] via-[#2a7a86]/90% to-[#c4922e]/85% px-5 py-4 text-[#f6f2eb] sm:grid-cols-[auto_1fr_auto] sm:px-6 sm:py-5">
            <div
              className="grid h-12 w-12 place-items-center rounded-[14px] border border-[rgba(255,252,247,0.22)] bg-[rgba(255,252,247,0.14)]"
              aria-hidden
            >
              <Calendar className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold tracking-[0.08em] uppercase opacity-85">
                Posts
              </p>
              <p className="font-display text-[clamp(1.25rem,2.4vw,1.7rem)] font-semibold tracking-[-0.02em] leading-tight">
                {whenLabel}
              </p>
              <p className="mt-1 text-[13px] font-medium opacity-90">
                {scheduleSubline(item)}
              </p>
            </div>
            <div className="col-span-2 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(255,252,247,0.28)] bg-[rgba(255,252,247,0.16)] px-3.5 py-2 text-[13px] font-bold whitespace-nowrap sm:col-span-1">
              <span
                className="h-2 w-2 rounded-full bg-[#5b9bd5] shadow-[0_0_0_2px_rgba(255,252,247,0.25)]"
                aria-hidden
              />
              {platforms}
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
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
                        {isFlyer ? "Open Flyer composer" : "Edit artwork"}
                      </Button>
                    ) : null}
                    {!isFlyer && editPreviewHref ? (
                      <Button
                        href={editPreviewHref}
                        variant="secondary"
                        size="sm"
                      >
                        Open in Preview
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                {isFlyer ? (
                  <div className="mx-auto flex max-w-[320px] flex-col items-center">
                    <p className="mb-2 text-center text-[10px] font-extrabold tracking-[0.07em] text-cos-muted uppercase">
                      Flyer artwork
                    </p>
                    <ArtworkLightboxThumbnail
                      src={feedUrl}
                      alt={`${item.milestoneName} flyer artwork`}
                      variant="feed"
                      wrapperClassName="w-full max-w-[280px]"
                      frameClassName="aspect-[2/3] w-full shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                      placeholder="No flyer artwork yet"
                    />
                    <p className="mt-2.5 text-center text-xs leading-snug text-cos-muted">
                      Tap the image to enlarge
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto grid max-w-[420px] grid-cols-2 items-end gap-3.5 max-[520px]:max-w-[280px] max-[520px]:grid-cols-1 max-[520px]:justify-items-center">
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="mb-2 text-center text-[10px] font-extrabold tracking-[0.07em] text-cos-muted uppercase">
                          Feed · 1:1
                        </p>
                        <ArtworkLightboxThumbnail
                          src={feedUrl}
                          alt={`${item.milestoneName} feed artwork`}
                          variant="feed"
                          wrapperClassName="w-full max-w-[280px]"
                          frameClassName="aspect-square w-full shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                          placeholder="No feed artwork yet"
                        />
                      </div>
                      <div className="flex min-w-0 flex-col items-center">
                        <p className="mb-2 text-center text-[10px] font-extrabold tracking-[0.07em] text-cos-muted uppercase">
                          Story · 9:16
                        </p>
                        <ArtworkLightboxThumbnail
                          src={storyUrl}
                          alt={`${item.milestoneName} story artwork`}
                          variant="story"
                          wrapperClassName="w-full max-w-[200px]"
                          frameClassName="aspect-[9/16] w-full max-h-[360px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                          placeholder="No story artwork yet"
                        />
                      </div>
                    </div>
                    <p className="mt-2.5 text-center text-xs leading-snug text-cos-muted">
                      Tap either image to enlarge
                    </p>
                  </>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <div>
                  <p className="mb-2 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                    Caption
                  </p>
                  <div
                    className={cn(
                      "rounded-[14px] border border-cos-border bg-[#f6f2eb] px-4 py-3.5 text-[15px] leading-relaxed text-cos-text",
                      !caption && "italic text-cos-muted",
                    )}
                  >
                    {caption || "No caption yet."}
                  </div>
                </div>

                {storyCaption ? (
                  <div>
                    <p className="mb-2 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                      Story caption
                    </p>
                    <div className="rounded-[14px] border border-cos-border bg-[#f6f2eb] px-4 py-3.5 text-sm leading-relaxed text-cos-text">
                      {storyCaption}
                    </div>
                  </div>
                ) : null}

                {item.approvalHistory.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                      Approval timeline
                    </p>
                    <HistoryList entries={item.approvalHistory} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-cos-border bg-[rgba(246,242,235,0.55)] px-5 py-4 sm:px-6">
          {showRetry ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onRetry}
              className="rounded-full bg-cos-text px-[18px] py-2.5 text-[13px] font-bold text-cos-card transition hover:bg-[#1a1714] disabled:opacity-50"
            >
              {isSubmitting ? "Retrying…" : "Retry"}
            </button>
          ) : null}
          {canAct ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onApprove}
                className="rounded-full bg-cos-text px-[18px] py-2.5 text-[13px] font-bold text-cos-card transition hover:bg-[#1a1714] disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Approve & schedule"}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onRequestChanges}
                className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-2.5 text-[13px] font-bold text-cos-text transition hover:border-[#6b8171] disabled:opacity-50"
              >
                Request changes
              </button>
              <p className="min-w-[160px] flex-1 text-xs text-cos-muted">
                Review only — leave your note on Request changes.
              </p>
            </>
          ) : item.workflowStatus === "scheduled" ||
            item.workflowStatus === "posted" ||
            item.workflowStatus === "published" ? (
            <button
              type="button"
              disabled
              className="rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-2.5 text-[13px] font-bold text-cos-muted"
            >
              {item.deliveryMethod === "draft-only"
                ? "Saved as draft"
                : "Already approved"}
            </button>
          ) : item.workflowStatus === "failed" && !showRetry ? (
            <p className="text-sm text-cos-muted">
              {item.publishError || "Couldn’t post to your Page."}
            </p>
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
          ? "Email post kit"
          : deliveryMethod === "draft-only"
            ? "Draft"
            : deliveryMethod === "schedule"
              ? "Scheduled"
              : "Publish now"}
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

