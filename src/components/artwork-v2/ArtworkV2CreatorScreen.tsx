"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ExternalLink, ImageIcon, Upload, X } from "lucide-react";
import { ArtworkGenerationModePicker } from "@/components/artwork-v2/ArtworkGenerationModePicker";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import { ARTWORK_GENERATION_MODE_COPY, type ArtworkGenerationMode } from "@/lib/artwork-v2/generation-mode";
import type { ArtworkV2Reference } from "@/lib/artwork-v2/types";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type { EventAsset } from "@/types/event-workspace";

interface ArtworkV2CreatorScreenProps {
  item: ArtworkWorkflowItem;
  prompt: string;
  references: ArtworkV2Reference[];
  approvedArtworkAssets: EventAsset[];
  canvaUrl: string;
  canImportFromCanva?: boolean;
  canvaIntegrationConfigured?: boolean;
  canvaConnectHref?: string;
  isGenerating?: boolean;
  isApprovingInspiration?: boolean;
  error?: string | null;
  onPromptChange: (value: string) => void;
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  onBack: () => void;
  onGenerate: (mode: ArtworkGenerationMode) => void;
  onApproveInspiration: (referenceId: string) => void;
  onOpenCanvaPicker?: () => void;
}

function createReferenceId(): string {
  return crypto.randomUUID();
}

export function ArtworkV2CreatorScreen({
  item,
  prompt,
  references,
  approvedArtworkAssets,
  canvaUrl,
  canImportFromCanva = false,
  canvaIntegrationConfigured = false,
  canvaConnectHref = "/settings/canva",
  isGenerating = false,
  isApprovingInspiration = false,
  error = null,
  onPromptChange,
  onReferencesChange,
  onBack,
  onGenerate,
  onApproveInspiration,
  onOpenCanvaPicker,
}: ArtworkV2CreatorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showApprovedPicker, setShowApprovedPicker] = useState(false);
  const [generationMode, setGenerationMode] = useState<ArtworkGenerationMode>("quick");

  const atMaxReferences = references.length >= ARTWORK_V2_MAX_INSPIRATION_IMAGES;
  const selectedEventAssetIds = new Set(
    references
      .filter((reference) => reference.source === "event_file" && reference.eventAssetId)
      .map((reference) => reference.eventAssetId as string),
  );

  const isPhaseItem = typeof item.relativeDay === "number";

  function revokeBlobPreview(reference: ArtworkV2Reference): void {
    if (reference.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(reference.previewUrl);
    }
  }

  function handleUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = ARTWORK_V2_MAX_INSPIRATION_IMAGES - references.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const uploadedReferences: ArtworkV2Reference[] = filesToAdd.map((file) => ({
      id: createReferenceId(),
      source: "upload",
      label: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    onReferencesChange([...references, ...uploadedReferences]);
    event.target.value = "";
  }

  function removeReference(referenceId: string) {
    const target = references.find((reference) => reference.id === referenceId);
    if (target) {
      revokeBlobPreview(target);
    }
    onReferencesChange(references.filter((reference) => reference.id !== referenceId));
  }

  function selectApprovedAsset(asset: EventAsset) {
    if (selectedEventAssetIds.has(asset.id) || atMaxReferences) {
      return;
    }

    onReferencesChange([
      ...references,
      {
        id: createReferenceId(),
        source: "event_file",
        label: asset.planLabel ?? asset.filename ?? "Approved artwork",
        previewUrl: resolveAssetImageUrl(asset.storagePath),
        eventAssetId: asset.id,
      },
    ]);
    setShowApprovedPicker(false);
  }

  return (
    <div className="space-y-6">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-sm text-cos-muted hover:text-cos-text"
        >
          ← Back to artwork list
        </button>
        <p className="studio-eyebrow">Create</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">{item.label}</h2>
        {isPhaseItem && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
            {item.metaPlacement === "feed"
              ? "Creates a 1:1 feed image first — when you approve, we automatically generate the 9:16 story version from the same design."
              : item.metaPlacement === "story"
                ? "Pick or adjust the story version — adapted from your approved feed artwork."
                : (item.formatLabel ?? item.channelLabel)}
          </p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Artwork prompt</CardTitle>
          <CardDescription>
            Pre-filled from your campaign event details — edit anything before generating.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <label htmlFor="artwork-v2-prompt" className="cos-section-title">
            What should this artwork look like?
          </label>
          <Textarea
            id="artwork-v2-prompt"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={8}
            placeholder="Describe the artwork you want — style, colors, text, mood…"
            className="mt-2 min-h-[180px] text-base"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {isPhaseItem ? "Artwork & inspiration" : "Reference images (optional)"}
          </CardTitle>
          <CardDescription>
            {isPhaseItem
              ? "Upload artwork from Canva, a designer, or another source — then approve it directly without generating. Or reuse approved artwork from this event as inspiration for AI."
              : `Add up to ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images. All attached images are sent to OpenAI with your prompt.`}
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
        <div className="space-y-3 border border-cos-border bg-cos-bg/50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {isPhaseItem ? (
              <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-cos-muted">
                <li>
                  Design in Canva, or pick an existing design with{" "}
                  <span className="font-medium text-cos-text">Import from Canva</span> below.
                </li>
                <li>
                  For manual export: Share → Download → PNG, then{" "}
                  <span className="font-medium text-cos-text">Upload exported file</span>.
                </li>
                <li>
                  Click <span className="font-medium text-cos-text">Use as approved</span> on any
                  uploaded preview — or import picks approve automatically.
                </li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-cos-muted">
                <li>Import or download your Canva design as PNG.</li>
                <li>Upload it below as a reference image.</li>
                <li>Use Generate Artwork to create AI versions inspired by it.</li>
              </ol>
            )}
            <div className="flex shrink-0 flex-col gap-2">
              {canImportFromCanva && onOpenCanvaPicker ? (
                <Button type="button" size="sm" onClick={onOpenCanvaPicker}>
                  Import from Canva
                </Button>
              ) : canvaIntegrationConfigured ? (
                <Button href={canvaConnectHref} size="sm" variant="secondary">
                  Connect Canva to import
                </Button>
              ) : (
                <Button href={canvaConnectHref} size="sm" variant="secondary">
                  <ExternalLink className="h-4 w-4" />
                  Open Canva
                </Button>
              )}
              {canImportFromCanva && (
                <a
                  href={canvaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-2 border border-cos-border bg-cos-card px-3 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg"
                >
                  <ExternalLink className="h-4 w-4" />
                  Edit in Canva
                </a>
              )}
            </div>
          </div>
        </div>

        {references.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {references.map((reference) => (
              <li
                key={reference.id}
                className="flex flex-col overflow-hidden border border-cos-border bg-cos-card"
              >
                <div className="flex aspect-square items-center justify-center bg-[#f7f6f3] p-2">
                  {reference.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reference.previewUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-cos-muted" />
                  )}
                </div>
                <div className="flex flex-col gap-2 border-t border-cos-border px-3 py-2">
                  <p className="min-w-0 truncate text-xs font-medium text-cos-text">
                    {reference.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 flex-1 text-xs"
                      disabled={isApprovingInspiration || isGenerating}
                      onClick={() => onApproveInspiration(reference.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isApprovingInspiration ? "Approving…" : "Use as approved"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeReference(reference.id)}
                      className="shrink-0 rounded-md p-1.5 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
                      aria-label={`Remove ${reference.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!atMaxReferences && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {isPhaseItem ? "Upload exported file" : "Upload"}
            </Button>
            {approvedArtworkAssets.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowApprovedPicker((open) => !open)}
              >
                Choose approved artwork
              </Button>
            )}
          </div>
        )}

        {showApprovedPicker && !atMaxReferences && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {approvedArtworkAssets.map((asset) => {
              const alreadySelected = selectedEventAssetIds.has(asset.id);
              const previewUrl = resolveAssetImageUrl(asset.storagePath);
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    disabled={alreadySelected}
                    onClick={() => selectApprovedAsset(asset)}
                    className="flex w-full items-center gap-3 rounded-xl border border-cos-border bg-cos-bg/40 p-2 text-left hover:bg-cos-card disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f6f3]">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-cos-muted" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-cos-text">
                        {asset.planLabel ?? asset.filename ?? "Approved artwork"}
                      </span>
                      {alreadySelected && (
                        <span className="text-xs text-cos-muted">Already added</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleUploadChange}
        />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate</CardTitle>
          <CardDescription>
            Choose a generation mode, then create artwork from your prompt.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          {error && (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <ArtworkGenerationModePicker
            value={generationMode}
            onChange={setGenerationMode}
            disabled={isGenerating}
          />
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full sm:w-auto"
            disabled={!prompt.trim() || isGenerating}
            onClick={() => onGenerate(generationMode)}
          >
            {isGenerating
              ? "Generating artwork…"
              : `Generate ${ARTWORK_GENERATION_MODE_COPY[generationMode].title.toLowerCase()}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
