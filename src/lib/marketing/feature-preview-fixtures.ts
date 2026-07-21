import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWeatherContext } from "@/lib/weather/types";
import type {
  PostingHeatmapData,
  PostingTimeScoreGrid,
} from "@/lib/posting-analytics/types";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { TodayWeekEntry, TodayWhatsNext } from "@/types/today";
import type { Event } from "@/types";
import type { EventPlaybookHubData } from "@/types/event-playbooks";
import type { FilesPageData } from "@/types/campaign-files";
import type { EventPlanningOverviewData } from "@/types/planning-overview";
import type { ApprovalQueueItem } from "@/types/event-workspace";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import {
  groupEventsByMonth,
  sortCampaignMonthGroups,
  type SortedCampaignMonthGroups,
} from "@/lib/events/campaign-page-utils";

export const PREVIEW_SPRING_ARTWORK = "/images/spring-carnival-campaign.png";
export const PREVIEW_BACK_TO_SCHOOL_ARTWORK = "/images/back-to-school-fair-campaign.png";

/** Fictional school and team — never use real org or board names in marketing. */
export const PREVIEW_SCHOOL_NAME = "Oak Ridge Elementary";
export const PREVIEW_ORG_TIMEZONE = "America/Chicago";
export const PREVIEW_USER_FIRST_NAME = "Sarah";
export const PREVIEW_USER_FULL_NAME = "Sarah Chen";
export const PREVIEW_USER_ROLE = "VP Communications";
export const PREVIEW_PRESIDENT_NAME = "Michelle Park";
export const PREVIEW_CHAIR_REBECCA = "Rebecca Kidd";
export const PREVIEW_VP_EVENTS = "Daniel Ortiz";
export const PREVIEW_EVENT_TITLE = "Spring Carnival";
export const PREVIEW_HUB_EVENT_TITLE = "Back to School Fair";

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

export const previewPlanningHubEvent: Event = {
  id: "preview-hub-event",
  title: PREVIEW_HUB_EVENT_TITLE,
  description:
    "Welcome-back celebration with classroom visits, supply drop-off, and a PTO welcome table for new families.",
  date: "2026-08-14",
  time: "09:00",
  location: "Oak Ridge Elementary gymnasium",
  audience: "All families and staff",
  theme: "Back to School",
  status: "scheduled",
  category: "Community",
  eventType: "family_event",
  communicationStrategy: "full_campaign",
  calendarImportId: null,
  eventOwner: null,
  approvalOrganizationRoleId: null,
  budget: "$2,800",
  volunteerNeeds: "8 volunteers for welcome table and hallway guides",
  goal: "Help families start the year informed and connected",
  expectedAttendance: "420 families",
  planningQuickLinks: {
    volunteer_signup: {
      url: "https://signup.oakridgepto.example/volunteers",
      status: "filled",
    },
    event_budget: { url: "", status: "filled" },
    communication_plan: { url: "", status: "filled" },
  },
  planningVendors: [],
  approvedSquareImageUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
  approvedSquareImageStatus: "filled",
  createdAt: "2026-05-15T12:00:00Z",
  updatedAt: "2026-06-28T12:00:00Z",
};

export const previewPlanningHubArtwork: HeroArtworkSelection = {
  source: "approved_asset",
  caption: "Artwork ready",
  imageUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
  label: "Save the Date",
  filename: "back-to-school-save-the-date.png",
  aspectRatio: "square",
  assetType: "facebook_graphic",
};

export const previewPlanningHubOwnership: EventRosterOwnership = {
  committeeName: PREVIEW_HUB_EVENT_TITLE,
  chairNames: [PREVIEW_CHAIR_REBECCA],
  vpRoleName: "VP Events",
  vpContactName: PREVIEW_VP_EVENTS,
  committeeFilled: true,
  vpFilled: true,
};

export const previewPlanningHubData: EventPlaybookHubData = {
  planningProgressPercent: 58,
  taskGroups: [],
  tasks: [
    {
      id: "ht1",
      eventId: "preview-hub-event",
      title: "Confirm welcome table supplies",
      status: "done",
      dueDate: "2026-07-20",
      assigneeName: PREVIEW_CHAIR_REBECCA,
      assigneeInitials: "RK",
      assigneeUserId: null,
      groupId: null,
      sortOrder: 0,
      createdAt: "2026-05-15T12:00:00Z",
      updatedAt: "2026-07-18T12:00:00Z",
    },
    {
      id: "ht2",
      eventId: "preview-hub-event",
      title: "Finalize hallway volunteer shifts",
      status: "in_progress",
      dueDate: "2026-08-01",
      assigneeName: PREVIEW_VP_EVENTS,
      assigneeInitials: "DO",
      assigneeUserId: null,
      groupId: null,
      sortOrder: 1,
      createdAt: "2026-05-15T12:00:00Z",
      updatedAt: "2026-07-28T12:00:00Z",
    },
    {
      id: "ht3",
      eventId: "preview-hub-event",
      title: "Print classroom maps for families",
      status: "todo",
      dueDate: "2026-08-10",
      assigneeName: null,
      assigneeInitials: null,
      assigneeUserId: null,
      groupId: null,
      sortOrder: 2,
      createdAt: "2026-05-15T12:00:00Z",
      updatedAt: "2026-05-15T12:00:00Z",
    },
  ],
  notes: [],
  files: [],
  activity: [
    {
      id: "ha1",
      eventId: "preview-hub-event",
      action: "Save the Date artwork approved",
      actorName: PREVIEW_USER_FULL_NAME,
      createdAt: "2026-07-12T14:00:00Z",
    },
    {
      id: "ha2",
      eventId: "preview-hub-event",
      action: "Volunteer signup link added",
      actorName: PREVIEW_CHAIR_REBECCA,
      createdAt: "2026-07-05T09:30:00Z",
    },
  ],
};

export const previewFilesPageData: FilesPageData = {
  tablesAvailable: true,
  files: [],
  events: [
    {
      eventId: previewPlanningHubEvent.id,
      title: previewPlanningHubEvent.title,
      date: previewPlanningHubEvent.date,
      artwork: previewPlanningHubArtwork,
      fileCount: 0,
    },
  ],
  eventList: [previewPlanningHubEvent],
  uploaderNames: [],
  currentUserName: PREVIEW_USER_FIRST_NAME,
};

function previewApprovalItem(
  overrides: Partial<ApprovalQueueItem> & Pick<ApprovalQueueItem, "id" | "channel">,
): ApprovalQueueItem {
  return {
    eventId: previewPlanningHubEvent.id,
    eventTitle: previewPlanningHubEvent.title,
    communicationItemId: overrides.id,
    status: "pending",
    communicationStatus: "pending_approval",
    requestedAt: "2026-07-05T17:46:00.000Z",
    resolvedAt: null,
    assigneeDisplayName: PREVIEW_CHAIR_REBECCA,
    assignedToMe: false,
    submittedByMe: false,
    notes: null,
    preview: {
      milestoneTitle: "Back to School welcome post",
      scheduledFor: "2026-08-01T14:00:00.000Z",
      captionText: "Welcome back, families! Join us for classroom visits and supply drop-off.",
      storyCaptionSnippet: null,
      artworkThumbnailUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
    },
    ...overrides,
  };
}

export const previewPlanningOverview: EventPlanningOverviewData = {
  assignedToMeCount: 2,
  otherPendingCount: 3,
  approvedThisWeekCount: 7,
  scheduledCount: 5,
  assignedToMe: [
    previewApprovalItem({
      id: "preview-approval-1",
      channel: "instagram",
      assignedToMe: true,
      preview: {
        milestoneTitle: "Instagram save-the-date reminder",
        scheduledFor: "2026-08-01T14:00:00.000Z",
        captionText: "Mark your calendars for Back to School Fair!",
        storyCaptionSnippet: null,
        artworkThumbnailUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
      },
    }),
    previewApprovalItem({
      id: "preview-approval-2",
      channel: "facebook",
      assignedToMe: true,
      preview: {
        milestoneTitle: "Facebook welcome post",
        scheduledFor: "2026-08-05T14:00:00.000Z",
        captionText: "We cannot wait to welcome everyone back!",
        storyCaptionSnippet: null,
        artworkThumbnailUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
      },
    }),
  ],
  otherPending: [
    previewApprovalItem({ id: "preview-pending-1", channel: "email" }),
    previewApprovalItem({ id: "preview-pending-2", channel: "newsletter" }),
    previewApprovalItem({ id: "preview-pending-3", channel: "flyer" }),
  ],
  changesRequested: [
    previewApprovalItem({
      id: "preview-change-1",
      channel: "instagram",
      communicationStatus: "changes_requested",
      status: "rejected",
      requestedAt: "2026-07-05T17:46:00.000Z",
      preview: {
        milestoneTitle: "Last call reminder for your favorite volunteer event.",
        scheduledFor: null,
        captionText: null,
        storyCaptionSnippet: null,
        artworkThumbnailUrl: null,
      },
    }),
    previewApprovalItem({
      id: "preview-change-2",
      channel: "facebook",
      communicationStatus: "changes_requested",
      status: "rejected",
      requestedAt: "2026-07-04T10:15:00.000Z",
      preview: {
        milestoneTitle: "Volunteer sign-up closing soon",
        scheduledFor: null,
        captionText: null,
        storyCaptionSnippet: null,
        artworkThumbnailUrl: null,
      },
    }),
    previewApprovalItem({
      id: "preview-change-3",
      channel: "website_announcement",
      communicationStatus: "changes_requested",
      status: "rejected",
      requestedAt: "2026-07-03T09:00:00.000Z",
      preview: {
        milestoneTitle: "Website announcement draft",
        scheduledFor: null,
        captionText: null,
        storyCaptionSnippet: null,
        artworkThumbnailUrl: null,
      },
    }),
  ],
  recentlyApproved: [
    previewApprovalItem({
      id: "preview-approved-1",
      channel: "instagram",
      status: "approved",
      communicationStatus: "approved",
      requestedAt: "2026-07-01T12:00:00.000Z",
      resolvedAt: "2026-07-06T14:27:00.000Z",
      preview: {
        milestoneTitle: "Save the date — Back to School Fair",
        scheduledFor: "2026-07-18T14:00:00.000Z",
        captionText: null,
        storyCaptionSnippet: null,
        artworkThumbnailUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
      },
    }),
    previewApprovalItem({
      id: "preview-approved-2",
      channel: "facebook",
      status: "approved",
      communicationStatus: "approved",
      requestedAt: "2026-07-01T12:00:00.000Z",
      resolvedAt: "2026-07-06T13:00:00.000Z",
      preview: {
        milestoneTitle: "Welcome table volunteer shifts",
        scheduledFor: null,
        captionText: null,
        storyCaptionSnippet: null,
        artworkThumbnailUrl: null,
      },
    }),
  ],
  timeline: [
    {
      id: "preview-timeline-1",
      eventId: previewPlanningHubEvent.id,
      activityType: "published",
      title: "Published",
      description: "Approved communications marked ready for distribution.",
      occurredAt: "2026-09-11T12:00:00.000Z",
      createdAt: "2026-09-11T12:00:00.000Z",
    },
  ],
};

export const previewSpringCarnivalHubData: EventPlaybookHubData = {
  planningProgressPercent: 62,
  taskGroups: [],
  tasks: [
    {
      id: "t1",
      eventId: "preview-event",
      title: "Confirm food truck lineup",
      status: "done",
      dueDate: "2026-06-20",
      assigneeName: PREVIEW_USER_FULL_NAME,
      assigneeInitials: "SC",
      assigneeUserId: null,
      groupId: null,
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
      assigneeName: PREVIEW_PRESIDENT_NAME,
      assigneeInitials: "MP",
      assigneeUserId: null,
      groupId: null,
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
      assigneeUserId: null,
      groupId: null,
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
      actorName: PREVIEW_USER_FULL_NAME,
      createdAt: "2026-06-10T09:30:00Z",
    },
  ],
};

export const previewSpiritAfternoonEvent: Event = {
  id: "preview-spirit-event",
  title: "Spirit Afternoon",
  description: "After-school spirit wear sale and class photo day reminders.",
  date: "2026-07-22",
  time: "15:30",
  location: "Oak Ridge Elementary cafeteria",
  audience: "Students and families",
  theme: "School Spirit",
  status: "scheduled",
  category: "Spirit",
  eventType: "spirit_night",
  communicationStrategy: "reminder_only",
  calendarImportId: null,
  eventOwner: null,
  approvalOrganizationRoleId: null,
  budget: null,
  volunteerNeeds: "2 volunteers at checkout table",
  goal: null,
  expectedAttendance: "200 students",
  planningQuickLinks: {},
  planningVendors: [],
  approvedSquareImageUrl: null,
  approvedSquareImageStatus: "open",
  createdAt: "2026-06-01T12:00:00Z",
  updatedAt: "2026-06-20T12:00:00Z",
};

export const previewBookFairEvent: Event = {
  id: "preview-book-fair",
  title: "Spring Book Fair",
  description: "Week-long Scholastic book fair in the library with family shopping night.",
  date: "2026-09-08",
  time: null,
  location: "Oak Ridge Elementary library",
  audience: "Students and families",
  theme: "Read & Explore",
  status: "scheduled",
  category: "Fundraiser",
  eventType: "book_fair",
  communicationStrategy: "full_campaign",
  calendarImportId: null,
  eventOwner: null,
  approvalOrganizationRoleId: null,
  budget: "$1,200",
  volunteerNeeds: "6 volunteers per shopping night",
  goal: "Fund new library titles",
  expectedAttendance: "500+ visits",
  planningQuickLinks: {},
  planningVendors: [],
  approvedSquareImageUrl: PREVIEW_BACK_TO_SCHOOL_ARTWORK,
  approvedSquareImageStatus: "filled",
  createdAt: "2026-06-10T12:00:00Z",
  updatedAt: "2026-06-25T12:00:00Z",
};

export const previewCampaignEvents: Event[] = [
  previewEvent,
  previewSpiritAfternoonEvent,
  previewPlanningHubEvent,
  previewBookFairEvent,
];

export function getPreviewCampaignMonthGroups(): SortedCampaignMonthGroups {
  return sortCampaignMonthGroups(
    groupEventsByMonth(previewCampaignEvents),
    PREVIEW_TODAY,
  );
}

export function getPreviewCampaignArtworkMap(): Map<
  string,
  HeroArtworkSelection | null
> {
  return new Map([
    [previewEvent.id, previewDashboardArtwork],
    [previewPlanningHubEvent.id, previewPlanningHubArtwork],
    [previewBookFairEvent.id, previewPlanningHubArtwork],
    [previewSpiritAfternoonEvent.id, null],
  ]);
}

export function getPreviewCampaignOwnershipMap(): Map<string, EventRosterOwnership> {
  return new Map([
    [
      previewEvent.id,
      {
        committeeName: PREVIEW_EVENT_TITLE,
        chairNames: [PREVIEW_USER_FULL_NAME],
        vpRoleName: PREVIEW_USER_ROLE,
        vpContactName: PREVIEW_USER_FULL_NAME,
        committeeFilled: true,
        vpFilled: true,
      },
    ],
    [previewPlanningHubEvent.id, previewPlanningHubOwnership],
    [
      previewSpiritAfternoonEvent.id,
      {
        committeeName: "Spirit Afternoon",
        chairNames: ["Michelle Park"],
        vpRoleName: "President",
        vpContactName: PREVIEW_PRESIDENT_NAME,
        committeeFilled: true,
        vpFilled: true,
      },
    ],
    [
      previewBookFairEvent.id,
      {
        committeeName: "Spring Book Fair",
        chairNames: [PREVIEW_CHAIR_REBECCA],
        vpRoleName: "VP Events",
        vpContactName: PREVIEW_VP_EVENTS,
        committeeFilled: true,
        vpFilled: true,
      },
    ],
  ]);
}

export const previewMetaScheduledEventIds = new Set([
  previewEvent.id,
  previewPlanningHubEvent.id,
]);

export const previewWeekEntries: TodayWeekEntry[] = [
  {
    id: "w0",
    date: "2026-07-02",
    title: PREVIEW_EVENT_TITLE,
    eventTitle: null,
    kind: "event",
    href: null,
  },
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
  "workflow",
  "planning-hub",
  "calendar",
  "heatmap",
  "artwork",
  "approvals",
  "publish",
];

export function featureScreenshotPath(slug: FeaturePreviewSlug): string {
  return `/images/features/${slug}.png`;
}

/** Slugs that use pre-recorded screen capture videos in the features carousel. */
export const FEATURE_VIDEO_SLUGS = [
  "calendar",
] as const satisfies readonly FeaturePreviewSlug[];

export type FeatureVideoSlug = (typeof FEATURE_VIDEO_SLUGS)[number];

export function featureVideoPath(slug: FeatureVideoSlug): string {
  return `/videos/features/${slug}.webm`;
}

export function featureVideoPosterPath(slug: FeatureVideoSlug): string {
  return featureScreenshotPath(slug);
}

export type FeatureRecordScenario =
  | "campaigns-flow"
  | "calendar-month"
  | "calendar-heatmap";

export const FEATURE_RECORD_SCENARIOS: FeatureRecordScenario[] = [
  "campaigns-flow",
  "calendar-month",
  "calendar-heatmap",
];

export const previewPostingHeatmap: PostingHeatmapData = buildStrongPreviewHeatmap();

function buildStrongPreviewHeatmap(): PostingHeatmapData {
  const scores: PostingTimeScoreGrid = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );

  for (let day = 0; day < 7; day += 1) {
    const isWeekday = day >= 1 && day <= 5;
    for (let hour = 6; hour <= 21; hour += 1) {
      let score: number;
      if (hour >= 17 && hour <= 20) {
        score = isWeekday ? 1 : 0.75;
      } else if (hour >= 11 && hour <= 16) {
        score = isWeekday ? 0.65 : 0.5;
      } else if (hour >= 7 && hour <= 10) {
        score = isWeekday ? 0.4 : 0.55;
      } else {
        score = 0.24;
      }
      scores[day]![hour] = score;
    }
  }

  return {
    timezone: "America/Chicago",
    scores,
    source: "blended",
    postCount: 42,
  };
}

function previewScheduledAt(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00-05:00`;
}

export type EnrichedPreviewCalendarItem = PlanningCalendarItem & {
  isOverdue: boolean;
  isToday: boolean;
};

export function enrichPreviewCalendarItems(
  items: PlanningCalendarItem[],
): EnrichedPreviewCalendarItem[] {
  return items.map((item) => {
    const isPublished =
      item.publishStatus === "published" || item.status === "published";
    const isOverdue = !isPublished && item.scheduledDate < PREVIEW_TODAY;

    return {
      ...item,
      isOverdue,
      isToday: item.scheduledDate === PREVIEW_TODAY,
    };
  });
}

function buildDenseWeekCalendarItems(): PlanningCalendarItem[] {
  const items: PlanningCalendarItem[] = [];

  const allDayEvents = [
    {
      id: "ad1",
      date: "2026-06-29",
      title: "Teacher Workday",
      eventTitle: "District Calendar",
    },
    {
      id: "ad2",
      date: "2026-07-01",
      title: PREVIEW_HUB_EVENT_TITLE,
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
    },
    {
      id: "ad3",
      date: "2026-07-02",
      title: "PTO Board Meeting",
      eventTitle: "PTO Board Meeting",
    },
    {
      id: "ad4",
      date: "2026-07-03",
      title: PREVIEW_EVENT_TITLE,
      eventTitle: PREVIEW_EVENT_TITLE,
    },
    {
      id: "ad5",
      date: "2026-07-04",
      title: "Independence Day — No School",
      eventTitle: "District Calendar",
    },
    {
      id: "ad6",
      date: "2026-06-30",
      title: "Spirit Afternoon",
      eventTitle: "Spirit Afternoon",
    },
  ];

  for (const entry of allDayEvents) {
    items.push(
      createPreviewPlanningItem({
        id: entry.id,
        eventId: `evt-${entry.id}`,
        eventTitle: entry.eventTitle,
        title: entry.title,
        scheduledDate: entry.date,
        sourceType: "event",
        channel: null,
        communicationType: "event",
      }),
    );
  }

  const metaPosts: Array<{
    id: string;
    date: string;
    hour: number;
    title: string;
    eventTitle: string;
    channel: "facebook" | "instagram";
    status: string;
    publishStatus: string;
  }> = [
    {
      id: "m1",
      date: "2026-06-29",
      hour: 17,
      title: "1 Week Out",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m2",
      date: "2026-06-29",
      hour: 18,
      title: "Volunteer call",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "instagram",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m3",
      date: "2026-06-30",
      hour: 12,
      title: "Save the Date",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "facebook",
      status: "published",
      publishStatus: "published",
    },
    {
      id: "m4",
      date: "2026-06-30",
      hour: 17,
      title: "Save the Date",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "instagram",
      status: "published",
      publishStatus: "published",
    },
    {
      id: "m5",
      date: "2026-07-01",
      hour: 7,
      title: "Morning reminder",
      eventTitle: "Spirit Afternoon",
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m6",
      date: "2026-07-01",
      hour: 17,
      title: "3 Days Out",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m7",
      date: "2026-07-01",
      hour: 18,
      title: "3 Days Out",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "instagram",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m8",
      date: "2026-07-02",
      hour: 11,
      title: "Day Before",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m9",
      date: "2026-07-02",
      hour: 17,
      title: "Teaser",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "instagram",
      status: "published",
      publishStatus: "published",
    },
    {
      id: "m10",
      date: "2026-07-03",
      hour: 9,
      title: "Day Of",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m11",
      date: "2026-07-03",
      hour: 17,
      title: "Weekend preview",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m12",
      date: "2026-07-04",
      hour: 10,
      title: "Holiday greeting",
      eventTitle: "Oak Ridge PTO",
      channel: "facebook",
      status: "published",
      publishStatus: "published",
    },
    {
      id: "m13",
      date: "2026-07-05",
      hour: 11,
      title: "Week ahead",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "instagram",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m14",
      date: "2026-07-05",
      hour: 18,
      title: "Sunday recap",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m15",
      date: "2026-07-01",
      hour: 12,
      title: "Lunch update",
      eventTitle: PREVIEW_HUB_EVENT_TITLE,
      channel: "instagram",
      status: "scheduled",
      publishStatus: "scheduled",
    },
    {
      id: "m16",
      date: "2026-07-02",
      hour: 18,
      title: "Day Before",
      eventTitle: PREVIEW_EVENT_TITLE,
      channel: "facebook",
      status: "scheduled",
      publishStatus: "scheduled",
    },
  ];

  for (const post of metaPosts) {
    items.push(
      createPreviewPlanningItem({
        id: post.id,
        eventId: `e-${post.id}`,
        eventTitle: post.eventTitle,
        title: post.title,
        timelineStepTitle: post.title,
        scheduledDate: post.date,
        scheduledAt: previewScheduledAt(post.date, post.hour),
        sourceType: "timeline_task",
        channel: post.channel,
        communicationType: "meta_milestone",
        status: post.status,
        publishStatus: post.publishStatus,
      }),
    );
  }

  return items;
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

function buildDenseMonthCalendarItems(): PlanningCalendarItem[] {
  const items: PlanningCalendarItem[] = [];
  const julyEvents = [
    { day: 1, title: "PTO Board Meeting", event: "PTO Board Meeting", type: "event" as const },
    { day: 1, title: "Teaser post", event: PREVIEW_EVENT_TITLE, channel: "facebook" as const, status: "published" },
    { day: 2, title: "Volunteer signup", event: PREVIEW_HUB_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 3, title: "Spirit Afternoon", event: "Spirit Afternoon", type: "event" as const },
    { day: 3, title: "Morning reminder", event: "Spirit Afternoon", channel: "facebook" as const, status: "scheduled" },
    { day: 5, title: "Save the Date", event: PREVIEW_HUB_EVENT_TITLE, channel: "facebook" as const, status: "published" },
    { day: 7, title: "1 Week Out", event: PREVIEW_HUB_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 8, title: "PTO General Meeting", event: "PTO General Meeting", type: "event" as const },
    { day: 8, title: "Meeting reminder", event: "PTO General Meeting", channel: "facebook" as const, status: "scheduled" },
    { day: 10, title: "3 Days Out", event: PREVIEW_EVENT_TITLE, channel: "facebook" as const, status: "scheduled" },
    { day: 12, title: "Volunteer call", event: PREVIEW_HUB_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 14, title: PREVIEW_EVENT_TITLE, event: PREVIEW_EVENT_TITLE, type: "event" as const },
    { day: 15, title: "3 Days Out", event: PREVIEW_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 16, title: "Day Before", event: PREVIEW_EVENT_TITLE, channel: "facebook" as const, status: "scheduled" },
    { day: 17, title: "Day Before", event: PREVIEW_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 18, title: PREVIEW_EVENT_TITLE, event: PREVIEW_EVENT_TITLE, type: "event" as const },
    { day: 18, title: "Day Of", event: PREVIEW_EVENT_TITLE, channel: "facebook" as const, status: "scheduled" },
    { day: 18, title: "Day Of", event: PREVIEW_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 20, title: "Thank-you post", event: PREVIEW_EVENT_TITLE, channel: "facebook" as const, status: "scheduled" },
    { day: 22, title: "Spirit Afternoon", event: "Spirit Afternoon", type: "event" as const },
    { day: 25, title: "Spirit Night", event: "Spirit Night", type: "event" as const },
    { day: 25, title: "Restaurant night", event: "Spirit Night", channel: "facebook" as const, status: "scheduled" },
    { day: 28, title: "August preview", event: PREVIEW_HUB_EVENT_TITLE, channel: "instagram" as const, status: "scheduled" },
    { day: 30, title: "Month wrap-up", event: "Oak Ridge PTO", channel: "facebook" as const, status: "scheduled" },
  ];

  julyEvents.forEach((entry, index) => {
    const date = `2026-07-${String(entry.day).padStart(2, "0")}`;
    const isEvent = entry.type === "event";

    items.push(
      createPreviewPlanningItem({
        id: `mo-${index + 1}`,
        eventId: isEvent ? `evt-mo-${index}` : `e-mo-${index}`,
        eventTitle: entry.event,
        title: entry.title,
        timelineStepTitle: entry.title,
        scheduledDate: date,
        sourceType: isEvent ? "event" : "timeline_task",
        channel: isEvent ? null : entry.channel,
        communicationType: isEvent ? "event" : "meta_milestone",
        status: isEvent ? "upcoming" : entry.status,
        publishStatus: isEvent ? undefined : entry.status,
      }),
    );
  });

  return items;
}

export const previewWeekCalendarItems: PlanningCalendarItem[] =
  buildDenseWeekCalendarItems();

export const previewMonthCalendarItems: PlanningCalendarItem[] =
  buildDenseMonthCalendarItems();

/** Week view fixtures (heatmap + dense week chips). */
export const previewCalendarItems: PlanningCalendarItem[] = previewWeekCalendarItems;

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
    storyManualPublish: false,
    publishMode: "feed_and_story_auto",
    publishPlatforms: { instagram: true, facebook: true },
    storyReminderSentAt: null,
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
    storyManualPublish: false,
    publishMode: "feed_and_story_auto",
    publishPlatforms: { instagram: false, facebook: false },
    storyReminderSentAt: null,
  },
];

export const previewPublishingQueue: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "q1",
    eventId: "preview-hub-event",
    eventTitle: PREVIEW_HUB_EVENT_TITLE,
    title: "Day Before",
    timelineStepTitle: "Day Before",
    scheduledDate: "2026-08-13",
    channel: "facebook",
    communicationType: "meta_milestone",
    publishStatus: "ready",
    status: "ready",
  }),
];

export const previewPublishingScheduled: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "s1",
    eventId: "preview-hub-event",
    eventTitle: PREVIEW_HUB_EVENT_TITLE,
    title: "1 Week Out",
    timelineStepTitle: "1 Week Out",
    scheduledDate: "2026-08-07",
    channel: "instagram",
    communicationType: "meta_milestone",
    publishStatus: "scheduled",
    status: "scheduled",
  }),
];

export const previewPublishingPublished: PlanningCalendarItem[] = [
  createPreviewPlanningItem({
    id: "p1",
    eventId: "preview-hub-event",
    eventTitle: PREVIEW_HUB_EVENT_TITLE,
    title: "Save the Date",
    timelineStepTitle: "Save the Date",
    scheduledDate: "2026-07-12",
    channel: "facebook",
    communicationType: "meta_milestone",
    publishStatus: "published",
    status: "published",
  }),
];
