"use client";

import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PLATFORM_FORMAT_OPTIONS } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  DeliveryMethod,
  MilestonePreviewContent,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";

const DELIVERY_OPTIONS = [
  ["auto-publish", "Publish automatically"],
  ["schedule", "Schedule to publish"],
  ["manual-email", "Email me for manual upload"],
  ["draft-only", "Save as draft only"],
] as const;

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

interface PreviewSettingsPanelProps {
  preview: MilestonePreviewContent;
  onUpdate: (patch: Partial<MilestonePreviewContent>) => void;
}

export function PreviewSettingsPanel({
  preview,
  onUpdate,
}: PreviewSettingsPanelProps) {
  const hasManualIgStory = preview.enabledFormats.includes(
    "instagram-story-manual",
  );

  function toggleFormat(format: PlatformFormat, enabled: boolean) {
    const enabledFormats = enabled
      ? [...preview.enabledFormats, format]
      : preview.enabledFormats.filter((f) => f !== format);
    onUpdate({ enabledFormats });
  }

  return (
    <aside className="cos-card h-fit space-y-5">
      <h2 className="font-display text-xl text-cos-text">Settings</h2>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          Platforms
        </legend>
        {PLATFORM_FORMAT_OPTIONS.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preview.enabledFormats.includes(option.id)}
              onChange={(e) => toggleFormat(option.id, e.target.checked)}
              className="h-4 w-4 accent-cos-text"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          Delivery method
        </legend>
        {DELIVERY_OPTIONS.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`delivery-${preview.milestoneId}`}
              checked={preview.deliveryMethod === value}
              onChange={() =>
                onUpdate({ deliveryMethod: value as DeliveryMethod })
              }
              className="h-4 w-4 accent-cos-text"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
          Schedule
        </p>
        <Input
          type="date"
          value={preview.scheduleDate}
          onChange={(e) => onUpdate({ scheduleDate: e.target.value })}
        />
        <Input
          type="time"
          value={preview.scheduleTime}
          onChange={(e) => onUpdate({ scheduleTime: e.target.value })}
        />
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-cos-accent transition-colors hover:text-cos-text"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
          Auto-suggest best time
        </button>
        <p className="text-xs text-cos-muted">
          {formatScheduleDate(preview.scheduleDate, preview.scheduleTime)}
        </p>
      </div>

      {(hasManualIgStory || preview.deliveryMethod === "manual-email") && (
        <div className="space-y-2 border-t border-cos-border pt-4">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Email send time (manual upload)
          </p>
          <p className="text-xs text-cos-muted">
            Defaults to publish time. Updates when publish schedule changes.
          </p>
          <Input
            type="date"
            value={preview.emailSendDate}
            onChange={(e) => onUpdate({ emailSendDate: e.target.value })}
          />
          <Input
            type="time"
            value={preview.emailSendTime}
            onChange={(e) => onUpdate({ emailSendTime: e.target.value })}
          />
          <Input
            label="Send to"
            value={preview.manualEmailTo}
            onChange={(e) => onUpdate({ manualEmailTo: e.target.value })}
          />
        </div>
      )}
    </aside>
  );
}
