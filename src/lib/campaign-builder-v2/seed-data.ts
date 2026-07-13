import { NO_BRAND_KIT_ID } from "./brand-kit.ts";
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
  { id: NO_BRAND_KIT_ID, name: "No brand kit" },
  { id: "ees-pto", name: "EES PTO Brand Kit" },
  { id: "district", name: "District Brand Kit" },
  { id: "custom", name: "Custom Brand Kit" },
];

/** Legacy single-select labels kept for older caption modal fallbacks. */
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
    inspirationOverallComment: "",
    brandKitId: NO_BRAND_KIT_ID,
    // Explicit None — never auto-select a tone for new campaigns.
    voiceTone: "",
    voiceToneValues: [],
    selectedLogoId: null,
    includeLogoInArtwork: false,
    uploadedLogoUrl: null,
    uploadedLogoLabel: null,
    colorMode: "none",
    customPaletteColors: [],
    // Explicit None — do not auto-apply organization colors.
    useSchoolColors: false,
    primarySchoolColor: null,
    secondarySchoolColor: null,
    // Never pre-fill AI guidance with example/demo copy — it must stay
    // empty until the user actually writes something (see Bug 3 in
    // .cursor/rules/campaign-builder-debug.mdc).
    globalAiGuidance: "",
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
      // Never bake example/demo copy into artworkNotes/captionNotes — these
      // are real form fields, not placeholders, and must stay empty until
      // the user actually writes something (see Bug 3 in
      // .cursor/rules/campaign-builder-debug.mdc).
      artworkNotes: "",
      captionNotes: "",
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
      artworkNotes: "",
      captionNotes: "",
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
      artworkNotes: "",
      captionNotes: "",
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
      artworkNotes: "",
      captionNotes: "",
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
