"use client";

import { ArtworkV2PickerScreen } from "@/components/artwork-v2/ArtworkV2PickerScreen";
import type { ArtworkV2PickerEntry } from "@/components/artwork-v2/ArtworkV2PickerScreen";

const FALL_FESTIVAL_ART = "/images/fall-festival-campaign.png";

const MOCK_ITEMS: ArtworkV2PickerEntry[] = [
  {
    id: "feed-3",
    label: "3 Days Out",
    assetType: "facebook_graphic",
    planLabel: "3 Days Out Feed",
    formatLabel: "Feed 1:1",
    metaPlacement: "feed",
    relativeDay: -3,
    channel: "facebook",
    channelLabel: "Facebook",
    isApproved: true,
    downloadUrl: FALL_FESTIVAL_ART,
    downloadFilename: "3-days-out-feed.png",
  },
  {
    id: "story-3",
    label: "3 Days Out",
    assetType: "instagram_story",
    planLabel: "3 Days Out Story",
    formatLabel: "Story 9:16",
    metaPlacement: "story",
    relativeDay: -3,
    channel: "instagram",
    channelLabel: "Instagram",
    isApproved: true,
    downloadUrl: FALL_FESTIVAL_ART,
    downloadFilename: "3-days-out-story.png",
  },
  {
    id: "feed-1",
    label: "Day Before",
    assetType: "facebook_graphic",
    planLabel: "Day Before Feed",
    formatLabel: "Feed 1:1",
    metaPlacement: "feed",
    relativeDay: -1,
    channel: "facebook",
    channelLabel: "Facebook",
    isApproved: true,
    downloadUrl: FALL_FESTIVAL_ART,
    downloadFilename: "day-before-feed.png",
  },
  {
    id: "story-1",
    label: "Day Before",
    assetType: "instagram_story",
    planLabel: "Day Before Story",
    formatLabel: "Story 9:16",
    metaPlacement: "story",
    relativeDay: -1,
    channel: "instagram",
    channelLabel: "Instagram",
    isApproved: true,
    downloadUrl: FALL_FESTIVAL_ART,
    downloadFilename: "day-before-story.png",
  },
  {
    id: "feed-2",
    label: "Day Of",
    assetType: "facebook_graphic",
    planLabel: "Day Of Feed",
    formatLabel: "Feed 1:1",
    metaPlacement: "feed",
    relativeDay: 0,
    channel: "facebook",
    channelLabel: "Facebook",
    isApproved: false,
    downloadUrl: null,
    downloadFilename: "day-of-feed.png",
  },
  {
    id: "story-2",
    label: "Day Of",
    assetType: "instagram_story",
    planLabel: "Day Of Story",
    formatLabel: "Story 9:16",
    metaPlacement: "story",
    relativeDay: 0,
    channel: "instagram",
    channelLabel: "Instagram",
    isApproved: false,
    downloadUrl: null,
    downloadFilename: "day-of-story.png",
  },
];

export function FeaturePreviewArtworkSlide() {
  return (
    <div className="pointer-events-none">
      <ArtworkV2PickerScreen
        items={MOCK_ITEMS}
        isPhaseWorkflow
        onSelect={() => {}}
        onSelectMilestone={() => {}}
      />
    </div>
  );
}
