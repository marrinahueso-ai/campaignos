"use client";

import { CampaignBuilderModal } from "@/components/campaign-builder-v2/CampaignBuilderModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PLATFORM_FORMAT_OPTIONS } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  CampaignBuilderMilestone,
  MilestoneCreativeOverrides,
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

export function readMilestoneEditorPatch(
  form: HTMLFormElement,
): Partial<CampaignBuilderMilestone> {
  const formData = new FormData(form);
  const platformFormats = PLATFORM_FORMAT_OPTIONS.filter((option) =>
    formData.getAll("platformFormats").includes(option.id),
  ).map((option) => option.id) as PlatformFormat[];

  return {
    name: String(formData.get("name") ?? ""),
    purpose: String(formData.get("purpose") ?? ""),
    suggestedDate: String(formData.get("suggestedDate") ?? ""),
    artworkNotes: String(formData.get("artworkNotes") ?? ""),
    captionNotes: String(formData.get("captionNotes") ?? ""),
    statusTag: String(formData.get("statusTag") ?? "not-started") as MilestoneStatusTag,
    platformFormats,
    creativeOverrides: buildCreativeOverridesPatch(formData),
  };
}

const STATUS_TAG_OPTIONS: Array<{ value: MilestoneStatusTag; label: string }> = [
  { value: "complete", label: "Complete" },
  { value: "in-progress", label: "In progress" },
  { value: "needs-review", label: "Needs review" },
  { value: "pending", label: "Pending" },
  { value: "not-started", label: "Not started" },
];

interface MilestoneEditorModalProps {
  milestone: CampaignBuilderMilestone;
  onClose: () => void;
  onSave: (patch: Partial<CampaignBuilderMilestone>) => void;
  onDelete: () => void;
  formId?: string;
}

export function MilestoneEditorModal({
  milestone,
  onClose,
  onSave,
  onDelete,
  formId = "milestone-editor-form",
}: MilestoneEditorModalProps) {
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
          onSave(readMilestoneEditorPatch(event.currentTarget));
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

        <Select
          label="Status tag"
          name="statusTag"
          defaultValue={milestone.statusTag}
        >
          {STATUS_TAG_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </form>
    </CampaignBuilderModal>
  );
}
