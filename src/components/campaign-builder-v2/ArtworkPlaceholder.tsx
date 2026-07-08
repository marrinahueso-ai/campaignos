"use client";

import { ImageIcon } from "lucide-react";
import { isPlaceholderArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";
import { cn } from "@/lib/utils/cn";

interface ArtworkPlaceholderProps {
  label?: string;
  hint?: string;
  aspectClassName?: string;
  imageUrl?: string | null;
  className?: string;
}

export function ArtworkPlaceholder({
  label = "No artwork yet",
  hint = "Click Generate or Edit",
  aspectClassName = "aspect-square",
  imageUrl,
  className,
}: ArtworkPlaceholderProps) {
  if (imageUrl && !isPlaceholderArtworkUrl(imageUrl)) {
    return (
      <div
        className={cn(
          "overflow-hidden border border-cos-border bg-cos-card",
          aspectClassName,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-cos-border bg-cos-bg/30 px-4 py-6 text-center",
        aspectClassName,
        className,
      )}
    >
      <ImageIcon className="h-8 w-8 text-cos-muted" strokeWidth={1.25} />
      <p className="mt-3 text-sm font-medium text-cos-text">{label}</p>
      <p className="mt-1 text-xs text-cos-muted">{hint}</p>
    </div>
  );
}
