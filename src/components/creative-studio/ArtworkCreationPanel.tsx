"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
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
import { ArtworkInspirationDebugPanel } from "@/components/ai-artwork/ArtworkInspirationDebugPanel";
import { MANUAL_PROMPT_REQUIRED_MESSAGE } from "@/lib/ai-artwork/generation-mode";
import { mapInspirationAsset } from "@/lib/creative-assets/mappers";
import {
  generateArtworkConceptsAction,
  saveArtworkPromptAction,
} from "@/lib/ai-artwork/actions";
import {
  ensurePlannerAssetAction,
  updateAssetPlanStatusAction,
} from "@/lib/creative-director/actions";
import {
  nextWorkflowItem,
  type ArtworkWorkflowItem,
} from "@/lib/creative-studio/artwork-workflow";
import type { ArtworkConcept, CampaignEventSnapshot } from "@/lib/ai-artwork/types";
import type { AssetPlanItem, CreativeBrief } from "@/lib/creative-director/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import type { EventAsset, EventAssetVersion } from "@/types/event-workspace";

type GeneratePhase = "idle" | "preparing" | "creating" | "finalizing";

const GENERATE_FAILURE_MESSAGE =
  "We couldn't create artwork this time. Your prompt is saved — try again.";

function CollapsibleArtworkSection({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-cos-border bg-cos-bg/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-2 px-5 py-4 text-left"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
        )}
        <span>
          <span className="block text-sm font-semibold text-cos-text">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-cos-muted">{subtitle}</span>}
        </span>
      </button>
      {open && <div className="space-y-4 border-t border-cos-border px-5 py-4">{children}</div>}
    </section>
  );
}

function assetMatchesPlanLabel(
  asset: EventAsset | null | undefined,
  planLabel: string,
): boolean {
  return Boolean(asset?.planLabel && asset.planLabel === planLabel);
}

function findCanonicalAsset(
  assets: EventAsset[],
  workflowItem: ArtworkWorkflowItem,
): EventAsset | null {
  return (
    assets.find(
      (entry) =>
        entry.planLabel === workflowItem.planLabel &&
        entry.assetType === workflowItem.assetType,
    ) ?? null
  );
}

function resolveInitialAssetId(
  assets: EventAsset[],
  workflowItem: ArtworkWorkflowItem,
  initialAsset: EventAsset | null,
  planItem: AssetPlanItem,
): string | null {
  const canonical = findCanonicalAsset(assets, workflowItem);
  if (canonical) return canonical.id;

  if (initialAsset && assetMatchesPlanLabel(initialAsset, workflowItem.planLabel)) {
    return initialAsset.id;
  }

  if (planItem.assetId) {
    const fromPlan = assets.find((entry) => entry.id === planItem.assetId);
    if (fromPlan && assetMatchesPlanLabel(fromPlan, workflowItem.planLabel)) {
      return fromPlan.id;
    }
  }

  return null;
}

interface ArtworkCreationPanelProps {
  eventId: string;
  eventTitle: string;
  workflowItem: ArtworkWorkflowItem;
  workflowItems: ArtworkWorkflowItem[];
  planItem: AssetPlanItem;
  asset: EventAsset | null;
  brief: CreativeBrief;
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
  onBack: () => void;
  onContinueNext: (nextItem: ArtworkWorkflowItem) => void;
}

export function ArtworkCreationPanel({
  eventId,
  eventTitle,
  workflowItem,
  workflowItems,
  planItem,
  asset: initialAsset,
  brief,
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
  onBack,
  onContinueNext,
}: ArtworkCreationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEnsuring, startEnsure] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [generatePhase, setGeneratePhase] = useState<GeneratePhase>("idle");
  const [resolvedAssetId, setResolvedAssetId] = useState<string | null>(() =>
    resolveInitialAssetId(assets, workflowItem, initialAsset, planItem),
  );
  const [markedComplete, setMarkedComplete] = useState(false);

  const asset =
    assets.find((entry) => entry.id === resolvedAssetId) ??
    (assetMatchesPlanLabel(initialAsset, workflowItem.planLabel) ? initialAsset : null);

  const [settings, setSettings] = useState(() =>
    asset
      ? defaultSettingsFromAsset(asset)
      : defaultSettingsFromAsset({
          id: "",
          eventId,
          assetType: workflowItem.assetType,
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
          planStatus: "needed",
          planLabel: workflowItem.planLabel,
          generationPrompt: planItem.generationPrompt,
          aiReview: null,
          inspirationMatch: null,
          generationSettings: null,
          createdAt: "",
          updatedAt: "",
        }),
  );
  const [customPrompt, setCustomPrompt] = useState(
    () => settings.customPromptOverride ?? "",
  );

  useEffect(() => {
    if (!canUpload) return;

    const current = assets.find((entry) => entry.id === resolvedAssetId);
    if (assetMatchesPlanLabel(current, workflowItem.planLabel)) return;

    startEnsure(async () => {
      const result = await ensurePlannerAssetAction(
        eventId,
        workflowItem.assetType,
        workflowItem.planLabel,
      );
      if (!result.success || !result.assetId) {
        setError(result.error ?? "Unable to prepare this artwork slot.");
        return;
      }
      setResolvedAssetId(result.assetId);
      router.refresh();
    });
  }, [resolvedAssetId, assets, canUpload, eventId, workflowItem, router]);

  useEffect(() => {
    if (!isPending) {
      setGeneratePhase("idle");
      return;
    }

    setGeneratePhase("preparing");
    const creatingTimer = window.setTimeout(() => setGeneratePhase("creating"), 700);
    const finalizingTimer = window.setTimeout(() => setGeneratePhase("finalizing"), 3500);

    return () => {
      window.clearTimeout(creatingTimer);
      window.clearTimeout(finalizingTimer);
    };
  }, [isPending]);

  const inspirationOptions = useMemo(() => {
    const byId = new Map(inspirationAssets.map((item) => [item.assetId, item]));
    if (campaignEvent) {
      for (const entry of assets) {
        if (entry.status !== "uploaded" || !entry.storagePath || byId.has(entry.id)) {
          continue;
        }
        byId.set(
          entry.id,
          mapInspirationAsset({
            asset: entry,
            eventTitle: campaignEvent.title,
            eventDate: campaignEvent.date,
            schoolYear: null,
          }),
        );
      }
    }
    return [...byId.values()];
  }, [inspirationAssets, assets, campaignEvent]);

  const concepts = resolvedAssetId ? conceptsByAsset[resolvedAssetId] ?? [] : [];
  const pendingConcepts = concepts.filter((concept) => concept.status === "pending");
  const hasPendingPreviews = pendingConcepts.length > 0;
  const artworkApproved = asset?.planStatus === "approved" || asset?.status === "uploaded";
  const promptMissing = customPrompt.trim().length === 0;

  const nextItem = nextWorkflowItem(workflowItem.id, workflowItems);
  const returnHref = `/events/${eventId}#artwork`;

  function refresh() {
    router.refresh();
  }

  function phaseLabel(phase: GeneratePhase): string | null {
    switch (phase) {
      case "preparing":
        return "Preparing prompt…";
      case "creating":
        return "Creating artwork…";
      case "finalizing":
        return "Finalizing image…";
      default:
        return null;
    }
  }

  async function resolveAssetIdForAction(): Promise<string | null> {
    const current = assets.find((entry) => entry.id === resolvedAssetId);
    if (assetMatchesPlanLabel(current, workflowItem.planLabel)) {
      return resolvedAssetId;
    }

    const result = await ensurePlannerAssetAction(
      eventId,
      workflowItem.assetType,
      workflowItem.planLabel,
    );
    if (!result.success || !result.assetId) {
      setError(result.error ?? "Unable to prepare this artwork slot.");
      return null;
    }
    setResolvedAssetId(result.assetId);
    return result.assetId;
  }

  function handleGenerate() {
    setError(null);
    setWarning(null);

    if (promptMissing) {
      setError(MANUAL_PROMPT_REQUIRED_MESSAGE);
      return;
    }

    startTransition(async () => {
      const assetId = await resolveAssetIdForAction();
      if (!assetId) return;

      const saveResult = await saveArtworkPromptAction(
        eventId,
        assetId,
        customPrompt,
        settings,
      );
      if (!saveResult.success) {
        setError(saveResult.error ?? GENERATE_FAILURE_MESSAGE);
        return;
      }

      const result = await generateArtworkConceptsAction(eventId, assetId);
      if (!result.success) {
        setError(result.error ?? GENERATE_FAILURE_MESSAGE);
        return;
      }
      setWarning(result.warning ?? null);
      refresh();
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      const assetId = await resolveAssetIdForAction();
      if (!assetId) return;

      const currentAsset = assets.find((entry) => entry.id === assetId) ?? asset;
      const status = currentAsset?.status === "uploaded" ? "approved" : "generated";
      const result = await updateAssetPlanStatusAction(eventId, assetId, status);
      if (!result.success) {
        setError(result.error ?? "Unable to mark artwork complete.");
        return;
      }
      setMarkedComplete(true);
      setError(null);
      refresh();
    });
  }

  const boundAsset = assets.find((entry) => entry.id === resolvedAssetId);
  const hasCanonicalAsset = assetMatchesPlanLabel(boundAsset, workflowItem.planLabel);

  if (canUpload && (isEnsuring || !hasCanonicalAsset)) {
    return (
      <p className="text-sm text-cos-muted">Preparing {workflowItem.label}…</p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to artwork needed
          </Button>
          <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
            {eventTitle}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-cos-text">{workflowItem.label}</h2>
        </div>
        <Button href={returnHref} size="sm" variant="secondary">
          Return to event
        </Button>
      </div>

      <ArtworkHumanDirectedPanel
        campaignEvent={campaignEvent}
        organizationName={organizationName}
        platformLabel={workflowItem.label}
        brandColors={brief.colorPalette}
        settings={settings}
        inspirationAssets={inspirationOptions}
        canEdit={canUpload}
        manualPrompt={customPrompt}
        onManualPromptChange={setCustomPrompt}
        onSettingsChange={setSettings}
      />

      <section className="space-y-4 rounded-2xl border border-cos-border bg-cos-bg/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-cos-text">Generate artwork</h3>
            <p className="text-xs text-cos-muted">
              Creates four previews for {workflowItem.label}.
            </p>
          </div>
          {canUpload && (
            <Button
              size="sm"
              disabled={isPending || !aiAvailable || !resolvedAssetId || promptMissing}
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4" />
              {isPending ? "Working…" : "Generate artwork"}
            </Button>
          )}
        </div>

        {generatePhase !== "idle" && (
          <p className="text-sm font-medium text-cos-primary">{phaseLabel(generatePhase)}</p>
        )}

        {!aiAvailable && aiUnavailableReason && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {aiUnavailableReason}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-cos-error/30 bg-red-50 px-4 py-3 text-sm text-red-900">
            {error.startsWith("We couldn't") ? error : `${GENERATE_FAILURE_MESSAGE} (${error})`}
          </p>
        )}

        {warning && (
          <p className="rounded-xl border border-cos-border bg-cos-bg/50 px-4 py-3 text-sm text-cos-muted">
            {warning}
          </p>
        )}
      </section>

      {resolvedAssetId && (
        <ArtworkInspirationDebugPanel eventId={eventId} assetId={resolvedAssetId} />
      )}

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-cos-text">Previews</h3>
          <p className="text-xs text-cos-muted">
            {hasPendingPreviews
              ? "Pick a preview to approve for this channel."
              : "Previews appear here after you generate artwork."}
          </p>
        </div>
        <ConceptGallery
          eventId={eventId}
          assetId={resolvedAssetId ?? ""}
          concepts={concepts}
          canEdit={canUpload && Boolean(resolvedAssetId)}
          onChanged={refresh}
        />
      </section>

      {resolvedAssetId && asset && (
        <>
          <CollapsibleArtworkSection
            title="Versions"
            defaultOpen={artworkApproved}
            subtitle="Previous approved versions of this artwork."
          >
            <AssetVersionHistory
              eventId={eventId}
              assetId={resolvedAssetId}
              currentVersion={asset.currentVersion}
              versions={assetVersions[resolvedAssetId] ?? []}
              canRestore={canRestoreVersion}
              onRestored={refresh}
            />
          </CollapsibleArtworkSection>

          <CollapsibleArtworkSection
            title="Current artwork"
            defaultOpen={artworkApproved && !hasPendingPreviews}
            subtitle="The active file used on this channel."
          >
            <CreativeAssetCard
              eventId={eventId}
              asset={asset}
              versions={assetVersions[resolvedAssetId] ?? []}
              canUpload={canUpload}
              canDelete={canDelete}
              canRestoreVersion={canRestoreVersion}
              onChanged={refresh}
            />
            {canUpload && (
              <UploadAssetCard eventId={eventId} onUploaded={refresh} />
            )}
          </CollapsibleArtworkSection>
        </>
      )}

      {canUpload && resolvedAssetId && (
        <section className="flex flex-wrap gap-3 border-t border-cos-border pt-6">
          <Button size="sm" variant="secondary" disabled={isPending} onClick={handleMarkComplete}>
            <CheckCircle2 className="h-4 w-4" />
            Mark complete
          </Button>
        </section>
      )}

      {markedComplete && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">Artwork complete</p>
          <p className="mt-1 text-sm text-emerald-800">
            {workflowItem.label} is ready for your event workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={returnHref} size="sm">
              Return to event
            </Button>
            {nextItem && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onContinueNext(nextItem)}
              >
                Continue to next artwork
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </section>
      )}

      {!markedComplete && nextItem && (
        <p className="text-sm text-cos-muted">
          Up next:{" "}
          <Link
            href={`/creative-studio?campaign=${eventId}&item=${nextItem.id}`}
            className="text-cos-primary underline-offset-2 hover:underline"
          >
            {nextItem.label}
          </Link>
        </p>
      )}
    </div>
  );
}
