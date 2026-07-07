"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { IMAGE_SIZE_PRESETS } from "@/lib/ai-artwork/constants";
import {
  CREATIVE_DIRECTION_OPTIONS,
  deriveAutoCreativeDirection,
  getCreativeDirectionLabel,
  rankAutoInspirationAssets,
  resolveDisplayedInspirationAssets,
} from "@/lib/ai-artwork/creative-direction";
import { resolveArtworkBrandColors } from "@/lib/ai-artwork/artwork-mode";
import { findInspirationAssetInList } from "@/lib/ai-artwork/display";
import type { ArtworkGenerationSettings, CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { CreativeBrief } from "@/lib/creative-director/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";

interface ArtworkCreativeDirectionPanelProps {
  brief: CreativeBrief;
  campaignEvent: CampaignEventSnapshot | null;
  organizationName: string | null;
  platformLabel: string;
  eventId: string;
  assetType: string;
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-cos-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-cos-text">{value}</dd>
    </div>
  );
}

export function ArtworkCreativeDirectionPanel({
  brief,
  campaignEvent,
  organizationName,
  platformLabel,
  eventId,
  assetType,
  settings,
  inspirationAssets,
  supportsImageReference,
  canEdit,
  customPrompt,
  onCustomPromptChange,
  onSettingsChange,
  onSave,
  isSaving = false,
}: ArtworkCreativeDirectionPanelProps) {
  const [showInspirationPicker, setShowInspirationPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const brandColors = resolveArtworkBrandColors({
    brandColors: [],
    briefPalette: brief.colorPalette,
  });

  const autoSummary = deriveAutoCreativeDirection({
    brief,
    campaignEvent,
    organizationName,
    platformLabel,
    eventType: null,
    brandColors,
  });

  const autoInspirationAssets = useMemo(
    () =>
      rankAutoInspirationAssets({
        assetType,
        brief,
        inspirationAssets,
        currentEventId: eventId,
        limit: 3,
      }),
    [assetType, brief, inspirationAssets, eventId],
  );

  const displayedInspirations = resolveDisplayedInspirationAssets({
    inspirationAssetId: settings.inspirationAssetId,
    supportInspirationAssetIds: settings.supportInspirationAssetIds,
    autoInspirationAssets,
    allAssets: inspirationAssets,
  });

  const primaryInspiration = findInspirationAssetInList(
    settings.inspirationAssetId ?? displayedInspirations[0]?.assetId ?? null,
    inspirationAssets,
  );
  const primaryImageUrl = resolveAssetImageUrl(primaryInspiration?.storagePath ?? null);

  function handleInspirationChange(assetId: string) {
    const supportIds = autoInspirationAssets
      .filter((item) => item.assetId !== assetId)
      .slice(0, 2)
      .map((item) => item.assetId);

    onSettingsChange({
      ...settings,
      inspirationAssetId: assetId || null,
      supportInspirationAssetIds: assetId ? supportIds : [],
      inspirationStrength: assetId ? "strong" : settings.inspirationStrength,
    });
    setShowInspirationPicker(false);
  }

  function resetToAutoInspiration() {
    const ranked = autoInspirationAssets;
    onSettingsChange({
      ...settings,
      inspirationAssetId: ranked[0]?.assetId ?? null,
      supportInspirationAssetIds: ranked.slice(1, 3).map((item) => item.assetId),
      inspirationStrength: "strong",
    });
    setShowInspirationPicker(false);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-cos-text">Creative Direction</h3>
        <p className="mt-1 text-xs text-cos-muted">
          Hey Ralli directs the artwork automatically — pick a design style, then generate.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-cos-muted">Design style</label>
        <select
          value={settings.creativeDirection}
          disabled={!canEdit}
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              creativeDirection: e.target.value as ArtworkGenerationSettings["creativeDirection"],
            })
          }
          className="mt-1 flex h-10 w-full rounded-lg border border-cos-border bg-cos-bg px-3 text-sm"
        >
          {CREATIVE_DIRECTION_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.default ? `⭐ ${option.label}` : option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-cos-muted">
          {
            CREATIVE_DIRECTION_OPTIONS.find((option) => option.id === settings.creativeDirection)
              ?.description
          }
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-cos-border bg-cos-bg/30 p-4 sm:grid-cols-2">
        <SummaryRow label="Campaign" value={autoSummary.campaignType} />
        <SummaryRow label="Audience" value={autoSummary.audience} />
        <SummaryRow label="Platform" value={autoSummary.platform} />
        <SummaryRow label="School" value={autoSummary.school} />
        <SummaryRow label="Brand" value={autoSummary.brandColors.join(", ")} />
        <SummaryRow label="Mood" value={autoSummary.mood} />
        <SummaryRow label="Layout" value={autoSummary.layout} />
        <SummaryRow
          label="Brand style"
          value={getCreativeDirectionLabel(settings.creativeDirection)}
        />
      </dl>

      <div className="rounded-xl border border-cos-border bg-cos-bg/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Using inspiration
            </p>
            {displayedInspirations.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {displayedInspirations.map((item) => (
                  <li key={item.assetId} className="flex items-center gap-2 text-sm text-cos-text">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    {item.eventTitle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-cos-muted">
                No approved school artwork yet — using brand style and creative brief.
              </p>
            )}
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowInspirationPicker((open) => !open)}
            >
              Change inspiration
            </Button>
          )}
        </div>

        {showInspirationPicker && canEdit && (
          <div className="mt-4 space-y-3 border-t border-cos-border pt-4">
            <select
              value={settings.inspirationAssetId ?? ""}
              onChange={(e) => handleInspirationChange(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-cos-border bg-cos-bg px-3 text-sm"
            >
              <option value="">Auto — best match from approved artwork</option>
              {inspirationAssets.map((item) => (
                <option key={item.assetId} value={item.assetId}>
                  {item.eventTitle} — {item.filename ?? item.assetType}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={resetToAutoInspiration}>
              Reset to auto-selected inspiration
            </Button>
          </div>
        )}

        {primaryInspiration && (
          <div className="mt-4 flex gap-3 rounded-lg border border-cos-border bg-cos-bg/50 p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f7f6f3]">
              {primaryImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImageUrl}
                  alt={primaryInspiration.filename ?? primaryInspiration.eventTitle}
                  className="max-h-full max-w-full object-contain object-center"
                />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-cos-muted">Reference artwork</p>
              <p className="truncate text-sm font-medium text-cos-text">
                {primaryInspiration.eventTitle}
              </p>
              <p className="text-xs text-cos-muted">
                {supportsImageReference
                  ? "Visual reference attached at generation — original file is never modified."
                  : "Style guidance from approved artwork — original file is never modified."}
              </p>
            </div>
          </div>
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
          Advanced
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
                placeholder="Leave blank to let Hey Ralli write art direction automatically."
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

export { defaultSettingsFromAsset } from "@/components/ai-artwork/ArtworkCreativeBriefPanel";
