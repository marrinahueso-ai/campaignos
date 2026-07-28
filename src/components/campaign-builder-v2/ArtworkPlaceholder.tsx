"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, ImageIcon, ThumbsDown, X } from "lucide-react";
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
  /** Subtle Reject control after generation — discards this image slot. */
  onReject?: () => void;
  rejectDisabled?: boolean;
  rejectLabel?: string;
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
  onReject,
  rejectDisabled = false,
  rejectLabel = "Reject this image",
}: ArtworkPlaceholderProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasImage = Boolean(imageUrl && !isPlaceholderArtworkUrl(imageUrl));
  const hasCornerActions = Boolean(onDownload || onReject);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  if (hasImage && imageUrl) {
    return (
      <>
        <div
          className={cn(
            "group relative cursor-zoom-in overflow-hidden rounded-[16px] border border-cos-border bg-cos-card transition hover:brightness-[1.03]",
            aspectClassName,
            className,
          )}
          role="button"
          tabIndex={0}
          aria-label="Enlarge artwork"
          onClick={() => setLightboxOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setLightboxOpen(true);
            }
          }}
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
          <span className="pointer-events-none absolute bottom-1/2 left-1/2 z-10 -translate-x-1/2 translate-y-2 rounded-full bg-[rgba(28,36,48,0.72)] px-2.5 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
            Click to enlarge
          </span>
          {hasCornerActions ? (
            <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              {onReject ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 border border-cos-border bg-white/95 p-0 text-cos-muted shadow-sm hover:bg-white hover:text-cos-text focus:opacity-100"
                  disabled={rejectDisabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReject();
                  }}
                  aria-label={rejectLabel}
                  title={rejectLabel}
                >
                  <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Button>
              ) : null}
              {onDownload ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 border border-cos-border bg-white/95 p-0 shadow-sm hover:bg-white focus:opacity-100"
                  disabled={downloadDisabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDownload();
                  }}
                  aria-label={downloadLabel}
                  title={downloadLabel}
                >
                  <Download className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {lightboxOpen ? (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(28,36,48,0.72)] p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Artwork preview"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[22px] bg-cos-card shadow-[0_18px_40px_rgba(42,38,34,0.2)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(28,36,48,0.55)] text-white"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className={cn("relative w-full", aspectClassName)}>
                {isOptimizableImageUrl(imageUrl) ? (
                  <Image
                    src={imageUrl}
                    alt={alt}
                    fill
                    sizes="90vw"
                    quality={90}
                    className="object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={alt}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-cos-border px-4 py-3">
                <p className="text-sm font-semibold text-cos-muted">
                  Generated artwork
                </p>
                <div className="flex items-center gap-2">
                  {onReject ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLightboxOpen(false);
                        onReject();
                      }}
                      disabled={rejectDisabled}
                      aria-label={rejectLabel}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Reject
                    </Button>
                  ) : null}
                  {onDownload ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onDownload}
                      disabled={downloadDisabled}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[16px] border border-dashed border-cos-border bg-cos-bg/30 px-4 py-6 text-center",
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
