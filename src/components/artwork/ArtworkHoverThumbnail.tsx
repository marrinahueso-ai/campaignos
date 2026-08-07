"use client";

import {
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Download, X, ZoomIn } from "lucide-react";
import { AppImage } from "@/components/images/AppImage";
import { Button } from "@/components/ui/Button";
import {
  buildArtworkDownloadFilename,
  downloadArtworkImage,
} from "@/lib/artwork-v2/download";
import { cn } from "@/lib/utils/cn";

function stopNav(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
  event.preventDefault();
}

function stopBubble(event: MouseEvent) {
  event.stopPropagation();
}

function useArtworkPreviewActions(
  imageUrl: string | null,
  downloadName: string,
) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  async function handleDownload(event?: MouseEvent) {
    event?.stopPropagation();
    event?.preventDefault();
    if (!imageUrl || downloading) return;
    setDownloading(true);
    try {
      const filename = buildArtworkDownloadFilename(downloadName);
      await downloadArtworkImage(imageUrl, filename);
    } catch {
      // Allow retry from the same control.
    } finally {
      setDownloading(false);
    }
  }

  function openLightbox(event: MouseEvent | KeyboardEvent) {
    stopNav(event);
    setLightboxOpen(true);
  }

  return {
    lightboxOpen,
    setLightboxOpen,
    downloading,
    handleDownload,
    openLightbox,
  };
}

function ArtworkPreviewLightbox({
  imageUrl,
  alt,
  open,
  onClose,
  onDownload,
  downloading,
}: {
  imageUrl: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  onDownload: (event?: MouseEvent) => void;
  downloading: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(28,36,48,0.72)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Artwork preview"
      onClick={onClose}
      onMouseDown={stopBubble}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[22px] bg-cos-card shadow-[0_18px_40px_rgba(42,38,34,0.2)]"
        onClick={stopBubble}
        onMouseDown={stopBubble}
      >
        <button
          type="button"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(28,36,48,0.55)] text-white"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-cos-border px-4 py-3">
          <p className="text-sm font-semibold text-cos-muted">Event artwork</p>
          <Button
            type="button"
            size="sm"
            onClick={onDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type ArtworkActionSize = "compact" | "default" | "floating";

function resolveArtworkActionSize(
  compact?: boolean,
  floating?: boolean,
): ArtworkActionSize {
  if (compact) return "compact";
  if (floating) return "floating";
  return "default";
}

const artworkActionSizeStyles: Record<
  ArtworkActionSize,
  { button: string; icon: string; stroke: number }
> = {
  compact: { button: "h-[22px] w-[22px]", icon: "h-2.5 w-2.5", stroke: 1.75 },
  default: { button: "h-7 w-7", icon: "h-3 w-3", stroke: 1.75 },
  floating: { button: "h-8 w-8", icon: "h-3.5 w-3.5", stroke: 1.75 },
};

function ArtworkActionButton({
  size,
  floating,
  disabled,
  onClick,
  ariaLabel,
  children,
}: {
  size: ArtworkActionSize;
  floating?: boolean;
  disabled?: boolean;
  onClick: (event: MouseEvent) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  const styles = artworkActionSizeStyles[size];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseDown={stopBubble}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-0 transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-[#8B867E]/35 focus-visible:ring-offset-1 focus-visible:outline-none",
        floating
          ? "border border-[rgba(255,252,247,0.35)] bg-[rgba(245,243,240,0.94)] text-[#8B867E] shadow-[0_1px_3px_rgba(20,28,24,0.18)] backdrop-blur-sm hover:bg-[#F5F3F0] hover:text-[#6B665E]"
          : "border border-[rgba(139,134,126,0.2)] bg-[#F5F3F0] text-[#8B867E] shadow-[0_1px_2px_rgba(42,38,34,0.08)] hover:bg-[#EFEBE6] hover:text-[#6B665E]",
        "disabled:pointer-events-none disabled:opacity-50",
        styles.button,
      )}
    >
      {children}
    </button>
  );
}

function ArtworkActionButtons({
  compact,
  floating,
  downloading,
  onEnlarge,
  onDownload,
  className,
}: {
  compact?: boolean;
  floating?: boolean;
  downloading: boolean;
  onEnlarge: (event: MouseEvent) => void;
  onDownload: (event: MouseEvent) => void;
  className?: string;
}) {
  const size = resolveArtworkActionSize(compact, floating);
  const styles = artworkActionSizeStyles[size];

  return (
    <div className={cn("pointer-events-auto flex items-center gap-0.5", className)}>
      <ArtworkActionButton
        size={size}
        floating={floating}
        onClick={onEnlarge}
        ariaLabel="Enlarge artwork"
      >
        <ZoomIn className={styles.icon} strokeWidth={styles.stroke} />
      </ArtworkActionButton>
      <ArtworkActionButton
        size={size}
        floating={floating}
        disabled={downloading}
        onClick={onDownload}
        ariaLabel="Download artwork"
      >
        <Download className={styles.icon} strokeWidth={styles.stroke} />
      </ArtworkActionButton>
    </div>
  );
}

interface ArtworkPreviewActionsProps {
  imageUrl: string;
  alt: string;
  downloadName: string;
  className?: string;
  compact?: boolean;
  floating?: boolean;
}

/** Enlarge + download controls and lightbox — no image wrapper. */
export function ArtworkPreviewActions({
  imageUrl,
  alt,
  downloadName,
  className,
  compact = false,
  floating = false,
}: ArtworkPreviewActionsProps) {
  const {
    lightboxOpen,
    setLightboxOpen,
    downloading,
    handleDownload,
    openLightbox,
  } = useArtworkPreviewActions(imageUrl, downloadName);

  return (
    <>
      <ArtworkActionButtons
        compact={compact}
        floating={floating}
        downloading={downloading}
        onEnlarge={openLightbox}
        onDownload={handleDownload}
        className={className}
      />
      <ArtworkPreviewLightbox
        imageUrl={imageUrl}
        alt={alt}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDownload={handleDownload}
        downloading={downloading}
      />
    </>
  );
}

interface ArtworkHoverThumbnailProps {
  imageUrl: string | null | undefined;
  alt: string;
  downloadName: string;
  className?: string;
  sizes?: string;
  /** Small list thumbs — tighter icon controls and padding. */
  compact?: boolean;
  placeholderClassName?: string;
}

export function ArtworkHoverThumbnail({
  imageUrl,
  alt,
  downloadName,
  className,
  sizes = "120px",
  compact = false,
  placeholderClassName,
}: ArtworkHoverThumbnailProps) {
  const url = imageUrl?.trim() || null;
  const {
    lightboxOpen,
    setLightboxOpen,
    downloading,
    handleDownload,
    openLightbox,
  } = useArtworkPreviewActions(url, downloadName);

  if (!url) {
    return (
      <span
        className={cn(
          "relative block aspect-square w-full overflow-hidden bg-[#f7f6f3]",
          className,
          placeholderClassName,
        )}
        aria-hidden
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          // Fixed square rail; contain keeps full poster art readable (cover was
          // cropping feed graphics into illegible letter fragments).
          "group relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-[#f7f6f3]",
          className,
        )}
        role="button"
        tabIndex={0}
        aria-label="Enlarge artwork"
        onClick={openLightbox}
        onMouseDown={stopBubble}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            openLightbox(event);
          }
        }}
      >
        <AppImage
          src={url}
          alt=""
          fill
          preset={compact ? "thumb" : "card"}
          displayWidth={compact ? 128 : 256}
          className="object-contain object-center p-0.5"
          style={{ objectFit: "contain" }}
          sizes={sizes}
        />
        <span className="pointer-events-none absolute inset-0 z-[1] bg-[rgba(28,36,48,0.22)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[2] flex items-end justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
            compact ? "p-1" : "p-2",
          )}
        >
          <ArtworkActionButtons
            compact={compact}
            downloading={downloading}
            onEnlarge={openLightbox}
            onDownload={handleDownload}
          />
        </div>
      </div>
      <ArtworkPreviewLightbox
        imageUrl={url}
        alt={alt}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDownload={handleDownload}
        downloading={downloading}
      />
    </>
  );
}
