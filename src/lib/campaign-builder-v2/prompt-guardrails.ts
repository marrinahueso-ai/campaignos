/** Shared prompt rules for campaign builder artwork + caption generation. */

export const CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES = [
  "Treat user notes as creative direction and intent — interpret them into polished copy and visuals.",
  "Do not paste user notes verbatim onto the graphic or into the caption.",
  "Elevate rough notes into clear, family-friendly messaging while staying faithful to the intent.",
].join(" ");

export const CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES = [
  "Use only verified facts and user-provided direction.",
  "Never invent times, gate hours, parking lots, balloon colors, locations, schedules, sponsors, or logistics.",
  "Never ask for volunteers or include sign-up CTAs unless user notes explicitly request it.",
  "Do not use the school, PTO, organization, or campaign name as on-graphic text unless user notes explicitly request it.",
  "Never render logo labels, brand kit names, or attached logo filenames as text.",
].join(" ");

export const CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES = [
  "Milestone names and purpose lines are internal scheduling labels for the AI — not headline copy.",
  "Never paste milestone names (e.g. Two-Week Push, Two-Week Reminder, Save the Date, Day Before) as on-graphic text.",
  "Do use natural, family-facing timing when the prompt provides it — e.g. \"2 weeks away\", \"1 week away\", \"Tomorrow!\", \"Today!\".",
  "Never use internal jargon like reminder, milestone, push, or two-week reminder as a headline unless user notes explicitly request that wording.",
  "Write short, audience-facing headline copy from the campaign moment + timing guidance + user direction.",
].join(" ");

export const CAMPAIGN_BUILDER_LOGO_RULES = [
  "When a logo image is attached, include it as a visual brand element only.",
  "Never spell out the logo label, school name, or organization name as headline or body text unless user notes explicitly request it.",
].join(" ");

export const CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES = [
  "On-graphic text must be short headline-style copy you write — not milestone labels, purpose fields, or user note dumps.",
  "Do not copy logistics, volunteer asks, or scheduling jargon onto the graphic.",
  "Never render scheduled post dates, milestone dates, or labels like Milestone:, Post date:, or Suggested date: on the graphic.",
  "The event date may appear when it fits the design and user direction — never the internal post or milestone schedule date.",
].join(" ");

export const CAMPAIGN_BUILDER_CAPTION_ARTWORK_RULES = [
  "If artwork is attached, complement its mood and theme only.",
  "Do not import invented on-graphic text, times, locations, hashtags, or logistics from the image into the caption.",
].join(" ");

export function shouldIncludeOrganizationName(
  organizationName: string | null | undefined,
  ...textSources: Array<string | null | undefined>
): boolean {
  const name = organizationName?.trim();
  if (!name) {
    return false;
  }

  const needle = name.toLowerCase();
  return textSources.some((source) => source?.toLowerCase().includes(needle));
}
