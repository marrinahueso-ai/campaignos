import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Mail,
  Send,
  User,
} from "lucide-react";
import type { UnifiedApprovalHistoryEntry } from "@/lib/approvals-scheduling/types";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/dates";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close review drawer"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-cos-border bg-cos-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-cos-border px-6 py-5">
          <div>
            <p className="studio-eyebrow">Review</p>
            <h2 className="font-display mt-1 text-3xl text-cos-text">
              {item.milestoneName}
            </h2>
            <p className="mt-1 text-sm text-cos-muted">
              {item.campaignName} · Campaign
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {item.preview.feedArtworkUrl ? (
              <ArtworkLightboxThumbnail
                src={item.preview.feedArtworkUrl}
                alt={`${item.milestoneName} feed artwork`}
                label="Feed 1:1"
                variant="feed"
                wrapperClassName="w-full"
                frameClassName="aspect-square"
                placeholder="Feed"
              />
            ) : null}
            {item.preview.storyArtworkUrl ? (
              <ArtworkLightboxThumbnail
                src={item.preview.storyArtworkUrl}
                alt={`${item.milestoneName} story artwork`}
                label="Story 9:16"
                variant="story"
                wrapperClassName="w-full"
                frameClassName="aspect-[9/16]"
                placeholder="Story"
              />
            ) : null}
            {!item.preview.feedArtworkUrl && !item.preview.storyArtworkUrl ? (
              <div className="col-span-full rounded-xl border border-dashed border-cos-border bg-cos-bg/40 px-4 py-8 text-center">
                <p className="text-sm font-medium text-cos-text">No artwork attached</p>
                <p className="mt-1 text-xs text-cos-muted">
                  Open Create with AI, generate artwork for this milestone, then send for
                  approval again.
                </p>
              </div>
            ) : null}
          </div>

          {item.preview.captionText ? (
            <div>
              <p className="cos-section-title">Shared caption</p>
              <p className="mt-2 text-sm leading-relaxed text-cos-text">
                {item.preview.captionText}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="cos-section-title">Platforms</p>
              <p className="mt-2 text-sm text-cos-text">
                {item.platforms.join(", ")}
              </p>
            </div>
            <div>
              <p className="cos-section-title">Delivery</p>
              <p className="mt-2 text-sm text-cos-text">
                {item.deliveryMethod ?? "auto-publish"}
              </p>
            </div>
          </div>

          {item.scheduleLabel ? (
            <div>
              <p className="cos-section-title">Schedule</p>
              <p className="mt-2 text-sm text-cos-text">{item.scheduleLabel}</p>
            </div>
          ) : null}

          <div>
            <p className="cos-section-title">Approval history</p>
            <div className="mt-3">
              <HistoryList entries={item.approvalHistory} />
            </div>
          </div>

          {canAct ? (
            <div>
              <label className="cos-section-title" htmlFor="review-comment">
                Comment
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                rows={3}
                placeholder="Add a note for the creator or approver…"
                className="mt-2 w-full resize-y border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        {canAct ? (
          <div className="flex flex-wrap gap-2 border-t border-cos-border px-6 py-4">
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={onApprove}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={onRequestChanges}
            >
              Request changes
            </Button>
          </div>
        ) : null}
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
            : "Auto-publish"}
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
    <section className="border border-cos-border bg-cos-card px-6 py-6">
      <h2 className="font-display text-2xl text-cos-text">
        How the approval flow works
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-cos-border bg-cos-bg">
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
