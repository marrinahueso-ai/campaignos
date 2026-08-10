"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  Globe,
  HelpCircle,
  Mail,
  Send,
  X,
} from "lucide-react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
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
import {
  isNewsletterMilestoneId,
  newsletterComposerHref,
  parseNewsletterIdFromMilestoneId,
} from "@/lib/newsletter/approval";
import {
  campaignBuilderEditArtworkHref,
  campaignBuilderPreviewMilestoneHref,
} from "@/lib/campaign-builder-v2/navigation";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/dates";
import { displayApprovalPostName } from "@/lib/approvals-scheduling/milestone-display-names";
import {
  getUnifiedApprovalPreview,
  type UnifiedApprovalHistoryEntry,
  type UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";
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

function isFlyerApprovalItem(item: UnifiedApprovalItem): boolean {
  return (
    item.channel === "flyer" ||
    isFlyerComposerMilestoneId(item.campaignMilestoneId)
  );
}

function isNewsletterApprovalItem(item: UnifiedApprovalItem): boolean {
  return (
    item.channel === "newsletter" ||
    isNewsletterMilestoneId(item.campaignMilestoneId)
  );
}

function approveButtonLabel(
  item: UnifiedApprovalItem,
  isFlyer: boolean,
  isNewsletter: boolean,
): string {
  if (isNewsletter) return "Approve newsletter";
  if (isFlyer) return "Approve";
  const label = item.scheduleLabel?.trim();
  if (!label) return "Approve & schedule";
  const short = label.match(/^([A-Za-z]{3,9}\.?\s+\d{1,2})/);
  if (short) return `Approve for ${short[1]}`;
  return `Approve for ${label.split(",")[0] ?? label}`;
}

function HistoryFallback({
  item,
  canAct,
}: {
  item: UnifiedApprovalItem;
  canAct: boolean;
}) {
  const waitingLabel =
    item.workflowStatus === "changes_requested"
      ? "Changes requested"
      : item.workflowStatus === "scheduled" ||
          item.workflowStatus === "posted" ||
          item.workflowStatus === "published"
        ? "Approved"
        : canAct
          ? "Waiting for you to review"
          : item.statusDetail || "In review";

  return (
    <ol className="space-y-3">
      <li className="flex gap-3 text-sm text-cos-text">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2f4a3c] text-[11px] font-bold text-[#fffcf7]">
          1
        </span>
        <span className="pt-1">Draft created</span>
      </li>
      <li className="flex gap-3 text-sm text-cos-text">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6b8171] text-[#fffcf7]">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="pt-1">Sent for approval</span>
      </li>
      <li className="flex gap-3 text-sm text-cos-text">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            canAct ? "bg-[#e8c4b4] text-[#8a4a32]" : "bg-cos-border text-cos-muted",
          )}
        >
          <Clock className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="pt-1 font-semibold">{waitingLabel}</span>
      </li>
    </ol>
  );
}

function HistoryList({ entries }: { entries: UnifiedApprovalHistoryEntry[] }) {
  return (
    <ul className="space-y-2.5">
      {entries.map((entry, index) => (
        <li
          key={`${entry.timestamp}-${index}`}
          className="grid grid-cols-[28px_1fr] gap-2.5 text-[13px] leading-snug"
        >
          <span
            className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-[rgba(47,74,60,0.12)] text-[11px] font-extrabold text-[#2f4a3c]"
            aria-hidden
          >
            {index + 1}
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
  const [captionCopied, setCaptionCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCaptionCopied(false);
  }, [open, item?.id]);

  if (!open || !item) {
    return null;
  }

  const changeRequestComment = changeRequestDisplayComment(item.notes);
  const showChangeRequestBanner = item.workflowStatus === "changes_requested";
  const isFlyer = isFlyerApprovalItem(item);
  const isNewsletter = isNewsletterApprovalItem(item);
  const newsletterId = isNewsletter
    ? parseNewsletterIdFromMilestoneId(item.campaignMilestoneId)
    : null;
  const editPreviewHref = isNewsletter
    ? newsletterComposerHref(newsletterId)
    : isFlyer
      ? flyerComposerEditHref()
      : item.campaignMilestoneId != null
        ? campaignBuilderPreviewMilestoneHref(
            item.eventId,
            item.campaignMilestoneId,
          )
        : null;
  const editArtworkHref = isNewsletter
    ? newsletterComposerHref(newsletterId)
    : isFlyer
      ? flyerComposerEditHref()
      : item.campaignMilestoneId != null
        ? campaignBuilderEditArtworkHref(item.eventId, item.campaignMilestoneId)
        : null;

  const showRetry = canRetryFailedApproval(item) && Boolean(onRetry);
  const preview = getUnifiedApprovalPreview(item);
  const caption =
    preview.captionText?.trim() ||
    preview.storyCaptionSnippet?.trim() ||
    null;
  const hasCaption = Boolean(caption);
  const feedUrl = preview.feedArtworkUrl;
  const storyUrl = isFlyer || isNewsletter ? null : preview.storyArtworkUrl;
  const channelPills = isNewsletter
    ? ["Newsletter"]
    : isFlyer
      ? ["Flyer"]
      : item.platforms.length > 0
        ? item.platforms.map((platform) =>
            platform === "facebook"
              ? "Facebook"
              : platform === "instagram"
                ? "Instagram"
                : "Email",
          )
        : ["Social"];

  async function copyCaption() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      window.setTimeout(() => setCaptionCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 md:p-6">
      <button
        type="button"
        aria-label="Close review"
        className="absolute inset-0 bg-[rgba(28,36,48,0.55)] backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(94vh,900px)] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-[22px] border border-[rgba(47,74,60,0.28)] bg-[#fffcf7] shadow-[0_28px_80px_rgba(47,74,60,0.22)] sm:rounded-[22px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-drawer-title"
      >
        {/* Forest identity strip — open review */}
        <div
          className="h-1.5 shrink-0 bg-gradient-to-r from-[#2f4a3c] via-[#6b8171] to-[#2f4a3c]"
          aria-hidden
        />
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(47,74,60,0.14)] bg-gradient-to-br from-[#e8eee9] via-[#f4f7f3] to-white px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(47,74,60,0.22)] bg-white text-[#2f4a3c] transition hover:border-[#2f4a3c] hover:bg-[#e8eee9]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <div className="min-w-0">
              <p className="mb-1.5 inline-flex rounded-full bg-[#2f4a3c] px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-[#fffcf7] uppercase">
                Open review
              </p>
              <h2
                id="review-drawer-title"
                className="font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-[#2f4a3c] italic sm:text-[1.85rem]"
              >
                {item.campaignName}
              </h2>
              <p className="mt-1 text-[11px] font-extrabold tracking-[0.08em] text-[#6b8171] uppercase">
                Post title:{" "}
                <span className="text-cos-text">
                  &lsquo;{displayApprovalPostName(item.milestoneName)}&rsquo;
                </span>
              </p>
              <p className="mt-1.5 text-sm text-cos-muted">
                Please review the details below and select an action.
              </p>
              {hasStaleContentNote(item.notes) ? (
                <span className="mt-2 inline-flex rounded-full bg-[#f8e3e3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#8b3f3f] uppercase">
                  Content may be outdated
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a
              href="mailto:hello@heyralli.com?subject=Help%20with%20approvals"
              className="inline-flex items-center gap-1.5 px-2 py-2 text-[13px] font-semibold text-cos-muted transition hover:text-cos-text"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
              Need help?
            </a>
            {showRetry ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onRetry}
                className="rounded-[12px] bg-[#2f4a3c] px-4 py-2.5 text-[13px] font-bold text-[#fffcf7] transition hover:brightness-110 disabled:opacity-50"
              >
                {isSubmitting ? "Retrying…" : "Retry"}
              </button>
            ) : null}
            {canAct ? (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onRequestChanges}
                  className="rounded-[12px] border border-cos-border bg-white px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:border-[#6b8171] disabled:opacity-50"
                >
                  Request changes
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onApprove}
                  className="rounded-[12px] bg-[#2f4a3c] px-4 py-2.5 text-[13px] font-bold text-[#fffcf7] transition hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving…"
                    : approveButtonLabel(item, isFlyer, isNewsletter)}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-cos-border bg-white text-cos-muted transition hover:text-cos-text lg:hidden"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
          <div className="min-h-0 overflow-y-auto bg-[#f6f2eb] px-4 py-5 sm:px-6">
            {showChangeRequestBanner ? (
              <div className="mb-5 rounded-2xl border border-[rgba(166,90,58,0.25)] bg-[rgba(166,90,58,0.08)] px-4 py-3">
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
                        {isNewsletter
                          ? "Open newsletter composer"
                          : isFlyer
                            ? "Open Flyer composer"
                            : "Edit artwork"}
                      </Button>
                    ) : null}
                    {!isFlyer && !isNewsletter && editPreviewHref ? (
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

            <p className="mb-3 text-[11px] font-extrabold tracking-[0.1em] text-cos-muted uppercase">
              {isNewsletter
                ? "This newsletter is ready for review"
                : isFlyer
                  ? "This flyer will appear like this"
                  : "This post will appear in 2 formats"}
            </p>

            {isNewsletter ? (
              <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-cos-border bg-white/70 px-4 py-3.5">
                <Mail
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#6b8171]"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="text-sm font-semibold text-cos-text">
                    {caption || "No subject line yet"}
                  </p>
                  <p className="mt-1 text-xs text-cos-muted">
                    Open the newsletter composer to review the full draft.
                  </p>
                </div>
              </div>
            ) : isFlyer ? (
              <div className="mb-6 max-w-[280px]">
                <p className="mb-2 text-[10px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                  Flyer preview
                </p>
                <ArtworkLightboxThumbnail
                  src={feedUrl}
                  alt={`${item.milestoneName} flyer artwork`}
                  variant="feed"
                  wrapperClassName="w-full max-w-[240px]"
                  frameClassName="aspect-[2/3] w-full rounded-[14px] shadow-[0_8px_24px_rgba(28,36,48,0.1)]"
                  placeholder="No flyer artwork yet"
                />
              </div>
            ) : (
              <div className="mb-6 flex flex-wrap items-end gap-5">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Feed · 1:1
                  </p>
                  <ArtworkLightboxThumbnail
                    src={feedUrl}
                    alt={`${item.milestoneName} feed artwork`}
                    variant="feed"
                    wrapperClassName="w-[200px] sm:w-[220px]"
                    frameClassName="aspect-square w-full rounded-[14px] shadow-[0_8px_24px_rgba(28,36,48,0.1)]"
                    placeholder="No feed artwork yet"
                  />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                    Story · 9:16
                  </p>
                  <ArtworkLightboxThumbnail
                    src={storyUrl}
                    alt={`${item.milestoneName} story artwork`}
                    variant="story"
                    wrapperClassName="w-[120px] sm:w-[132px]"
                    frameClassName="aspect-[9/16] w-full rounded-[14px] shadow-[0_8px_24px_rgba(28,36,48,0.1)]"
                    placeholder="No story artwork yet"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 border-t border-cos-border/80 pt-5 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                  Review history
                </p>
                {item.approvalHistory.length > 0 ? (
                  <HistoryList entries={item.approvalHistory} />
                ) : (
                  <HistoryFallback item={item} canAct={canAct} />
                )}
              </div>

              <div className="rounded-[16px] border border-dashed border-cos-border/80 bg-white/70 p-4">
                <p className="mb-1 text-[10px] font-extrabold tracking-[0.1em] text-cos-muted uppercase">
                  Note to reviewer
                </p>
                <p className="text-sm text-cos-muted">
                  No note from the creator on this one.
                </p>
              </div>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-cos-border bg-white px-4 py-5 sm:px-5 lg:border-t-0 lg:border-l">
            <section className="mb-5 border-b border-cos-border pb-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold tracking-[0.1em] text-cos-muted uppercase">
                  {isNewsletter ? "Subject line" : isFlyer ? "On-flyer copy" : "Caption"}
                </p>
                {hasCaption && !isFlyer && !isNewsletter ? (
                  <button
                    type="button"
                    onClick={() => void copyCaption()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cos-muted transition hover:text-cos-text"
                  >
                    <Copy className="h-3 w-3" strokeWidth={2} />
                    {captionCopied ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
              <div
                className={cn(
                  "rounded-[14px] border border-cos-border bg-[#fffcf7] px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap text-cos-text",
                  !caption && "italic text-cos-muted",
                )}
              >
                {caption ||
                  (isNewsletter
                    ? "No subject line yet."
                    : isFlyer
                      ? "No on-flyer copy yet."
                      : "No caption yet.")}
              </div>
            </section>

            <section className="mb-5 border-b border-cos-border pb-5">
              <p className="mb-2 text-[11px] font-extrabold tracking-[0.1em] text-cos-muted uppercase">
                Schedule
              </p>
              <div className="flex items-start gap-3 rounded-[14px] border border-cos-border bg-[#fffcf7] px-3.5 py-3">
                <Calendar
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#6b8171]"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="text-sm font-semibold text-cos-text">
                    {isNewsletter
                      ? "Draft — not sent yet"
                      : isFlyer
                        ? "Print-ready"
                        : item.scheduleLabel || "Schedule not set yet"}
                  </p>
                  <p className="mt-0.5 text-xs text-cos-muted">
                    {approvalOutcomeChip(item).label}
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-5 border-b border-cos-border pb-5">
              <p className="mb-2 text-[11px] font-extrabold tracking-[0.1em] text-cos-muted uppercase">
                Channels
              </p>
              <div className="flex flex-wrap gap-2">
                {channelPills.map((ch) => (
                  <span
                    key={ch}
                    className="rounded-full border border-cos-border bg-[#f6f2eb] px-3 py-1 text-xs font-bold text-cos-text"
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 text-[11px] font-extrabold tracking-[0.1em] text-cos-muted uppercase">
                Visibility
              </p>
              <div className="flex items-start gap-3 text-sm text-cos-text">
                <Globe
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#6b8171]"
                  strokeWidth={1.75}
                />
                <p>
                  {isNewsletter
                    ? "Sent to your saved newsletter audience"
                    : isFlyer
                      ? "Shared as a downloadable / printable flyer"
                      : "Public (Anyone on or off Facebook)"}
                </p>
              </div>
            </section>

            {item.assigneeName && item.assigneeName !== "—" ? (
              <p className="mt-6 text-xs text-cos-muted">
                Assigned to{" "}
                <span className="font-bold text-cos-text">
                  {item.assigneeName}
                </span>
              </p>
            ) : null}
          </aside>
        </div>
      </div>
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
