"use client";

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

function ArtSlot({
  view,
  url,
  title,
  subtitle,
  updated,
  animating,
}: {
  view: "feed" | "story" | "flyer";
  url: string | null;
  title: string;
  subtitle: string;
  updated: boolean;
  animating: boolean;
}) {
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
          ]
            .filter(Boolean)
            .join(" ")}
          role="img"
          aria-label={url ? `${label} preview` : `${label}: ${emptyLabel}`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" />
          ) : null}
          {updated ? <span className="rev-art-badge">AI updated</span> : null}
          {!url ? (
            <div className="rev-art-fallback">
              <strong>{title}</strong>
              {subtitle ? <span>{subtitle}</span> : null}
              <span className="rev-art-empty-hint">{emptyLabel}</span>
            </div>
          ) : null}
        </div>
      </WarmBreathFrame>
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
