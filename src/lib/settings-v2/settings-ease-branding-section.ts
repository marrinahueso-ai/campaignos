/**
 * Pure Branding Ease section helpers — safe for Server Components and clients.
 * Keep this module free of "use client" so /settings/branding can parse
 * ?section= without crossing the client boundary.
 */

/** Ease Branding hub — tiles + nested section summaries. */
export interface SettingsEaseBrandingHubData {
  organizationShortName: string;
  writingStyleLabel: string | null;
  aiBrainConfigured: boolean;
  aiBrainStatusLabel: string;
  inboxSourcesCount: number;
  playbookCount: number;
  schoolYearLabel: string;
  primaryColor: string;
  accentColor: string;
  fontStyle: string;
  mascotLabel: string;
  ptoLogoUploaded: boolean;
  schoolLogoUploaded: boolean;
  /** Original public URL (or storage path resolved to public). Preview via AppImage. */
  ptoLogoUrl: string | null;
  schoolLogoUrl: string | null;
  brandKitReady: boolean;
}

export type SettingsEaseBrandingSection =
  | "hub"
  | "ai-inbox"
  | "playbook"
  | "colors-logos"
  | "school-year";

export const SETTINGS_EASE_BRANDING_SECTIONS: SettingsEaseBrandingSection[] = [
  "hub",
  "ai-inbox",
  "playbook",
  "colors-logos",
  "school-year",
];

export function brandingEaseSectionFromParam(
  value: string | undefined,
): SettingsEaseBrandingSection {
  if (
    value === "ai-inbox" ||
    value === "playbook" ||
    value === "colors-logos" ||
    value === "school-year"
  ) {
    return value;
  }
  // Former AI Brain deep links land on the hub — customer Brain UI is unshipped.
  if (value === "ai-brain") {
    return "hub";
  }
  if (value === "colors" || value === "logos" || value === "brand-kit") {
    return "colors-logos";
  }
  if (value === "inbox" || value === "inbox-ai") {
    return "ai-inbox";
  }
  if (value === "playbooks" || value === "milestones") {
    return "playbook";
  }
  return "hub";
}

/** Shipped pages for Branding pills that must not land on a summary card. */
export function brandingEaseDirectRoute(
  section: SettingsEaseBrandingSection,
): string | null {
  if (section === "ai-inbox") return "/settings/inbox-ai";
  if (section === "playbook") return "/settings/playbooks-milestones";
  return null;
}

export function brandingSectionHref(
  section: SettingsEaseBrandingSection,
): string {
  const direct = brandingEaseDirectRoute(section);
  if (direct) return direct;
  if (section === "hub") return "/settings/branding";
  return `/settings/branding?section=${section}`;
}
