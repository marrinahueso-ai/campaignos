import {
  EVENT_SOCIAL_INSPIRATION_LABEL,
  parseFlyerInspirationPhotoSource,
} from "@/lib/flyer-composer/inspiration-source";
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
  /** Linked campaign event — used to populate flyer facts when present. */
  event?: {
    title?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
    /** Campaign / social artwork for this event — used as flyer inspiration when none was uploaded. */
    imageUrl?: string | null;
  } | null;
  qrEnabled: boolean;
  qrUrl?: string | null;
  qrCaption?: string | null;
  brandEnabled: boolean;
  brandKit?: FlyerGenerateBrandKit | null;
  selectedLogoId?: string | null;
  inspirationPhotoUrl?: string | null;
  inspirationPhotoSource?: "upload" | "library" | "event" | null;
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

/** Format YYYY-MM-DD (or ISO) for flyer copy — never invent dates. */
export function formatFlyerEventDate(date: string | null | undefined): string {
  const raw = date?.trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  try {
    return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`).toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric", year: "numeric" },
    );
  } catch {
    return raw;
  }
}

/**
 * Resolve structured flyer facts from an optional linked event.
 * Explicit overrides win; otherwise event title/date/time/location are used.
 */
export function resolveFlyerEventFacts(input: {
  title?: string | null;
  datesEvents?: string | null;
  directions?: string | null;
  location?: string | null;
  event?: {
    title?: string | null;
    date?: string | null;
    time?: string | null;
    location?: string | null;
  } | null;
}): {
  headline: string;
  datesEvents: string;
  directions: string;
  location: string;
} {
  const eventTitle = input.event?.title?.trim() || "";
  const eventDate = formatFlyerEventDate(input.event?.date);
  const eventTime = input.event?.time?.trim() || "";
  const eventLocation = input.event?.location?.trim() || "";

  const dateLine = [eventDate, eventTime].filter(Boolean).join(" · ");

  return {
    headline: input.title?.trim() || eventTitle,
    datesEvents: input.datesEvents?.trim() || dateLine,
    directions: input.directions?.trim() || eventTime,
    location: input.location?.trim() || eventLocation,
  };
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
  const uploadedInspirationUrl = isImageReferenceUrl(input.inspirationPhotoUrl)
    ? input.inspirationPhotoUrl!.trim()
    : null;
  const eventInspirationUrl = isImageReferenceUrl(input.event?.imageUrl)
    ? input.event!.imageUrl!.trim()
    : null;
  const inspirationUrl = uploadedInspirationUrl || eventInspirationUrl;
  const parsedSource = parseFlyerInspirationPhotoSource(
    input.inspirationPhotoSource,
  );
  const inspirationSource = uploadedInspirationUrl
    ? parsedSource === "upload" ||
      parsedSource === "library" ||
      parsedSource === "event"
      ? parsedSource
      : "upload"
    : eventInspirationUrl
      ? "event"
      : null;
  const inspirationLabel =
    input.inspirationPhotoLabel?.trim() ||
    (inspirationSource === "event" ? EVENT_SOCIAL_INSPIRATION_LABEL : null);

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

  const facts = resolveFlyerEventFacts({
    title: input.title,
    datesEvents: input.datesEvents,
    directions: input.directions,
    location: input.location,
    event: input.event,
  });

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
      inspirationPhotoLabel: inspirationLabel,
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
      headline: facts.headline,
      schoolYear: "",
      location: facts.location,
      directions: facts.directions,
      datesEvents: facts.datesEvents,
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
