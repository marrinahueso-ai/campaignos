import type { CommunicationChannel } from "@/types/event-workspace";
import type { OpeningPattern } from "@/lib/brand-voice/types";

const OPENING_LIBRARY: OpeningPattern[] = [
  {
    id: "countdown",
    label: "Countdown energy",
    pattern: "The countdown is on — [paint the moment]… [event] is [timing phrase].",
    channels: ["facebook", "instagram", "newsletter", "email"],
  },
  {
    id: "almost-here",
    label: "Almost here",
    pattern: "It's almost here! [Sensory detail about the event].",
    channels: ["facebook", "instagram", "morning_announcements"],
  },
  {
    id: "today-energy",
    label: "Today energy",
    pattern: "Today's the day! [Vivid scene] — [event] [location/time phrase].",
    channels: ["facebook", "instagram", "morning_announcements"],
  },
  {
    id: "one-week",
    label: "One week out",
    pattern: "One week to go… [What makes this special].",
    channels: ["newsletter", "email", "facebook"],
  },
  {
    id: "so-excited",
    label: "Genuine excitement",
    pattern: "We're so excited — [meaningful detail about the event/community].",
    channels: ["newsletter", "email", "facebook"],
  },
  {
    id: "tradition-returns",
    label: "Beloved tradition",
    pattern: "One of our favorite traditions returns — [why families love it].",
    channels: ["newsletter", "email", "website_announcement", "facebook"],
  },
  {
    id: "school-pride",
    label: "School pride",
    pattern: "Grab your favorite [school spirit item] — [event] is [timing phrase].",
    channels: ["facebook", "instagram", "newsletter"],
  },
  {
    id: "halls-louder",
    label: "Campus energy",
    pattern: "Our halls are about to get a lot louder — [event] means [warm detail].",
    channels: ["morning_announcements", "facebook", "newsletter"],
  },
  {
    id: "ready-for-fun",
    label: "Ready for fun",
    pattern: "Ready for some fun? [Paint the scene before logistics].",
    channels: ["facebook", "instagram", "email"],
  },
  {
    id: "back-to-school",
    label: "Back to school warmth",
    pattern: "School is almost back! [Reconnecting, belonging, or excitement detail].",
    channels: ["newsletter", "email", "website_announcement", "facebook"],
  },
  {
    id: "gratitude-open",
    label: "Gratitude opening",
    pattern: "Thank you for making our school amazing — [specific impact from the event].",
    channels: ["newsletter", "email", "facebook", "instagram"],
  },
  {
    id: "morning-greeting",
    label: "Morning greeting",
    pattern: "Good morning! [One vivid line about today's event].",
    channels: ["morning_announcements"],
  },
  {
    id: "staff-brief",
    label: "Staff brief",
    pattern: "For staff: [event] [date] — [one line families should hear].",
    channels: ["principal_notes"],
  },
  {
    id: "instagram-hook",
    label: "Instagram hook",
    pattern: "[Event feeling in 3–5 words] · [date]",
    channels: ["instagram"],
  },
  {
    id: "website-story",
    label: "Website story lead",
    pattern: "[Warm scene or why this matters] — [event name] is [date][location phrase].",
    channels: ["website_announcement"],
  },
  {
    id: "volunteer-purpose",
    label: "Volunteer purpose",
    pattern: "[Impact on students/teachers first] — [verified volunteer need if on file].",
    channels: ["volunteer_signup", "email"],
  },
];

function isNonEmptyDraftPreview(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function selectOpeningPatterns(input: {
  channel: CommunicationChannel;
  avoidHints?: Array<string | null | undefined>;
  limit?: number;
}): OpeningPattern[] {
  const { channel, avoidHints = [], limit = 4 } = input;
  const normalizedAvoid = avoidHints
    .filter(isNonEmptyDraftPreview)
    .map(normalizeOpeningHint);

  return OPENING_LIBRARY.filter((pattern) => pattern.channels.includes(channel))
    .filter((pattern) => {
      const normalized = normalizeOpeningHint(pattern.pattern);
      return !normalizedAvoid.some(
        (avoid) => avoid.length > 12 && (normalized.includes(avoid) || avoid.includes(normalized)),
      );
    })
    .slice(0, limit);
}

export function extractOpeningHintsFromDrafts(
  draftPreviews: Array<string | null | undefined>,
): string[] {
  return draftPreviews
    .filter(isNonEmptyDraftPreview)
    .map((preview) => preview.split(/[\n.!?]/)[0]?.trim() ?? "")
    .filter((line) => line.length > 10)
    .slice(0, 8);
}

function normalizeOpeningHint(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

export { OPENING_LIBRARY };
