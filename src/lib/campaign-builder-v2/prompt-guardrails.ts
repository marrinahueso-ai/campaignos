/** Shared prompt rules for campaign builder artwork + caption generation. */

export const CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES = [
  "Treat user notes as creative direction and intent — interpret them into polished copy and visuals.",
  "Do not paste user notes verbatim onto the graphic or into the caption.",
  "Elevate rough notes into clear, family-friendly messaging while staying faithful to the intent.",
].join(" ");

export const CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES = [
  "Use only verified facts, user-provided direction, and content visible in attached inspiration images.",
  "Never invent times, gate hours, parking lots, balloon colors, locations, schedules, sponsors, or logistics.",
  "Sponsors, vendors, and logos that appear in attached inspiration images are verified — include those visuals.",
  "Do not use the school, PTO, organization, or campaign name as on-graphic text unless user notes explicitly request it.",
  "Never render logo labels, brand kit names, or attached logo filenames as text — use the logo artwork itself.",
].join(" ");

export const CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES = [
  "Post names and purpose lines are internal scheduling labels for the AI — not headline copy.",
  "Never paste milestone names (e.g. Two-Week Push, Two-Week Reminder, Save the Date, Day Before) as on-graphic text.",
  "Do use natural, family-facing timing when the prompt provides it — e.g. \"2 weeks away\", \"1 week away\", \"Tomorrow!\", \"Today!\".",
  "Never use internal jargon like reminder, milestone, push, or two-week reminder as a headline unless user notes explicitly request that wording.",
  "Write short, audience-facing headline copy from the campaign moment + timing guidance + user direction.",
].join(" ");

export const CAMPAIGN_BUILDER_LOGO_RULES = [
  "When a logo image is attached (brand kit or inspiration), include the visual mark in the design.",
  "Never spell out the logo label, school name, or organization name as headline or body text unless user notes explicitly request it.",
].join(" ");

export const CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES = [
  "On-graphic text must be short headline-style copy you write — not milestone labels, purpose fields, or user note dumps.",
  "Never render scheduled post dates, milestone dates, or labels like Milestone:, Post date:, or Suggested date: on the graphic.",
  "The event date may appear when it fits the design and user direction — never the internal post or milestone schedule date.",
].join(" ");

/** Common AI cliché accents founders dislike on school / PTO artwork. */
export const CAMPAIGN_BUILDER_ANTI_CLICHE_VISUAL_RULES = [
  "Do not add comic speed lines, emphasis rays, sparkle bursts, starbursts, or hash-mark accents beside headlines or words.",
  "Prefer clean typography and layout hierarchy over decorative side flourishes.",
].join(" ");

/** Social posts should not look like spreadsheets or semester calendars unless asked. */
export const CAMPAIGN_BUILDER_ANTI_TABLE_LAYOUT_RULES = [
  "Do not lay out the graphic as a spreadsheet, data table, grid of cells, comparison chart, month calendar, or checklist table unless the user explicitly asks for a table or calendar layout.",
  "Do not invent month boxes, calendar grids, or checklist tables unless the user explicitly asks for a table or calendar layout.",
  "Clustered sponsor logos, food or product photos, ribbons, and callout groups on a 1:1 poster are not tables — include them when those images are attached.",
  "Prefer a designed poster with clear hierarchy, not rows of empty cells.",
].join(" ");

/** Attached inspiration is source material to place — not mood-only clipart. */
export const CAMPAIGN_BUILDER_INSPIRATION_IMAGE_RULES = [
  "Use every attached inspiration image.",
  "If an attached image is a logo, sponsor mark, food photo, product photo, or other identifiable brand art, include that visual in the design — do not replace it with emoji, clipart, or a generic stand-in.",
  "Do not invent extra sponsors, vendors, or logos that are not in the attached images or user notes.",
].join(" ");

/** Unlocked regenerates: keep logos, do not re-invent white rounded plates. */
export const CAMPAIGN_BUILDER_ANTI_LOGO_PLATE_RULES = [
  "Do not place logos, sponsor marks, or product photos inside white rounded rectangles, cards, or plate-like boxes unless the user explicitly asks for framed tiles.",
  "Integrate those marks into the poster (edges, corners, natural clusters) instead of a row of boxed tiles.",
].join(" ");

/** When Edit Post "Keep style locked" is on — previous art is the source of truth. */
export const CAMPAIGN_BUILDER_STYLE_LOCK_RULES = [
  "Style lock is ON: the attached previous image is the source of truth.",
  "Replicate it as closely as possible — same colors, layout, composition, typography, subjects, and overall look.",
  "Apply ONLY the user's explicit change list; change nothing else.",
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
