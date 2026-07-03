"use client";

import { useEffect, useRef } from "react";
import type { FeatureVideoSlug } from "@/lib/marketing/feature-preview-fixtures";
import {
  featureVideoPath,
  featureVideoPosterPath,
} from "@/lib/marketing/feature-preview-fixtures";
import { cn } from "@/lib/utils/cn";

interface FeatureCarouselVideoSlideProps {
  slug: FeatureVideoSlug;
  isActive: boolean;
  className?: string;
}

export function FeatureCarouselVideoSlide({
  slug,
  isActive,
  className,
}: FeatureCarouselVideoSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (isActive) {
      void video.play().catch(() => {
        // Autoplay may be blocked until user interaction; poster remains visible.
      });
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      className={cn("block h-auto w-full bg-cos-bg/40 object-contain object-top", className)}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={featureVideoPosterPath(slug)}
      aria-label={`${slug} product preview`}
    >
      <source src={featureVideoPath(slug)} type="video/webm" />
    </video>
  );
}
