export type FlyerComposerSlotFields = {
  orgName: string;
  headline: string;
  schoolYear: string;
  location: string;
  directions: string;
  datesEvents: string;
  /** Freeform creative direction for AI (social-style) — interpret, don't paste literally. */
  aiDirection: string;
  /** Legacy supporting copy; still accepted, prefer aiDirection for prompts. */
  bodyCopy: string;
  donationTiers: string;
  ctaLabel: string;
  ctaUrl: string;
  qrUrl: string;
  qrCaption: string;
  footerLine: string;
  lastYearNotes: string;
};

export type FlyerComposerStartPath = "update" | "proven" | "new";

export type FlyerComposerPrintSize = "letter" | "half";

export type FlyerComposerStartContext = {
  /** update last year | proven layout | new flyer */
  path: FlyerComposerStartPath | null;
  pathLabel: string | null;
  printSize: FlyerComposerPrintSize | null;
  printSizeLabel: string | null;
};

export type FlyerComposerTemplateContext = {
  templateId: string;
  templateName: string;
  isCustom: boolean;
  ratio: string | null;
  hasQr: boolean;
};

export type FlyerComposerAssetContext = {
  inspirationPhotoPresent: boolean;
  inspirationPhotoSource: "sample" | "upload" | null;
  inspirationPhotoLabel: string | null;
  /** Context note for the model when no image URL is attached. */
  inspirationPhotoNote: string | null;
  /** data: or https URL sent to image generation as reference input. */
  inspirationPhotoUrl: string | null;
  customTemplatePresent: boolean;
  customTemplateFileName: string | null;
  customTemplateFileType: "pdf" | "image" | null;
  /** Context note when template bytes are not sent (e.g. PDF). */
  customTemplateNote: string | null;
  /** data: or https URL for uploaded last-year template image reference. */
  customTemplateImageUrl: string | null;
};

export type FlyerComposerBrandKit = {
  organizationShortName: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  fontStyle: string | null;
  mascotLabel: string | null;
  ptoLogoUploaded: boolean;
  schoolLogoUploaded: boolean;
  logoDisplay: "pto" | "school" | "lettermark" | "none";
};

export type FlyerComposerGenerateInput = {
  start: FlyerComposerStartContext;
  template: FlyerComposerTemplateContext;
  assets: FlyerComposerAssetContext;
  brandEnabled: boolean;
  brandKit: FlyerComposerBrandKit | null;
  fields: Partial<FlyerComposerSlotFields>;
};

export type FlyerComposerGeneratedSlots = Partial<FlyerComposerSlotFields>;

export type FlyerComposerGenerateImageResult = {
  success: boolean;
  error: string | null;
  /** Public URL when storage upload succeeds. */
  imageUrl: string | null;
  /** data:image/png;base64,... fallback when storage is unavailable. */
  imageBase64: string | null;
  aiUsed: boolean;
};

export type FlyerComposerGenerateResult = {
  success: boolean;
  error: string | null;
  /** Primary deliverable — generated flyer artwork. */
  imageUrl: string | null;
  imageBase64: string | null;
  /** Secondary metadata — inspiration slot copy (optional polish). */
  slots: FlyerComposerGeneratedSlots | null;
  aiUsed: boolean;
};
