import type { FlyerComposerGenerateInput } from "@/lib/flyer-composer/types";

const FIELD_LABELS: Record<string, string> = {
  orgName: "Organization name",
  headline: "Headline / title",
  schoolYear: "School year",
  location: "Location",
  directions: "Directions",
  datesEvents: "Dates and events (full list — render every line)",
  bodyCopy: "Body copy",
  donationTiers: "Donation tiers",
  ctaLabel: "Call-to-action label",
  ctaUrl: "CTA URL",
  qrUrl: "QR code URL",
  qrCaption: "QR caption",
  footerLine: "Footer",
  lastYearNotes: "Last-year / change notes",
};

const PROVEN_LAYOUT_IDS = new Set(["semester", "investor", "festival"]);

function templateLayoutInstructions(input: FlyerComposerGenerateInput): string[] {
  const { template, start, assets } = input;

  if (template.isCustom || start.path === "update") {
    return [
      "Layout type: CUSTOM UPLOAD — match the volunteer's uploaded last-year flyer layout and visual structure.",
      "Preserve the same section hierarchy, photo placement, and typography rhythm as a typical school/PTO flyer refresh.",
      "Update all dates, headlines, and copy from the direction below — do not reuse placeholder org names.",
    ];
  }

  if (start.path === "new") {
    if (template.templateId === "simple-half") {
      return [
        "Layout type: SIMPLE HALF-PAGE FLYER — landscape 8.5×5.5 announcement.",
        "Compact headline, short body, CTA — optimized for bulletin boards.",
        "Follow the volunteer's direction below — do not impose a calendar grid or donation tier layout.",
      ];
    }
    return [
      "Layout type: SIMPLE LETTER FLYER — clean 8.5×11 portrait announcement.",
      "Headline, optional hero image band, scannable body, footer.",
      "Follow the volunteer's direction below — do not impose a calendar grid or donation tier layout.",
    ];
  }

  switch (template.templateId) {
    case "semester":
      return [
        "Layout type: SEMESTER AT A GLANCE — portrait school calendar flyer.",
        "Large colorful header (e.g. BACK TO SCHOOL or headline text).",
        "Month grid or month boxes (AUG through JAN or full school year) with event days filled in from the dates list.",
        "Each date/event line from inspiration MUST appear in the correct month box.",
        "School-supplies or friendly footer band; leave a clear square QR placeholder in the bottom corner if QR URL is provided.",
      ];
    case "investor":
      return [
        "Layout type: BECOME AN INVESTOR — donation / membership fundraiser flyer.",
        "Bold headline, organization name, school year.",
        "Tier cards or stacked donation levels from the tiers list ($25, $50, etc.).",
        "Short motivational body paragraph; prominent donate CTA and QR placeholder if URL provided.",
      ];
    case "festival":
      return [
        "Layout type: EVENT FLYER — single community event poster.",
        assets.inspirationPhotoPresent
          ? "Hero photo area (use attached inspiration photo), date chip or date banner, headline, location, body."
          : "Optional hero band using brand colors, typography, or simple illustration — no stock crowd/festival/night-event photography.",
        "Warm, inviting PTO/community event aesthetic — not a generic template mockup.",
      ];
    case "simple-letter":
      return [
        "Layout type: SIMPLE LETTER FLYER — clean 8.5×11 portrait announcement.",
        "Headline, optional hero image band, scannable body, footer.",
      ];
    case "simple-half":
      return [
        "Layout type: SIMPLE HALF-PAGE FLYER — landscape 8.5×5.5 announcement.",
        "Compact headline, short body, CTA — optimized for bulletin boards.",
      ];
    default:
      return [
        `Layout type: ${template.templateName} — follow the volunteer's direction below.`,
      ];
  }
}

function formatDirectionFields(input: FlyerComposerGenerateInput): string {
  const lines: string[] = ["CONTENT TO RENDER ON THE FLYER (use all non-empty lines):"];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const value = (input.fields as Record<string, string | undefined>)[key]?.trim();
    if (value) {
      lines.push(`- ${label}: ${value}`);
    }
  }
  if (lines.length === 1) {
    lines.push("- (Use template defaults and brand — volunteer provided minimal text.)");
  }
  return lines.join("\n");
}

function formatBrandBlock(input: FlyerComposerGenerateInput): string {
  if (!input.brandEnabled) {
    return "Brand: neutral community palette — no specific org logos.";
  }
  const kit = input.brandKit;
  return [
    "Brand kit (use these colors and org identity on the designed flyer):",
    `- Organization: ${kit?.organizationShortName ?? "Your organization"}`,
    kit?.primaryColor ? `- Primary color: ${kit.primaryColor}` : null,
    kit?.accentColor ? `- Accent color: ${kit.accentColor}` : null,
    kit?.fontStyle ? `- Font style: ${kit.fontStyle}` : null,
    kit?.mascotLabel ? `- Mascot: ${kit.mascotLabel}` : null,
    kit?.ptoLogoUploaded || kit?.schoolLogoUploaded
      ? "- Include org logo mark or lettermark in header (no third-party logos)."
      : "- Use org name as wordmark in header.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatAssetsBlock(input: FlyerComposerGenerateInput): string {
  const { assets } = input;
  const lines: string[] = ["INSPIRATION ASSETS:"];
  if (assets.inspirationPhotoPresent) {
    lines.push(
      "- Use the attached inspiration/reference photo in the flyer design (hero band or focal image).",
    );
    if (assets.inspirationPhotoLabel) {
      lines.push(`- Photo context: ${assets.inspirationPhotoLabel}`);
    }
    if (assets.inspirationPhotoNote) {
      lines.push(`- Note: ${assets.inspirationPhotoNote}`);
    }
  } else {
    lines.push("- Hero / inspiration photo: none provided.");
    lines.push(
      "- Do NOT invent stock crowd, festival lawn, fair lights, or night-event photography.",
    );
    lines.push(
      "- Use brand colors, typography, and optional illustrated or graphic header bands instead.",
    );
  }
  if (assets.customTemplatePresent) {
    lines.push("- Custom template uploaded: match that layout type.");
    if (assets.customTemplateFileName) {
      lines.push(`- File: ${assets.customTemplateFileName}`);
    }
    if (assets.customTemplateImageUrl) {
      lines.push("- Use the attached last-year template image as layout reference.");
    }
    if (assets.customTemplateNote) {
      lines.push(`- Note: ${assets.customTemplateNote}`);
    }
  }
  return lines.join("\n");
}

function formatQrInstructions(input: FlyerComposerGenerateInput): string {
  const qrUrl = input.fields.qrUrl?.trim() || input.fields.ctaUrl?.trim();
  if (!qrUrl || !input.template.hasQr) {
    return "";
  }
  const caption = input.fields.qrCaption?.trim();
  return [
    "QR CODE:",
    `- Leave a clean white square placeholder (~10% of flyer width) in the bottom-right for a QR code overlay.`,
    caption ? `- Place caption text near the QR: "${caption}"` : null,
    "- Do NOT draw a fake QR pattern — empty white box with thin border only.",
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
    return "PRINT FORMAT: US half-page 8.5×5.5 inch landscape flyer — wide bulletin layout, not square, not Instagram story.";
  }
  return "PRINT FORMAT: US Letter 8.5×11 inch portrait flyer — full page, not square, not Instagram, not social media crop.";
}

/**
 * Rich image-generation prompt from the full flyer direction payload.
 * Template lock: semester = month grids, investor = tiers, etc.
 */
export function buildFlyerComposerImagePrompt(
  input: FlyerComposerGenerateInput,
): string {
  const { start, template } = input;
  const printNote =
    start.printSizeLabel ??
    (template.ratio ? `Aspect ratio ${template.ratio}` : "Portrait print flyer");

  return [
    "Design a complete, print-ready school / PTO flyer as a single polished graphic.",
    "Output one finished flyer image with all text rendered legibly — not a wireframe or HTML mockup.",
    "Use real copy from the direction below; never use placeholder org names like Oak Park or Riverside.",
    formatPrintFormatInstructions(input),
    "",
    `Start path: ${start.pathLabel ?? start.path ?? "new flyer"}`,
    PROVEN_LAYOUT_IDS.has(template.templateId)
      ? `Template: ${template.templateName} (${template.templateId})`
      : `Print format: ${template.templateName}`,
    `Print: ${printNote}`,
    "",
    ...templateLayoutInstructions(input),
    "",
    formatBrandBlock(input),
    "",
    formatAssetsBlock(input),
    "",
    formatDirectionFields(input),
    "",
    formatQrInstructions(input),
    "",
    "QUALITY:",
    "- Professional PTO/school flyer design with strong hierarchy and readable type at print size.",
    "- Colorful but on-brand; parent-facing and welcoming.",
    "- All dates and events from the list must be visible on the flyer.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function resolveFlyerComposerImageSize(input: FlyerComposerGenerateInput): string {
  if (isHalfPageFlyer(input)) {
    // 8.5×5.5 landscape — closest supported GPT output (3:2)
    return "1536x1024";
  }
  const ratio = input.template.ratio?.trim();
  if (ratio === "1/1") {
    return "1024x1024";
  }
  // US Letter 8.5×11 portrait — closest supported GPT output (2:3)
  return "1024x1536";
}
