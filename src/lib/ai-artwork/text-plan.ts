import type { CreativeBrief } from "@/lib/creative-director/types";
import type { VerifiedEventFacts } from "@/lib/ai-artwork/event-facts";
import type { ArtworkTextPlan } from "@/lib/ai-artwork/types";

export function buildArtworkTextPlan(input: {
  facts: VerifiedEventFacts;
  brief: CreativeBrief | null;
  assetLabel: string;
}): ArtworkTextPlan {
  const { facts, brief } = input;
  const dateTime = [facts.date, facts.time].filter(Boolean).join(" · ") || null;

  const subheadline =
    brief?.moodSummary?.trim() ||
    brief?.visualDirection?.trim()?.slice(0, 140) ||
    facts.theme ||
    (facts.description ? facts.description.slice(0, 140) : null);

  return {
    headline: facts.title,
    subheadline,
    dateTime,
    location: facts.location,
    cta: facts.cta,
    footerBranding: facts.organizationName,
  };
}

export function formatArtworkTextPlanLines(plan: ArtworkTextPlan): string[] {
  const lines: string[] = [
    `Headline: ${plan.headline}`,
  ];

  if (plan.subheadline) {
    lines.push(`Subheadline: ${plan.subheadline}`);
  }

  if (plan.dateTime) {
    lines.push(`Date/time: ${plan.dateTime}`);
  } else {
    lines.push("Date/time: not on file");
  }

  if (plan.location) {
    lines.push(`Location: ${plan.location}`);
  } else {
    lines.push("Location: not on file");
  }

  if (plan.cta) {
    lines.push(`CTA: ${plan.cta}`);
  }

  if (plan.footerBranding) {
    lines.push(`Footer/branding: ${plan.footerBranding}`);
  }

  return lines;
}

export function parseArtworkTextPlan(value: unknown): ArtworkTextPlan | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const headline = typeof record.headline === "string" ? record.headline.trim() : "";

  if (!headline) {
    return null;
  }

  return {
    headline,
    subheadline:
      typeof record.subheadline === "string" ? record.subheadline : null,
    dateTime: typeof record.dateTime === "string" ? record.dateTime : null,
    location: typeof record.location === "string" ? record.location : null,
    cta: typeof record.cta === "string" ? record.cta : null,
    footerBranding:
      typeof record.footerBranding === "string" ? record.footerBranding : null,
  };
}
