"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  MARKETING_PRODUCT_DEMOS,
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
  /** Aspect ratio utility, e.g. aspect-[1024/665] */
  aspectClassName?: string;
  /** Prefer LCP: show next/image poster with priority before video mounts play */
  priority?: boolean;
  sizes?: string;
  /** object-fit for the video/poster */
  objectFit?: "contain" | "cover";
}

/**
 * Passive product demo clip — muted, looping, playsInline, no native controls.
 * Respects prefers-reduced-motion (static poster). Plays only while near viewport
 * and yields to other demos so the marketing page never feels like a wall of motion.
 */
export function MarketingProductDemoVideo({
  demoId,
  className,
  aspectClassName = "aspect-[1024/665]",
  priority = false,
  sizes = "(max-width: 1024px) 100vw, 1152px",
  objectFit = "contain",
}: MarketingProductDemoVideoProps) {
  const demo = MARKETING_PRODUCT_DEMOS[demoId];
  const ownerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [showPosterOverlay, setShowPosterOverlay] = useState(true);

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

  useEffect(() => {
    demoPlayback.setPause(ownerId, pauseVideo);
    return () => demoPlayback.clear(ownerId);
  }, [ownerId, pauseVideo]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (visible) {
          setShouldLoad(true);
        }
      },
      { rootMargin: "200px 0px", threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      pauseVideo();
      return;
    }
    if (!shouldLoad) return;

    if (inView) {
      demoPlayback.requestPlay(ownerId, playVideo);
    } else {
      pauseVideo();
    }
  }, [inView, shouldLoad, reducedMotion, ownerId, playVideo, pauseVideo]);

  const objectClass =
    objectFit === "cover" ? "object-cover object-top" : "object-contain object-top";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full overflow-hidden bg-cos-bg",
        aspectClassName,
        className,
      )}
    >
      <Image
        src={demo.poster}
        alt={demo.label}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          objectClass,
          showPosterOverlay || reducedMotion ? "opacity-100" : "opacity-0",
        )}
      />

      {!reducedMotion && shouldLoad ? (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full",
            objectClass,
            showPosterOverlay ? "opacity-0" : "opacity-100",
          )}
          muted
          loop
          playsInline
          preload={priority ? "metadata" : "none"}
          poster={demo.poster}
          aria-hidden
          tabIndex={-1}
          onLoadedData={() => setShowPosterOverlay(false)}
          onPlaying={() => setShowPosterOverlay(false)}
        >
          <source src={demo.src} type="video/mp4" />
        </video>
      ) : null}

      <span className="sr-only">{demo.label}</span>
    </div>
  );
}
