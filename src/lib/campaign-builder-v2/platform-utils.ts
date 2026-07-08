import type {
  ArtworkView,
  MilestoneArtwork,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";

export const PLATFORM_FORMAT_OPTIONS: Array<{
  id: PlatformFormat;
  label: string;
  aspect: "1/1" | "9/16";
}> = [
  { id: "facebook-feed", label: "Facebook Feed", aspect: "1/1" },
  { id: "facebook-story", label: "Facebook Story", aspect: "9/16" },
  { id: "instagram-feed", label: "Instagram Feed", aspect: "1/1" },
  { id: "instagram-story", label: "Instagram Story", aspect: "9/16" },
  {
    id: "instagram-story-manual",
    label: "Instagram Story Manual",
    aspect: "9/16",
  },
];

export const ARTWORK_VIEW_OPTIONS: Array<{
  id: ArtworkView;
  label: string;
  subtitle: string;
  aspect: "1/1" | "9/16";
}> = [
  {
    id: "feed",
    label: "Feed view (1:1)",
    subtitle: "Instagram Feed + Facebook Feed",
    aspect: "1/1",
  },
  {
    id: "story",
    label: "Story view (9:16)",
    subtitle: "Instagram Story + Facebook Story",
    aspect: "9/16",
  },
];

export const PLATFORM_FORMAT_LABELS: Record<PlatformFormat, string> = {
  "facebook-feed": "Facebook Feed (1:1)",
  "facebook-story": "Facebook Story (9:16)",
  "instagram-feed": "Instagram Feed (1:1)",
  "instagram-story": "Instagram Story (9:16)",
  "instagram-story-manual": "Instagram Story (Manual)",
};

export const ARTWORK_VIEW_LABELS: Record<ArtworkView, string> = {
  feed: "Feed view (1:1)",
  story: "Story view (9:16)",
};

export function artworkViewForFormat(format: PlatformFormat): ArtworkView {
  return format.includes("story") ? "story" : "feed";
}

export function artworkKeyForView(view: ArtworkView): keyof MilestoneArtwork {
  return view === "feed" ? "feedUrl" : "storyUrl";
}

/** Maps a publish format to its shared artwork slot (feed or story). */
export function artworkKeyForFormat(
  format: PlatformFormat,
): keyof MilestoneArtwork {
  return artworkKeyForView(artworkViewForFormat(format));
}

export function aspectClassForView(view: ArtworkView): string {
  return view === "story" ? "aspect-[9/16]" : "aspect-square";
}

export function aspectClassForFormat(format: PlatformFormat): string {
  return aspectClassForView(artworkViewForFormat(format));
}

export function enabledArtworkViews(
  enabledFormats: PlatformFormat[],
): ArtworkView[] {
  const views = new Set<ArtworkView>();
  for (const format of enabledFormats) {
    views.add(artworkViewForFormat(format));
  }
  return ARTWORK_VIEW_OPTIONS.map((option) => option.id).filter((view) =>
    views.has(view),
  );
}

export function defaultEnabledFormats(): PlatformFormat[] {
  return [
    "facebook-feed",
    "facebook-story",
    "instagram-feed",
    "instagram-story",
  ];
}

export function emptyMilestoneArtwork(): MilestoneArtwork {
  return {
    feedUrl: null,
    storyUrl: null,
  };
}

/** Demo / legacy placeholder URLs that must never count as generated artwork. */
export function isPlaceholderArtworkUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) {
    return false;
  }

  const trimmed = url.trim().toLowerCase();

  if (trimmed === "/api/placeholder-artwork") {
    return true;
  }

  if (
    trimmed.includes("placehold.co") ||
    trimmed.includes("via.placeholder.com") ||
    trimmed.includes("placeholder.com")
  ) {
    return true;
  }

  return false;
}

export function sanitizeArtworkUrl(url: string | null | undefined): string | null {
  if (!url?.trim() || isPlaceholderArtworkUrl(url)) {
    return null;
  }

  return url.trim();
}

/** Migrate legacy four-slot artwork payloads to feed + story. */
export function normalizeMilestoneArtwork(artwork: unknown): MilestoneArtwork {
  const source =
    artwork && typeof artwork === "object"
      ? (artwork as Partial<MilestoneArtwork> & Record<string, string | null | undefined>)
      : {};
  return {
    feedUrl: sanitizeArtworkUrl(
      source.feedUrl ?? source.facebookFeedUrl ?? source.instagramFeedUrl ?? null,
    ),
    storyUrl: sanitizeArtworkUrl(
      source.storyUrl ?? source.facebookStoryUrl ?? source.instagramStoryUrl ?? null,
    ),
  };
}
