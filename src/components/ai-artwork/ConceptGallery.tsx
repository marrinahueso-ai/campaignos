"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import {
  approveArtworkConceptAction,
  discardArtworkConceptAction,
  regenerateArtworkConceptAction,
} from "@/lib/ai-artwork/actions";
import type { ArtworkConcept } from "@/lib/ai-artwork/types";

interface ConceptGalleryProps {
  eventId: string;
  assetId: string;
  concepts: ArtworkConcept[];
  canEdit: boolean;
  onChanged?: () => void;
  /** @deprecated Layout is unified; kept for call-site compatibility. */
  variant?: "default" | "featured";
}

export function ConceptGallery({
  eventId,
  assetId,
  concepts,
  canEdit,
  onChanged,
}: ConceptGalleryProps) {
  const [isPending, startTransition] = useTransition();
  const [lightboxConcept, setLightboxConcept] = useState<ArtworkConcept | null>(null);
  const pending = concepts.filter((concept) => concept.status === "pending");

  useEffect(() => {
    if (!lightboxConcept) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxConcept(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxConcept]);

  if (pending.length === 0) {
    return (
      <p className="text-sm text-cos-muted">
        Generate artwork to see previews here.
      </p>
    );
  }

  function refresh() {
    onChanged?.();
  }

  const lightboxUrl = lightboxConcept
    ? resolveAssetImageUrl(lightboxConcept.storagePath)
    : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {pending.map((concept) => {
          const imageUrl = resolveAssetImageUrl(concept.storagePath);
          return (
            <article
              key={concept.id}
              className="overflow-hidden rounded-xl border border-cos-border bg-cos-card shadow-sm"
            >
              <button
                type="button"
                className="flex h-36 w-full cursor-zoom-in items-center justify-center bg-[#f7f6f3] p-2 sm:h-40"
                onClick={() => imageUrl && setLightboxConcept(concept)}
                aria-label={`View preview ${concept.conceptIndex} full size`}
              >
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`Preview ${concept.conceptIndex}`}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </button>
              {canEdit && (
                <div className="flex flex-wrap gap-1.5 border-t border-cos-border p-2.5">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await approveArtworkConceptAction(eventId, assetId, concept.id);
                        refresh();
                      })
                    }
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await regenerateArtworkConceptAction(eventId, assetId, concept.id);
                        refresh();
                      })
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await discardArtworkConceptAction(eventId, concept.id);
                        refresh();
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                    Deny
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {lightboxConcept && lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${lightboxConcept.conceptIndex} full size`}
          onClick={() => setLightboxConcept(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxConcept(null)}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt={`Preview ${lightboxConcept.conceptIndex}`}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
