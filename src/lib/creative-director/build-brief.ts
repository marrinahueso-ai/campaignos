import type { CreativeBrief, CreativeDirectorContext, StyleMemoryEntry } from "@/lib/creative-director/types";

function inferEventMood(input: {
  eventType: string | null;
  theme: string | null;
  title: string;
  description: string;
}): string[] {
  const combined = `${input.title} ${input.theme ?? ""} ${input.eventType ?? ""} ${input.description}`
    .toLowerCase()
    .trim();

  if (/festival|fair|carnival|boo.?hoo|yahoo/.test(combined)) {
    return ["Festive", "Community", "Welcoming"];
  }
  if (/concert|performance|music|winter/.test(combined)) {
    return ["Celebratory", "Community", "Proud"];
  }
  if (/run|walk|athletic|sport|pe/.test(combined)) {
    return ["Energetic", "Active", "School Spirit"];
  }
  if (/fundrais|donut|breakfast|food|bake/.test(combined)) {
    return ["Warm", "Community", "Inviting"];
  }
  if (/book|read|library/.test(combined)) {
    return ["Curious", "Warm", "Family-friendly"];
  }
  if (/teacher|staff|appreciation|volunteer/.test(combined)) {
    return ["Grateful", "Heartfelt", "Community"];
  }
  if (/spirit|night|store|apparel/.test(combined)) {
    return ["Proud", "Energetic", "School Spirit"];
  }
  if (/playdate|social|family/.test(combined)) {
    return ["Friendly", "Community", "Welcoming"];
  }

  return ["Energetic", "Community", "School Spirit"];
}

function inferVisualStyle(theme: string | null, eventType: string | null): string {
  const combined = `${theme ?? ""} ${eventType ?? ""}`.toLowerCase();
  if (combined.includes("carnival") || combined.includes("fair")) {
    return "Hand illustrated, paper-cut feel, bright event colors";
  }
  if (combined.includes("fundrais")) {
    return "Clean and trustworthy with bold headline space";
  }
  if (combined.includes("appreciation") || combined.includes("teacher")) {
    return "Warm, heartfelt, soft illustration or photography";
  }
  return "Friendly school-community style with clear hierarchy";
}

function buildColorPalette(
  brandColors: string[],
  theme: string | null,
): string[] {
  const palette = [...brandColors];
  if (theme?.trim()) {
    palette.push(`Theme accent inspired by: ${theme.trim()}`);
  }
  if (palette.length === 0) {
    palette.push("Use organization brand colors when available");
  }
  return palette;
}

function buildDoNotUse(organizationVoice: string | null): string[] {
  const base = ["Dark backgrounds", "Corporate stock photos", "Generic clip art"];
  if (organizationVoice?.toLowerCase().includes("formal")) {
    base.push("Overly casual doodle styles");
  }
  return base;
}

function referencePriorStyle(styleMemory: StyleMemoryEntry[]): string | null {
  const latest = styleMemory[0];
  if (!latest) return null;
  return `Reference approved style from ${latest.eventTitle} (${latest.style.style})`;
}

export function buildCreativeBriefFromContext(
  context: CreativeDirectorContext,
): CreativeBrief {
  const { event, brandColors, organizationVoice, styleMemory } = context;
  const toneFromTheme = event.theme?.trim() ? [event.theme.trim()] : [];
  const emotionalTone = [
    ...new Set([
      ...inferEventMood({
        eventType: event.eventType,
        theme: event.theme,
        title: event.title,
        description: event.description,
      }),
      ...toneFromTheme,
    ]),
  ].slice(0, 5);

  const priorStyleNote = referencePriorStyle(styleMemory);
  const consistencyRules = [
    "Use the same illustration or photo style across every asset",
    "Keep school name and event title placement consistent",
    "Match typography hierarchy on flyer, social, and web banner",
  ];
  if (priorStyleNote) {
    consistencyRules.unshift(priorStyleNote);
  }

  const visualStyle = inferVisualStyle(event.theme, event.eventType);
  const usesPhoto =
    visualStyle.toLowerCase().includes("photography") ||
    event.category?.toLowerCase().includes("photo");

  return {
    campaignTitle: event.title,
    personality: emotionalTone.slice(0, 3),
    emotionalTone,
    visualDirection: event.description.trim()
      ? `Support the event brief: ${event.description.trim().slice(0, 280)}${event.description.length > 280 ? "…" : ""}`
      : visualStyle,
    typographySuggestions: usesPhoto
      ? "Bold friendly headers with clean readable body text"
      : "Rounded friendly headers with clean readable body text",
    illustrationVsPhotography: usesPhoto ? "mixed" : "illustrated",
    colorPalette: buildColorPalette(brandColors, event.theme),
    iconRecommendations: [
      "Simple line icons matching illustration style",
      "Avoid overly detailed icon sets",
    ],
    graphicStyle: visualStyle,
    textureBackgroundSuggestions: usesPhoto
      ? "Light neutral backgrounds with subtle texture"
      : "Soft paper or cut-paper texture backgrounds",
    consistencyRules,
    doNotUse: buildDoNotUse(organizationVoice),
    moodSummary: emotionalTone.slice(0, 3).join(" · "),
  };
}

export function emptyCreativeBrief(campaignTitle: string): CreativeBrief {
  return {
    campaignTitle,
    personality: [],
    emotionalTone: [],
    visualDirection: "",
    typographySuggestions: "",
    illustrationVsPhotography: "illustrated",
    colorPalette: [],
    iconRecommendations: [],
    graphicStyle: "",
    textureBackgroundSuggestions: "",
    consistencyRules: [],
    doNotUse: [],
    moodSummary: "",
  };
}

export function mergeCreativeBrief(
  base: CreativeBrief,
  patch: Partial<CreativeBrief>,
): CreativeBrief {
  return {
    ...base,
    ...patch,
    personality: patch.personality ?? base.personality,
    emotionalTone: patch.emotionalTone ?? base.emotionalTone,
    colorPalette: patch.colorPalette ?? base.colorPalette,
    iconRecommendations: patch.iconRecommendations ?? base.iconRecommendations,
    consistencyRules: patch.consistencyRules ?? base.consistencyRules,
    doNotUse: patch.doNotUse ?? base.doNotUse,
  };
}
