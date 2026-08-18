export type FlyerInspirationPhotoSource =
  | "sample"
  | "upload"
  | "library"
  | "event";

export const EVENT_SOCIAL_INSPIRATION_LABEL = "This event’s social artwork";

export function parseFlyerInspirationPhotoSource(
  value: string | null | undefined,
): FlyerInspirationPhotoSource | null {
  const raw = value?.trim();
  if (
    raw === "sample" ||
    raw === "upload" ||
    raw === "library" ||
    raw === "event"
  ) {
    return raw;
  }
  return null;
}

export function isUserChosenFlyerInspiration(
  source: FlyerInspirationPhotoSource | null | undefined,
): boolean {
  return source === "upload" || source === "library";
}

/**
 * When a flyer is linked to an event, use that event’s campaign/social artwork
 * as inspiration unless the volunteer already uploaded or picked a gallery image.
 */
export function resolveFlyerInspirationForEvent(input: {
  currentUrl: string | null | undefined;
  currentSource: FlyerInspirationPhotoSource | null | undefined;
  currentLabel: string | null | undefined;
  eventImageUrl: string | null | undefined;
}): {
  url: string | null;
  source: FlyerInspirationPhotoSource | null;
  label: string | null;
} {
  const currentUrl = input.currentUrl?.trim() || null;
  const currentSource = parseFlyerInspirationPhotoSource(input.currentSource);
  const currentLabel = input.currentLabel?.trim() || null;
  const eventUrl = input.eventImageUrl?.trim() || null;

  if (isUserChosenFlyerInspiration(currentSource) && currentUrl) {
    return {
      url: currentUrl,
      source: currentSource,
      label: currentLabel,
    };
  }

  if (eventUrl) {
    return {
      url: eventUrl,
      source: "event",
      label: EVENT_SOCIAL_INSPIRATION_LABEL,
    };
  }

  if (currentSource === "event" || !currentUrl) {
    return { url: null, source: null, label: null };
  }

  return {
    url: currentUrl,
    source: currentSource,
    label: currentLabel,
  };
}
