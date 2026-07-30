import type { FlyerComposerGenerateInput } from "@/lib/flyer-composer/types";

export const FLYER_COMPOSER_SLOTS_MAX_TOKENS = 2200;

const SLOT_KEYS = [
  "orgName",
  "headline",
  "schoolYear",
  "location",
  "directions",
  "datesEvents",
  "bodyCopy",
  "donationTiers",
  "ctaLabel",
  "ctaUrl",
  "qrUrl",
  "qrCaption",
  "footerLine",
] as const;

export type FlyerSlotJsonKey = (typeof SLOT_KEYS)[number];

const SLOT_SECTIONS: {
  section: string;
  keys: (keyof typeof SLOT_LABELS)[];
}[] = [
  {
    section: "Core identity",
    keys: ["orgName", "headline", "schoolYear"],
  },
  {
    section: "When & where",
    keys: ["location", "directions", "datesEvents"],
  },
  {
    section: "Body",
    keys: ["bodyCopy"],
  },
  {
    section: "CTA & QR",
    keys: ["ctaLabel", "ctaUrl", "qrUrl", "qrCaption"],
  },
  {
    section: "Footer",
    keys: ["footerLine"],
  },
  {
    section: "Donation tiers (optional)",
    keys: ["donationTiers"],
  },
  {
    section: "Last year / change notes",
    keys: ["lastYearNotes"],
  },
];

const SLOT_LABELS: Record<FlyerSlotJsonKey | "lastYearNotes", string> = {
  orgName: "Organization",
  headline: "Headline / title",
  schoolYear: "School year",
  location: "Location",
  directions: "Directions",
  datesEvents: "Dates & events",
  bodyCopy: "Body copy",
  donationTiers: "Donation tiers",
  ctaLabel: "CTA label",
  ctaUrl: "CTA URL",
  qrUrl: "QR URL",
  qrCaption: "QR caption",
  footerLine: "Footer",
  lastYearNotes: "Last year notes / change directions",
};

export function buildFlyerComposerSlotsSystemPrompt(): string {
  return [
    "You fill text slots for a print flyer inside a fixed, template-locked layout.",
    "The volunteer chose a start path, template, brand kit settings, and inspiration fields — treat ALL of that as direction.",
    "You NEVER invent a new design, layout, colors, hero photo, or extra sections.",
    "Return ONLY valid JSON — no markdown fences, commentary, or preamble.",
    "Update slot text, dates, URLs, and QR direction only; polish and complete copy where the inputs support it.",
    "Do NOT invent dates, locations, prices, URLs, or contact details that are not supported by the inputs.",
    "Preserve existing URLs and QR targets unless the directions explicitly ask to change them.",
    "Keep headlines concise and parent-facing; body copy should be scannable.",
    "For datesEvents and donationTiers, use newline-separated lines when multiple items apply.",
    "For the Semester at a Glance template, datesEvents is the primary calendar list — preserve every date/event line from inspiration (Aug–Dec rows). Never move calendar lines into bodyCopy.",
  ].join(" ");
}

function formatSlotSection(
  section: string,
  fields: Partial<Record<FlyerSlotJsonKey | "lastYearNotes", string>>,
): string {
  const lines = [`${section}`];
  for (const key of SLOT_SECTIONS.find((s) => s.section === section)?.keys ??
    []) {
    const value = (fields[key] ?? "").trim();
    lines.push(`- ${SLOT_LABELS[key]}: ${value || "(empty)"}`);
  }
  return lines.join("\n");
}

function formatAllSlotSections(
  fields: Partial<Record<FlyerSlotJsonKey | "lastYearNotes", string>>,
): string {
  return SLOT_SECTIONS.map((s) => formatSlotSection(s.section, fields)).join(
    "\n\n",
  );
}

function formatStartBlock(input: FlyerComposerGenerateInput): string {
  const { start, template } = input;
  const lines = [
    "START",
    `- Path: ${start.pathLabel ?? start.path ?? "(not set)"}`,
    `- Template id: ${template.templateId}`,
    `- Template name: ${template.templateName}`,
    `- Custom upload layout: ${template.isCustom ? "yes" : "no"}`,
  ];
  if (template.ratio) lines.push(`- Print ratio: ${template.ratio}`);
  if (start.printSizeLabel) {
    lines.push(`- Print size: ${start.printSizeLabel}`);
  }
  if (template.hasQr) {
    lines.push("- Template includes QR slot: yes");
  }
  return lines.join("\n");
}

function formatAssetsBlock(input: FlyerComposerGenerateInput): string {
  const { assets } = input;
  const lines = ["INSPIRATION ASSETS"];

  if (assets.inspirationPhotoPresent) {
    lines.push("- Hero / inspiration photo: present");
    if (assets.inspirationPhotoSource) {
      lines.push(`- Photo source: ${assets.inspirationPhotoSource}`);
    }
    if (assets.inspirationPhotoLabel) {
      lines.push(`- Photo label: ${assets.inspirationPhotoLabel}`);
    }
    if (assets.inspirationPhotoNote) {
      lines.push(`- Photo note: ${assets.inspirationPhotoNote}`);
    }
  } else {
    lines.push("- Hero / inspiration photo: none");
  }

  if (assets.customTemplatePresent) {
    lines.push("- Last-year / custom template file: present");
    if (assets.customTemplateFileName) {
      lines.push(`- Template filename: ${assets.customTemplateFileName}`);
    }
    if (assets.customTemplateFileType) {
      lines.push(`- Template file type: ${assets.customTemplateFileType}`);
    }
    if (assets.customTemplateNote) {
      lines.push(`- Template note: ${assets.customTemplateNote}`);
    }
  } else if (input.template.isCustom) {
    lines.push("- Last-year / custom template file: expected but not uploaded");
  } else {
    lines.push("- Last-year / custom template file: n/a (proven or new layout)");
  }

  return lines.join("\n");
}

function formatBrandBlock(
  input: FlyerComposerGenerateInput,
  organizationName: string | null,
  brandVoiceSummary: string,
): string {
  if (!input.brandEnabled) {
    return ["BRAND KIT", "- Enabled: no", "- Use neutral community tone"].join(
      "\n",
    );
  }

  const kit = input.brandKit;
  return [
    "BRAND KIT",
    "- Enabled: yes",
    `- Organization: ${kit?.organizationShortName ?? organizationName ?? "(not provided)"}`,
    kit?.primaryColor ? `- Primary color: ${kit.primaryColor}` : null,
    kit?.accentColor ? `- Accent color: ${kit.accentColor}` : null,
    kit?.fontStyle ? `- Font style: ${kit.fontStyle}` : null,
    kit?.mascotLabel ? `- Mascot: ${kit.mascotLabel}` : null,
    kit?.ptoLogoUploaded ? "- PTO logo on file: yes" : "- PTO logo on file: no",
    kit?.schoolLogoUploaded
      ? "- School logo on file: yes"
      : "- School logo on file: no",
    kit?.logoDisplay ? `- Logo display: ${kit.logoDisplay}` : null,
    brandVoiceSummary
      ? `- Voice: ${brandVoiceSummary}`
      : "- Voice: warm, welcoming, community-first PTA/PTO tone",
    "- Do not describe hex colors or logo filenames in flyer copy.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatTemplateRules(input: FlyerComposerGenerateInput): string[] {
  const rules = [
    "- Template/layout is LOCKED — update text, dates, tiers, CTA/QR strings only.",
    "- Interpret last year notes, custom template context, and every filled slot as direction.",
    "- Do not paste raw notes verbatim unless they are already polished parent-facing copy.",
    "- If a slot is already strong, return it unchanged or lightly edited.",
    "- qrUrl should match ctaUrl when the template uses a donate/calendar QR unless directions say otherwise.",
    "- Do not add markdown, emoji, or hashtags.",
  ];

  if (input.template.templateId === "semester") {
    rules.push(
      "- Semester at a Glance: put ALL calendar dates and events in datesEvents as newline-separated rows (e.g. \"Aug 15 — Back to School Night\").",
      "- Keep bodyCopy empty or a single short intro unless inspiration includes separate prose.",
      "- Never drop or summarize away multi-line date lists from inspiration — return the full calendar.",
    );
  }

  if (input.template.templateId === "investor") {
    rules.push(
      "- Become an Investor: donation tiers belong in donationTiers (newline-separated). Body copy is the pitch paragraph only.",
    );
  }

  return rules;
}

export function buildFlyerComposerSlotsUserPrompt(
  input: FlyerComposerGenerateInput,
  organizationName: string | null,
  brandVoiceSummary: string,
): string {
  const task = input.template.isCustom
    ? "Update last year's flyer copy inside the uploaded, layout-locked template."
    : `Fill the locked "${input.template.templateName}" flyer template slots.`;

  return [
    task,
    "",
    formatStartBlock(input),
    "",
    formatAssetsBlock(input),
    "",
    formatBrandBlock(input, organizationName, brandVoiceSummary),
    "",
    "INSPIRATION SLOTS (all sections)",
    formatAllSlotSections(input.fields),
    "",
    "JSON OUTPUT",
    "Return a JSON object with ONLY these keys (omit keys that should stay unchanged):",
    JSON.stringify(SLOT_KEYS),
    "",
    "RULES",
    ...formatTemplateRules(input),
  ].join("\n");
}

export function parseFlyerComposerSlotsJson(raw: string): Record<string, string> {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object.");
  }

  const out: Record<string, string> = {};
  for (const key of SLOT_KEYS) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

/** Compact one-line labels for UI direction summaries. */
export function summarizeFlyerComposerDirection(
  input: FlyerComposerGenerateInput,
): string[] {
  const lines: string[] = [];
  if (input.start.pathLabel) lines.push(`Start: ${input.start.pathLabel}`);
  lines.push(`Template: ${input.template.templateName}`);
  if (input.start.printSizeLabel) {
    lines.push(`Print: ${input.start.printSizeLabel}`);
  }
  if (input.assets.customTemplatePresent) {
    lines.push(
      `Last-year file: ${input.assets.customTemplateFileName ?? "uploaded"}`,
    );
  }
  if (input.assets.inspirationPhotoPresent) {
    lines.push(
      `Photo: ${input.assets.inspirationPhotoLabel ?? input.assets.inspirationPhotoSource ?? "added"}`,
    );
  }
  lines.push(`Brand kit: ${input.brandEnabled ? "on" : "off"}`);
  const filledSlots = SLOT_KEYS.filter((k) => input.fields[k]?.trim());
  if (filledSlots.length) {
    lines.push(`Slots filled: ${filledSlots.length}`);
  }
  if (
    input.fields.aiDirection?.trim() ||
    input.fields.bodyCopy?.trim() ||
    input.fields.lastYearNotes?.trim()
  ) {
    lines.push("AI direction included");
  }
  return lines;
}
