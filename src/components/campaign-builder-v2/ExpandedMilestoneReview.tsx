"use client";

import { Check, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { getSharedCaptionText } from "@/lib/campaign-builder-v2/caption-utils";
import { derivedPreviewStatus } from "@/lib/campaign-builder-v2/milestone-status";
import {
  ARTWORK_VIEW_OPTIONS,
  PLATFORM_FORMAT_LABELS,
  artworkKeyForFormat,
  artworkKeyForView,
  artworkViewForFormat,
  enabledArtworkViews,
} from "@/lib/campaign-builder-v2/platform-utils";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignBuilderMilestone,
  DeliveryMethod,
  MilestonePreviewContent,
  MilestonePreviewStatus,
} from "@/lib/campaign-builder-v2/types";

const STATUS_LABELS: Record<MilestonePreviewStatus, string> = {
  ready: "Ready",
  "needs-review": "Needs review",
  draft: "Draft",
};

const STATUS_STYLES: Record<MilestonePreviewStatus, string> = {
  ready: "bg-cos-success-bg text-cos-success-text",
  "needs-review": "bg-cos-warning text-cos-warning-text",
  draft: "bg-cos-info text-cos-info-text",
};

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  "auto-publish": "Auto-publish",
  schedule: "Scheduled",
  "manual-email": "Manual email",
  "draft-only": "Draft only",
};

function formatScheduleLabel(dateStr: string, timeStr: string): string {
  try {
    const date = new Date(`${dateStr}T${timeStr || "09:00"}:00`);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatApprovalTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

interface ExpandedMilestoneReviewProps {
  index: number;
  milestone: CampaignBuilderMilestone;
  preview: MilestonePreviewContent;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdatePreview: (patch: Partial<MilestonePreviewContent>) => void;
}

export function ExpandedMilestoneReview({
  index,
  milestone,
  preview,
  isExpanded,
  onToggle,
  onUpdatePreview,
}: ExpandedMilestoneReviewProps) {
  const showManualDetails =
    preview.deliveryMethod === "manual-email" ||
    preview.enabledFormats.includes("instagram-story-manual");
  const contentStatus = derivedPreviewStatus(preview);

  const emailAssets = preview.enabledFormats.map((format) => {
    const view = artworkViewForFormat(format);
    const key = artworkKeyForView(view);
    const hasArtwork = Boolean(preview.artwork[key]);
    return {
      label: PLATFORM_FORMAT_LABELS[format],
      included: hasArtwork,
    };
  });

  const artworkSummaryViews = enabledArtworkViews(preview.enabledFormats);
  const sharedCaptionText = getSharedCaptionText(preview.captions);
  const captionsAreShared =
    preview.captions.length <= 1 ||
    preview.captions.every(
      (caption) => caption.text.trim() === sharedCaptionText.trim(),
    );

  return (
    <div className="border-b border-cos-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-cos-bg/40 sm:gap-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cos-success text-sm font-semibold text-white">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 font-display text-lg text-cos-text">
          {milestone.name}
        </span>
        <span
          className={cn(
            "shrink-0 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            STATUS_STYLES[contentStatus],
          )}
        >
          {STATUS_LABELS[contentStatus]}
        </span>
        <select
          value={preview.deliveryMethod}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onUpdatePreview({
              deliveryMethod: e.target
                .value as MilestonePreviewContent["deliveryMethod"],
            });
          }}
          className="hidden shrink-0 border border-cos-border bg-cos-card px-2 py-1 text-sm text-cos-text sm:block"
        >
          <option value="auto-publish">Auto-publish</option>
          <option value="schedule">Scheduled</option>
          <option value="manual-email">Manual email</option>
          <option value="draft-only">Draft only</option>
        </select>
        <span className="hidden shrink-0 whitespace-nowrap text-sm text-cos-muted lg:block">
          {formatScheduleLabel(preview.scheduleDate, preview.scheduleTime)}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-cos-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="grid gap-0 border-t border-cos-border bg-cos-bg/20 lg:grid-cols-4">
          <section className="space-y-3 border-b border-cos-border p-4 lg:border-b-0 lg:border-r">
            <h3 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Content summary
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-cos-text">Artwork</p>
              <ul className="space-y-1">
                {artworkSummaryViews.map((view) => {
                  const option = ARTWORK_VIEW_OPTIONS.find(
                    (entry) => entry.id === view,
                  );
                  const key = artworkKeyForView(view);
                  const hasArtwork = Boolean(preview.artwork[key]);
                  return (
                    <li key={view} className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          hasArtwork ? "text-cos-success" : "text-cos-border",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className="text-cos-muted">
                        {option?.label ?? view}
                        {option?.subtitle ? ` (${option.subtitle})` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="pt-2 font-medium text-cos-text">Publish formats</p>
              <ul className="space-y-1">
                {preview.enabledFormats.map((format) => (
                  <li key={format} className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        preview.artwork[artworkKeyForFormat(format)]
                          ? "text-cos-success"
                          : "text-cos-border",
                      )}
                      strokeWidth={2.5}
                    />
                    <span className="text-cos-muted">
                      {PLATFORM_FORMAT_LABELS[format]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pt-2 font-medium text-cos-text">Captions</p>
              {captionsAreShared ? (
                <div className="flex items-start gap-2">
                  <Check
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      sharedCaptionText.trim()
                        ? "text-cos-success"
                        : "text-cos-border",
                    )}
                    strokeWidth={2.5}
                  />
                  <span className="text-cos-muted">
                    {sharedCaptionText.trim()
                      ? "Facebook & Instagram caption"
                      : "No caption yet"}
                  </span>
                </div>
              ) : (
                <ul className="space-y-1">
                  {preview.captions.map((caption) => (
                    <li key={caption.platform} className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          caption.text
                            ? "text-cos-success"
                            : "text-cos-border",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className="text-cos-muted">
                        {caption.platform === "facebook"
                          ? "Facebook caption"
                          : "Instagram caption"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-3 border-b border-cos-border p-4 lg:border-b-0 lg:border-r">
            <h3 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Schedule
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-cos-muted">Publish date</dt>
                <dd className="font-medium text-cos-text">{preview.scheduleDate}</dd>
              </div>
              <div>
                <dt className="text-cos-muted">Publish time</dt>
                <dd className="font-medium text-cos-text">{preview.scheduleTime}</dd>
              </div>
              <div>
                <dt className="text-cos-muted">Status</dt>
                <dd className="font-medium text-cos-text">
                  {DELIVERY_LABELS[preview.deliveryMethod]}
                </dd>
              </div>
            </dl>
            {showManualDetails && (
              <div className="space-y-2 border-t border-cos-border pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                  Email send time
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                </p>
                <Input
                  type="date"
                  value={preview.emailSendDate}
                  onChange={(e) =>
                    onUpdatePreview({ emailSendDate: e.target.value })
                  }
                />
                <Input
                  type="time"
                  value={preview.emailSendTime}
                  onChange={(e) =>
                    onUpdatePreview({ emailSendTime: e.target.value })
                  }
                />
              </div>
            )}
          </section>

          {showManualDetails ? (
            <section className="space-y-3 border-b border-cos-border p-4 lg:border-b-0 lg:border-r">
              <h3 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                Email details (Manual upload)
              </h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-cos-muted">Send to</dt>
                  <dd>
                    <Input
                      type="email"
                      value={preview.manualEmailTo}
                      onChange={(e) =>
                        onUpdatePreview({ manualEmailTo: e.target.value })
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-cos-muted">Link for Instagram</dt>
                  <dd>
                    <Input
                      type="url"
                      placeholder="https://…"
                      value={preview.manualUploadLink}
                      onChange={(e) =>
                        onUpdatePreview({ manualUploadLink: e.target.value })
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-cos-muted">Subject preview</dt>
                  <dd className="text-cos-text">
                    Your {milestone.name} content for{" "}
                    {formatScheduleLabel(
                      preview.scheduleDate,
                      preview.scheduleTime,
                    )}
                  </dd>
                </div>
              </dl>
              <div>
                <p className="text-xs font-medium text-cos-muted">
                  Include in email
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {emailAssets.map((asset) => (
                    <li key={asset.label} className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          asset.included
                            ? "text-cos-success"
                            : "text-cos-border",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className="text-cos-muted">{asset.label}</span>
                    </li>
                  ))}
                  {captionsAreShared ? (
                    <li className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          sharedCaptionText.trim()
                            ? "text-cos-success"
                            : "text-cos-border",
                        )}
                        strokeWidth={2.5}
                      />
                      <span className="text-cos-muted">
                        Facebook & Instagram caption
                      </span>
                    </li>
                  ) : (
                    preview.captions.map((caption) => (
                      <li
                        key={`email-${caption.platform}`}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5",
                            caption.text ? "text-cos-success" : "text-cos-border",
                          )}
                          strokeWidth={2.5}
                        />
                        <span className="text-cos-muted">
                          {caption.platform === "facebook"
                            ? "Facebook caption"
                            : "Instagram caption"}
                        </span>
                      </li>
                    ))
                  )}
                  <li className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        preview.manualUploadLink.trim()
                          ? "text-cos-success"
                          : "text-cos-border",
                      )}
                      strokeWidth={2.5}
                    />
                    <span className="text-cos-muted">Instagram link</span>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-cos-muted">
                After approval, this kit emails via Resend at{" "}
                {formatScheduleLabel(
                  preview.emailSendDate,
                  preview.emailSendTime,
                )}{" "}
                CT
              </p>
            </section>
          ) : (
            <section className="hidden p-4 lg:block lg:border-r" />
          )}

          <section className="space-y-3 p-4">
            <h3 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
              Approvals
            </h3>
            <ul className="space-y-3 text-sm">
              {preview.approvalStatuses.map((approval) => (
                <li key={approval.role}>
                  <p className="font-medium text-cos-text">{approval.label}</p>
                  <p className="text-cos-muted">
                    {approval.status === "approved"
                      ? "Approved"
                      : approval.status === "pending"
                        ? "Pending"
                        : "—"}
                  </p>
                  <p className="text-xs text-cos-muted">
                    {formatApprovalTimestamp(approval.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
