"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

import {
  canOptimizeWithNextImage,
  isLocalOrDataImageUrl,
  toDisplayImageUrl,
  type ImageDisplayIntent,
  type ImageDisplayPreset,
  type ImageDisplayResize,
} from "@/lib/images/display";
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

/**
 * Shared display image: derives Supabase transform URLs for display intent,
 * falls back to <img> for blob/data/non-Supabase hosts, and keeps originals
 * when intent="original" (lightbox, etc.).
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
  const [triedOriginalFallback, setTriedOriginalFallback] = useState(false);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
    setTriedOriginalFallback(false);
  }, [resolvedSrc]);

  if (!currentSrc) {
    return null;
  }

  const handleError = () => {
    // Transform / next/image can fail while the original object URL still works.
    if (!triedOriginalFallback && originalSrc && currentSrc !== originalSrc) {
      setTriedOriginalFallback(true);
      setCurrentSrc(originalSrc);
      return;
    }
    setCurrentSrc("");
    onError?.();
  };

  const loading = priority ? "eager" : "lazy";
  const usePlainImg =
    isLocalOrDataImageUrl(currentSrc) || !canOptimizeWithNextImage(currentSrc);

  if (usePlainImg) {
    if (props.fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- blob/data/remote hosts
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          fetchPriority={priority ? "high" : "auto"}
          className={cn("absolute inset-0 h-full w-full", className)}
          onError={handleError}
        />
      );
    }

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
        onError={handleError}
      />
    );
  }

  const shared: Pick<
    ImageProps,
    "alt" | "className" | "sizes" | "priority" | "quality" | "onError"
  > = {
    alt,
    className,
    sizes,
    priority,
    quality: 75,
    onError: handleError,
  };

  if (props.fill) {
    return (
      <Image
        {...shared}
        src={currentSrc}
        fill
        loading={loading}
        fetchPriority={priority ? "high" : "auto"}
      />
    );
  }

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
