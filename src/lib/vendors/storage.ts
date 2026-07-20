import { VENDOR_DOCUMENTS_BUCKET } from "@/lib/vendors/constants";

export function sanitizeVendorDocumentFilename(filename: string): string {
  return filename.replace(/[^\w.-]/g, "_");
}

export function buildVendorDocumentStoragePath(
  organizationId: string,
  vendorId: string,
  filename: string,
  eventId?: string | null,
): string {
  const safeName = sanitizeVendorDocumentFilename(filename);
  const prefix = eventId
    ? `${organizationId}/${vendorId}/${eventId}`
    : `${organizationId}/${vendorId}`;
  return `${prefix}/${Date.now()}-${safeName}`;
}

export function buildVendorLogoStoragePath(
  organizationId: string,
  vendorId: string,
  filename: string,
): string {
  const safeName = sanitizeVendorDocumentFilename(filename);
  return `${organizationId}/${vendorId}/logo/${Date.now()}-${safeName}`;
}

export function isAllowedVendorLogo(file: File): boolean {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  if (allowedExtensions.has(extension)) {
    return true;
  }

  const allowedMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ]);

  return allowedMimeTypes.has(file.type);
}

export function isAllowedVendorDocument(file: File): boolean {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const allowedExtensions = new Set([
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".png",
    ".jpg",
    ".jpeg",
  ]);

  if (allowedExtensions.has(extension)) {
    return true;
  }

  const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ]);

  return allowedMimeTypes.has(file.type);
}

export { VENDOR_DOCUMENTS_BUCKET };
