"use client";

import Image from "next/image";
import { Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  /** Icon-only download control on the image corner. */
  onDownload?: () => void;
  downloadDisabled?: boolean;
  downloadLabel?: string;
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
  onDownload,
  downloadDisabled = false,
  downloadLabel = "Download artwork",
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
        {onDownload ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 z-10 h-8 w-8 border border-cos-border bg-white/95 p-0 shadow-sm hover:bg-white"
            disabled={downloadDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onDownload();
            }}
            aria-label={downloadLabel}
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : null}
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
