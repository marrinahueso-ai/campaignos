import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWeatherContext } from "@/lib/weather/types";
import { computePostingHeatmap } from "@/lib/posting-analytics/compute-heatmap";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { TodayWeekEntry, TodayWhatsNext } from "@/types/today";

/** Fictional school and team — never use real org or board names in marketing. */
export const PREVIEW_SCHOOL_NAME = "Oak Ridge Elementary";
export const PREVIEW_USER_FIRST_NAME = "Sarah";
export const PREVIEW_USER_FULL_NAME = "Sarah Chen";
export const PREVIEW_USER_ROLE = "VP Communications";
export const PREVIEW_PRESIDENT_NAME = "Michelle Park";
export const PREVIEW_EVENT_TITLE = "Spring Carnival";

export const PREVIEW_TODAY = "2026-07-01";

export const previewWhatsNext: TodayWhatsNext = {
  kind: "step",
  title: `Continue Save the Date for ${PREVIEW_EVENT_TITLE}`,
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
  filename: "spring-carnival-save-the-date.png",
  aspectRatio: "square",
  assetType: "facebook_graphic",
};

export const previewWeekEntries: TodayWeekEntry[] = [
  {
    id: "w1",
    date: "2026-07-01",
    title: "Day Before",
    eventTitle: PREVIEW_EVENT_TITLE,
    kind: "communication",
    href: null,
  },
  {
    id: "w2",
    date: "2026-07-02",
    title: "Day Of",
    eventTitle: PREVIEW_EVENT_TITLE,
    kind: "communication",
    href: null,
  },
  {
    id: "w3",
    date: "2026-07-08",
    title: "Ready to publish",
    eventTitle: PREVIEW_EVENT_TITLE,
    kind: "publishing",
    href: null,
  },
];

export const previewWeather: TodayWeatherContext = {
  location: { label: "Oak Ridge", city: "Oak Ridge", state: "TN", query: "US" },
  weather: { temperatureF: 89, condition: "Sunny", source: "mock" },
  displayLine: "89° and sunny",
};

export type FeaturePreviewSlug =
  | "dashboard"
  | "workflow"
  | "calendar"
  | "heatmap"
  | "artwork"
  | "approvals"
  | "publish";

export const FEATURE_PREVIEW_SLUGS: FeaturePreviewSlug[] = [
  "dashboard",
  "workflow",
  "calendar",
  "heatmap",
  "artwork",
  "approvals",
  "publish",
];

export function featureScreenshotPath(slug: FeaturePreviewSlug): string {
  return `/images/features/${slug}.png`;
}

export const previewPostingHeatmap: PostingHeatmapData = computePostingHeatmap({
  timezone: "America/Chicago",
  preferredPostingHours: [
    { daysOfWeek: [1, 2, 3, 4, 5], startHour: 17, endHour: 20 },
    { daysOfWeek: [0, 6], startHour: 10, endHour: 13 },
  ],
  publishedAtTimestamps: [
    "2026-06-10T18:30:00-05:00",
    "2026-06-12T19:00:00-05:00",
    "2026-06-15T17:45:00-05:00",
    "2026-06-18T18:15:00-05:00",
    "2026-06-22T19:30:00-05:00",
    "2026-06-25T17:00:00-05:00",
    "2026-06-28T18:00:00-05:00",
  ],
});

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
    eventTitle: PREVIEW_EVENT_TITLE,
    title: PREVIEW_EVENT_TITLE,
    scheduledDate: "2026-10-15",
    sourceType: "event",
    channel: null,
    communicationType: "event",
  }),
  createPreviewPlanningItem({
    id: "c2",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Day Before",
    scheduledDate: "2026-10-14",
    sourceType: "timeline_task",
    channel: "facebook",
    communicationType: "scheduled_post",
  }),
  createPreviewPlanningItem({
    id: "c3",
    eventId: "e2",
    eventTitle: "PTO General Meeting",
    title: "PTO General Meeting",
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
    eventTitle: PREVIEW_EVENT_TITLE,
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
    eventTitle: PREVIEW_EVENT_TITLE,
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
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Teaser post",
    scheduledDate: "2026-08-15",
    channel: "facebook",
    communicationType: "scheduled_post",
    publishStatus: "published",
    status: "published",
  }),
];
