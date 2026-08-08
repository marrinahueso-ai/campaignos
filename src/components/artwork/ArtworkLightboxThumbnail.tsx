"use client";

import { useState } from "react";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
import { AppImage } from "@/components/images/AppImage";
import { cn } from "@/lib/utils/cn";

interface ArtworkLightboxThumbnailProps {
  src: string | null | undefined;
  alt: string;
  label?: string;
  variant?: "feed" | "story";
  wrapperClassName?: string;
  frameClassName?: string;
  placeholder?: string;
}

export function ArtworkLightboxThumbnail({
  src,
  alt,
  label,
  variant = "feed",
  wrapperClassName,
  frameClassName,
  placeholder = "No image",
}: ArtworkLightboxThumbnailProps) {
  const [open, setOpen] = useState(false);
  const url = src?.trim() || null;
  // Story frames are 9:16; cover crops square/feed art. Contain shows the full image.
  const fit = variant === "story" ? "contain" : "cover";

  return (
    <div className={cn("flex flex-col gap-2", wrapperClassName)}>
      {url ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className={cn(
              "relative overflow-hidden rounded-xl border border-cos-border bg-[#f7f6f3]",
              "cursor-zoom-in transition-opacity hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-primary/40",
              frameClassName,
            )}
            aria-label={`View ${alt} full size`}
          >
            <AppImage
              src={url}
              alt=""
              fill
              preset="card"
              displayWidth={360}
              displayHeight={variant === "story" ? 640 : 360}
              resize={fit}
              sizes="(max-width: 768px) 45vw, 220px"
              className={fit === "contain" ? "object-contain" : "object-cover"}
            />
          </button>
          {open && (
            <ArtworkV2ReviewLightbox
              src={url}
              alt={alt}
              variant={variant}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-xl border border-cos-border bg-[#f7f6f3] px-2 text-center text-[10px] text-cos-muted",
            frameClassName,
          )}
        >
          {placeholder}
        </div>
      )}
      {label && (
        <p className="text-center text-[10px] font-medium text-cos-muted">{label}</p>
      )}
    </div>
  );
}
