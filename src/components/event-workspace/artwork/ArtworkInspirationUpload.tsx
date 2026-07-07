"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";
import type { ArtworkV2Reference } from "@/lib/artwork-v2/types";
import { cn } from "@/lib/utils/cn";

interface ArtworkInspirationUploadProps {
  references: ArtworkV2Reference[];
  onReferencesChange: (references: ArtworkV2Reference[]) => void;
  onApproveInspiration?: (referenceId: string) => void;
  isApproving?: boolean;
  disabled?: boolean;
}

function createReferenceId(): string {
  return crypto.randomUUID();
}

export function ArtworkInspirationUpload({
  references,
  onReferencesChange,
  onApproveInspiration,
  isApproving = false,
  disabled = false,
}: ArtworkInspirationUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atMaxReferences = references.length >= ARTWORK_V2_MAX_INSPIRATION_IMAGES;

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

  return (
    <div className="space-y-3">
      {!atMaxReferences && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "inline-flex h-9 items-center gap-2 border border-cos-border bg-cos-card px-4 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Upload exported file
        </button>
      )}

      {references.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {references.map((reference) => (
            <li
              key={reference.id}
              className="group relative flex h-16 w-16 items-center justify-center overflow-hidden border border-cos-border bg-[#f7f6f3]"
            >
              {reference.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reference.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              <button
                type="button"
                onClick={() => removeReference(reference.id)}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center bg-cos-card/90 text-cos-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-cos-text"
                aria-label={`Remove ${reference.label}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
              {onApproveInspiration && (
                <button
                  type="button"
                  disabled={isApproving || disabled}
                  onClick={() => onApproveInspiration(reference.id)}
                  className="absolute inset-x-0 bottom-0 bg-cos-dark/80 px-1 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {isApproving ? "…" : "Use as approved"}
                </button>
              )}
            </li>
          ))}
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
  );
}
