import type { CommunicationChannel } from "@/types/event-workspace";
import type { ClosingPattern } from "@/lib/brand-voice/types";

const CLOSING_LIBRARY: ClosingPattern[] = [
  {
    id: "warm-pto-signoff",
    label: "Warm PTO sign-off",
    pattern: "Thank you for supporting our school community.\n— [PTO name]",
    channels: ["newsletter", "email"],
  },
  {
    id: "see-you-there",
    label: "See you there",
    pattern: "We hope to see you there!",
    channels: ["newsletter", "facebook", "email", "website_announcement"],
  },
  {
    id: "questions-reach-out",
    label: "Questions welcome",
    pattern: "Questions? Reach out to [PTO name] — we are happy to help.",
    channels: ["email", "newsletter", "website_announcement"],
  },
  {
    id: "share-with-friend",
    label: "Share with a friend",
    pattern: "Know someone who would enjoy this? Please share!",
    channels: ["facebook", "instagram"],
  },
  {
    id: "gratitude-close",
    label: "Gratitude close",
    pattern: "Thank you for being part of what makes our school special.",
    channels: ["newsletter", "email", "facebook", "instagram"],
  },
  {
    id: "morning-dismiss",
    label: "Morning dismiss",
    pattern: "Have a great day!",
    channels: ["morning_announcements"],
  },
  {
    id: "staff-thanks",
    label: "Staff thanks",
    pattern: "Thank you for helping us share this with families.",
    channels: ["principal_notes"],
  },
  {
    id: "volunteer-thanks",
    label: "Volunteer thanks",
    pattern: "We appreciate every helping hand.",
    channels: ["volunteer_signup", "email"],
  },
];

export function selectClosingPatterns(input: {
  channel: CommunicationChannel;
  limit?: number;
}): ClosingPattern[] {
  return CLOSING_LIBRARY.filter((pattern) => pattern.channels.includes(input.channel)).slice(
    0,
    input.limit ?? 3,
  );
}

export { CLOSING_LIBRARY };
