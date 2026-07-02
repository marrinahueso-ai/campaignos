"use client";

import { useEffect } from "react";
import { GeneratedArtworkFrame } from "@/components/artwork/GeneratedArtworkFrame";

interface ArtworkV2ReviewLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ArtworkV2ReviewLightbox({ src, alt, onClose }: ArtworkV2ReviewLightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <button
      type="button"
      className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-label="Close artwork preview"
    >
      <GeneratedArtworkFrame
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[min(100%,960px)] rounded-xl bg-transparent p-4"
      />
    </button>
  );
}
