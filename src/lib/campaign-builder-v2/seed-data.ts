import { defaultEnabledFormats, emptyMilestoneArtwork } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  ApprovalWorkflowStep,
  BrandKitOption,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestonePreviewContent,
  PlaybookOption,
} from "@/lib/campaign-builder-v2/types";

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
      name: "Two-Week Reminder",
      category: "reminder",
      purpose: "Remind families with key details and volunteer sign-up",
      suggestedDate: offset(-14),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "Highlight volunteer CTA",
      captionNotes: "Mention volunteer sign-up link",
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
      purpose: "Last-minute reminder with parking and arrival tips",
      suggestedDate: offset(-1),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "Parking map or arrival tips visual",
      captionNotes: "Include gate time and parking details",
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
      purpose: "Share photos, thank volunteers, and celebrate success",
      suggestedDate: offset(2),
      platforms: ["facebook", "instagram"],
      platformFormats: defaultEnabledFormats(),
      artworkNotes: "Photo collage style recap",
      captionNotes: "Thank volunteers and families",
      statusTag: "not-started",
    },
  ];

  return templates.map((milestone, index) => ({
    ...milestone,
    sortOrder: index,
  }));
}

function buildPreviewContent(
  milestone: CampaignBuilderMilestone,
  index: number,
): MilestonePreviewContent {
  const statuses: MilestonePreviewContent["status"][] = [
    "ready",
    "needs-review",
    "ready",
    "needs-review",
    "draft",
    "ready",
  ];

  const captions: Record<string, { facebook: string; instagram: string }> = {
    "ms-save-the-date": {
      facebook:
        "Mark your calendars! Our Back to School Fair is coming up on August 15. Join us for food, fun, and community connection. See you there!",
      instagram:
        "Save the date! Back to School Fair — Aug 15. Food, fun & community. Link in bio for details.",
    },
    "ms-two-week": {
      facebook:
        "Two weeks until our Back to School Fair! Volunteer spots are open — sign up today and help make this event amazing for our families.",
      instagram:
        "2 weeks to go! Back to School Fair needs YOU. Volunteer link in bio.",
    },
    "ms-one-week": {
      facebook:
        "One week away! Here's what to expect: welcome stations, classroom visits, PTO info booth, and treats for the kids. August 15 — don't miss it!",
      instagram:
        "1 week countdown! Welcome stations, treats & PTO info. Aug 15.",
    },
    "ms-day-before": {
      facebook:
        "Tomorrow is the day! Gates open at 5:30 PM. Parking is in the south lot — look for the green balloons. See you soon!",
      instagram:
        "TOMORROW! 5:30 PM. South lot parking. Green balloons = you found us.",
    },
    "ms-event-day": {
      facebook:
        "We're LIVE at the Back to School Fair! Stop by the PTO booth for your welcome packet and say hi to our volunteers.",
      instagram:
        "We're here! Back to School Fair is happening NOW. Come say hi!",
    },
    "ms-thank-you": {
      facebook:
        "What a wonderful Back to School Fair! Thank you to every volunteer and family who made it special. Swipe through for highlights from the night.",
      instagram:
        "Thank you, EES families! Back to School Fair recap — swipe for the best moments.",
    },
  };

  const text = captions[milestone.id] ?? {
    facebook: `Facebook caption for ${milestone.name}`,
    instagram: `Instagram caption for ${milestone.name}`,
  };

  const deliveryMethods: MilestonePreviewContent["deliveryMethod"][] = [
    "auto-publish",
    "schedule",
    "manual-email",
    "auto-publish",
    "draft-only",
    "schedule",
  ];

  const scheduleTime = index % 2 === 0 ? "09:00" : "17:30";
  const deliveryMethod = deliveryMethods[index] ?? "auto-publish";

  const approvalStatuses: MilestonePreviewContent["approvalStatuses"] = [
    {
      role: "creator",
      label: "Creator",
      status: index === 2 ? "approved" : index < 2 ? "approved" : "not-started",
      timestamp:
        index <= 2 ? "2026-05-15T10:12:00" : null,
    },
    {
      role: "committee-chair",
      label: "Committee Chair",
      status: index === 2 ? "pending" : "not-started",
      timestamp: null,
    },
    {
      role: "vp-comms",
      label: "VP Communications",
      status: "not-started",
      timestamp: null,
    },
  ];

  return {
    milestoneId: milestone.id,
    status: statuses[index] ?? "draft",
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: text.facebook },
      { platform: "instagram", text: text.instagram },
    ],
    enabledFormats: milestone.platformFormats,
    deliveryMethod,
    scheduleDate: milestone.suggestedDate,
    scheduleTime,
    emailSendDate: milestone.suggestedDate,
    emailSendTime: scheduleTime,
    manualEmailTo: "marrina@heyralli.com",
    approvalStatuses,
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
    previewContents: milestones.map(buildPreviewContent),
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
