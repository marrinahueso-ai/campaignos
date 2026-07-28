import type {
  OpportunityVisibility,
  VolunteerOpportunity,
} from "@/lib/volunteer-composer/types";

export const PREVIEW_FULL_MONTH = "full-month";

/**
 * Homepage-style window: roles outside the on/off range are hidden (roll off).
 * Full-month preview keeps every role for manager audit.
 * In-window roles without a signup URL stay visible as Coming soon (no CTA).
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
      dimmed: !hasUrl,
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
      show: false,
      dimmed: true,
    };
  }

  if (role.expiresOn && asOfDate > role.expiresOn) {
    return {
      key: "closed",
      label: "Closed",
      show: false,
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
