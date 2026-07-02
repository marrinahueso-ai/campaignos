import type {
  AudienceProfile,
  OrganizationReadingLevel,
  OrganizationVoice,
} from "@/lib/ai-strategy/types";
import type { CommunicationChannel } from "@/types/event-workspace";

const CHANNEL_AUDIENCE_NOTES: Partial<Record<CommunicationChannel, string>> = {
  principal_notes: "School staff delivering messages to students and families.",
  morning_announcements: "Students and staff hearing announcements in school.",
  volunteer_signup: "Parents and caregivers who may have limited time.",
  instagram: "Families active on social — often scanning quickly on mobile.",
  facebook: "Broader school community including grandparents and neighbors.",
};

export function resolveAudience(input: {
  eventAudience: string | null;
  organizationAudienceDefaults: string | null;
  channel: CommunicationChannel;
  organizationVoice: OrganizationVoice;
}): AudienceProfile {
  const primary =
    input.eventAudience?.trim() ||
    input.organizationAudienceDefaults?.trim() ||
    "School families and caregivers";

  const secondary =
    input.channel === "principal_notes" || input.channel === "morning_announcements"
      ? "Students and school staff"
      : input.channel === "volunteer_signup"
        ? "Existing volunteers and new helpers"
        : null;

  const addressStyle =
    input.organizationVoice.firstPersonStyle === "pto"
      ? "Use inclusive PTO language (we/our) without sounding institutional."
      : input.organizationVoice.firstPersonStyle === "school"
        ? "Speak as the school community when appropriate."
        : input.organizationVoice.firstPersonStyle === "community"
          ? "Welcoming community voice that invites everyone in."
          : "Warm first-person plural (we/our) from the organizing team.";

  const channelNote = CHANNEL_AUDIENCE_NOTES[input.channel];
  const readingLevel = input.organizationVoice.readingLevel;

  return {
    primary: channelNote ? `${primary} — ${channelNote}` : primary,
    secondary,
    readingLevel,
    addressStyle: `${addressStyle} Target reading level: ${readingLevelLabel(readingLevel)}.`,
  };
}

function readingLevelLabel(level: OrganizationReadingLevel): string {
  switch (level) {
    case "elementary_families":
      return "plain language friendly to elementary families";
    case "staff_and_families":
      return "clear language for staff and families";
    default:
      return "general family-friendly reading level";
  }
}
