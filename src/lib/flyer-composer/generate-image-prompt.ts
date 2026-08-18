import {
  FLYER_QR_MARGIN_FRACTION,
  FLYER_QR_SLOT_FRACTION,
} from "@/lib/flyer-composer/qr-layout";
import { resolveSelectedLogoReferenceUrl } from "@/lib/flyer-composer/reference-images";
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

/** Freeform creative direction — same role as social / ChatGPT user text. */
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
  const lines: string[] = [];
  for (const key of EVENT_DETAIL_KEYS) {
    const value = input.fields[key]?.trim();
    if (!value) continue;
    if (key === "datesEvents" || key === "donationTiers") {
      lines.push(`${EVENT_DETAIL_LABELS[key]}:`);
      for (const row of value.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
        lines.push(`  • ${row}`);
      }
      continue;
    }
    lines.push(`${EVENT_DETAIL_LABELS[key]}: ${value}`);
  }
  return lines.join("\n");
}

function hasAttachedLogo(input: FlyerComposerGenerateInput): boolean {
  return (
    input.brandEnabled &&
    Boolean(resolveSelectedLogoReferenceUrl(input.brandKit))
  );
}

function hasAttachedReferenceImage(input: FlyerComposerGenerateInput): boolean {
  const { assets } = input;
  if (assets.inspirationPhotoPresent && assets.inspirationPhotoUrl) return true;
  if (assets.customTemplatePresent && assets.customTemplateImageUrl) return true;
  if (hasAttachedLogo(input)) return true;
  return false;
}

function isHalfPageFlyer(input: FlyerComposerGenerateInput): boolean {
  const ratio = input.template.ratio?.trim();
  return (
    input.start.printSize === "half" ||
    input.template.templateId === "simple-half" ||
    ratio === "3/2" ||
    ratio === "8.5/5.5"
  );
}

function formatPrintFormatInstructions(input: FlyerComposerGenerateInput): string {
  if (isHalfPageFlyer(input)) {
    return "Format: US half-page 8.5×5.5 inch landscape flyer — full-bleed edge-to-edge artwork filling the entire canvas, no white borders/margins/frames, not a square social crop.";
  }
  return "Format: US Letter 8.5×11 inch portrait flyer — full-bleed edge-to-edge artwork filling the entire canvas, no white borders/margins/frames, not a square social crop.";
}

/**
 * ChatGPT-style flyer prompt: user direction first, then short facts + attached images.
 * Avoid competing template-lock essays that drown out the creative brief.
 */
export function buildFlyerComposerImagePrompt(
  input: FlyerComposerGenerateInput,
): string {
  const direction = resolveFlyerComposerAiDirection(input.fields);
  const facts = formatEventDetails(input);
  const hasRefs = hasAttachedReferenceImage(input);
  const org =
    input.fields.orgName?.trim() ||
    (input.brandEnabled
      ? input.brandKit?.organizationShortName?.trim()
      : "") ||
    "";

  const lines: string[] = [
    "Create one polished, print-ready school / PTO event flyer as a single image.",
    formatPrintFormatInstructions(input),
    "Readable from a few feet away. Real text on the flyer — not lorem ipsum.",
    "Typography style: clean, confident lettering — NO speed lines, sparkle bursts, comic emphasis rays, starbursts, or hash-mark accents beside words or headlines.",
    "No grid-like icon rows, icon strips, emoji tiles, or dotted/line dividers between icons — keep the layout open with bold typography and atmosphere, not a row of labeled icons.",
  ];

  const eventSocialInspiration = input.assets.inspirationPhotoSource === "event";
  if (eventSocialInspiration) {
    lines.push(
      "Do not invent people who are not in the attached social artwork. If that artwork includes people, keep them as they appear — do not replace the scene to avoid them.",
    );
  } else {
    lines.push(
      "No people in the artwork — no photos, illustrations, cartoons, silhouettes, or crowds of people, families, kids, or skaters.",
    );
  }

  if (direction) {
    lines.push(
      "",
      "Volunteer direction (this is the main brief — design the flyer to match):",
      direction,
      "",
    );
    if (eventSocialInspiration) {
      lines.push(
        "Follow that direction for copy, type, and layout, but keep the attached social artwork as the scene — do not invent a different setting.",
      );
    } else {
      lines.push(
        "Include the theme, activities, and any dates/times named in that direction on the flyer.",
        "Suggest the activity with scenery, props, color, and type — never by drawing people or a bottom icon grid.",
      );
    }
  } else {
    lines.push(
      "",
      "No freeform direction — design from the facts below and any attached images.",
    );
  }

  if (facts) {
    lines.push("", "Facts to include when they don't conflict with the direction:", facts);
    lines.push(
      "Use these real event facts on the flyer — do not invent dates, times, or locations, and do not print placeholder copy like “To Be Announced” when a date or time is provided above.",
    );
  }

  if (org) {
    lines.push("", `Organization name on the flyer: ${org}`);
  }

  if (input.brandEnabled && input.brandKit) {
    const kit = input.brandKit;
    const brandBits = [
      kit.primaryColor ? `primary ${kit.primaryColor}` : null,
      kit.accentColor ? `accent ${kit.accentColor}` : null,
    ].filter(Boolean);
    if (brandBits.length) {
      lines.push(`Brand colors to lean on: ${brandBits.join(", ")}.`);
    }
  }

  const logoAttached = hasAttachedLogo(input);
  if (logoAttached) {
    const logoLabel =
      input.brandKit?.selectedLogoLabel?.trim() || "organization logo";
    lines.push(
      "",
      `Attached brand logo (${logoLabel}): incorporate this logo mark into the flyer design (corner badge or masthead). Do not invent a different logo or redraw letterforms from the logo as headline type.`,
    );
  }

  if (eventSocialInspiration) {
    lines.push(
      "",
      "The attached image is this event’s existing social-media artwork.",
      "Keep the same scene, colors, style, logos, and subject — expand that artwork into this flyer size (extend the canvas; do not crop it back to a square).",
      "Do not replace it with a different illustration, playground, or generic school scene.",
      "Add flyer typography and the real date/time on top of (or around) that same visual — not a bare crop with no type.",
    );
    if (logoAttached) {
      lines.push(
        "The logo attachment is a brand mark — place it as a logo, not as the hero photo.",
      );
    }
  } else if (hasRefs) {
    lines.push(
      "",
      "Attached image(s): use as the visual foundation (hero / background / mood).",
      "Build a complete designed flyer around them — title treatment, activity callouts, date/time bar — not a bare photograph with no type.",
      "If an attachment is a photo, use it as the scene/hero under the design. If it is a prior flyer, treat it as a light structure guide — still follow the volunteer direction above.",
    );
    if (logoAttached) {
      lines.push(
        "The logo attachment is a brand mark — place it as a logo, not as the hero photo.",
      );
    }
  } else if (!direction) {
    lines.push(
      "",
      "No reference photo — use brand colors and clear typography; avoid people and generic stock crowd scenes.",
    );
  }

  const qrUrl = input.fields.qrUrl?.trim() || input.fields.ctaUrl?.trim();
  if (qrUrl && /^https?:\/\//i.test(qrUrl)) {
    const slotPct = Math.round(FLYER_QR_SLOT_FRACTION * 100);
    const marginPct = Math.round(FLYER_QR_MARGIN_FRACTION * 100);
    lines.push(
      "",
      "QR CODE SLOT (critical — the app stamps a real scannable QR after generation):",
      `- Leave ONE empty solid white SQUARE in the lower-right corner — exactly ~${slotPct}% of the shorter flyer side on both width and height (always a perfect square, never a rounded rectangle or rounded corners).`,
      `- Place it with ~${marginPct}% margin from the right edge and ~${marginPct}% from the bottom edge — same corner and size every time.`,
      "- The white square must be empty and flush to those margins — the app will fill that entire square with a QR of the same size.",
      "- Do NOT draw QR modules, fake barcodes, pixel grids, finder patterns, or any stand-in code.",
      "- Do NOT put the URL text inside that white square — caption text may sit beside it to the left.",
      "- Keep that white square clear of icons, gradients, paperclips, and texture so a QR overlay can fill it edge-to-edge.",
    );
    const caption = input.fields.qrCaption?.trim();
    if (caption) lines.push(`QR caption beside the square: ${caption}`);
  }

  if (input.fields.datesEvents?.trim()) {
    lines.push(
      "",
      "If a dates-and-events list is in the facts, every line should appear on the flyer.",
    );
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
