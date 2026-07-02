import "server-only";

import {
  assertReadyToPostPrompt,
  resolveArtworkBrandColors,
} from "@/lib/ai-artwork/artwork-mode";
import {
  creativeDirectionPromptLines,
  getCreativeDirectionLabel,
  parseCreativeDirection,
} from "@/lib/ai-artwork/creative-direction";
import {
  isHumanDirectedArtworkGeneration,
  resolveFinalArtworkImagePrompt,
} from "@/lib/ai-artwork/generation-mode";
import { isApparelOrProductInspiration } from "@/lib/ai-artwork/inspiration";
import type { ArtworkMode, BuildArtworkPromptInput } from "@/lib/ai-artwork/types";
import { styleMemoryToBriefHint } from "@/lib/creative-director/style-memory";
import { IMAGE_SIZE_PRESETS } from "@/lib/ai-artwork/constants";

function buildHumanDirectedArtworkPrompt(input: BuildArtworkPromptInput): string {
  return resolveFinalArtworkImagePrompt(input.customPrompt);
}

export function buildArtworkGenerationPrompt(input: BuildArtworkPromptInput): string {
  if (isHumanDirectedArtworkGeneration()) {
    return buildHumanDirectedArtworkPrompt(input);
  }
  return buildAutomaticCreativeDirectorPrompt(input);
}

export { buildHumanDirectedArtworkPrompt };

function modeSection(mode: ArtworkMode): string[] {
  switch (mode) {
    case "ready_to_post":
      return [
        "Output Mode: Ready-to-Post",
        "Create a complete ready-to-post graphic.",
        "Include short readable text only from the verified Artwork Text Plan.",
        "Use the event title and short date/time only.",
        "Do not invent additional words.",
      ];
    case "background_only":
      return [
        "Output Mode: Background Only",
        "Create background artwork only — no readable text in the image.",
        "Reserve clean blank areas for headline, date/time, and event details to be added as overlays later.",
      ];
    case "text_safe_layout":
      return [
        "Output Mode: Text-Safe Layout",
        "Create campaign artwork with intentional text-safe layout zones.",
        "Do not render readable text — leave clear regions where editable copy will be added later.",
      ];
  }
}

function inspirationSection(input: BuildArtworkPromptInput): string[] {
  const { inspiration, styleMemory, settings } = input;
  const strength = settings.inspirationStrength ?? "strong";
  const lines: string[] = ["Reference Artwork & Inspiration"];

  if (inspiration) {
    if (strength === "strong") {
      lines.push(
        "This selected inspiration is the primary creative direction. Match the subject, layout, product focus, color feel, and composition closely without copying exact logos or protected artwork.",
      );
    }
    if (inspiration.usageMode === "image_reference") {
      lines.push(
        `Primary reference: "${inspiration.asset.eventTitle}" — ${inspiration.asset.filename ?? inspiration.asset.assetType}.`,
        "A reference image is attached. Create something original inspired by its style, subject, and layout.",
      );
    } else {
      lines.push(
        `Visual direction from "${inspiration.asset.eventTitle}": ${inspiration.profile.summary}`,
        "Create something original inspired by this style and subject.",
      );
    }

    if (isApparelOrProductInspiration(inspiration.asset)) {
      lines.push(
        "Subject: apparel and merchandise — shirts, hoodies, or spirit-store products.",
        "Style: product display, promotional mockup, clean retail/spirit-store layout.",
      );
    }
  }

  if (input.supportInspirations?.length) {
    lines.push(
      "Additional approved school references (style guidance only):",
      ...input.supportInspirations.map(
        (entry) => `- "${entry.eventTitle}": ${entry.summary}`,
      ),
    );
  }

  if (!inspiration && styleMemory.length > 0) {
    lines.push(
      "Use previous approved campaign artwork and brand style.",
      ...styleMemory.slice(0, 3).map(styleMemoryToBriefHint),
    );
  }

  if (!inspiration && styleMemory.length === 0 && !input.supportInspirations?.length) {
    lines.push("Use school brand style — warm, modern, and shareable.");
  }

  return lines;
}

function verifiedEventTextSection(input: BuildArtworkPromptInput): string[] {
  const { eventFacts, eventType, textPlan, settings } = input;
  const palette = resolveArtworkBrandColors({
    brandColors: input.brandColors,
    briefPalette: input.brief?.colorPalette ?? [],
  });

  const lines: string[] = [
    "Campaign Context",
    `Campaign: ${eventFacts.title}`,
    `Purpose: ${eventFacts.description ?? input.brief?.moodSummary ?? "School community event"}`,
    `Audience: ${eventFacts.audience ?? "Parents and school community"}`,
    `Platform: ${input.assetLabel}`,
    `School: ${eventFacts.organizationName ?? "Elementary school PTO"}`,
    `Brand Colors: ${palette.join(", ")}`,
  ];

  if (eventFacts.date) lines.push(`Date: ${eventFacts.date}`);
  if (eventFacts.time) lines.push(`Time: ${eventFacts.time}`);
  if (eventFacts.location) lines.push(`Location: ${eventFacts.location}`);
  if (eventType) lines.push(`Campaign Type: ${eventType.replace(/_/g, " ")}`);
  if (eventFacts.theme) lines.push(`Theme: ${eventFacts.theme}`);

  if (settings.artworkMode === "ready_to_post") {
    lines.push("");
    lines.push("Artwork Text Plan (render in image — title and date/time only)");
    lines.push(`Title: ${textPlan.headline}`);
    if (textPlan.dateTime) {
      lines.push(`Date/time: ${textPlan.dateTime}`);
    }
  }

  return lines;
}

function artDirectionSection(input: BuildArtworkPromptInput): string[] {
  const direction = parseCreativeDirection(input.settings.creativeDirection);
  const { brief, settings } = input;
  const sizeHint =
    IMAGE_SIZE_PRESETS.find((entry) => entry.id === settings.imageSizePreset)?.promptHint ??
    "Balanced campaign graphic layout.";

  const lines: string[] = [
    "Art Direction",
    ...creativeDirectionPromptLines(direction),
    `Selected style preset: ${getCreativeDirectionLabel(direction)}.`,
  ];

  lines.push("");
  lines.push("Design Hierarchy");
  lines.push(
    "1. Event title — largest, most legible element.",
    "2. Supporting date/time or key detail — secondary weight.",
    "3. Hero artwork or photo — supports the message without overpowering text.",
    "4. School/PTO branding — subtle, consistent placement.",
  );

  lines.push("");
  lines.push("Typography");
  if (brief?.typographySuggestions) {
    lines.push(brief.typographySuggestions);
  } else {
    lines.push(
      "Friendly, confident sans-serif headline with clean readable subtext.",
      "Consistent type scale — no more than two type treatments.",
    );
  }

  lines.push("");
  lines.push("Composition");
  if (brief?.graphicStyle) {
    lines.push(brief.graphicStyle);
  } else if (brief?.visualDirection) {
    lines.push(brief.visualDirection);
  } else {
    lines.push(
      "Modern elementary school PTO graphic — warm, playful, premium, and highly shareable.",
    );
  }
  if (brief?.textureBackgroundSuggestions) {
    lines.push(`Background: ${brief.textureBackgroundSuggestions}`);
  }

  lines.push("");
  lines.push("Layout");
  lines.push(`Format: ${input.assetLabel}. ${sizeHint}`);
  lines.push("Clear focal point, balanced margins, platform-appropriate safe zones.");

  lines.push("");
  lines.push("Visual Mood");
  if (brief?.moodSummary) {
    lines.push(`Mood: ${brief.moodSummary}`);
  }
  if (brief?.personality.length) {
    lines.push(`Personality: ${brief.personality.join(", ")}.`);
  }

  lines.push("");
  lines.push("Brand Consistency");
  lines.push(
    "Use the school brand colors as the primary palette — do not introduce off-brand neons or unrelated color schemes.",
  );
  if (brief?.consistencyRules.length) {
    lines.push(...brief.consistencyRules.slice(0, 3));
  }

  if (settings.style.trim()) {
    lines.push(settings.style.trim());
  }

  lines.push("");
  lines.push(
    "Professional Quality",
    "Polished school communication artwork — flyer/social quality a PTO would proudly share.",
    "Looks designed by one consistent in-house designer, not random AI output.",
    "Crisp edges, intentional spacing, cohesive color system, no visual clutter.",
  );
  lines.push("Return only the finished artwork.");

  return lines;
}

function avoidListSection(input: BuildArtworkPromptInput): string[] {
  const lines: string[] = ["Negative Prompts — Avoid"];
  const avoid: string[] = [
    "Generic AI clip art or cartoon sticker packs",
    "Random floating objects, unrelated icons, or decorative junk",
    "Inconsistent typography — mixed fonts, warped letterforms, illegible text",
    "Stock-photo layouts, corporate brochure templates, or Canva-default looks",
    "Busy backgrounds that compete with the headline",
    "Mismatched illustration styles within one graphic",
    "Watermarks, lorem ipsum, placeholder text, or invented event details",
  ];

  if (input.inspiration && isApparelOrProductInspiration(input.inspiration.asset)) {
    avoid.push(
      "generic students standing together",
      "school family group scenes",
      "random clipart",
      "unrelated school scenes",
      "generic campaign art that ignores the merchandise/product focus",
    );
  }

  if (input.inspiration?.profile.avoidList) {
    avoid.push(input.inspiration.profile.avoidList);
  }

  if (input.brief?.doNotUse.length) {
    avoid.push(...input.brief.doNotUse);
  }

  if (input.settings.negativeInstructions.trim()) {
    avoid.push(input.settings.negativeInstructions.trim());
  }

  lines.push(avoid.join("; "));
  return lines;
}

function conceptVariationLine(index: number): string | null {
  if (!index || index <= 1) {
    return null;
  }
  return `Concept ${index}: explore a distinct creative direction while staying on brief and brand.`;
}

function buildAutomaticCreativeDirectorPrompt(input: BuildArtworkPromptInput): string {
  const { settings, customPrompt, variationType, conceptIndex } = input;
  const mode = settings.artworkMode ?? "ready_to_post";
  const strength = settings.inspirationStrength ?? "strong";
  const sections: string[][] = [];

  if (input.inspiration && strength === "strong") {
    sections.push(inspirationSection(input));
  }

  sections.push(modeSection(mode));

  if (!input.inspiration || strength !== "strong") {
    sections.push(inspirationSection(input));
  }

  sections.push(verifiedEventTextSection(input));
  sections.push(artDirectionSection(input));
  sections.push(avoidListSection(input));

  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...section);
  }

  const variationLine = conceptVariationLine(conceptIndex ?? 0);
  if (variationLine) {
    lines.push("");
    lines.push(variationLine);
  }

  if (variationType) {
    lines.push("");
    lines.push(`Variation: ${variationType}`);
  }

  const extra = [customPrompt?.trim(), settings.additionalInstructions.trim()].filter(Boolean);
  if (extra.length > 0) {
    lines.push("");
    lines.push("Additional direction:");
    lines.push(extra.join("\n"));
  }

  const prompt = lines.join("\n");
  assertReadyToPostPrompt(mode, prompt);
  return prompt;
}
