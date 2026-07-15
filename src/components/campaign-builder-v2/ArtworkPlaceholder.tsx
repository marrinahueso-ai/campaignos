"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { isPlaceholderArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";
import { cn } from "@/lib/utils/cn";

interface ArtworkPlaceholderProps {
  label?: string;
  hint?: string;
  aspectClassName?: string;
  imageUrl?: string | null;
  className?: string;
  /** First visible preview image — helps LCP without changing layout. */
  priority?: boolean;
  alt?: string;
}

function isOptimizableImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function ArtworkPlaceholder({
  label = "No artwork yet",
  hint = "Click Generate or Edit",
  aspectClassName = "aspect-square",
  imageUrl,
  className,
  priority = false,
  alt = "",
}: ArtworkPlaceholderProps) {
  if (imageUrl && !isPlaceholderArtworkUrl(imageUrl)) {
    return (
      <div
        className={cn(
          "relative overflow-hidden border border-cos-border bg-cos-card",
          aspectClassName,
          className,
        )}
      >
        {isOptimizableImageUrl(imageUrl) ? (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes="(max-width: 768px) 90vw, 420px"
            quality={75}
            priority={priority}
            fetchPriority={priority ? "high" : "auto"}
            className="object-cover"
          />
        ) : (
          // Local blob/data URLs and non-Supabase hosts cannot use next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt}
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
        )}
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
