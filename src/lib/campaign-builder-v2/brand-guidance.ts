/** Minimal brand-kit item shape for prompt guidance (avoids server-only deps). */
export interface BrandGuidanceItem {
  category: string;
  label?: string | null;
  valueText?: string | null;
  storagePath?: string | null;
}

function normalizeColorKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Builds the brand-direction block for artwork prompts.
 * Merges onboarding `brand_assets` + mascot with `organization_brand_kit_items`.
 */
export function buildBrandGuidanceBlock(input: {
  items: BrandGuidanceItem[];
  organizationName?: string | null;
  ptoName?: string | null;
  includeOrganizationNames?: boolean;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  mascot?: string | null;
  hasPtoLogo?: boolean;
  hasSchoolLogo?: boolean;
}): string | null {
  const lines: string[] = [];
  const seenColors = new Set<string>();

  if (input.includeOrganizationNames) {
    if (input.organizationName?.trim()) {
      lines.push(`Organization: ${input.organizationName.trim()}`);
    }
    if (input.ptoName?.trim()) {
      lines.push(`PTO name: ${input.ptoName.trim()}`);
    }
  }

  if (input.mascot?.trim()) {
    lines.push(
      `Mascot: ${input.mascot.trim()} — reflect this school spirit identity in imagery and tone when it fits (do not invent a logo from the name alone).`,
    );
  }

  const pushColor = (label: string, value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = normalizeColorKey(trimmed);
    if (seenColors.has(key)) return;
    seenColors.add(key);
    lines.push(`Color — ${label}: ${trimmed}`);
  };

  pushColor("Primary", input.primaryColor);
  pushColor("Accent", input.secondaryColor);

  for (const item of input.items) {
    if (item.category === "color" && item.valueText?.trim()) {
      pushColor(item.label?.trim() || "Brand", item.valueText);
    }
    if (item.category === "font" && item.valueText?.trim()) {
      lines.push(`Font — ${item.label}: ${item.valueText.trim()}`);
    }
    if (item.category === "brand_voice" && item.valueText?.trim()) {
      lines.push(`Brand voice: ${item.valueText.trim()}`);
    }
    if (
      (item.category === "school_logo" || item.category === "pto_logo") &&
      item.storagePath?.trim()
    ) {
      lines.push(
        `${item.category === "school_logo" ? "School logo" : "PTO logo"}: attached as a visual brand reference — match colors and style from the image; do not render the logo label as text.`,
      );
    }
  }

  if (input.hasPtoLogo) {
    const already = input.items.some(
      (item) => item.category === "pto_logo" && item.storagePath?.trim(),
    );
    if (!already) {
      lines.push(
        "PTO logo: attached as a visual brand reference — match colors and style from the image; do not render the logo label as text.",
      );
    }
  }

  if (input.hasSchoolLogo) {
    const already = input.items.some(
      (item) => item.category === "school_logo" && item.storagePath?.trim(),
    );
    if (!already) {
      lines.push(
        "School logo: attached as a visual brand reference — match colors and style from the image; do not render the logo label as text.",
      );
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
