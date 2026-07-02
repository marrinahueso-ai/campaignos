import type {
  ActivityType,
  CommunicationChannel,
  EventAssetType,
} from "@/types/event-workspace";

export const COMMUNICATION_CHANNELS: {
  channel: CommunicationChannel;
  label: string;
}[] = [
  { channel: "website_announcement", label: "Website Announcement" },
  { channel: "newsletter", label: "Newsletter" },
  { channel: "facebook", label: "Facebook" },
  { channel: "instagram", label: "Instagram" },
  { channel: "email", label: "Email" },
  { channel: "flyer", label: "Flyer" },
  { channel: "principal_notes", label: "Principal Notes" },
  { channel: "morning_announcements", label: "Morning Announcements" },
  { channel: "volunteer_signup", label: "Volunteer Signup" },
];

export const EVENT_ASSET_TYPES: {
  assetType: EventAssetType;
  label: string;
}[] = [
  { assetType: "hero_image", label: "Hero Image" },
  { assetType: "square_graphic", label: "Square Graphic" },
  { assetType: "instagram_story", label: "Instagram Story" },
  { assetType: "flyer", label: "Flyer" },
  { assetType: "logo", label: "Logo" },
  { assetType: "document", label: "Document" },
];

export const EVENT_ASSET_GROUPS: {
  id: string;
  label: string;
  types: EventAssetType[];
  emptyHint?: string;
}[] = [
  {
    id: "event_artwork",
    label: "Event Artwork",
    types: ["hero_image"],
  },
  {
    id: "social",
    label: "Social Graphics",
    types: ["square_graphic", "instagram_story"],
  },
  {
    id: "flyers",
    label: "Flyers",
    types: ["flyer"],
  },
  {
    id: "website",
    label: "Website / Newsletter",
    types: ["logo"],
  },
  {
    id: "photos",
    label: "Photos",
    types: [],
    emptyHint:
      "Upload JPG or PNG photos using Event Artwork or Social Graphics slots.",
  },
  {
    id: "documents",
    label: "Documents",
    types: ["document"],
  },
  {
    id: "other",
    label: "Other",
    types: [],
    emptyHint: "Additional asset types will appear here in a future sprint.",
  },
];

export const TIMELINE_STEPS: {
  activityType: ActivityType;
  title: string;
  description: string;
}[] = [
  {
    activityType: "calendar_imported",
    title: "Calendar Imported",
    description: "School calendar uploaded and scanned for event details.",
  },
  {
    activityType: "workspace_created",
    title: "Workspace Created",
    description: "Event workspace initialized with planning sections.",
  },
  {
    activityType: "communications_generated",
    title: "Communications Generated",
    description: "Draft messages prepared for each communication channel.",
  },
  {
    activityType: "board_approval",
    title: "Board Approval",
    description: "Campaign materials submitted for PTO board review.",
  },
  {
    activityType: "published",
    title: "Published",
    description: "Approved communications marked ready for distribution.",
  },
  {
    activityType: "event_completed",
    title: "Event Completed",
    description: "Event date passed and workspace archived for records.",
  },
];

export const PLACEHOLDER_COMMUNICATION_CONTENT: Record<
  CommunicationChannel,
  string
> = {
  website_announcement:
    "Join us for an unforgettable community celebration! Mark your calendars and bring the whole family for food, games, and school spirit.",
  newsletter:
    "Our upcoming event is the perfect opportunity to connect with fellow families and support our teachers. Mark your calendar for the date and location below.",
  facebook:
    "Save the date! Our PTO is hosting an event you won't want to miss. Comment below or share this post with a friend.",
  instagram:
    "Community. Connection. School spirit. Tap the link in bio for details. #PTOProud #SchoolCommunity",
  email:
    "Dear families, we are excited to invite you to our upcoming PTO event. Your participation helps us fund classroom resources and enrichment programs.",
  flyer:
    "You're invited! Join the Lincoln Elementary PTO for an evening of fun, fundraising, and fellowship. Admission is free for all families.",
  principal_notes:
    "Staff reminder: please mention the upcoming PTO event during morning announcements and encourage families to participate.",
  morning_announcements:
    "Good morning! Don't forget about our PTO event coming soon. Ask your grown-ups to check email for details.",
  volunteer_signup:
    "We are preparing for our upcoming event. Contact the PTO if you would like more information.",
};

export const DEFAULT_EVENT_CATEGORY = "PTO Event";

export const DEFAULT_EVENT_OWNER = "PTO Communications Chair";

export const DEFAULT_BUDGET = "$500 planned (placeholder)";
