"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Palette } from "lucide-react";
import { ArtworkChecklist } from "@/components/creative-studio/ArtworkChecklist";
import { ArtworkCreationPanel } from "@/components/creative-studio/ArtworkCreationPanel";
import { getArtworkWorkflowItems } from "@/lib/creative-studio/artwork-defaults";
import { ensurePlannerAssetAction } from "@/lib/creative-director/actions";
import {
  resolveWorkflowAsset,
  resolveWorkflowPlanItem,
  synthesizePlanItem,
  type ArtworkWorkflowItem,
} from "@/lib/creative-studio/artwork-workflow";
import type { ArtworkConcept, CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { BrandKitItem, InspirationAsset } from "@/lib/creative-assets/types";
import type { BrandAssets } from "@/types";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import {
  canDeleteCampaignAssets,
  canRestoreAssetVersions,
  canUploadCampaignAssets,
} from "@/lib/creative-assets/permissions";
import type {
  AssetPlanItem,
  CreativeBrief,
  StyleMemoryEntry,
} from "@/lib/creative-director/types";
import type { EventAsset, EventAssetVersion } from "@/types/event-workspace";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

interface CreativeStudioShellProps {
  events: { id: string; title: string; date: string }[];
  selectedEventId: string | null;
  campaignAssets: EventAsset[];
  assetVersions: Record<string, EventAssetVersion[]>;
  inspirationAssets: InspirationAsset[];
  brandKitItems: BrandKitItem[];
  brandAssets: BrandAssets | null;
  organizationVoice: string | null;
  userRole: CampaignRole;
  creativeBrief: CreativeBrief | null;
  briefIsAiEnhanced: boolean;
  assetPlan: AssetPlanItem[];
  styleMemory: StyleMemoryEntry[];
  artworkConcepts: Record<string, ArtworkConcept[]>;
  artworkAiAvailable: boolean;
  artworkAiReason: string | null;
  campaignEvent: CampaignEventSnapshot | null;
  organizationName: string | null;
  supportsImageReference: boolean;
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
}

export function CreativeStudioShell({
  events,
  selectedEventId,
  campaignAssets,
  assetVersions,
  inspirationAssets,
  userRole,
  creativeBrief,
  assetPlan,
  artworkConcepts,
  artworkAiAvailable,
  artworkAiReason,
  campaignEvent,
  organizationName,
  supportsImageReference,
  eventType,
  communicationStrategy,
}: CreativeStudioShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedItemId = searchParams.get("item");
  const [isEnsuring, startTransition] = useTransition();
  const [ensureError, setEnsureError] = useState<string | null>(null);

  const workflowItems = useMemo(
    () =>
      getArtworkWorkflowItems({
        eventType,
        communicationStrategy,
        assets: campaignAssets,
      }),
    [eventType, communicationStrategy, campaignAssets],
  );

  const canEdit = canUploadCampaignAssets(userRole);
  const eventTitle =
    campaignEvent?.title ??
    events.find((event) => event.id === selectedEventId)?.title ??
    "Campaign";

  const brief =
    creativeBrief ??
    ({
      campaignTitle: eventTitle,
      personality: [],
      emotionalTone: [],
      visualDirection: "",
      typographySuggestions: "",
      illustrationVsPhotography: "illustrated",
      colorPalette: [],
      iconRecommendations: [],
      graphicStyle: "",
      textureBackgroundSuggestions: "",
      consistencyRules: [],
      doNotUse: [],
      moodSummary: "",
    } satisfies CreativeBrief);

  function handleCampaignChange(eventId: string) {
    const params = new URLSearchParams();
    params.set("campaign", eventId);
    router.push(`/creative-studio?${params.toString()}`);
  }

  function openChecklist() {
    if (!selectedEventId) return;
    router.push(`/creative-studio?campaign=${selectedEventId}`);
  }

  function openWorkflowItem(item: ArtworkWorkflowItem) {
    if (!selectedEventId) return;
    setEnsureError(null);

    startTransition(async () => {
      const planItem = resolveWorkflowPlanItem(item, assetPlan);
      const asset = resolveWorkflowAsset(item, planItem, campaignAssets);

      if (!asset?.id && canEdit) {
        const result = await ensurePlannerAssetAction(
          selectedEventId,
          item.assetType,
          item.planLabel,
        );
        if (!result.success) {
          setEnsureError(result.error ?? "Unable to open this artwork item.");
          return;
        }
      }

      router.push(`/creative-studio?campaign=${selectedEventId}&item=${item.id}`);
      router.refresh();
    });
  }

  const activeWorkflowItem = workflowItems.find((entry) => entry.id === selectedItemId);

  const activePlanItem = activeWorkflowItem
    ? resolveWorkflowPlanItem(activeWorkflowItem, assetPlan) ??
      synthesizePlanItem(
        activeWorkflowItem,
        resolveWorkflowAsset(activeWorkflowItem, null, campaignAssets),
      )
    : null;

  const activeAsset = activeWorkflowItem
    ? resolveWorkflowAsset(activeWorkflowItem, activePlanItem, campaignAssets)
    : null;

  return (
    <div className="pb-16">
      <header className="space-y-6 border-b border-cos-border pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-cos-primary/10 p-3 text-cos-primary">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-cos-text">Artwork</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-cos-muted">
                Create social graphics for your event. Work one piece at a time — generate,
                review concepts, and mark complete.
              </p>
            </div>
          </div>

          {events.length > 0 && (
            <div className="min-w-[220px]">
              <label htmlFor="campaign-select" className="text-xs font-medium text-cos-muted">
                Event
              </label>
              <select
                id="campaign-select"
                value={selectedEventId ?? ""}
                onChange={(e) => handleCampaignChange(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {events.length === 0 && (
          <p className="rounded-xl border border-cos-border bg-cos-bg/40 px-4 py-3 text-sm text-cos-muted">
            No active campaigns yet. Create a campaign to start artwork.
          </p>
        )}

        {selectedEventId && !activeWorkflowItem && (
          <p className="text-sm text-cos-muted">
            Primary question:{" "}
            <span className="font-medium text-cos-text">What artwork does this event need?</span>
          </p>
        )}
      </header>

      <div className="mt-10">
        {!selectedEventId ? (
          <p className="text-sm text-cos-muted">Select an event to view artwork needed.</p>
        ) : activeWorkflowItem && activePlanItem ? (
          <ArtworkCreationPanel
            eventId={selectedEventId}
            eventTitle={eventTitle}
            workflowItem={activeWorkflowItem}
            workflowItems={workflowItems}
            planItem={activePlanItem}
            asset={activeAsset}
            brief={brief}
            assets={campaignAssets}
            assetVersions={assetVersions}
            conceptsByAsset={artworkConcepts}
            inspirationAssets={inspirationAssets}
            canUpload={canEdit}
            canDelete={canDeleteCampaignAssets(userRole)}
            canRestoreVersion={canRestoreAssetVersions(userRole)}
            aiAvailable={artworkAiAvailable}
            aiUnavailableReason={artworkAiReason}
            campaignEvent={campaignEvent}
            organizationName={organizationName}
            supportsImageReference={supportsImageReference}
            onBack={openChecklist}
            onContinueNext={(nextItem) => openWorkflowItem(nextItem)}
          />
        ) : (
          <>
            {ensureError && (
              <p className="mb-4 rounded-xl border border-cos-error/30 bg-red-50 px-4 py-3 text-sm text-red-900">
                {ensureError}
              </p>
            )}
            <ArtworkChecklist
              eventTitle={eventTitle}
              plan={assetPlan}
              assets={campaignAssets}
              workflowItems={workflowItems}
              onSelectItem={openWorkflowItem}
              isEnsuring={isEnsuring}
            />
          </>
        )}
      </div>
    </div>
  );
}
