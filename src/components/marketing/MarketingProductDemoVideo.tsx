"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  MARKETING_PRODUCT_DEMOS,
  warmMarketingDemo,
  type MarketingProductDemoId,
} from "@/lib/marketing/product-demo-videos";
import { cn } from "@/lib/utils/cn";

/**
 * Only one marketing product demo plays at a time so the page stays calm.
 */
const pauseRegistry = new Map<string, () => void>();

const demoPlayback = {
  requestPlay(ownerId: string, play: () => void) {
    for (const [id, pause] of pauseRegistry) {
      if (id !== ownerId) pause();
    }
    play();
  },
  setPause(ownerId: string, pause: () => void) {
    pauseRegistry.set(ownerId, pause);
  },
  clear(ownerId: string) {
    pauseRegistry.delete(ownerId);
  },
};

export interface MarketingProductDemoVideoProps {
  demoId: MarketingProductDemoId;
  className?: string;
  /** Aspect ratio utility — Screen Studio exports are ~1960×1080 */
  aspectClassName?: string;
  /** Prefer LCP: show next/image poster with priority before video mounts play */
  priority?: boolean;
  sizes?: string;
  /**
   * object-fit for the video/poster.
   * Product UI recordings should use "contain" so the full frame stays visible.
   */
  objectFit?: "contain" | "cover";
  /**
   * @deprecated Prefer objectFit="contain". When true, zooms ~14% with
   * object-cover — crops product chrome. Kept only for non-homepage experiments.
   */
  cropStudioChrome?: boolean;
  /** Override video preload. Tour clips should use "auto" once near-viewport. */
  preload?: "none" | "metadata" | "auto";
}

/**
 * Passive product demo clip — muted, looping, playsInline, no native controls.
 * Respects prefers-reduced-motion (static poster). Loads early when near the
 * viewport, but only autoplays when substantially on-screen so hero + tour
 * demos do not fight each other.
 */
export function MarketingProductDemoVideo({
  demoId,
  className,
  aspectClassName = "aspect-[1960/1080]",
  priority = false,
  sizes = "(max-width: 1024px) 100vw, 1152px",
  objectFit = "contain",
  cropStudioChrome = false,
  preload,
}: MarketingProductDemoVideoProps) {
  const demo = MARKETING_PRODUCT_DEMOS[demoId];
  const ownerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [showPosterOverlay, setShowPosterOverlay] = useState(true);
  const shouldPlayRef = useRef(false);
  shouldPlayRef.current = shouldPlay;

  const resolvedPreload = preload ?? (priority ? "metadata" : "none");

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, []);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;
    void video.play().catch(() => {
      // Autoplay can be blocked; poster remains visible.
    });
  }, [reducedMotion]);

  const revealVideo = useCallback(() => {
    setShowPosterOverlay(false);
  }, []);

  useEffect(() => {
    demoPlayback.setPause(ownerId, pauseVideo);
    return () => demoPlayback.clear(ownerId);
  }, [ownerId, pauseVideo]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      setShouldPlay(true);
      return;
    }

    // Prefetch / mount media early — does not autoplay by itself.
    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          warmMarketingDemo(demoId);
        }
      },
      { rootMargin: "600px 0px", threshold: 0.01 },
    );

    // Play only when the clip is substantially visible (avoids hero↔tour thrash).
    const playObserver = new IntersectionObserver(
      ([entry]) => {
        const visible =
          Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= 0.35;
        setShouldPlay(visible);
      },
      { rootMargin: "0px", threshold: [0, 0.35, 0.5, 0.75, 1] },
    );

    loadObserver.observe(node);
    playObserver.observe(node);
    return () => {
      loadObserver.disconnect();
      playObserver.disconnect();
    };
  }, [demoId]);

  // When the tour swaps clips, show the poster until the new source can play.
  useEffect(() => {
    setShowPosterOverlay(true);
    warmMarketingDemo(demoId);
  }, [demoId]);

  useEffect(() => {
    if (reducedMotion) {
      pauseVideo();
      return;
    }
    if (!shouldLoad) return;

    if (shouldPlay) {
      demoPlayback.requestPlay(ownerId, playVideo);
    } else {
      pauseVideo();
    }
  }, [
    demoId,
    shouldPlay,
    shouldLoad,
    reducedMotion,
    ownerId,
    playVideo,
    pauseVideo,
  ]);

  const fitClass =
    objectFit === "cover" || cropStudioChrome
      ? "object-cover object-top"
      : "object-contain object-center";
  // Avoid zoom-cropping product UI. cropStudioChrome remains available but is
  // unused on the homepage — full-frame contain is the marketing default.
  const mediaClass = cn(
    fitClass,
    cropStudioChrome && "scale-[1.14] origin-center",
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full overflow-hidden bg-cos-bg bg-cover bg-top bg-no-repeat",
        aspectClassName,
        className,
      )}
      style={{ backgroundImage: `url(${demo.poster})` }}
    >
      <Image
        src={demo.poster}
        alt={demo.label}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          mediaClass,
          showPosterOverlay || reducedMotion ? "opacity-100" : "opacity-0",
        )}
      />

      {!reducedMotion && shouldLoad ? (
        <video
          key={demo.src}
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full",
            mediaClass,
            showPosterOverlay ? "opacity-0" : "opacity-100",
          )}
          muted
          loop
          playsInline
          preload={resolvedPreload}
          poster={demo.poster}
          aria-hidden
          tabIndex={-1}
          onCanPlay={() => {
            revealVideo();
            if (shouldPlayRef.current) playVideo();
          }}
          onPlaying={revealVideo}
        >
          <source src={demo.src} type="video/mp4" />
        </video>
      ) : null}

      <span className="sr-only">{demo.label}</span>
    </div>
  );
}
