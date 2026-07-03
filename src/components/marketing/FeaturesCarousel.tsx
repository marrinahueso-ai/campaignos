"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { MARKETING_FEATURES } from "@/lib/marketing/feature-definitions";
import type { FeaturePreviewSlug } from "@/lib/marketing/feature-preview-fixtures";
import { cn } from "@/lib/utils/cn";

const FeaturePreviewSlide = dynamic(
  () =>
    import("@/components/marketing/feature-previews/FeaturePreviewSlide").then(
      (module) => module.FeaturePreviewSlide,
    ),
  {
    loading: () => (
      <div className="flex min-h-[480px] items-center justify-center bg-cos-bg/40">
        <p className="text-sm text-cos-muted">Loading workspace preview…</p>
      </div>
    ),
  },
);

const AUTOPLAY_MS = 5500;
const PAUSE_AFTER_INTERACTION_MS = 10000;

export function FeaturesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const pauseUntilRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = MARKETING_FEATURES[activeIndex]!;
  const activeSlug = active.id;

  const pauseAutoplay = useCallback(() => {
    pauseUntilRef.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
    setProgressKey((value) => value + 1);
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

  useEffect(() => {
    if (isPaused) {
      return;
    }

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
        setProgressKey((value) => value + 1);
        scheduleNext();
      }, AUTOPLAY_MS);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isPaused, activeIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious]);

  const ActiveIcon = active.icon;

  return (
    <div ref={containerRef} className="mt-16" tabIndex={-1}>
      <div
        className="cos-card overflow-hidden p-0"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPaused(false);
          }
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cos-border px-6 py-5 sm:px-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="cos-section-title">From the workspace</p>
              <span className="inline-flex items-center gap-1.5 border border-cos-border bg-cos-bg/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-cos-muted uppercase">
                <ActiveIcon className="h-3 w-3" strokeWidth={1.5} />
                Live product UI
              </span>
            </div>
            <p className="mt-2 font-display text-2xl text-cos-text sm:text-3xl">
              {active.title}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
              {active.summary}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {active.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-full border border-cos-border bg-cos-bg/50 px-2.5 py-0.5 text-xs text-cos-text"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                pauseAutoplay();
                setIsPaused((value) => !value);
              }}
              className="flex h-10 w-10 items-center justify-center border border-cos-border text-cos-muted transition-colors hover:border-cos-text/30 hover:text-cos-text"
              aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
            >
              {isPaused ? (
                <Play className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Pause className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
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

        <div className="relative overflow-hidden bg-cos-bg/30">
          <div
            key={`${activeSlug}-${direction}`}
            className={cn(
              "origin-top",
              direction === "forward"
                ? "feature-carousel-enter-forward"
                : "feature-carousel-enter-backward",
            )}
          >
            <div className="max-h-[640px] overflow-hidden">
              <FeaturePreviewSlide slug={activeSlug as FeaturePreviewSlug} />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cos-bg via-cos-bg/60 to-transparent" />
        </div>

        <div className="border-t border-cos-border px-6 py-4 sm:px-8">
          <div className="mb-4 h-0.5 overflow-hidden bg-cos-border">
            <div
              key={progressKey}
              className={cn(
                "h-full origin-left bg-cos-text",
                isPaused ? "w-full opacity-30" : "feature-carousel-progress",
              )}
              style={
                isPaused
                  ? undefined
                  : { animationDuration: `${AUTOPLAY_MS}ms` }
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {MARKETING_FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = index === activeIndex;

              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-200",
                    isActive
                      ? "border-cos-text/25 bg-cos-dark text-[#f6f2eb]"
                      : "border-transparent text-cos-muted hover:border-cos-border hover:bg-cos-bg/60 hover:text-cos-text",
                  )}
                  aria-label={`Go to ${feature.title}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="hidden sm:inline">
                    {feature.title.split(",")[0]?.split("—")[0]?.trim()}
                  </span>
                  <span className="sm:hidden">{index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
