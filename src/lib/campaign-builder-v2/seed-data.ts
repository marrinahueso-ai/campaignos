import { defaultEnabledFormats, emptyMilestoneArtwork } from "./platform-utils.ts";
import type {
  ApprovalWorkflowStep,
  BrandKitOption,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestonePreviewContent,
  PlaybookOption,
} from "./types.ts";

export const DEFAULT_PLAYBOOK_OPTIONS: PlaybookOption[] = [
  { id: "school-6-week", name: "School Event – 6 Week Playbook" },
  { id: "fundraiser-4-week", name: "Fundraiser – 4 Week Playbook" },
  { id: "community-2-week", name: "Community Event – 2 Week Playbook" },
];

export const DEFAULT_BRAND_KIT_OPTIONS: BrandKitOption[] = [
  { id: "none", name: "No brand kit" },
  { id: "ees-pto", name: "EES PTO Brand Kit" },
  { id: "district", name: "District Brand Kit" },
  { id: "custom", name: "Custom Brand Kit" },
];

export const DEFAULT_VOICE_TONE_OPTIONS = [
  "Friendly, Exciting, Welcoming",
  "Professional, Informative",
  "Playful, Energetic",
  "Warm, Community-focused",
];

export function buildDefaultInspiration(
  eventId: string,
  eventTitle: string,
  eventDate: string,
): CampaignBuilderInspiration {
  return {
    campaignId: eventId,
    campaignName: eventTitle || "Back to School Fair",
    eventDate: eventDate || "2026-08-15",
    playbookId: "school-6-week",
    inspirationImages: [],
    brandKitId: "ees-pto",
    voiceTone: DEFAULT_VOICE_TONE_OPTIONS[0],
    selectedLogoId: null,
    includeLogoInArtwork: false,
    useSchoolColors: true,
    primarySchoolColor: null,
    secondarySchoolColor: null,
    globalAiGuidance:
      "Vintage school look. Cream background. Navy and green are our primary colors. Include playful school elements like pencils, apples, and chalkboard textures. Keep text readable and welcoming for families.",
  };
}

export function buildDefaultMilestones(eventDate: string): CampaignBuilderMilestone[] {
  const base = new Date(`${eventDate}T12:00:00`);
  const offset = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const templates: Array<Omit<CampaignBuilderMilestone, "sortOrder">> = [
    {
      id: "ms-save-the-date",
      name: "Save the Date",
      category: "awareness",
      purpose: "Announce the event and build early awareness",
      suggestedDate: offset(-42),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "Bold headline, vintage school poster style",
      captionNotes: "Warm welcome tone, include event date",
      statusTag: "complete",
    },
    {
      id: "ms-two-week",
      name: "Two-Week Push",
      category: "reminder",
      purpose: "Build excitement and drive attendance two weeks before the event",
      suggestedDate: offset(-14),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "",
      captionNotes: "",
      statusTag: "in-progress",
    },
    {
      id: "ms-one-week",
      name: "One-Week Push",
      category: "reminder",
      purpose: "Drive attendance with schedule highlights",
      suggestedDate: offset(-7),
      platforms: ["facebook", "instagram"],
      platformFormats: [
        ...defaultEnabledFormats(),
        "instagram-story-manual",
      ],
      artworkNotes: "Countdown visual, energetic layout",
      captionNotes: "List top 3 things to expect",
      statusTag: "needs-review",
    },
    {
      id: "ms-day-before",
      name: "Day Before Reminder",
      category: "reminder",
      purpose: "Final heads-up the day before the event",
      suggestedDate: offset(-1),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "",
      captionNotes: "",
      statusTag: "pending",
    },
    {
      id: "ms-event-day",
      name: "Event Day",
      category: "event-day",
      purpose: "Live updates and on-site excitement",
      suggestedDate: eventDate,
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "Live now badge, booth location",
      captionNotes: "Short, exciting live update",
      statusTag: "not-started",
    },
    {
      id: "ms-thank-you",
      name: "Thank You / Recap",
      category: "recap",
      purpose: "Share photos and celebrate event success",
      suggestedDate: offset(2),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "Photo collage style recap",
      captionNotes: "Warm gratitude tone for families",
      statusTag: "not-started",
    },
  ];

  return templates.map((milestone, index) => ({
    ...milestone,
    sortOrder: index,
  }));
}

function buildEmptyPreviewContent(
  milestone: CampaignBuilderMilestone,
): MilestonePreviewContent {
  return {
    milestoneId: milestone.id,
    status: "draft",
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: milestone.platformFormats,
    deliveryMethod: "auto-publish",
    scheduleDate: milestone.suggestedDate,
    scheduleTime: "09:00",
    emailSendDate: milestone.suggestedDate,
    emailSendTime: "09:00",
    manualEmailTo: "marrina@heyralli.com",
    approvalStatuses: [
      {
        role: "creator",
        label: "Creator",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "committee-chair",
        label: "Committee Chair",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "vp-comms",
        label: "VP Communications",
        status: "not-started",
        timestamp: null,
      },
    ],
  };
}

export function buildDefaultApprovalWorkflow(): ApprovalWorkflowStep[] {
  return [
    {
      id: "creator",
      role: "Creator",
      assigneeName: "You",
      assigneeInitials: "YO",
      status: "complete",
    },
    {
      id: "committee-chair",
      role: "Committee Chair",
      assigneeName: "Sarah M.",
      assigneeInitials: "SM",
      status: "pending",
    },
    {
      id: "vp-comms",
      role: "VP Communications",
      assigneeName: null,
      assigneeInitials: null,
      status: "empty",
    },
    {
      id: "scheduled",
      role: "Scheduled / Delivered",
      assigneeName: null,
      assigneeInitials: null,
      status: "empty",
    },
  ];
}

export function buildDefaultSession(
  eventId: string,
  eventTitle: string,
  eventDate: string,
): CampaignBuilderSession {
  const inspiration = buildDefaultInspiration(eventId, eventTitle, eventDate);
  const milestones = buildDefaultMilestones(eventDate);

  return {
    eventId,
    currentStep: "inspiration",
    inspiration,
    milestones,
    previewContents: milestones.map(buildEmptyPreviewContent),
    approvalWorkflow: buildDefaultApprovalWorkflow(),
    reviewFilter: "all",
    selectedMilestoneId: milestones[0]?.id ?? null,
    previewTab: "all",
    expandedReviewMilestoneIds: [],
  };
}

export const LOCAL_SESSION_KEY_PREFIX = "campaign-builder-v2:";

export function localSessionKey(eventId: string): string {
  return `${LOCAL_SESSION_KEY_PREFIX}${eventId}`;
}
