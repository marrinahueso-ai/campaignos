import type { FlyerComposerGenerateInput } from "@/lib/flyer-composer/types";

/** Structured facts that belong on the flyer (not freeform creative direction). */
const EVENT_DETAIL_KEYS = [
  "orgName",
  "headline",
  "schoolYear",
  "location",
  "directions",
  "datesEvents",
  "donationTiers",
  "ctaLabel",
  "ctaUrl",
  "qrUrl",
  "qrCaption",
  "footerLine",
] as const;

const EVENT_DETAIL_LABELS: Record<(typeof EVENT_DETAIL_KEYS)[number], string> = {
  orgName: "Organization",
  headline: "Headline",
  schoolYear: "School year",
  location: "Location",
  directions: "Directions",
  datesEvents: "Dates and events",
  donationTiers: "Donation tiers",
  ctaLabel: "CTA label",
  ctaUrl: "CTA URL",
  qrUrl: "QR URL",
  qrCaption: "QR caption",
  footerLine: "Footer",
};

const PROVEN_LAYOUT_IDS = new Set(["semester", "investor", "festival"]);

function templateLayoutInstructions(input: FlyerComposerGenerateInput): string[] {
  const { template, start, assets } = input;

  if (template.isCustom || start.path === "update") {
    return [
      "Layout: refresh the volunteer's uploaded last-year flyer — keep structure, update copy from event details + direction.",
    ];
  }

  if (start.path === "new" || !PROVEN_LAYOUT_IDS.has(template.templateId)) {
    if (template.templateId === "simple-half") {
      return [
        "Layout: compact half-page (8.5×5.5) announcement — headline, short body, CTA.",
      ];
    }
    return [
      "Layout: clean US Letter announcement flyer — strong headline, scannable body, optional hero band, footer.",
    ];
  }

  switch (template.templateId) {
    case "semester":
      return [
        "Layout: semester calendar flyer with month boxes; place every dates-and-events line in the correct month.",
      ];
    case "investor":
      return [
        "Layout: donation / membership flyer with clear tier levels from the tiers list.",
      ];
    case "festival":
      return [
        assets.inspirationPhotoPresent
          ? "Layout: single-event poster with hero photo, date, headline, and CTA."
          : "Layout: single-event poster — brand colors/typography for header (no stock crowd photography).",
      ];
    default:
      return [`Layout: ${template.templateName}.`];
  }
}

/** Freeform creative direction — same role as social artwork direction. */
export function resolveFlyerComposerAiDirection(
  fields: FlyerComposerGenerateInput["fields"],
): string {
  const primary = fields.aiDirection?.trim();
  if (primary) return primary;
  // Backward compat: older drafts used bodyCopy / lastYearNotes as direction.
  return [fields.bodyCopy, fields.lastYearNotes]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function formatEventDetails(input: FlyerComposerGenerateInput): string {
  const lines: string[] = ["EVENT DETAILS (facts for the flyer — use these):"];
  for (const key of EVENT_DETAIL_KEYS) {
    const value = input.fields[key]?.trim();
    if (!value) continue;
    if (key === "datesEvents" || key === "donationTiers") {
      lines.push(`- ${EVENT_DETAIL_LABELS[key]}:`);
      for (const row of value.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
        lines.push(`  • ${row}`);
      }
      continue;
    }
    lines.push(`- ${EVENT_DETAIL_LABELS[key]}: ${value}`);
  }
  if (lines.length === 1) {
    lines.push("- (Minimal details — rely on brand kit and artwork direction.)");
  }
  return lines.join("\n");
}

function formatBrandBlock(input: FlyerComposerGenerateInput): string {
  if (!input.brandEnabled) {
    return "Brand: neutral community palette.";
  }
  const kit = input.brandKit;
  return [
    "Brand kit (colors and identity — not literal copy to paste):",
    `- Organization: ${kit?.organizationShortName ?? "Your organization"}`,
    kit?.primaryColor ? `- Primary color: ${kit.primaryColor}` : null,
    kit?.accentColor ? `- Accent color: ${kit.accentColor}` : null,
    kit?.fontStyle ? `- Font style: ${kit.fontStyle}` : null,
    kit?.mascotLabel ? `- Mascot: ${kit.mascotLabel}` : null,
    kit?.ptoLogoUploaded || kit?.schoolLogoUploaded
      ? "- Include org logo mark or lettermark in the header."
      : "- Use organization name as a wordmark in the header.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatAssetsBlock(input: FlyerComposerGenerateInput): string {
  const { assets } = input;
  const lines: string[] = [];
  if (assets.inspirationPhotoPresent) {
    lines.push(
      "Inspiration photo: use the attached reference image for hero mood/composition (do not invent a different stock photo).",
    );
  } else {
    lines.push(
      "Inspiration photo: none. Do NOT invent stock crowd, festival lawn, fair lights, or night-event photography — use brand colors, type, or simple illustration.",
    );
  }
  if (assets.customTemplatePresent) {
    lines.push(
      assets.customTemplateImageUrl
        ? "Last-year template image is attached — match that layout structure."
        : `Last-year template uploaded (${assets.customTemplateFileName ?? "file"}) — refresh layout, update copy.`,
    );
  }
  return lines.join("\n");
}

function formatQrInstructions(input: FlyerComposerGenerateInput): string {
  const qrUrl = input.fields.qrUrl?.trim() || input.fields.ctaUrl?.trim();
  if (!qrUrl) return "";
  const caption = input.fields.qrCaption?.trim();
  return [
    "QR: leave a clean white square placeholder (~10% width) for overlay — do not draw a fake QR pattern.",
    caption ? `QR caption near the box: "${caption}"` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function isHalfPageFlyer(input: FlyerComposerGenerateInput): boolean {
  const ratio = input.template.ratio?.trim();
  return (
    input.start.printSize === "half" ||
    input.template.templateId === "simple-half" ||
    ratio === "3/2"
  );
}

function formatPrintFormatInstructions(input: FlyerComposerGenerateInput): string {
  if (isHalfPageFlyer(input)) {
    return "PRINT FORMAT: US half-page 8.5×5.5 inch landscape — not square, not Instagram.";
  }
  return "PRINT FORMAT: US Letter 8.5×11 inch portrait — full page, not square, not Instagram.";
}

/**
 * Image prompt modeled on social artwork direction:
 * event facts + brand + one freeform direction body (interpret, don't over-specify).
 */
export function buildFlyerComposerImagePrompt(
  input: FlyerComposerGenerateInput,
): string {
  const direction = resolveFlyerComposerAiDirection(input.fields);
  const printNote =
    input.start.printSizeLabel ??
    (input.template.ratio ? `Aspect ${input.template.ratio}` : "Portrait letter");

  const lines = [
    "Create a complete, print-ready school / PTO flyer as a single polished graphic.",
    "Render real text from event details; never use placeholder org names like Oak Park or Riverside.",
    formatPrintFormatInstructions(input),
    "",
    `Start: ${input.start.pathLabel ?? input.start.path ?? "new flyer"}`,
    PROVEN_LAYOUT_IDS.has(input.template.templateId)
      ? `Optional layout guide: ${input.template.templateName}`
      : `Print size: ${input.template.templateName} (${printNote})`,
    "",
    ...templateLayoutInstructions(input),
    "",
    formatEventDetails(input),
    "",
    formatBrandBlock(input),
    "",
    formatAssetsBlock(input),
  ];

  if (direction) {
    lines.push(
      "",
      "Artwork direction from the user (interpret into polished visuals — do not paste these words literally on the graphic):",
      direction,
    );
  }

  const qr = formatQrInstructions(input);
  if (qr) {
    lines.push("", qr);
  }

  lines.push(
    "",
    "Interpret the direction into a clear parent-facing design. Prefer hierarchy and readability over packing every instruction as on-graphic text.",
    "If a dates-and-events list is provided, every line should appear on the flyer.",
    "Only include logistics you were given in event details or direction.",
  );

  return lines.filter(Boolean).join("\n");
}

export function resolveFlyerComposerImageSize(input: FlyerComposerGenerateInput): string {
  if (isHalfPageFlyer(input)) {
    return "1536x1024";
  }
  const ratio = input.template.ratio?.trim();
  if (ratio === "1/1") {
    return "1024x1024";
  }
  return "1024x1536";
}
