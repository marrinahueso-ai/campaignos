"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { ResourceTutorial } from "@/lib/marketing/resource-tutorials";

interface ResourceTutorialViewerProps {
  tutorial: ResourceTutorial;
  onClose: () => void;
}

/**
 * Full-frame narrated tutorial viewer.
 * - Opens only after user intent (card / search / deep link)
 * - Native controls for play/pause, volume, scrub, fullscreen
 * - object-fit: contain so the full recording stays visible
 * - Video element mounts only while open (listing never preloads MP4s)
 */
export function ResourceTutorialViewer({
  tutorial,
  onClose,
}: ResourceTutorialViewerProps) {
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // User opened the viewer — attempt play under that gesture. If the browser
    // blocks unmuted autoplay, native controls remain for an intentional click.
    void video.play().catch(() => {
      /* ignore — user can press play */
    });
  }, [tutorial.id]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-cos-text/50 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(100dvh-1.5rem,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-2xl sm:max-h-[min(100dvh-3rem,920px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-cos-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-base font-semibold text-cos-text sm:text-lg"
            >
              {tutorial.title}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-cos-muted sm:text-sm">
              {tutorial.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg-alt hover:text-cos-text"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-black px-2 py-2 sm:px-3 sm:py-3">
          <video
            ref={videoRef}
            className="max-h-[min(70dvh,720px)] w-full bg-black object-contain"
            src={tutorial.src}
            poster={tutorial.poster}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            aria-label={tutorial.label}
          >
            {tutorial.captionsSrc ? (
              <track
                kind="captions"
                src={tutorial.captionsSrc}
                srcLang="en"
                label="English"
              />
            ) : null}
            Your browser does not support embedded video.
          </video>
        </div>

        {!tutorial.captionsSrc ? (
          <p className="border-t border-cos-border px-4 py-2 text-[11px] text-cos-muted sm:px-5">
            Captions are not available for this tutorial yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
