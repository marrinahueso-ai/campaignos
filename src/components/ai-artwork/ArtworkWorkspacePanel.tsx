"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CreativeAssetCard,
  UploadAssetCard,
} from "@/components/creative-assets/CreativeAssetCard";
import { AssetVersionHistory } from "@/components/creative-assets/AssetVersionHistory";
import {
  ArtworkHumanDirectedPanel,
  defaultSettingsFromAsset,
} from "@/components/ai-artwork/ArtworkHumanDirectedPanel";
import { ConceptGallery } from "@/components/ai-artwork/ConceptGallery";
import { MANUAL_PROMPT_REQUIRED_MESSAGE } from "@/lib/ai-artwork/generation-mode";
import { ArtworkTextPlanPanel } from "@/components/ai-artwork/ArtworkTextPlanPanel";
import { buildVerifiedEventFacts } from "@/lib/ai-artwork/event-facts";
import { buildArtworkTextPlan } from "@/lib/ai-artwork/text-plan";
import { mapInspirationAsset } from "@/lib/creative-assets/mappers";
import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import {
  generateArtworkConceptsAction,
  saveArtworkPromptAction,
} from "@/lib/ai-artwork/actions";
import type { ArtworkConcept, CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { AssetPlanItem, CreativeBrief } from "@/lib/creative-director/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import type { EventAsset, EventAssetVersion } from "@/types/event-workspace";

interface ArtworkWorkspacePanelProps {
  eventId: string;
  brief: CreativeBrief;
  plan: AssetPlanItem[];
  assets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  conceptsByAsset: Record<string, ArtworkConcept[]>;
  inspirationAssets: InspirationAsset[];
  canUpload: boolean;
  canDelete: boolean;
  canRestoreVersion: boolean;
  aiAvailable: boolean;
  aiUnavailableReason: string | null;
  campaignEvent: CampaignEventSnapshot | null;
  organizationName: string | null;
  supportsImageReference: boolean;
}

export function ArtworkWorkspacePanel({
  eventId,
  brief,
  plan,
  assets,
  assetVersions,
  conceptsByAsset,
  inspirationAssets,
  canUpload,
  canDelete,
  canRestoreVersion,
  aiAvailable,
  aiUnavailableReason,
  campaignEvent,
  organizationName,
}: ArtworkWorkspacePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const plannedAssets = useMemo(() => {
    return plan.map((item) => {
      const asset =
        assets.find((entry) => entry.id === item.assetId) ??
        assets.find(
          (entry) =>
            !entry.isCustom &&
            entry.assetType === item.assetType &&
            (entry.planLabel === item.label || !entry.planLabel),
        );
      return { plan: item, asset };
    });
  }, [plan, assets]);

  const inspirationOptions = useMemo(() => {
    const byId = new Map(inspirationAssets.map((item) => [item.assetId, item]));
    if (campaignEvent) {
      for (const asset of assets) {
        if (asset.status !== "uploaded" || !asset.storagePath || byId.has(asset.id)) {
          continue;
        }
        byId.set(
          asset.id,
          mapInspirationAsset({
            asset,
            eventTitle: campaignEvent.title,
            eventDate: campaignEvent.date,
            schoolYear: null,
          }),
        );
      }
    }
    return [...byId.values()];
  }, [inspirationAssets, assets, campaignEvent]);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    () => plannedAssets.find((entry) => entry.asset?.id)?.asset?.id ?? "",
  );

  const selected = plannedAssets.find((entry) => entry.asset?.id === selectedAssetId);
  const selectedAsset = selected?.asset;
  const selectedPlan = selected?.plan;

  const [settings, setSettings] = useState(() =>
    selectedAsset ? defaultSettingsFromAsset(selectedAsset) : defaultSettingsFromAsset({
      id: "",
      eventId,
      assetType: "miscellaneous",
      filename: null,
      storagePath: null,
      status: "placeholder",
      aiGenerated: false,
      uploadedBy: null,
      currentVersion: 1,
      tags: [],
      isFavorite: false,
      canvaUrl: null,
      isCustom: false,
      planStatus: null,
      planLabel: null,
      generationPrompt: null,
      aiReview: null,
      inspirationMatch: null,
      generationSettings: null,
      createdAt: "",
      updatedAt: "",
    }),
  );
  const [customPrompt, setCustomPrompt] = useState(
    () => (selectedAsset ? defaultSettingsFromAsset(selectedAsset).customPromptOverride : null) ?? "",
  );

  const concepts = selectedAssetId ? conceptsByAsset[selectedAssetId] ?? [] : [];

  const activeTextPlan = useMemo(() => {
    if (settings.textPlan) {
      return settings.textPlan;
    }
    if (!campaignEvent || !selectedPlan) {
      return null;
    }
    const facts = buildVerifiedEventFacts({
      event: {
        id: eventId,
        title: campaignEvent.title,
        description: campaignEvent.description,
        date: campaignEvent.date,
        time: campaignEvent.time,
        location: campaignEvent.location,
        audience: campaignEvent.audience,
        theme: campaignEvent.theme,
        status: "scheduled",
        category: null,
        eventType: null,
        communicationStrategy: "full_campaign",
        calendarImportId: null,
        eventOwner: null,
        approvalOrganizationRoleId: null,
        budget: null,
        volunteerNeeds: campaignEvent.volunteerNeeds,
        goal: null,
        expectedAttendance: null,
        planningQuickLinks: {},
        planningVendors: [],
        approvedSquareImageUrl: null,
        approvedSquareImageStatus: "open",
        createdAt: "",
        updatedAt: null,
      },
      organizationName,
    });
    return buildArtworkTextPlan({
      facts,
      brief,
      assetLabel: selectedPlan.label,
    });
  }, [settings.textPlan, campaignEvent, selectedPlan, eventId, organizationName, brief]);

  const needsTextOverlay =
    selectedAsset?.assetType === "flyer" ||
    selectedAsset?.assetType === "facebook_graphic" ||
    selectedAsset?.assetType === "instagram_graphic" ||
    selectedAsset?.assetType === "instagram_story" ||
    selectedAsset?.assetType === "newsletter_banner" ||
    selectedAsset?.assetType === "email_header" ||
    selectedAsset?.assetType === "hero_image";

  function refresh() {
    router.refresh();
  }

  function selectAsset(assetId: string, planItem: AssetPlanItem, asset?: EventAsset) {
    setSelectedAssetId(assetId);
    const nextSettings = asset ? defaultSettingsFromAsset(asset) : settings;
    setSettings(nextSettings);
    setCustomPrompt(nextSettings.customPromptOverride ?? "");
    setError(null);
  }

  function handleGenerate() {
    if (!selectedAssetId) return;
    if (!customPrompt.trim()) {
      setError(MANUAL_PROMPT_REQUIRED_MESSAGE);
      return;
    }
    setError(null);
    startTransition(async () => {
      await saveArtworkPromptAction(eventId, selectedAssetId, customPrompt, settings);
      const result = await generateArtworkConceptsAction(eventId, selectedAssetId);
      if (!result.success) setError(result.error);
      else refresh();
    });
  }

  if (plannedAssets.length === 0) {
    return (
      <p className="text-sm text-cos-muted">
        Open the Asset Planner or Creative Brief tab to set up artwork for this campaign.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {plannedAssets.map(({ plan: item, asset }) => {
          const assetId = asset?.id;
          if (!assetId) return null;
          return (
            <button
              key={`${item.label}-${item.assetType}`}
              type="button"
              onClick={() => selectAsset(assetId, item, asset)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedAssetId === assetId
                  ? "bg-cos-text text-white"
                  : "bg-cos-bg text-cos-muted hover:text-cos-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {selectedAsset && selectedPlan && (
        <>
          <ArtworkHumanDirectedPanel
            campaignEvent={campaignEvent}
            organizationName={organizationName}
            platformLabel={selectedPlan.label}
            brandColors={brief.colorPalette}
            settings={settings}
            inspirationAssets={inspirationOptions}
            canEdit={canUpload}
            manualPrompt={customPrompt}
            onManualPromptChange={setCustomPrompt}
            onSettingsChange={setSettings}
          />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-cos-text">Generate artwork</h3>
                <p className="text-xs text-cos-muted">Creates four previews from your direction.</p>
              </div>
              {canUpload && (
                <Button
                  size="sm"
                  disabled={isPending || !aiAvailable || !customPrompt.trim()}
                  onClick={handleGenerate}
                >
                  <Sparkles className="h-4 w-4" />
                  {isPending ? "Working…" : "Generate artwork"}
                </Button>
              )}
            </div>
            {!aiAvailable && (
              <p className="text-xs text-cos-muted">{aiUnavailableReason}</p>
            )}
            {error && <p className="text-xs text-cos-error">{error}</p>}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cos-text">Previews</h3>
            {needsTextOverlay && activeTextPlan && concepts.some((c) => c.status === "pending") && (
              <p className="text-xs text-cos-muted">
                Recommended overlay copy is shown below beside each concept — add in CampaignOS or
                Canva after approving artwork.
              </p>
            )}
            <div
              className={
                needsTextOverlay && activeTextPlan && concepts.some((c) => c.status === "pending")
                  ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]"
                  : undefined
              }
            >
              <ConceptGallery
                eventId={eventId}
                assetId={selectedAssetId}
                concepts={concepts}
                canEdit={canUpload}
                onChanged={refresh}
              />
              {needsTextOverlay &&
                activeTextPlan &&
                concepts.some((c) => c.status === "pending") && (
                  <ArtworkTextPlanPanel textPlan={activeTextPlan} compact />
                )}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cos-text">Version History</h3>
            <AssetVersionHistory
              eventId={eventId}
              assetId={selectedAssetId}
              currentVersion={selectedAsset.currentVersion}
              versions={assetVersions[selectedAssetId] ?? []}
              canRestore={canRestoreVersion}
              onRestored={refresh}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-cos-text">Approved Artwork</h3>
            <p className="text-xs text-cos-muted">
              Approved concepts become the active campaign asset. Manual uploads still work.
            </p>
            <CreativeAssetCard
              eventId={eventId}
              asset={selectedAsset}
              versions={assetVersions[selectedAssetId] ?? []}
              canUpload={canUpload}
              canDelete={canDelete}
              canRestoreVersion={canRestoreVersion}
              onChanged={refresh}
            />
          </section>
        </>
      )}

      <section className="space-y-4 border-t border-cos-border pt-8">
        <h3 className="text-sm font-semibold text-cos-text">All uploads</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets
            .filter((asset) => asset.status === "uploaded")
            .map((asset) => (
              <CreativeAssetCard
                key={asset.id}
                eventId={eventId}
                asset={asset}
                versions={assetVersions[asset.id] ?? []}
                canUpload={canUpload}
                canDelete={canDelete}
                canRestoreVersion={canRestoreVersion}
                compact
                onChanged={refresh}
              />
            ))}
          {canUpload && <UploadAssetCard eventId={eventId} onUploaded={refresh} />}
        </div>
        {assets.filter((asset) => asset.status === "uploaded").length === 0 && (
          <p className="text-sm text-cos-muted">
            No uploaded artwork yet for {getCreativeAssetTypeLabel(selectedAsset?.assetType ?? "miscellaneous")}.
          </p>
        )}
      </section>
    </div>
  );
}
