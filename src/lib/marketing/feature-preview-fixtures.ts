import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWeatherContext } from "@/lib/weather/types";
import { computePostingHeatmap } from "@/lib/posting-analytics/compute-heatmap";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { TodayWeekEntry, TodayWhatsNext } from "@/types/today";
import type { Event } from "@/types";
import type { EventPlaybookHubData } from "@/types/event-playbooks";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";

export const PREVIEW_SPRING_ARTWORK = "/images/spring-carnival-campaign.png";

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
  imageUrl: PREVIEW_SPRING_ARTWORK,
  label: "Save the Date",
  filename: "spring-carnival-save-the-date.png",
  aspectRatio: "square",
  assetType: "facebook_graphic",
};

export const previewOwnership: EventRosterOwnership = {
  committeeName: "Spring Carnival",
  chairNames: ["Sarah Chen"],
  vpRoleName: "VP Communications",
  vpContactName: PREVIEW_USER_FULL_NAME,
  committeeFilled: true,
  vpFilled: true,
};

export const previewEvent: Event = {
  id: "preview-event",
  title: PREVIEW_EVENT_TITLE,
  description:
    "Annual spring fundraiser with carnival games, food trucks, and a class basket raffle.",
  date: "2026-07-18",
  time: "10:00",
  location: "Oak Ridge Elementary field",
  audience: "Families and staff",
  theme: "Spring Carnival",
  status: "scheduled",
  category: "Fundraiser",
  eventType: "family_event",
  communicationStrategy: "full_campaign",
  calendarImportId: null,
  eventOwner: null,
  approvalOrganizationRoleId: null,
  budget: "$4,500",
  volunteerNeeds: "12 volunteers for game booths",
  goal: "Raise funds for playground upgrades",
  expectedAttendance: "350 families",
  planningQuickLinks: {},
  planningVendors: [],
  approvedSquareImageUrl: PREVIEW_SPRING_ARTWORK,
  approvedSquareImageStatus: "filled",
  createdAt: "2026-05-01T12:00:00Z",
  updatedAt: "2026-06-15T12:00:00Z",
};

export const previewHubData: EventPlaybookHubData = {
  planningProgressPercent: 62,
  tasks: [
    {
      id: "t1",
      eventId: "preview-event",
      title: "Confirm food truck lineup",
      status: "done",
      dueDate: "2026-06-20",
      assigneeName: "Sarah Chen",
      assigneeInitials: "SC",
      sortOrder: 0,
      createdAt: "2026-05-01T12:00:00Z",
      updatedAt: "2026-06-18T12:00:00Z",
    },
    {
      id: "t2",
      eventId: "preview-event",
      title: "Order bounce house rental",
      status: "in_progress",
      dueDate: "2026-07-01",
      assigneeName: "Michelle Park",
      assigneeInitials: "MP",
      sortOrder: 1,
      createdAt: "2026-05-01T12:00:00Z",
      updatedAt: "2026-06-28T12:00:00Z",
    },
    {
      id: "t3",
      eventId: "preview-event",
      title: "Recruit class basket volunteers",
      status: "todo",
      dueDate: "2026-07-10",
      assigneeName: null,
      assigneeInitials: null,
      sortOrder: 2,
      createdAt: "2026-05-01T12:00:00Z",
      updatedAt: "2026-05-01T12:00:00Z",
    },
  ],
  notes: [],
  files: [],
  activity: [
    {
      id: "a1",
      eventId: "preview-event",
      action: "Save the Date artwork approved",
      actorName: PREVIEW_USER_FULL_NAME,
      createdAt: "2026-06-22T14:00:00Z",
    },
    {
      id: "a2",
      eventId: "preview-event",
      action: "Communication plan generated",
      actorName: "Sarah Chen",
      createdAt: "2026-06-10T09:30:00Z",
    },
  ],
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
  | "planning-hub"
  | "workflow"
  | "calendar"
  | "heatmap"
  | "artwork"
  | "approvals"
  | "publish";

export const FEATURE_PREVIEW_SLUGS: FeaturePreviewSlug[] = [
  "dashboard",
  "planning-hub",
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
    scheduledDate: "2026-07-18",
    sourceType: "event",
    channel: null,
    communicationType: "event",
  }),
  createPreviewPlanningItem({
    id: "c2",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Day Before",
    timelineStepTitle: "Day Before",
    scheduledDate: "2026-07-17",
    sourceType: "timeline_task",
    channel: "facebook",
    communicationType: "meta_milestone",
    status: "scheduled",
    publishStatus: "scheduled",
  }),
  createPreviewPlanningItem({
    id: "c3",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Day Of",
    timelineStepTitle: "Day Of",
    scheduledDate: "2026-07-18",
    sourceType: "timeline_task",
    channel: "facebook",
    communicationType: "meta_milestone",
    status: "scheduled",
    publishStatus: "scheduled",
  }),
  createPreviewPlanningItem({
    id: "c4",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Save the Date",
    timelineStepTitle: "Save the Date",
    scheduledDate: "2026-06-15",
    sourceType: "timeline_task",
    channel: "facebook",
    communicationType: "meta_milestone",
    status: "published",
    publishStatus: "published",
  }),
  createPreviewPlanningItem({
    id: "c5",
    eventId: "e2",
    eventTitle: "PTO General Meeting",
    title: "PTO General Meeting",
    scheduledDate: "2026-07-08",
    sourceType: "event",
    channel: null,
    communicationType: "event",
  }),
  createPreviewPlanningItem({
    id: "c6",
    eventId: "e3",
    eventTitle: "Spirit Night",
    title: "Spirit Night",
    scheduledDate: "2026-07-25",
    sourceType: "event",
    channel: null,
    communicationType: "event",
  }),
  createPreviewPlanningItem({
    id: "c7",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "3 Days Out",
    timelineStepTitle: "3 Days Out",
    scheduledDate: "2026-07-15",
    sourceType: "timeline_task",
    channel: "instagram",
    communicationType: "meta_milestone",
    status: "scheduled",
    publishStatus: "scheduled",
  }),
  createPreviewPlanningItem({
    id: "c8",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Teaser post",
    timelineStepTitle: "Teaser post",
    scheduledDate: "2026-07-03",
    sourceType: "timeline_task",
    channel: "facebook",
    communicationType: "meta_milestone",
    status: "published",
    publishStatus: "published",
  }),
];

export const previewMetaPublishBundles: MetaPublishBundle[] = [
  {
    relativeDay: -1,
    title: "Day Before",
    dueDate: "2026-07-17",
    scheduledFor: "2026-07-17T09:00:00",
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
    dueDate: "2026-07-18",
    scheduledFor: "2026-07-18T07:00:00",
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
    timelineStepTitle: "Day Before",
    scheduledDate: "2026-07-17",
    channel: "facebook",
    communicationType: "meta_milestone",
    publishStatus: "ready",
    status: "ready",
  }),
];

export const previewPublishingScheduled: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "s1",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "3 Days Out",
    timelineStepTitle: "3 Days Out",
    scheduledDate: "2026-07-15",
    channel: "instagram",
    communicationType: "meta_milestone",
    publishStatus: "scheduled",
    status: "scheduled",
  }),
];

export const previewPublishingPublished: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "p1",
    eventId: "e1",
    eventTitle: PREVIEW_EVENT_TITLE,
    title: "Save the Date",
    timelineStepTitle: "Save the Date",
    scheduledDate: "2026-06-15",
    channel: "facebook",
    communicationType: "meta_milestone",
    publishStatus: "published",
    status: "published",
  }),
];
