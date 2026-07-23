import type { DeliveryMethod } from "@/lib/campaign-builder-v2/types";

/** Legacy value persisted before Publish Now replaced “Publish automatically”. */
export const LEGACY_AUTO_PUBLISH: DeliveryMethod = "auto-publish";

export const DEFAULT_DELIVERY_METHOD: DeliveryMethod = "publish-now";

export function isPublishNowDelivery(
  method: string | null | undefined,
): boolean {
  return method === "publish-now" || method === "auto-publish";
}

export function wantsMetaFeedDelivery(
  method: string | null | undefined,
): boolean {
  return (
    isPublishNowDelivery(method) ||
    method === "schedule"
  );
}

/** Normalize stored / session values; legacy auto-publish → publish-now. */
export function normalizeDeliveryMethod(
  value: string | null | undefined,
): DeliveryMethod {
  if (value === "schedule" || value === "manual-email" || value === "draft-only") {
    return value;
  }
  if (value === "publish-now" || value === "auto-publish") {
    return "publish-now";
  }
  return DEFAULT_DELIVERY_METHOD;
}

export function deliveryMethodUiLabel(method: DeliveryMethod): string {
  switch (method) {
    case "publish-now":
    case "auto-publish":
      return "Publish Now";
    case "schedule":
      return "Schedule to publish";
    case "manual-email":
      return "Email me for manual upload";
    case "draft-only":
      return "Save as draft only";
    default:
      return "Publish Now";
  }
}
