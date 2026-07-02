import {
  buildVerifiedEventFacts,
  type VerifiedEventFacts,
} from "@/lib/ai-artwork/event-facts";
import type { ArtworkPhaseWorkflowItem } from "@/lib/artwork-v2/campaign-phases";
import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";
import type { Event } from "@/types";

const MAX_DESCRIPTION_LENGTH = 220;

function resolveFormatHint(metaPlacement: ArtworkPhaseWorkflowItem["metaPlacement"]): string {
  return metaPlacement === "story"
    ? "vertical 9:16 story format for Facebook and Instagram Stories"
    : "square 1:1 feed format for Facebook and Instagram feeds";
}

function truncateDescription(description: string): string {
  if (description.length <= MAX_DESCRIPTION_LENGTH) {
    return description;
  }

  return `${description.slice(0, MAX_DESCRIPTION_LENGTH - 1).trim()}…`;
}

export function formatArtworkEventWhen(facts: VerifiedEventFacts): string | null {
  const parts: string[] = [];
  if (facts.date) parts.push(facts.date);
  if (facts.time) parts.push(facts.time);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Compact event summary for artwork prompts — editable by volunteers before generate. */
export function buildArtworkEventDetailsBlock(input: {
  event: Event;
  organizationName?: string | null;
}): string {
  const facts = buildVerifiedEventFacts({
    event: input.event,
    organizationName: input.organizationName,
  });

  const lines: string[] = [];

  const when = formatArtworkEventWhen(facts);
  const headlineParts = [facts.title];
  if (when) headlineParts.push(when);
  if (facts.location) headlineParts.push(facts.location);
  lines.push(`Event: ${headlineParts.join(" · ")}`);

  if (facts.organizationName) {
    lines.push(`School/PTO: ${facts.organizationName}`);
  }

  if (facts.audience) {
    lines.push(`Audience: ${facts.audience}`);
  }

  if (facts.theme) {
    lines.push(`Theme: ${facts.theme}`);
  }

  if (facts.description) {
    lines.push(`About: ${truncateDescription(facts.description)}`);
  }

  return lines.join("\n");
}

export function buildDefaultArtworkPrompt(input: {
  event: Event;
  organizationName?: string | null;
  item: ArtworkWorkflowItem;
  hasInspiration?: boolean;
}): string {
  const detailsBlock = buildArtworkEventDetailsBlock({
    event: input.event,
    organizationName: input.organizationName,
  });

  const phase =
    typeof input.item.relativeDay === "number" &&
    "metaPlacement" in input.item &&
    input.item.metaPlacement
      ? (input.item as ArtworkPhaseWorkflowItem)
      : null;

  if (phase) {
    const milestoneLabel = phase.label.toLowerCase();
    const formatHint = resolveFormatHint(phase.metaPlacement);

    if (input.hasInspiration) {
      return [
        `Create a ${milestoneLabel} version of this event artwork in ${formatHint}.`,
        "",
        detailsBlock,
        "",
        "Keep the same visual style, colors, and branding as the attached inspiration. Adjust the messaging and urgency for this milestone.",
        "",
        "Include the event name and key date/time on the graphic.",
      ].join("\n");
    }

    return [
      `Create ${milestoneLabel} artwork for this school event — ${formatHint}.`,
      "",
      detailsBlock,
      "",
      "Include the event name and key date/time on the graphic. Warm, family-friendly PTO style.",
    ].join("\n");
  }

  return [
    `Create event artwork for ${input.item.label.toLowerCase()}.`,
    "",
    detailsBlock,
    "",
    "Include the event name and key date/time on the graphic.",
  ].join("\n");
}
