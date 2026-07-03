import {
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import type { MetaPublishSurfaces } from "@/types/playbooks";

/** Single publish mode — maps to meta_publish_surfaces + story_manual_publish in DB. */
export type MetaPublishMode =
  | "feed_and_story_auto"
  | "feed_auto_story_manual"
  | "story_manual"
  | "story_auto";

export const PUBLISH_MODE_OPTIONS: {
  value: MetaPublishMode;
  label: string;
  description: string;
}[] = [
  {
    value: "feed_and_story_auto",
    label: "Feed + Story",
    description: "Auto-publish both via Meta",
  },
  {
    value: "feed_auto_story_manual",
    label: "Feed + Manual Story",
    description: "Feed auto; story from your phone",
  },
  {
    value: "story_manual",
    label: "Manual Story",
    description: "Story only — post from your phone",
  },
  {
    value: "story_auto",
    label: "Story",
    description: "Auto-publish story via Meta",
  },
];

export function derivePublishMode(
  surfaces: MetaPublishSurfaces,
  storyManualPublish: boolean,
): MetaPublishMode {
  if (surfaces === "both") {
    return storyManualPublish ? "feed_auto_story_manual" : "feed_and_story_auto";
  }

  if (surfaces === "story_only") {
    return storyManualPublish ? "story_manual" : "story_auto";
  }

  // Legacy feed_only — treat as feed auto without story in UI
  return storyManualPublish ? "feed_auto_story_manual" : "feed_and_story_auto";
}

export function publishModeToDb(mode: MetaPublishMode): {
  metaPublishSurfaces: MetaPublishSurfaces;
  storyManualPublish: boolean;
} {
  switch (mode) {
    case "feed_and_story_auto":
      return { metaPublishSurfaces: "both", storyManualPublish: false };
    case "feed_auto_story_manual":
      return { metaPublishSurfaces: "both", storyManualPublish: true };
    case "story_manual":
      return { metaPublishSurfaces: "story_only", storyManualPublish: true };
    case "story_auto":
      return { metaPublishSurfaces: "story_only", storyManualPublish: false };
  }
}

export function isManualStoryEmailMode(mode: MetaPublishMode): boolean {
  return mode === "feed_auto_story_manual" || mode === "story_manual";
}

export function isManualStoryOnlyMode(mode: MetaPublishMode): boolean {
  return mode === "story_manual";
}

export function isAutoPublishMode(mode: MetaPublishMode): boolean {
  return mode === "feed_and_story_auto" || mode === "story_auto";
}

export function surfacesNeedManualStoryEmail(
  surfaces: MetaPublishSurfaces,
  storyManualPublish: boolean,
): boolean {
  return storyManualPublish && isStorySurfaceEnabled(surfaces);
}

export function isManualStoryOnlyBundle(
  surfaces: MetaPublishSurfaces,
  storyManualPublish: boolean,
): boolean {
  return (
    storyManualPublish &&
    isStorySurfaceEnabled(surfaces) &&
    !isFeedSurfaceEnabled(surfaces)
  );
}
