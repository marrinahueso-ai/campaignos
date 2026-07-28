"use client";

export type RevisionArtScope = "feed" | "story" | "both";

type RevisionArtworkPairProps = {
  feedUrl: string | null;
  storyUrl: string | null;
  title: string;
  subtitle: string;
  /** Which slot(s) show the “AI updated” badge. */
  artUpdated?: RevisionArtScope | false | null;
  /** Which slot(s) play the regen shimmer. */
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
  view: "feed" | "story";
  url: string | null;
  title: string;
  subtitle: string;
  updated: boolean;
  animating: boolean;
}) {
  const isStory = view === "story";
  const emptyLabel = isStory ? "No story artwork yet" : "No feed artwork yet";

  return (
    <div className="rev-art-slot">
      <div className="rev-art-slot-label">
        {isStory ? "Story · 9:16" : "Feed · 1:1"}
      </div>
      <div
        className={[
          "rev-art",
          isStory ? "is-story" : "is-feed",
          animating ? "is-regen" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        ) : null}
        {updated ? <span className="rev-art-badge">AI updated</span> : null}
        {!url ? (
          <div className="rev-art-fallback">
            <strong>{title}</strong>
            <span>{subtitle || emptyLabel}</span>
            {subtitle ? (
              <span className="rev-art-empty-hint">{emptyLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Side-by-side feed (1:1) + story (9:16) preview for Revision workspace.
 */
export function RevisionArtworkPair({
  feedUrl,
  storyUrl,
  title,
  subtitle,
  artUpdated = false,
  animating = false,
  showEditHints = false,
}: RevisionArtworkPairProps) {
  return (
    <div className="rev-art-pair-wrap">
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
