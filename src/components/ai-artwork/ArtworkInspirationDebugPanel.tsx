"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { previewArtworkPromptAction } from "@/lib/ai-artwork/actions";
import { isArtworkDebugEnabled } from "@/lib/ai-artwork/generation-mode";
import type { ArtworkGenerationPayloadAudit } from "@/lib/ai-artwork/prompt-audit";

interface ArtworkInspirationDebugPanelProps {
  eventId: string;
  assetId: string;
}

interface PreviewData {
  finalPrompt: string;
  imageSize: string;
  inspirationAsset: {
    assetId: string;
    eventTitle: string;
    filename: string | null;
    imageUrl: string | null;
  } | null;
  payloadAudit: ArtworkGenerationPayloadAudit | null;
}

export function ArtworkInspirationDebugPanel({
  eventId,
  assetId,
}: ArtworkInspirationDebugPanelProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isArtworkDebugEnabled()) {
    return null;
  }

  function loadPreview() {
    setError(null);
    startTransition(async () => {
      const result = await previewArtworkPromptAction(eventId, assetId);
      if (!result) {
        setError("Could not build prompt preview.");
        setPreview(null);
        return;
      }
      setPreview({
        finalPrompt: result.finalPrompt,
        imageSize: result.imageSize,
        inspirationAsset: result.inspirationAsset,
        payloadAudit: result.payloadAudit,
      });
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-dashed border-amber-400/60 bg-amber-50/40 p-4 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-cos-text">Artwork prompt debug</h3>
          <p className="text-xs text-cos-muted">
            Shows the exact prompt that will be sent to OpenAI Images.
          </p>
        </div>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={loadPreview}>
          {isPending ? "Loading…" : "Refresh preview"}
        </Button>
      </div>

      {error && <p className="text-xs text-cos-error">{error}</p>}

      {preview && (
        <div className="space-y-4 text-xs">
          {preview.payloadAudit && (
            <div className="rounded-lg bg-cos-bg/60 p-3 font-mono text-[11px] text-cos-muted">
              <p>manualPromptLength: {preview.payloadAudit.manualPromptLength}</p>
              <p>finalPromptLength: {preview.payloadAudit.finalPromptLength}</p>
              <p>
                promptMatchesManualPrompt:{" "}
                {preview.payloadAudit.promptMatchesManualPrompt ? "true" : "false"}
              </p>
              <p>inspirationImageCount: {preview.payloadAudit.inspirationImageCount}</p>
              <p>imageSize: {preview.imageSize}</p>
            </div>
          )}

          {preview.inspirationAsset?.imageUrl && (
            <div className="rounded-lg bg-cos-bg/60 p-3">
              <p className="font-medium text-cos-text">Inspiration image</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.inspirationAsset.imageUrl}
                alt=""
                className="mt-2 max-h-24 max-w-full object-contain"
              />
            </div>
          )}

          <div className="rounded-lg bg-cos-bg/60 p-3">
            <p className="font-medium text-cos-text">FINAL_IMAGE_PROMPT_START</p>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-cos-muted">
              {preview.finalPrompt}
            </pre>
            <p className="mt-2 font-medium text-cos-text">FINAL_IMAGE_PROMPT_END</p>
          </div>
        </div>
      )}
    </section>
  );
}
