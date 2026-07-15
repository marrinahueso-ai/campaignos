"use client";

import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  MILESTONE_STATUS_LABELS,
  resolveMilestoneGenerationStatus,
} from "@/lib/campaign-builder-v2/milestone-status";
import { PLATFORM_FORMAT_OPTIONS } from "@/lib/campaign-builder-v2/platform-utils";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignBuilderMilestone,
  MilestoneCreativeOverrides,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
  MilestoneStatusTag,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";

type OverrideMode = "inherit" | "none";

function readOverrideMode(
  formData: FormData,
  field: string,
): OverrideMode {
  return formData.get(field) === "none" ? "none" : "inherit";
}

/** Only logo/colors are supported here — "selected" per-milestone values (e.g. a
 * different logo than the campaign default) are not exposed in this minimal UI yet. */
function buildCreativeOverridesPatch(formData: FormData): MilestoneCreativeOverrides | undefined {
  const logoMode = readOverrideMode(formData, "logoOverrideMode");
  const colorsMode = readOverrideMode(formData, "colorsOverrideMode");

  if (logoMode === "inherit" && colorsMode === "inherit") {
    return undefined;
  }

  const overrides: MilestoneCreativeOverrides = {};
  if (logoMode === "none") {
    overrides.logo = { mode: "none" };
  }
  if (colorsMode === "none") {
    overrides.colors = { mode: "none" };
  }
  return overrides;
}

function statusTagFromGeneration(
  status: MilestoneGenerationStatus,
): MilestoneStatusTag {
  switch (status) {
    case "generated":
    case "approved":
    case "scheduled":
    case "published":
      return "complete";
    case "queued":
    case "generating":
      return "in-progress";
    case "needs_review":
    case "changes_requested":
      return "needs-review";
    case "awaiting_approval":
      return "pending";
    default:
      return "not-started";
  }
}

export function readMilestoneEditorPatch(
  form: HTMLFormElement,
  options?: {
    preview?: MilestonePreviewContent | null;
    platformFormatsFallback?: PlatformFormat[];
  },
): Partial<CampaignBuilderMilestone> {
  const formData = new FormData(form);
  const platformFormats = PLATFORM_FORMAT_OPTIONS.filter((option) =>
    formData.getAll("platformFormats").includes(option.id),
  ).map((option) => option.id) as PlatformFormat[];

  const generationStatus = resolveMilestoneGenerationStatus(
    options?.preview,
    platformFormats.length > 0
      ? platformFormats
      : (options?.platformFormatsFallback ?? []),
  );

  return {
    name: String(formData.get("name") ?? ""),
    purpose: String(formData.get("purpose") ?? ""),
    suggestedDate: String(formData.get("suggestedDate") ?? ""),
    artworkNotes: String(formData.get("artworkNotes") ?? ""),
    captionNotes: String(formData.get("captionNotes") ?? ""),
    // Persist a tag aligned with the shared generation status — never trust a
    // manual dropdown that stays "not-started" after content is generated.
    statusTag: statusTagFromGeneration(generationStatus),
    platformFormats,
    creativeOverrides: buildCreativeOverridesPatch(formData),
  };
}

interface MilestoneEditorModalProps {
  milestone: CampaignBuilderMilestone;
  preview?: MilestonePreviewContent | null;
  onClose: () => void;
  onSave: (patch: Partial<CampaignBuilderMilestone>) => void;
  onDelete: () => void;
  formId?: string;
}

export function MilestoneEditorModal({
  milestone,
  preview = null,
  onClose,
  onSave,
  onDelete,
  formId = "milestone-editor-form",
}: MilestoneEditorModalProps) {
  const displayStatus = resolveMilestoneGenerationStatus(
    preview,
    milestone.platformFormats,
  );

  return (
    <CampaignBuilderModal
      title="Edit milestone"
      subtitle="Update name, purpose, platforms, and AI guidance"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onDelete}>
            Delete milestone
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId}>
              Save milestone
            </Button>
          </div>
        </div>
      }
    >
      <form
        id={formId}
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(
            readMilestoneEditorPatch(event.currentTarget, {
              preview,
              platformFormatsFallback: milestone.platformFormats,
            }),
          );
          onClose();
        }}
      >
        <Input
          label="Milestone name"
          name="name"
          defaultValue={milestone.name}
          required
        />
        <Textarea
          label="Purpose"
          name="purpose"
          defaultValue={milestone.purpose}
          rows={3}
          required
        />
        <Input
          label="Suggested date"
          name="suggestedDate"
          type="date"
          defaultValue={milestone.suggestedDate}
          required
        />

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Platforms & formats
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PLATFORM_FORMAT_OPTIONS.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="platformFormats"
                  value={option.id}
                  defaultChecked={milestone.platformFormats.includes(option.id)}
                  className="h-4 w-4 accent-cos-text"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Textarea
          label="Artwork notes (artwork only)"
          name="artworkNotes"
          defaultValue={milestone.artworkNotes}
          rows={3}
          placeholder="Visual direction for AI artwork generation..."
        />
        <Textarea
          label="Caption notes (captions only)"
          name="captionNotes"
          defaultValue={milestone.captionNotes}
          rows={3}
          placeholder="Tone, CTA, and messaging notes for captions..."
        />

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Creative overrides for this milestone
          </legend>
          <p className="text-xs text-cos-muted">
            By default this milestone inherits the campaign&apos;s logo and
            color settings from Your Creative Setup. Choose None to opt this
            milestone out — it will never fall back to the campaign setting.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Logo"
              name="logoOverrideMode"
              defaultValue={
                milestone.creativeOverrides?.logo?.mode === "none"
                  ? "none"
                  : "inherit"
              }
            >
              <option value="inherit">Inherit from campaign</option>
              <option value="none">None for this milestone</option>
            </Select>
            <Select
              label="Colors"
              name="colorsOverrideMode"
              defaultValue={
                milestone.creativeOverrides?.colors?.mode === "none"
                  ? "none"
                  : "inherit"
              }
            >
              <option value="inherit">Inherit from campaign</option>
              <option value="none">None for this milestone</option>
            </Select>
          </div>
        </fieldset>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
            Status
          </p>
          <p
            className={cn(
              "inline-block px-2 py-1 text-xs font-semibold tracking-wide uppercase",
              displayStatus === "generated" ||
                displayStatus === "approved" ||
                displayStatus === "scheduled" ||
                displayStatus === "published"
                ? "bg-cos-success-bg text-cos-success-text"
                : displayStatus === "ready_to_generate"
                  ? "border border-cos-border bg-cos-bg text-cos-muted"
                  : "bg-cos-warning text-cos-warning-text",
            )}
          >
            {MILESTONE_STATUS_LABELS[displayStatus]}
          </p>
          <p className="text-xs text-cos-muted">
            Based on generated artwork and captions for this milestone — same
            status as the timeline.
          </p>
        </div>
      </form>
    </CampaignBuilderModal>
  );
}
