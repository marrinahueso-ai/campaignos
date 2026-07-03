"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface ArtworkV2ReviewLightboxProps {
  src: string;
  alt: string;
  variant?: "feed" | "story";
  onClose: () => void;
}

export function ArtworkV2ReviewLightbox({
  src,
  alt,
  variant = "feed",
  onClose,
}: ArtworkV2ReviewLightboxProps) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn(
            "max-h-[90vh] object-contain",
            variant === "story"
              ? "max-w-[min(90vw,540px)]"
              : "max-w-[min(90vw,960px)]",
          )}
        />
      </div>
    </div>
  );
}
