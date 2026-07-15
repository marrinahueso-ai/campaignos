"use client";

import Image from "next/image";
import { useState } from "react";
import { ArtworkV2ReviewLightbox } from "@/components/artwork-v2/ArtworkV2ReviewLightbox";
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

  return (
    <div className={cn("flex flex-col gap-2", wrapperClassName)}>
      {src ? (
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
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 768px) 45vw, 220px"
              className="object-cover"
              unoptimized
            />
          </button>
          {open && (
            <ArtworkV2ReviewLightbox
              src={src}
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
