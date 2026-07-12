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
  "Do not use the school or organization name unless user guidance explicitly mentions it or asks for it.",
].join(" ");

export const CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES = [
  "Milestone names and purpose lines are internal scheduling labels for the AI — not headline copy.",
  "Never paste milestone names (e.g. Two-Week Reminder, Save the Date) as on-graphic text.",
  "Write short, audience-facing headline copy from the campaign moment and user direction instead.",
].join(" ");

export const CAMPAIGN_BUILDER_LOGO_RULES = [
  "When a logo image is attached, include it as a visual brand element only.",
  "Never spell out the logo label, school name, or organization name as headline or body text unless user notes explicitly request it.",
].join(" ");

export const CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES = [
  "On-graphic text must be short headline-style copy you write — not milestone labels, purpose fields, or user note dumps.",
  "Do not copy logistics, volunteer asks, or scheduling jargon onto the graphic.",
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
