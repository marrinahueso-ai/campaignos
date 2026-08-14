import { VENDOR_DOCUMENTS_BUCKET } from "@/lib/vendors/constants";
import { resolveSafeUploadContentType } from "@/lib/uploads/safe-content-type";

/** Vendor documents are contracts/invoices, not media — same ceiling as campaign files. */
export const MAX_VENDOR_DOCUMENT_BYTES = 25 * 1024 * 1024;
/** Vendor logos are small display images. */
export const MAX_VENDOR_LOGO_BYTES = 5 * 1024 * 1024;

const ALLOWED_VENDOR_LOGO_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

const ALLOWED_VENDOR_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

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

/**
 * Extension is authoritative (see resolveVendorLogoContentType) — accepting a
 * file merely because its client-supplied MIME type matched would let a file
 * named e.g. "evil.html" through by spoofing `file.type` to `image/png`.
 */
export function isAllowedVendorLogo(file: File): boolean {
  return resolveVendorLogoContentType(file.name) !== null;
}

export function isAllowedVendorDocument(file: File): boolean {
  return resolveVendorDocumentContentType(file.name) !== null;
}

/**
 * Server-derived Content-Type for a vendor logo, from its extension only —
 * never from the client-supplied `file.type`. Returns null to reject uploads
 * with an unrecognized/disallowed extension.
 */
export function resolveVendorLogoContentType(filename: string): string | null {
  return resolveSafeUploadContentType(filename, ALLOWED_VENDOR_LOGO_EXTENSIONS);
}

/**
 * Server-derived Content-Type for a vendor document, from its extension only
 * — never from the client-supplied `file.type`. Returns null to reject
 * uploads with an unrecognized/disallowed extension.
 */
export function resolveVendorDocumentContentType(
  filename: string,
): string | null {
  return resolveSafeUploadContentType(
    filename,
    ALLOWED_VENDOR_DOCUMENT_EXTENSIONS,
  );
}

export { VENDOR_DOCUMENTS_BUCKET };
