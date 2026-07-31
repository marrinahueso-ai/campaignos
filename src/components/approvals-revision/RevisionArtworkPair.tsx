"use client";

import { ZoomIn, X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { WarmBreathFrame } from "@/components/motion/WarmBreathFrame";

export type RevisionArtScope = "feed" | "story" | "both";

export type RevisionArtworkVariant = "social" | "flyer";

type RevisionArtworkPairProps = {
  feedUrl: string | null;
  storyUrl: string | null;
  title: string;
  subtitle: string;
  /** Social = feed+story pair; flyer = single letter/print preview. */
  variant?: RevisionArtworkVariant;
  /** Which slot(s) show the “AI updated” badge. */
  artUpdated?: RevisionArtScope | false | null;
  /** Which slot(s) play the regen shimmer / warm breath while waiting. */
  animating?: RevisionArtScope | false | null;
  /** Soft hint under slots for creator edit affordance. */
  showEditHints?: boolean;
};

function scopeIncludes(
  scope: RevisionArtScope | false | null | undefined,
  view: "feed" | "story",
): boolean {
  if (!scope) return false;
  return scope === "both" || scope === view;
}

function FlyerPreviewLightbox({
  imageUrl,
  open,
  onClose,
}: {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="rev-flyer-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Flyer print preview"
      onClick={onClose}
    >
      <div
        className="rev-flyer-lightbox-card"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <button
          type="button"
          className="rev-flyer-lightbox-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Flyer print preview" />
        <p className="rev-flyer-lightbox-caption">Print flyer · full size</p>
      </div>
    </div>,
    document.body,
  );
}

function ArtSlot({
  view,
  url,
  title,
  subtitle,
  updated,
  animating,
  enlargeable = false,
}: {
  view: "feed" | "story" | "flyer";
  url: string | null;
  title: string;
  subtitle: string;
  updated: boolean;
  animating: boolean;
  enlargeable?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isStory = view === "story";
  const isFlyer = view === "flyer";
  const emptyLabel = isFlyer
    ? "No flyer artwork yet"
    : isStory
      ? "No story artwork yet"
      : "No feed artwork yet";
  const label = isFlyer
    ? "Flyer · print"
    : isStory
      ? "Story · 9:16"
      : "Feed · 1:1";
  const artClass = isFlyer ? "is-flyer" : isStory ? "is-story" : "is-feed";
  const generateLabel = isFlyer
    ? "generating flyer artwork"
    : `generating ${isStory ? "story" : "feed"} artwork`;
  const canEnlarge = Boolean(enlargeable && url);

  function openLightbox(event: MouseEvent | KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!canEnlarge) return;
    setLightboxOpen(true);
  }

  return (
    <div
      className="rev-art-slot"
      data-revision-art={view}
      data-has-art={url ? "true" : "false"}
    >
      <div className="rev-art-slot-label">{label}</div>
      <WarmBreathFrame active={animating} label={generateLabel}>
        <div
          className={[
            "rev-art",
            artClass,
            !url ? "is-empty" : "",
            animating ? "is-regen" : "",
            canEnlarge ? "is-enlargeable" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role={canEnlarge ? "button" : "img"}
          tabIndex={canEnlarge ? 0 : undefined}
          aria-label={
            url
              ? canEnlarge
                ? `${label} preview — click to enlarge`
                : `${label} preview`
              : `${label}: ${emptyLabel}`
          }
          onClick={canEnlarge ? openLightbox : undefined}
          onKeyDown={
            canEnlarge
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openLightbox(event);
                  }
                }
              : undefined
          }
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" />
          ) : null}
          {updated ? <span className="rev-art-badge">AI updated</span> : null}
          {canEnlarge ? (
            <span className="rev-art-zoom" aria-hidden="true">
              <ZoomIn size={18} strokeWidth={2} />
            </span>
          ) : null}
          {!url ? (
            <div className="rev-art-fallback">
              <strong>{title}</strong>
              {subtitle ? <span>{subtitle}</span> : null}
              <span className="rev-art-empty-hint">{emptyLabel}</span>
            </div>
          ) : null}
        </div>
      </WarmBreathFrame>
      {canEnlarge && url ? (
        <FlyerPreviewLightbox
          imageUrl={url}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Preview for Revision workspace.
 * Social: side-by-side feed (1:1) + story (9:16) — both slots always render.
 * Flyer: single letter/print preview.
 */
export function RevisionArtworkPair({
  feedUrl,
  storyUrl,
  title,
  subtitle,
  variant = "social",
  artUpdated = false,
  animating = false,
  showEditHints = false,
}: RevisionArtworkPairProps) {
  if (variant === "flyer") {
    return (
      <div className="rev-art-pair-wrap" data-revision-artwork-pair="flyer">
        <div className="rev-label">Preview</div>
        <div className="rev-art-pair is-flyer">
          <ArtSlot
            view="flyer"
            url={feedUrl}
            title={title}
            subtitle={subtitle}
            updated={Boolean(artUpdated)}
            animating={Boolean(animating)}
            enlargeable
          />
        </div>
        {showEditHints ? (
          <p className="rev-art-pair-hint">
            Open Flyer composer to revise print artwork, then send for
            re-approval.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rev-art-pair-wrap" data-revision-artwork-pair="social">
      <div className="rev-label">Preview</div>
      <div className="rev-art-pair">
        <ArtSlot
          view="feed"
          url={feedUrl}
          title={title}
          subtitle={subtitle}
          updated={scopeIncludes(artUpdated, "feed")}
          animating={scopeIncludes(animating, "feed")}
        />
        <ArtSlot
          view="story"
          url={storyUrl}
          title={title}
          subtitle={subtitle}
          updated={scopeIncludes(artUpdated, "story")}
          animating={scopeIncludes(animating, "story")}
        />
      </div>
      {showEditHints ? (
        <p className="rev-art-pair-hint">
          Regenerate feed, story, or both from Instruct AI below.
        </p>
      ) : null}
    </div>
  );
}
