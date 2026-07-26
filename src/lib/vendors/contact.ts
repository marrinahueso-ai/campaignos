import type { Vendor, VendorContact } from "@/types/vendors";

function formatVendorWebsiteLabel(website: string | null): string | null {
  if (!website?.trim()) return null;
  return website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export type ResolvedVendorContact = {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  websiteLabel: string | null;
  websiteHref: string | null;
  /** e.g. "Maya Chen · Owner" */
  whoLabel: string | null;
  /** e.g. "Maya Chen · Owner · Nashville" */
  leadLabel: string | null;
  callLabel: string;
};

export function vendorWebsiteHref(website: string | null): string | null {
  const trimmed = website?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function resolveVendorContact(
  vendor: Pick<Vendor, "email" | "phone" | "website" | "city">,
  primaryContact: VendorContact | null | undefined,
  options?: { city?: string | null },
): ResolvedVendorContact {
  const name = primaryContact?.name?.trim() || null;
  const title = primaryContact?.title?.trim() || null;
  const showTitle =
    Boolean(title) && title!.toLowerCase() !== (name ?? "").toLowerCase();
  const email = (primaryContact?.email ?? vendor.email)?.trim() || null;
  const phone = (primaryContact?.phone ?? vendor.phone)?.trim() || null;
  const website = vendor.website?.trim() || null;
  const websiteLabel = formatVendorWebsiteLabel(website);
  const websiteHref = vendorWebsiteHref(website);
  const city = (options?.city ?? vendor.city)?.trim() || null;

  const whoParts = [name, showTitle ? title : null].filter(Boolean);
  const whoLabel = whoParts.length ? whoParts.join(" · ") : null;

  const leadParts = [
    name,
    showTitle ? title : null,
    city,
  ].filter(Boolean);
  const leadLabel = leadParts.length ? leadParts.join(" · ") : null;

  const firstName = name?.split(/\s+/)[0] ?? null;
  const callLabel = firstName ? `Call ${firstName}` : "Call";

  return {
    name,
    title: showTitle ? title : null,
    email,
    phone,
    website,
    websiteLabel,
    websiteHref,
    whoLabel,
    leadLabel,
    callLabel,
  };
}

export type VendorCardBandTone = "forest" | "mustard" | "teal";

/** Squircle fills on colored card bands — ~1–2 shades lighter than band base. */
export type VendorLogoMarkToneStyle = {
  initialsBg: string;
  initialsText: string;
  logoBorder: string;
};

export const VENDOR_LOGO_MARK_TONE: Record<
  VendorCardBandTone,
  VendorLogoMarkToneStyle
> = {
  forest: {
    initialsBg: "#4d6b58",
    initialsText: "#f6f2eb",
    logoBorder: "rgba(255,252,247,0.22)",
  },
  mustard: {
    initialsBg: "#d4a84a",
    initialsText: "#2a2622",
    logoBorder: "rgba(42,38,34,0.14)",
  },
  teal: {
    initialsBg: "#449099",
    initialsText: "#f6f2eb",
    logoBorder: "rgba(255,252,247,0.22)",
  },
};

/** Profile hero initials — subtle forest tint on the light wash. */
export const VENDOR_LOGO_MARK_HERO = {
  initialsBg: "#4d6b58",
  initialsText: "#f6f2eb",
} as const;

export function vendorCardBandTone(
  vendorId: string,
  categoryColor?: string | null,
): VendorCardBandTone {
  const color = categoryColor?.trim().toLowerCase() ?? "";
  if (
    color.includes("yellow") ||
    color.includes("amber") ||
    color.includes("gold") ||
    color.includes("#c4") ||
    color.includes("#e8")
  ) {
    return "mustard";
  }
  if (
    color.includes("teal") ||
    color.includes("cyan") ||
    color.includes("blue") ||
    color.includes("#2a7") ||
    color.includes("#0ea")
  ) {
    return "teal";
  }

  let hash = 0;
  for (let i = 0; i < vendorId.length; i += 1) {
    hash = (hash + vendorId.charCodeAt(i) * (i + 1)) % 3;
  }
  return (["forest", "mustard", "teal"] as const)[hash] ?? "forest";
}

export function vendorStatusPill(
  status: Vendor["status"],
): { label: string; tone: "ok" | "warn" | "muted" } | null {
  switch (status) {
    case "active":
      return { label: "Active", tone: "ok" };
    case "pending":
      return { label: "Pending", tone: "warn" };
    case "blocked":
      return { label: "Blocked", tone: "warn" };
    case "archived":
      return { label: "Archived", tone: "muted" };
    default:
      return null;
  }
}
