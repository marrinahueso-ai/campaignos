import type { Vendor, VendorContact } from "@/types/vendors";

export interface VendorDuplicateMatch {
  field: "name" | "email" | "phone" | "domain";
  vendorId: string;
  vendorName: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function extractDomain(website: string | null | undefined): string | null {
  if (!website?.trim()) {
    return null;
  }

  try {
    const url = website.includes("://")
      ? new URL(website)
      : new URL(`https://${website}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return website
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.toLowerCase() ?? null;
  }
}

export function findVendorDuplicates(
  candidates: Vendor[],
  input: {
    name: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    excludeVendorId?: string;
  },
): VendorDuplicateMatch[] {
  const matches: VendorDuplicateMatch[] = [];
  const normalizedName = normalizeName(input.name);
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
  const normalizedPhone = input.phone ? normalizePhone(input.phone) : null;
  const inputDomain = extractDomain(input.website);

  for (const vendor of candidates) {
    if (input.excludeVendorId && vendor.id === input.excludeVendorId) {
      continue;
    }

    if (normalizeName(vendor.name) === normalizedName) {
      matches.push({
        field: "name",
        vendorId: vendor.id,
        vendorName: vendor.name,
      });
      continue;
    }

    if (
      normalizedEmail &&
      vendor.email &&
      normalizeEmail(vendor.email) === normalizedEmail
    ) {
      matches.push({
        field: "email",
        vendorId: vendor.id,
        vendorName: vendor.name,
      });
      continue;
    }

    if (
      normalizedPhone &&
      vendor.phone &&
      normalizePhone(vendor.phone) === normalizedPhone
    ) {
      matches.push({
        field: "phone",
        vendorId: vendor.id,
        vendorName: vendor.name,
      });
      continue;
    }

    const vendorDomain = extractDomain(vendor.website);
    if (inputDomain && vendorDomain && inputDomain === vendorDomain) {
      matches.push({
        field: "domain",
        vendorId: vendor.id,
        vendorName: vendor.name,
      });
    }
  }

  return matches;
}

export function findContactDuplicates(
  contacts: VendorContact[],
  input: {
    email?: string | null;
    phone?: string | null;
    vendorId: string;
  },
): VendorDuplicateMatch[] {
  const matches: VendorDuplicateMatch[] = [];
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
  const normalizedPhone = input.phone ? normalizePhone(input.phone) : null;

  for (const contact of contacts) {
    if (contact.vendorId === input.vendorId) {
      continue;
    }

    if (
      normalizedEmail &&
      contact.email &&
      normalizeEmail(contact.email) === normalizedEmail
    ) {
      matches.push({
        field: "email",
        vendorId: contact.vendorId,
        vendorName: contact.name,
      });
    }

    if (
      normalizedPhone &&
      contact.phone &&
      normalizePhone(contact.phone) === normalizedPhone
    ) {
      matches.push({
        field: "phone",
        vendorId: contact.vendorId,
        vendorName: contact.name,
      });
    }
  }

  return matches;
}

export function formatDuplicateWarning(matches: VendorDuplicateMatch[]): string {
  if (!matches.length) {
    return "";
  }

  const first = matches[0]!;
  const label =
    first.field === "domain"
      ? "website domain"
      : first.field;

  return `A vendor with a matching ${label} already exists: ${first.vendorName}.`;
}
