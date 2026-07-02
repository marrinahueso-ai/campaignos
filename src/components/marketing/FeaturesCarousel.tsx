"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import { MARKETING_FEATURES } from "@/lib/marketing/feature-definitions";
import {
  featureScreenshotPath,
  type FeaturePreviewSlug,
} from "@/lib/marketing/feature-preview-fixtures";
import { cn } from "@/lib/utils/cn";

const AUTOPLAY_MS = 4000;
const PAUSE_AFTER_INTERACTION_MS = 8000;

export function FeaturesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<FeaturePreviewSlug>>(
    new Set(),
  );
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const pauseUntilRef = useRef(0);

  const active = MARKETING_FEATURES[activeIndex]!;
  const activeSlug = active.id;
  const isImageReady = loadedImages.has(activeSlug);

  const pauseAutoplay = useCallback(() => {
    pauseUntilRef.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
  }, []);

  useEffect(() => {
    for (const feature of MARKETING_FEATURES) {
      const image = new window.Image();
      image.src = featureScreenshotPath(feature.id);
      image.onload = () => {
        setLoadedImages((current) => {
          if (current.has(feature.id)) {
            return current;
          }
          const next = new Set(current);
          next.add(feature.id);
          return next;
        });
      };
    }
  }, []);

  useEffect(() => {
    let timeoutId = 0;
    let cancelled = false;

    const scheduleNext = () => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (document.visibilityState === "hidden") {
          scheduleNext();
          return;
        }

        if (Date.now() < pauseUntilRef.current) {
          scheduleNext();
          return;
        }

        setDirection("forward");
        setActiveIndex(
          (current) => (current + 1) % MARKETING_FEATURES.length,
        );
        scheduleNext();
      }, AUTOPLAY_MS);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      pauseAutoplay();
      setActiveIndex((current) => {
        if (index === current) {
          return current;
        }
        setDirection(index > current ? "forward" : "backward");
        return index;
      });
    },
    [pauseAutoplay],
  );

  const goNext = useCallback(() => {
    pauseAutoplay();
    setDirection("forward");
    setActiveIndex((current) => (current + 1) % MARKETING_FEATURES.length);
  }, [pauseAutoplay]);

  const goPrevious = useCallback(() => {
    pauseAutoplay();
    setDirection("backward");
    setActiveIndex(
      (current) =>
        (current - 1 + MARKETING_FEATURES.length) % MARKETING_FEATURES.length,
    );
  }, [pauseAutoplay]);

  return (
    <div className="mt-16">
      <div className="cos-card overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cos-border px-6 py-5 sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="cos-section-title">From the workspace</p>
            <p className="mt-1 font-display text-2xl text-cos-text sm:text-3xl">
              {active.title}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
              {active.summary}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={goPrevious}
              className="flex h-10 w-10 items-center justify-center border border-cos-border text-cos-muted transition-colors hover:border-cos-text/30 hover:text-cos-text"
              aria-label="Previous feature"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-10 w-10 items-center justify-center border border-cos-border text-cos-muted transition-colors hover:border-cos-text/30 hover:text-cos-text"
              aria-label="Next feature"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="group relative block w-full cursor-pointer overflow-hidden bg-cos-bg/40 text-left"
          onClick={goNext}
          aria-label={`Show next feature after ${active.title}`}
        >
          <div
            key={activeSlug}
            className={
              direction === "forward"
                ? "feature-carousel-enter-forward"
                : "feature-carousel-enter-backward"
            }
          >
            <div className="relative min-h-[420px] w-full bg-cos-bg sm:min-h-[520px]">
              {!isImageReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-cos-muted">Loading preview…</p>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={activeSlug}
                src={featureScreenshotPath(activeSlug)}
                alt={`${active.title} preview`}
                className={cn(
                  "block h-auto w-full object-cover object-top transition-opacity duration-300",
                  isImageReady ? "opacity-100" : "opacity-0",
                )}
                decoding="async"
                onLoad={() => {
                  setLoadedImages((current) => {
                    if (current.has(activeSlug)) {
                      return current;
                    }
                    const next = new Set(current);
                    next.add(activeSlug);
                    return next;
                  });
                }}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-cos-dark/80 via-cos-dark/35 to-transparent px-4 py-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <MousePointerClick
              className="h-4 w-4 text-[#f6f2eb]"
              strokeWidth={1.5}
            />
            <span className="text-sm text-[#f6f2eb]">
              Click to explore the next feature
            </span>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-cos-border px-6 py-5 sm:px-8">
          {MARKETING_FEATURES.map((feature, index) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => goTo(index)}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                index === activeIndex
                  ? "font-medium text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
              aria-label={`Go to ${feature.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "bg-cos-text"
                    : "bg-cos-border",
                )}
              />
              <span className="hidden sm:inline">{feature.title.split(",")[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
