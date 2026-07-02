"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_GENERATION_SETTINGS,
  IMAGE_SIZE_PRESETS,
  VARIATION_PRESETS,
} from "@/lib/ai-artwork/constants";
import {
  ARTWORK_MODE_OPTIONS,
  resolveArtworkBrandColors,
} from "@/lib/ai-artwork/artwork-mode";
import type { ArtworkGenerationSettings, CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { CreativeBrief } from "@/lib/creative-director/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import { findInspirationAssetInList } from "@/lib/ai-artwork/display";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";

interface ArtworkCreativeBriefPanelProps {
  brief: CreativeBrief;
  campaignEvent: CampaignEventSnapshot | null;
  organizationName: string | null;
  platformLabel: string;
  settings: ArtworkGenerationSettings;
  inspirationAssets: InspirationAsset[];
  supportsImageReference: boolean;
  canEdit: boolean;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  onSettingsChange: (value: ArtworkGenerationSettings) => void;
  onSave: () => void;
  isSaving?: boolean;
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-cos-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-cos-text">{value}</dd>
    </div>
  );
}

export function ArtworkCreativeBriefPanel({
  brief,
  campaignEvent,
  organizationName,
  platformLabel,
  settings,
  inspirationAssets,
  supportsImageReference,
  canEdit,
  customPrompt,
  onCustomPromptChange,
  onSettingsChange,
  onSave,
  isSaving = false,
}: ArtworkCreativeBriefPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedInspiration = findInspirationAssetInList(
    settings.inspirationAssetId,
    inspirationAssets,
  );
  const inspirationImageUrl = resolveAssetImageUrl(selectedInspiration?.storagePath ?? null);

  const brandDisplay = resolveArtworkBrandColors({
    brandColors: [],
    briefPalette: brief.colorPalette,
  }).join(", ");

  const creativeGoal =
    "Design artwork that parents would immediately want to share — polished, warm, and clearly about the event.";

  return (
    <div className="space-y-6 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-cos-text">Creative Brief</h3>
        <p className="mt-1 text-xs text-cos-muted">
          CampaignOS directs the artwork. Pick a platform and optional inspiration — then generate.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <BriefRow
          label="Event"
          value={campaignEvent?.title ?? brief.campaignTitle}
        />
        <BriefRow
          label="Audience"
          value={campaignEvent?.audience ?? "Parents and school community"}
        />
        <BriefRow label="Platform" value={platformLabel} />
        <BriefRow label="School" value={organizationName ?? "Elementary school PTO"} />
        <BriefRow label="Brand" value={brandDisplay} />
        <BriefRow label="Creative Goal" value={creativeGoal} />
      </dl>

      <div>
        <label className="text-xs font-medium text-cos-muted">Artwork mode</label>
        <select
          value={settings.artworkMode}
          disabled={!canEdit}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              artworkMode: e.target.value as ArtworkGenerationSettings["artworkMode"],
            })
          }
          className="mt-1 flex h-10 w-full rounded-lg border border-cos-border bg-cos-bg px-3 text-sm"
        >
          {ARTWORK_MODE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.description}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-cos-muted">Inspiration (optional)</label>
        <select
          value={settings.inspirationAssetId ?? ""}
          disabled={!canEdit}
          onChange={(e) => {
            const inspirationAssetId = e.target.value || null;
            onSettingsChange({
              ...settings,
              inspirationAssetId,
              inspirationStrength: inspirationAssetId
                ? settings.inspirationStrength || "strong"
                : settings.inspirationStrength,
            });
          }}
          className="mt-1 flex h-10 w-full rounded-lg border border-cos-border bg-cos-bg px-3 text-sm"
        >
          <option value="">None — use brand and prior campaign style</option>
          {inspirationAssets.map((item) => (
            <option key={item.assetId} value={item.assetId}>
              {item.eventTitle} — {item.filename ?? item.assetType}
            </option>
          ))}
        </select>
        {selectedInspiration && (
          <div className="mt-3 flex gap-3 rounded-xl border border-cos-border bg-cos-bg/40 p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f7f6f3]">
              {inspirationImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inspirationImageUrl}
                  alt={selectedInspiration.filename ?? selectedInspiration.eventTitle}
                  className="max-h-full max-w-full object-contain object-center"
                />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium text-cos-text">
                {selectedInspiration.eventTitle}
              </p>
              <p className="text-xs text-cos-muted">
                {supportsImageReference
                  ? "Passed as visual reference — original file is never modified."
                  : "Used as style guidance — original file is never modified."}
              </p>
            </div>
          </div>
        )}
        {!selectedInspiration && settings.inspirationAssetId && (
          <p className="mt-2 text-xs text-cos-error">
            Selected inspiration could not be loaded. Pick another asset.
          </p>
        )}
      </div>

      <div className="border-t border-cos-border pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((open) => !open)}
          className="flex w-full items-center gap-2 text-left text-sm font-medium text-cos-text"
        >
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          Advanced Prompt
          <span className="text-xs font-normal text-cos-muted">(power users)</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-cos-muted">Custom prompt override</label>
              <Textarea
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                rows={6}
                disabled={!canEdit}
                className="mt-1 font-mono text-xs"
                placeholder="Leave blank to let CampaignOS write the creative brief automatically."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-cos-muted">Additional direction</label>
              <Textarea
                value={settings.additionalInstructions}
                onChange={(e) =>
                  onSettingsChange({ ...settings, additionalInstructions: e.target.value })
                }
                rows={2}
                disabled={!canEdit}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-cos-muted">Output size</label>
              <select
                value={settings.imageSizePreset}
                disabled={!canEdit}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    imageSizePreset: e.target.value as ArtworkGenerationSettings["imageSizePreset"],
                  })
                }
                className="mt-1 flex h-10 w-full rounded-lg border border-cos-border bg-cos-bg px-3 text-sm"
              >
                {IMAGE_SIZE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} ({preset.ratio})
                  </option>
                ))}
              </select>
            </div>
            {canEdit && (
              <Button size="sm" disabled={isSaving} onClick={onSave}>
                {isSaving ? "Saving…" : "Save advanced settings"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function defaultSettingsFromAsset(
  asset: import("@/types/event-workspace").EventAsset,
): ArtworkGenerationSettings {
  return asset.generationSettings ?? { ...DEFAULT_GENERATION_SETTINGS };
}

export { VARIATION_PRESETS };
