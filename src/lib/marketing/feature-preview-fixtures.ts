import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWeatherContext } from "@/lib/weather/types";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { TodayWeekEntry, TodayWhatsNext } from "@/types/today";

export const PREVIEW_TODAY = "2026-07-01";

export const previewWhatsNext: TodayWhatsNext = {
  kind: "step",
  title: "Continue Save the Date for Fall Festival",
  subtitle: "Due today",
  href: "/events/preview",
  ctaLabel: "Continue",
  eventId: "preview-event",
};

export const previewDashboardArtwork: HeroArtworkSelection = {
  source: "approved_asset",
  caption: "Artwork ready",
  imageUrl: "/images/fall-festival-campaign.png",
  label: "Save the Date",
  filename: "fall-festival-save-the-date.png",
  aspectRatio: "square",
  assetType: "facebook_graphic",
};

export const previewWeekEntries: TodayWeekEntry[] = [
  {
    id: "w1",
    date: "2026-07-01",
    title: "Day Before",
    eventTitle: "Fall Festival",
    kind: "communication",
    href: null,
  },
  {
    id: "w2",
    date: "2026-07-02",
    title: "Day Of",
    eventTitle: "Fall Festival",
    kind: "communication",
    href: null,
  },
  {
    id: "w3",
    date: "2026-07-08",
    title: "Ready to publish",
    eventTitle: "Fall Festival",
    kind: "publishing",
    href: null,
  },
];

export const previewWeather: TodayWeatherContext = {
  location: { label: "Your community", city: "Local", state: "TN", query: "US" },
  weather: { temperatureF: 89, condition: "Sunny", source: "mock" },
  displayLine: "89° and sunny",
};

export type FeaturePreviewSlug =
  | "dashboard"
  | "workflow"
  | "calendar"
  | "artwork"
  | "approvals"
  | "publish";

export const FEATURE_PREVIEW_SLUGS: FeaturePreviewSlug[] = [
  "dashboard",
  "workflow",
  "calendar",
  "artwork",
  "approvals",
  "publish",
];

export function featureScreenshotPath(slug: FeaturePreviewSlug): string {
  return `/images/features/${slug}.png`;
}

export function createPreviewPlanningItem(
  partial: Partial<PlanningCalendarItem> &
    Pick<PlanningCalendarItem, "id" | "title" | "scheduledDate" | "eventTitle">,
): PlanningCalendarItem {
  return {
    sourceId: partial.id,
    sourceType: partial.sourceType ?? "timeline_task",
    eventId: partial.eventId ?? "preview-event",
    timelineStepTitle: partial.timelineStepTitle ?? partial.title,
    timelineStepId: partial.timelineStepId ?? null,
    communicationItemId: partial.communicationItemId ?? null,
    channel: partial.channel ?? "facebook",
    communicationType: partial.communicationType ?? "timeline_task",
    status: partial.status ?? "upcoming",
    assignedUser: null,
    draftContent: null,
    draftStatus: null,
    artworkStatus: null,
    approvalStatus: null,
    publishStatus: null,
    versionNumber: null,
    ...partial,
  };
}

export const previewCalendarItems: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "c1",
    eventId: "e1",
    eventTitle: "Fall Festival",
    title: "Fall Festival",
    scheduledDate: "2026-10-15",
    sourceType: "event",
    channel: null,
    communicationType: "event",
  }),
  createPreviewPlanningItem({
    id: "c2",
    eventId: "e1",
    eventTitle: "Fall Festival",
    title: "Day Before",
    scheduledDate: "2026-10-14",
    sourceType: "timeline_task",
    channel: "facebook",
    communicationType: "scheduled_post",
  }),
  createPreviewPlanningItem({
    id: "c3",
    eventId: "e2",
    eventTitle: "PTO Meeting",
    title: "PTO Meeting",
    scheduledDate: "2026-07-08",
    sourceType: "event",
    channel: null,
    communicationType: "event",
  }),
];

export const previewMetaPublishBundles: MetaPublishBundle[] = [
  {
    relativeDay: -1,
    title: "Day Before",
    dueDate: "2026-10-14",
    scheduledFor: "2026-10-14T09:00:00",
    status: "needs_artwork",
    isMetaPost: true,
    channel: "facebook",
    captionPreview: null,
    storyCaptionPreview: null,
    feedArtworkUrl: null,
    storyArtworkUrl: null,
    missingArtwork: ["Feed", "Story"],
    targets: [
      { platform: "facebook", placement: "feed", label: "Facebook Feed" },
      { platform: "instagram", placement: "feed", label: "Instagram Feed" },
    ],
    stepId: null,
    metaPublishSurfaces: "both",
  },
  {
    relativeDay: 0,
    title: "Day Of",
    dueDate: "2026-10-15",
    scheduledFor: "2026-10-15T07:00:00",
    status: "channel_only",
    isMetaPost: false,
    channel: null,
    captionPreview: null,
    storyCaptionPreview: null,
    feedArtworkUrl: null,
    storyArtworkUrl: null,
    missingArtwork: [],
    targets: [],
    stepId: null,
    metaPublishSurfaces: "both",
  },
];

export const previewPublishingQueue: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "q1",
    eventId: "e1",
    eventTitle: "Fall Festival",
    title: "Day Before",
    scheduledDate: "2026-10-14",
    channel: "facebook",
    communicationType: "scheduled_post",
    publishStatus: "ready",
    status: "ready",
  }),
];

export const previewPublishingScheduled: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "s1",
    eventId: "e1",
    eventTitle: "Fall Festival",
    title: "Save the Date",
    scheduledDate: "2026-09-01",
    channel: "instagram",
    communicationType: "scheduled_post",
    publishStatus: "scheduled",
    status: "scheduled",
  }),
];

export const previewPublishingPublished: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "p1",
    eventId: "e1",
    eventTitle: "Fall Festival",
    title: "Teaser post",
    scheduledDate: "2026-08-15",
    channel: "facebook",
    communicationType: "scheduled_post",
    publishStatus: "published",
    status: "published",
  }),
];
