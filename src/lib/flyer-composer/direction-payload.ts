import type {
  FlyerComposerGenerateInput,
  FlyerComposerSlotFields,
} from "@/lib/flyer-composer/types";

export const FLYER_DIRECTION_FIELD_KEYS: (keyof FlyerComposerSlotFields)[] = [
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
  "lastYearNotes",
];

/** Returns field keys that have non-empty trimmed values in the direction payload. */
export function listSetDirectionFields(
  fields: Partial<FlyerComposerSlotFields>,
): (keyof FlyerComposerSlotFields)[] {
  return FLYER_DIRECTION_FIELD_KEYS.filter((key) => Boolean(fields[key]?.trim()));
}

/** True when every non-empty inspiration field appears in the serialized direction text. */
export function directionTextIncludesAllSetFields(
  directionText: string,
  fields: Partial<FlyerComposerSlotFields>,
): boolean {
  return listSetDirectionFields(fields).every((key) => {
    const value = fields[key]?.trim();
    return Boolean(value && directionText.includes(value));
  });
}

export function buildSampleDirectionInput(
  overrides: Partial<FlyerComposerGenerateInput> = {},
): FlyerComposerGenerateInput {
  return {
    start: {
      path: "proven",
      pathLabel: "Use a proven layout",
      printSize: null,
      printSizeLabel: null,
      ...overrides.start,
    },
    template: {
      templateId: "semester",
      templateName: "Semester at a Glance",
      isCustom: false,
      ratio: "3/4",
      hasQr: true,
      ...overrides.template,
    },
    assets: {
      inspirationPhotoPresent: true,
      inspirationPhotoSource: "sample",
      inspirationPhotoLabel: "Festival lawn",
      inspirationPhotoNote: "Sample stock photo selected for hero slot — image bytes not sent in v1.",
      customTemplatePresent: false,
      customTemplateFileName: null,
      customTemplateFileType: null,
      customTemplateNote: null,
      ...overrides.assets,
    },
    brandEnabled: true,
    brandKit: {
      organizationShortName: "Oak Park PTA",
      primaryColor: "#2F4A3C",
      accentColor: "#C4922E",
      fontStyle: "Modern",
      mascotLabel: "Panthers",
      ptoLogoUploaded: true,
      schoolLogoUploaded: false,
      logoDisplay: "lettermark",
      ...overrides.brandKit,
    },
    fields: {
      orgName: "Oak Park PTA",
      headline: "Semester at a Glance",
      schoolYear: "2025–2026",
      location: "Oak Park Elementary",
      directions: "South lot · main doors",
      datesEvents: "Aug 15 — Back to School Night\nSep 12 — Fall Festival",
      bodyCopy: "Supporting copy for parents.",
      donationTiers: "$25 — Supporter\n$50 — Friend",
      ctaLabel: "Subscribe to calendar",
      ctaUrl: "https://example.org/calendar",
      qrUrl: "https://example.org/calendar",
      qrCaption: "Scan to add all dates",
      footerLine: "yourorg.org · @YourOrg",
      lastYearNotes: "Refresh dates for the new school year.",
      ...overrides.fields,
    },
  };
}
