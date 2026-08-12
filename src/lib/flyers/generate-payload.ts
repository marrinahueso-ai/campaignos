import type { FlyerComposerGenerateInput } from "@/lib/flyer-composer/types";
import type { FlyerPrintSize } from "@/lib/flyers/types";

/** Client-safe brand kit slice used when building generate payloads. */
export type FlyerGenerateBrandKit = {
  organizationShortName: string;
  primaryColor: string;
  accentColor: string;
  fontStyle: string;
  mascotLabel: string | null;
  ptoLogoUploaded: boolean;
  schoolLogoUploaded: boolean;
  logos: { id: string; label: string; url: string }[];
};

export type FlyerGeneratePayloadInput = {
  printSize: FlyerPrintSize;
  aiDirection: string;
  /** When refining an existing image via Edit with AI. */
  editDirection?: string | null;
  title?: string | null;
  orgName?: string | null;
  datesEvents?: string | null;
  location?: string | null;
  directions?: string | null;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
  qrEnabled: boolean;
  qrUrl?: string | null;
  qrCaption?: string | null;
  brandEnabled: boolean;
  brandKit?: FlyerGenerateBrandKit | null;
  selectedLogoId?: string | null;
  inspirationPhotoUrl?: string | null;
  inspirationPhotoSource?: "upload" | "library" | null;
  inspirationPhotoLabel?: string | null;
  /** Image-only prior flyer / active preview used as custom template reference. */
  previousFlyerUrl?: string | null;
};

function isImageReferenceUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}

export function printSizeLabel(printSize: FlyerPrintSize): string {
  return printSize === "half"
    ? "Half (8.5×5.5)"
    : "Letter (8.5×11)";
}

export function templateForPrintSize(printSize: FlyerPrintSize): {
  templateId: string;
  templateName: string;
  ratio: string;
} {
  if (printSize === "half") {
    return {
      templateId: "simple-half",
      templateName: "Simple flyer · Half (8.5×5.5)",
      ratio: "8.5/5.5",
    };
  }
  return {
    templateId: "simple-letter",
    templateName: "Simple flyer · Letter",
    ratio: "8.5/11",
  };
}

/**
 * Pure builder for POST /api/flyer-composer/generate body.
 * Call only from explicit Generate / Update button handlers.
 */
export function buildFlyerGeneratePayload(
  input: FlyerGeneratePayloadInput,
): FlyerComposerGenerateInput {
  const printSize = input.printSize === "half" ? "half" : "letter";
  const template = templateForPrintSize(printSize);
  const inspirationUrl = isImageReferenceUrl(input.inspirationPhotoUrl)
    ? input.inspirationPhotoUrl!.trim()
    : null;
  const inspirationSource =
    inspirationUrl &&
    (input.inspirationPhotoSource === "upload" ||
      input.inspirationPhotoSource === "library")
      ? input.inspirationPhotoSource
      : inspirationUrl
        ? "upload"
        : null;

  const previousUrl = isImageReferenceUrl(input.previousFlyerUrl)
    ? input.previousFlyerUrl!.trim()
    : null;

  const edit = input.editDirection?.trim() || "";
  const baseDirection = input.aiDirection?.trim() || "";
  const aiDirection = edit
    ? baseDirection
      ? `${baseDirection}\n\nRefine: ${edit}`
      : edit
    : baseDirection;

  const qrEnabled = input.qrEnabled === true;
  const qrUrl = qrEnabled ? input.qrUrl?.trim() || "" : "";

  const brandKit = input.brandKit;
  const selectedLogo =
    brandKit?.logos.find((logo) => logo.id === input.selectedLogoId) ??
    brandKit?.logos[0] ??
    null;
  const selectedLogoUrl = selectedLogo?.url?.trim() || null;
  const logoDisplay =
    selectedLogo?.id === "school"
      ? "school"
      : selectedLogo?.id === "pto"
        ? "pto"
        : selectedLogoUrl
          ? "pto"
          : brandKit?.ptoLogoUploaded
            ? "pto"
            : brandKit?.schoolLogoUploaded
              ? "school"
              : "lettermark";

  return {
    start: {
      path: "new",
      pathLabel: "New flyer",
      printSize,
      printSizeLabel: printSizeLabel(printSize),
    },
    template: {
      templateId: template.templateId,
      templateName: template.templateName,
      isCustom: Boolean(previousUrl),
      ratio: template.ratio,
      hasQr: qrEnabled && Boolean(qrUrl),
    },
    assets: {
      inspirationPhotoPresent: Boolean(inspirationUrl && inspirationSource),
      inspirationPhotoSource: inspirationSource,
      inspirationPhotoLabel: input.inspirationPhotoLabel?.trim() || null,
      inspirationPhotoNote: null,
      inspirationPhotoUrl: inspirationUrl,
      customTemplatePresent: Boolean(previousUrl),
      customTemplateFileName: previousUrl ? "previous-flyer.png" : null,
      customTemplateFileType: previousUrl ? "image" : null,
      customTemplateNote: null,
      customTemplateImageUrl: previousUrl,
    },
    brandEnabled: input.brandEnabled === true,
    brandKit: brandKit
      ? {
          organizationShortName: brandKit.organizationShortName,
          primaryColor: brandKit.primaryColor,
          accentColor: brandKit.accentColor,
          fontStyle: brandKit.fontStyle,
          mascotLabel: brandKit.mascotLabel,
          ptoLogoUploaded: brandKit.ptoLogoUploaded,
          schoolLogoUploaded: brandKit.schoolLogoUploaded,
          logoDisplay,
          selectedLogoId: selectedLogo?.id ?? input.selectedLogoId ?? null,
          selectedLogoUrl:
            input.brandEnabled && selectedLogoUrl ? selectedLogoUrl : null,
          selectedLogoLabel: selectedLogo?.label ?? null,
        }
      : null,
    fields: {
      orgName: input.orgName?.trim() || brandKit?.organizationShortName || "",
      headline: input.title?.trim() || "",
      schoolYear: "",
      location: input.location?.trim() || "",
      directions: input.directions?.trim() || "",
      datesEvents: input.datesEvents?.trim() || "",
      aiDirection,
      bodyCopy: "",
      donationTiers: "",
      ctaLabel: input.ctaLabel?.trim() || "",
      ctaUrl: input.ctaUrl?.trim() || qrUrl,
      qrUrl,
      qrCaption: input.qrCaption?.trim() || "",
      footerLine: "",
      lastYearNotes: "",
    },
  };
}
