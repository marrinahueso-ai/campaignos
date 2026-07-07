"use client";

import { Textarea } from "@/components/ui/Textarea";
import { DEFAULT_GENERATION_SETTINGS } from "@/lib/ai-artwork/constants";
import { findInspirationAssetInList } from "@/lib/ai-artwork/display";
import {
  MANUAL_PROMPT_PLACEHOLDER,
  MANUAL_PROMPT_REQUIRED_MESSAGE,
} from "@/lib/ai-artwork/generation-mode";
import { resolveArtworkBrandColors } from "@/lib/ai-artwork/artwork-mode";
import type { ArtworkGenerationSettings, CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";

interface ArtworkHumanDirectedPanelProps {
  campaignEvent: CampaignEventSnapshot | null;
  organizationName: string | null;
  platformLabel: string;
  brandColors: string[];
  settings: ArtworkGenerationSettings;
  inspirationAssets: InspirationAsset[];
  canEdit: boolean;
  manualPrompt: string;
  onManualPromptChange: (value: string) => void;
  onSettingsChange: (value: ArtworkGenerationSettings) => void;
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-cos-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-cos-text">{value}</dd>
    </div>
  );
}

function formatDateTime(event: CampaignEventSnapshot | null): string {
  if (!event) return "—";
  const parts = [event.date?.trim(), event.time?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function ArtworkHumanDirectedPanel({
  campaignEvent,
  organizationName,
  platformLabel,
  brandColors,
  settings,
  inspirationAssets,
  canEdit,
  manualPrompt,
  onManualPromptChange,
  onSettingsChange,
}: ArtworkHumanDirectedPanelProps) {
  const selectedInspiration = findInspirationAssetInList(
    settings.inspirationAssetId,
    inspirationAssets,
  );
  const inspirationImageUrl = resolveAssetImageUrl(selectedInspiration?.storagePath ?? null);

  const brandDisplay = resolveArtworkBrandColors({
    brandColors,
    briefPalette: [],
  }).join(", ");

  const promptMissing = manualPrompt.trim().length === 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-cos-text">What are we making?</h3>
          <p className="mt-1 text-xs text-cos-muted">Basic event context for this artwork.</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <ContextRow label="Event" value={campaignEvent?.title ?? "—"} />
          <ContextRow label="Artwork type" value={platformLabel} />
          <ContextRow label="Date/time" value={formatDateTime(campaignEvent)} />
          <ContextRow label="School" value={organizationName ?? "—"} />
          <ContextRow label="Brand colors" value={brandDisplay} />
        </dl>
      </section>

      <section className="space-y-3 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
        <div>
          <label htmlFor="artwork-manual-prompt" className="text-sm font-semibold text-cos-text">
            What should this artwork look like?
          </label>
          <p className="mt-1 text-xs text-cos-muted">
            Describe the look and feel. You are the creative director — Hey Ralli generates from
            your direction.
          </p>
        </div>
        <Textarea
          id="artwork-manual-prompt"
          value={manualPrompt}
          onChange={(e) => onManualPromptChange(e.target.value)}
          rows={6}
          disabled={!canEdit}
          placeholder={MANUAL_PROMPT_PLACEHOLDER}
          className="text-sm"
        />
        {promptMissing && (
          <p className="text-xs text-cos-muted">{MANUAL_PROMPT_REQUIRED_MESSAGE}</p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
        <div>
          <label htmlFor="artwork-inspiration" className="text-sm font-semibold text-cos-text">
            Optional inspiration image
          </label>
          <p className="mt-1 text-xs text-cos-muted">
            Use this only as a loose style guide. Do not copy it exactly.
          </p>
        </div>
        <select
          id="artwork-inspiration"
          value={settings.inspirationAssetId ?? ""}
          disabled={!canEdit}
          onChange={(e) => {
            const inspirationAssetId = e.target.value || null;
            onSettingsChange({
              ...settings,
              inspirationAssetId,
              supportInspirationAssetIds: [],
              inspirationStrength: inspirationAssetId ? "light" : settings.inspirationStrength,
              inspirationStyleProfile: null,
            });
          }}
          className="flex h-10 w-full rounded-lg border border-cos-border bg-cos-bg px-3 text-sm"
        >
          <option value="">None</option>
          {inspirationAssets.map((item) => (
            <option key={item.assetId} value={item.assetId}>
              {item.eventTitle} — {item.filename ?? item.assetType}
            </option>
          ))}
        </select>

        {selectedInspiration && (
          <div className="space-y-3 rounded-xl border border-cos-border bg-cos-bg/40 p-4">
            <p className="text-sm font-medium text-cos-text">
              This is inspiration only — Hey Ralli will create something new.
            </p>
            <div className="flex gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f6f3]">
                {inspirationImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inspirationImageUrl}
                    alt={selectedInspiration.filename ?? selectedInspiration.eventTitle}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cos-text">
                  {selectedInspiration.eventTitle}
                </p>
                <p className="text-xs text-cos-muted">
                  {selectedInspiration.filename ?? selectedInspiration.assetType}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function defaultSettingsFromAsset(
  asset: import("@/types/event-workspace").EventAsset,
): ArtworkGenerationSettings {
  const base = asset.generationSettings ?? { ...DEFAULT_GENERATION_SETTINGS };
  return {
    ...base,
    supportInspirationAssetIds: [],
    inspirationStrength: base.inspirationAssetId ? "light" : base.inspirationStrength,
  };
}