"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  canOptimizeWithNextImage,
  isLocalOrDataImageUrl,
  toDisplayImageUrl,
  type ImageDisplayIntent,
  type ImageDisplayPreset,
  type ImageDisplayResize,
} from "@/lib/images/display";
import { objectFitFromClassName } from "@/lib/images/object-fit";
import { cn } from "@/lib/utils/cn";

type AppImageBase = {
  src: string;
  alt: string;
  /** display (default) transforms Supabase public URLs; original leaves them alone. */
  intent?: ImageDisplayIntent;
  preset?: ImageDisplayPreset;
  /** Explicit transform width; defaults from preset. */
  displayWidth?: number;
  displayHeight?: number;
  resize?: ImageDisplayResize;
  displayQuality?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  sizes?: string;
  onError?: () => void;
};

type AppImageFillProps = AppImageBase & {
  fill: true;
  width?: never;
  height?: never;
};

type AppImageFixedProps = AppImageBase & {
  fill?: false;
  width: number;
  height: number;
};

export type AppImageProps = AppImageFillProps | AppImageFixedProps;

export { objectFitFromClassName } from "@/lib/images/object-fit";

/**
 * Shared display image: derives Supabase transform URLs for display intent,
 * falls back to <img> for blob/data/non-Supabase hosts, and keeps originals
 * when intent="original" (lightbox, etc.).
 *
 * Fill mode always uses a plain <img> (same pattern as Homepage / Social).
 * next/image `fill` was stretching artwork in Events / Volunteers / Approvals
 * thumbs even when `object-cover` was in className.
 */
export function AppImage(props: AppImageProps) {
  const {
    src,
    alt,
    intent = "display",
    preset,
    displayWidth,
    displayHeight,
    resize,
    displayQuality,
    className,
    style,
    priority = false,
    sizes,
    onError,
  } = props;

  const resolvedSrc = toDisplayImageUrl(src, {
    intent,
    preset,
    width: displayWidth ?? (!props.fill ? props.width : undefined),
    height: displayHeight,
    quality: displayQuality,
    resize,
  });

  const originalSrc = src.trim();
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);
  // Refs keep onError fallback correct even if the browser fires error before
  // the next React render (stale closure used to clear the src too early).
  const currentSrcRef = useRef(resolvedSrc);
  const triedOriginalFallbackRef = useRef(false);

  useEffect(() => {
    currentSrcRef.current = resolvedSrc;
    triedOriginalFallbackRef.current = false;
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  if (!currentSrc) {
    return null;
  }

  const handleError = () => {
    // Transform / next/image can fail while the original object URL still works.
    const active = currentSrcRef.current;
    if (
      !triedOriginalFallbackRef.current &&
      originalSrc &&
      active !== originalSrc
    ) {
      triedOriginalFallbackRef.current = true;
      currentSrcRef.current = originalSrc;
      setCurrentSrc(originalSrc);
      return;
    }
    currentSrcRef.current = "";
    setCurrentSrc("");
    onError?.();
  };

  const loading = priority ? "eager" : "lazy";
  const objectFit =
    style?.objectFit ?? objectFitFromClassName(className) ?? "cover";

  // Fill: plain img only. Supabase already bounds the URL; next/image fill
  // stretched aspect on dashboard card rails.
  if (props.fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fill thumbs need reliable object-fit
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        fetchPriority={priority ? "high" : "auto"}
        className={cn("absolute inset-0 h-full w-full", className)}
        style={{ ...style, objectFit }}
        onError={handleError}
      />
    );
  }

  const usePlainImg =
    isLocalOrDataImageUrl(currentSrc) || !canOptimizeWithNextImage(currentSrc);

  if (usePlainImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob/data/remote hosts
      <img
        src={currentSrc}
        alt={alt}
        width={props.width}
        height={props.height}
        loading={loading}
        fetchPriority={priority ? "high" : "auto"}
        className={className}
        style={style}
        onError={handleError}
      />
    );
  }

  const shared: Pick<
    ImageProps,
    "alt" | "className" | "sizes" | "priority" | "quality" | "onError" | "style"
  > = {
    alt,
    className,
    sizes,
    priority,
    quality: 75,
    onError: handleError,
    style,
  };

  return (
    <Image
      {...shared}
      src={currentSrc}
      width={props.width}
      height={props.height}
      loading={loading}
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
