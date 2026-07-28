import type {
  OpportunityVisibility,
  VolunteerOpportunity,
} from "@/lib/volunteer-composer/types";

export const PREVIEW_FULL_MONTH = "full-month";

/**
 * Homepage-style window, but cards stay visible with Open / Coming soon / Closed
 * status for the as-of date (mockup parity).
 */
export function opportunityVisibility(
  role: VolunteerOpportunity,
  asOfDate: string,
): OpportunityVisibility {
  const hasUrl = Boolean(role.signupUrl.trim());

  if (asOfDate === PREVIEW_FULL_MONTH) {
    return {
      key: hasUrl ? "open" : "soon",
      label: hasUrl ? "Open" : "Coming soon",
      show: true,
      dimmed: false,
    };
  }

  if (role.alwaysOn) {
    return {
      key: hasUrl ? "open" : "soon",
      label: hasUrl ? "Open" : "Coming soon",
      show: true,
      dimmed: !hasUrl,
    };
  }

  if (role.startsOn && asOfDate < role.startsOn) {
    return {
      key: "soon",
      label: "Coming soon",
      show: true,
      dimmed: true,
    };
  }

  if (role.expiresOn && asOfDate > role.expiresOn) {
    return {
      key: "closed",
      label: "Closed",
      show: true,
      dimmed: true,
    };
  }

  return {
    key: hasUrl ? "open" : "soon",
    label: hasUrl ? "Open" : "Coming soon",
    show: true,
    dimmed: !hasUrl,
  };
}

export function opportunityCtaLabel(vis: OpportunityVisibility): string {
  if (vis.key === "closed") return "Sign-up closed";
  if (vis.key === "soon") return "Sign up coming soon";
  return "Sign up →";
}
