"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PLATFORM_FORMAT_OPTIONS } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  DeliveryMethod,
  MilestonePreviewContent,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";
import { cn } from "@/lib/utils/cn";

const DELIVERY_OPTIONS = [
  ["publish-now", "Publish now"],
  ["schedule", "Schedule for later"],
  ["manual-email", "Email me for manual upload"],
  ["draft-only", "Save as draft only"],
] as const;

const FORMAT_BLURBS: Partial<Record<PlatformFormat, string>> = {
  "facebook-feed": "Square · Facebook",
  "facebook-story": "Vertical · Facebook",
  "instagram-feed": "Square · Instagram",
  "instagram-story": "Vertical · Meta story",
  "instagram-story-manual":
    "Email kit at send time — add music, stickers, link stickers yourself",
};

function formatScheduleDate(dateStr: string, timeStr: string): string {
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
    return `${dateStr} ${timeStr}`;
  }
}

function formatsSummary(enabled: PlatformFormat[]): string {
  if (enabled.length === 0) return "No formats selected";
  const labels = PLATFORM_FORMAT_OPTIONS.filter((o) =>
    enabled.includes(o.id),
  ).map((o) => o.label);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

interface PreviewSettingsPanelProps {
  preview: MilestonePreviewContent;
  onUpdate: (patch: Partial<MilestonePreviewContent>) => void;
  canUseDeveloperTools?: boolean;
  onClearGeneratedContent?: () => void;
  clearMessage?: string | null;
}

export function PreviewSettingsPanel({
  preview,
  onUpdate,
  canUseDeveloperTools = false,
  onClearGeneratedContent,
  clearMessage,
}: PreviewSettingsPanelProps) {
  const [formatsOpen, setFormatsOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const hasManualIgStory = preview.enabledFormats.includes(
    "instagram-story-manual",
  );

  useEffect(() => {
    if (!formatsOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!dropRef.current?.contains(event.target as Node)) {
        setFormatsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [formatsOpen]);

  function toggleFormat(format: PlatformFormat, enabled: boolean) {
    const enabledFormats = enabled
      ? [...preview.enabledFormats, format]
      : preview.enabledFormats.filter((f) => f !== format);
    onUpdate({ enabledFormats });
  }

  return (
    <aside className="h-fit space-y-5 rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <h2 className="font-display text-xl text-cos-text">Settings</h2>

      <div ref={dropRef} className="relative space-y-2">
        <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          Platforms &amp; formats
        </p>
        <p className="text-xs text-cos-muted">
          Facebook and Instagram posts go out automatically after approval.
        </p>
        <button
          type="button"
          aria-expanded={formatsOpen}
          onClick={() => setFormatsOpen((open) => !open)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-[14px] border border-cos-border bg-cos-bg px-3.5 py-3 text-left transition hover:border-cos-brand-sage",
            formatsOpen && "border-cos-brand-sage bg-cos-card shadow-sm",
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-cos-text">
              {formatsSummary(preview.enabledFormats)}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-cos-muted">
              {preview.enabledFormats.length} selected
              {hasManualIgStory ? " · includes Story Manual email kit" : ""}
              {" · click to change"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-cos-muted transition",
              formatsOpen && "rotate-180",
            )}
          />
        </button>

        {formatsOpen ? (
          <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-auto rounded-[16px] border border-cos-border bg-cos-card p-2 shadow-[0_18px_40px_rgba(42,38,34,0.12)]">
            {PLATFORM_FORMAT_OPTIONS.map((option) => {
              const on = preview.enabledFormats.includes(option.id);
              const isManual = option.id === "instagram-story-manual";
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleFormat(option.id, !on)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-[12px] px-2.5 py-2.5 text-left transition hover:bg-cos-bg",
                    on && "bg-cos-brand-sage/10",
                    isManual && on && "bg-[rgba(212,168,75,0.14)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-cos-border bg-cos-card",
                      on && "border-cos-text bg-cos-text text-white",
                    )}
                  >
                    {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <span
                      className={cn(
                        "block text-sm font-semibold text-cos-text",
                        isManual && "text-[#7a5a12]",
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-cos-muted">
                      {FORMAT_BLURBS[option.id] ?? option.aspect}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          When to publish
        </legend>
        {DELIVERY_OPTIONS.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`delivery-${preview.milestoneId}`}
              checked={
                value === "publish-now"
                  ? preview.deliveryMethod === "publish-now" ||
                    preview.deliveryMethod === "auto-publish"
                  : preview.deliveryMethod === value
              }
              onChange={() =>
                onUpdate({ deliveryMethod: value as DeliveryMethod })
              }
              className="h-4 w-4 accent-cos-text"
            />
            {label}
          </label>
        ))}
        {(preview.deliveryMethod === "publish-now" ||
          preview.deliveryMethod === "auto-publish") && (
          <p className="text-xs text-cos-muted">
            Goes out right after approval.
          </p>
        )}
      </fieldset>

      {preview.deliveryMethod === "schedule" ? (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Schedule
          </p>
          <Input
            label="Publish date"
            type="date"
            value={preview.scheduleDate}
            onChange={(e) => onUpdate({ scheduleDate: e.target.value })}
          />
          <Input
            label="Publish time"
            type="time"
            value={preview.scheduleTime}
            onChange={(e) => onUpdate({ scheduleTime: e.target.value })}
          />
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-cos-text transition-colors hover:text-cos-muted"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            Auto-suggest best time
          </button>
          <p className="text-xs text-cos-muted">
            {formatScheduleDate(preview.scheduleDate, preview.scheduleTime)}
          </p>
        </div>
      ) : null}

      {(hasManualIgStory || preview.deliveryMethod === "manual-email") && (
        <div className="space-y-2 rounded-[14px] border border-[rgba(212,168,75,0.35)] bg-[rgba(212,168,75,0.1)] p-3">
          <p className="inline-flex rounded-full bg-[rgba(212,168,75,0.22)] px-2.5 py-0.5 text-[11px] font-bold text-[#7a5a12]">
            Story kit email — music &amp; stickers workflow
          </p>
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Email send time (manual upload)
          </p>
          <p className="text-xs text-cos-muted">
            After approval, Resend queues the story kit (image link, caption, and
            Instagram link) to arrive at this send time. Keep &quot;Schedule for
            later&quot; when feed should still auto-post to Meta — Send-to alone
            does not cancel feed scheduling.
          </p>
          <Input
            label="Email send date"
            type="date"
            value={preview.emailSendDate}
            onChange={(e) => onUpdate({ emailSendDate: e.target.value })}
          />
          <Input
            label="Email send time"
            type="time"
            value={preview.emailSendTime}
            onChange={(e) => onUpdate({ emailSendTime: e.target.value })}
          />
          <Input
            label="Send to"
            type="email"
            value={preview.manualEmailTo}
            onChange={(e) =>
              onUpdate({
                manualEmailTo: e.target.value,
              })
            }
          />
          <Input
            label="Link for Instagram"
            type="url"
            placeholder="https://…"
            value={preview.manualUploadLink}
            onChange={(e) => onUpdate({ manualUploadLink: e.target.value })}
          />
          <p className="text-xs text-cos-muted">
            Optional. Included in the manual-upload email for link stickers.
          </p>
        </div>
      )}

      {canUseDeveloperTools && onClearGeneratedContent ? (
        <div className="space-y-2 border-t border-cos-border pt-4">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Developer tools
          </p>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onClearGeneratedContent}
          >
            Clear this post
          </Button>
          {clearMessage ? (
            <p className="text-xs text-cos-muted">{clearMessage}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
