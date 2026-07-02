import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventAssetType } from "@/types/event-workspace";
import type { PlanningItemType } from "@/types/communications-calendar";

/** Warm studio palette — no cold blue/purple channel chips. */
export const CHANNEL_COLORS: Record<
  CommunicationChannel,
  { bg: string; border: string; text: string; dot: string }
> = {
  website_announcement: {
    bg: "bg-cos-accent-soft",
    border: "border-cos-border",
    text: "text-cos-text",
    dot: "bg-cos-accent",
  },
  newsletter: {
    bg: "bg-cos-warning",
    border: "border-cos-border",
    text: "text-cos-warning-text",
    dot: "bg-cos-accent",
  },
  facebook: {
    bg: "bg-cos-bg-alt",
    border: "border-cos-border",
    text: "text-cos-text",
    dot: "bg-cos-primary",
  },
  instagram: {
    bg: "bg-cos-accent-soft",
    border: "border-cos-border",
    text: "text-cos-text",
    dot: "bg-cos-accent",
  },
  email: {
    bg: "bg-cos-bg-alt",
    border: "border-cos-border",
    text: "text-cos-text",
    dot: "bg-cos-primary",
  },
  flyer: {
    bg: "bg-cos-warning",
    border: "border-cos-border",
    text: "text-cos-warning-text",
    dot: "bg-cos-accent",
  },
  principal_notes: {
    bg: "bg-cos-bg-alt",
    border: "border-cos-border",
    text: "text-cos-text",
    dot: "bg-cos-muted",
  },
  morning_announcements: {
    bg: "bg-cos-warning",
    border: "border-cos-border",
    text: "text-cos-warning-text",
    dot: "bg-cos-accent",
  },
  volunteer_signup: {
    bg: "bg-cos-success-bg",
    border: "border-cos-border",
    text: "text-cos-success-text",
    dot: "bg-cos-success",
  },
};

export const ITEM_TYPE_LABELS: Record<PlanningItemType, string> = {
  event: "PTO Event",
  timeline_task: "Timeline Task",
  draft: "Draft",
  artwork: "Artwork",
  approval: "Approval",
  scheduled_post: "Scheduled Post",
  meta_milestone: "Meta Post",
};

export const ASSET_TYPE_LABELS: Record<EventAssetType, string> = {
  hero_image: "Hero Image",
  square_graphic: "Square Graphic",
  instagram_graphic: "Instagram Graphic",
  instagram_story: "Instagram Story",
  facebook_graphic: "Facebook Graphic",
  newsletter_banner: "Newsletter Banner",
  email_header: "Email Header",
  flyer: "Flyer Artwork",
  pdf: "PDF",
  canva_link: "Canva Link",
  logo_used: "Logo Used",
  miscellaneous: "Miscellaneous",
  logo: "Logo Asset",
  document: "Document",
};

export const ASSET_CHANNEL_MAP: Partial<Record<EventAssetType, CommunicationChannel>> = {
  flyer: "flyer",
  instagram_story: "instagram",
  square_graphic: "instagram",
  hero_image: "website_announcement",
};

export const PLANNING_CHANNELS: CommunicationChannel[] = [
  "website_announcement",
  "newsletter",
  "facebook",
  "instagram",
  "email",
  "flyer",
  "principal_notes",
  "morning_announcements",
  "volunteer_signup",
];

export const DEFAULT_FILTERS = {
  eventId: null,
  channel: "all" as const,
  status: "all" as const,
  assignedUser: "all" as const,
  communicationType: "all" as const,
};

export function getChannelStyles(channel: CommunicationChannel | null) {
  if (!channel) {
    return {
      bg: "bg-cos-bg",
      border: "border-cos-border",
      text: "text-cos-muted",
      dot: "bg-cos-muted",
    };
  }
  return CHANNEL_COLORS[channel];
}
