export const ORGANIZATION_STICKERS_BUCKET = "organization-stickers";

/** Max upload size for a custom sticker (2 MiB). */
export const ORGANIZATION_STICKER_MAX_BYTES = 2 * 1024 * 1024;

/** Soft cap so an org cannot flood the picker. */
export const ORGANIZATION_STICKER_MAX_COUNT = 48;

export const ORGANIZATION_STICKER_MIME_TYPES = [
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpeg",
] as const;

export type OrganizationStickerMimeType =
  (typeof ORGANIZATION_STICKER_MIME_TYPES)[number];

export function isOrganizationStickerMimeType(
  value: string,
): value is OrganizationStickerMimeType {
  return (ORGANIZATION_STICKER_MIME_TYPES as readonly string[]).includes(value);
}

export function stickerExtensionForMime(
  mimeType: OrganizationStickerMimeType,
): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/jpeg":
      return "jpg";
  }
}

export function buildOrganizationStickerStoragePath(input: {
  organizationId: string;
  stickerId: string;
  mimeType: OrganizationStickerMimeType;
}): string {
  const ext = stickerExtensionForMime(input.mimeType);
  return `${input.organizationId}/${input.stickerId}.${ext}`;
}
